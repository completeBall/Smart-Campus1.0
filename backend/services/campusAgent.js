const pool = require('../config/db');
const { callChatCompletion, getProviderDefaults } = require('./aiClient');

let iconv = null;
try {
  iconv = require('iconv-lite');
} catch (e) {
  iconv = null;
}

const MAX_TOOL_ROUNDS = 3;
const SYSTEM_PROMPT = `你是智慧校园学生端的 Agent。
你可以根据用户问题决定是否调用工具来获取校园数据。
规则：
1. 优先调用工具获取真实数据，不要编造校园内部信息。
2. 只允许使用白名单工具。
3. 工具调用必须由后端执行，不能让用户直接控制 SQL。
4. 写入类操作一律只给草稿，不直接执行。
5. 回答要简洁、自然，适合学生使用。

你必须只输出 JSON，格式如下：
{"type":"final","answer":"..."}
或者
{"type":"tool","tool":"tool_name","args":{...}}
`;

const safeJsonParse = (text) => {
  if (!text) return null;
  const raw = String(text).trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (e) {
    return null;
  }
};

const dayOfWeekFromDate = (date = new Date()) => {
  const day = date.getDay();
  return day === 0 ? 7 : day;
};

const rowsToCompactText = (rows, limit = 8) => {
  return (rows || []).slice(0, limit);
};

const LATIN1_MOJIBAKE_RE = /[ÃÂâ¤åæçèéäöü]/g;
const GBK_MOJIBAKE_RE = /[鏅烘収鏍″洯绠鍛浣犳槸宸ュ叿璇棶妯瀷鐢ㄧ敓绋嬪畨鎺冨嫟鐭ユ儏]/g;
const CJK_RE = /[\u4e00-\u9fff]/g;
const COMMON_CHINESE_RE = /[的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说学法所得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天日那问明看原又么利比或但第向道此变条只没结解意建月公无系很情者最立想已通并提直题程展果员入常文总次品式活设及管特件长求基资边流级少图山统接知较将组见计别手期根论运指区强放决被干做必先回则任取据处理金济交受联认共权收证改清己再更单风切打白教安场真具每至达示声报类名确才科信节话整空元今集步广记需研界律观装影算低持众书复容须际商验断深难近]/g;
const REPLACEMENT_RE = /\uFFFD/g;

const countMatches = (text, pattern) => (String(text || '').match(pattern) || []).length;

const countMojibakeMarkers = (text) => countMatches(text, LATIN1_MOJIBAKE_RE) + countMatches(text, GBK_MOJIBAKE_RE);

const textQualityScore = (text) => {
  const raw = String(text || '');
  return countMatches(raw, CJK_RE) * 2
    + countMatches(raw, COMMON_CHINESE_RE)
    - countMojibakeMarkers(raw) * 6
    - countMatches(raw, REPLACEMENT_RE) * 10;
};

const looksMojibake = (value) => {
  if (typeof value !== 'string') return false;
  return countMojibakeMarkers(value) > 0 && /[^\x00-\x7F]/.test(value);
};

const shouldUseRepair = (source, repaired) => {
  if (!repaired || repaired === source || repaired.includes('\uFFFD')) return false;
  const sourceBad = countMojibakeMarkers(source);
  const repairedBad = countMojibakeMarkers(repaired);
  const sourceCjk = countMatches(source, CJK_RE);
  const repairedCjk = countMatches(repaired, CJK_RE);
  return repairedBad < sourceBad
    && repairedCjk >= Math.max(1, sourceCjk - 1)
    && textQualityScore(repaired) > textQualityScore(source) + 2;
};

const repairMojibakeText = (value) => {
  if (!looksMojibake(value)) return value;

  const candidates = [];
  try {
    candidates.push(Buffer.from(value, 'latin1').toString('utf8'));
  } catch (e) {
    // ignore failed repair path
  }
  if (iconv) {
    try {
      candidates.push(iconv.decode(iconv.encode(value, 'gbk'), 'utf8'));
    } catch (e) {
      // ignore failed repair path
    }
  }

  return candidates
    .filter(candidate => shouldUseRepair(value, candidate))
    .sort((a, b) => textQualityScore(b) - textQualityScore(a))[0] || value;
};

const normalizeTextValue = (value) => {
  if (typeof value === 'string') return repairMojibakeText(value);
  if (Array.isArray(value)) return value.map(normalizeTextValue);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeTextValue(item)]));
  }
  return value;
};

const formatToolResult = (result) => {
  const normalized = normalizeTextValue(result);
  if (normalized == null) return '[]';
  if (typeof normalized === 'string') return normalized.slice(0, 4000);
  return JSON.stringify(normalized).slice(0, 4000);
};

const hasSuspiciousText = (value) => {
  if (typeof value === 'string') {
    return looksMojibake(value);
  }
  if (Array.isArray(value)) return value.some(hasSuspiciousText);
  if (value && typeof value === 'object') {
    return Object.values(value).some(hasSuspiciousText);
  }
  return false;
};

const cleanAnswerText = (value) => {
  const text = repairMojibakeText(String(value || ''));
  return text
    .replace(/\uFFFD+/g, '')
    .replace(/\s+\n/g, '\n')
    .trim();
};

const emptyUsage = () => ({
  prompt_tokens: 0,
  completion_tokens: 0,
  total_tokens: 0
});

const addUsage = (total, usage = {}) => ({
  prompt_tokens: Number(total.prompt_tokens || 0) + Number(usage.prompt_tokens || 0),
  completion_tokens: Number(total.completion_tokens || 0) + Number(usage.completion_tokens || 0),
  total_tokens: Number(total.total_tokens || 0) + Number(usage.total_tokens || 0)
});

const firstRow = (rows) => (Array.isArray(rows) && rows.length > 0 ? rows[0] : null);

const createTools = ({ studentId }) => {
  const tools = {
    get_student_profile: {
      description: '查询当前学生的个人档案信息',
      async execute() {
        const [rows] = await pool.execute(
          `SELECT u.id, u.username, u.name, u.role, u.avatar, u.class_name, u.phone, u.email, u.signature,
                  u.status, u.created_at, c.name AS college, m.name AS major
             FROM users u
             LEFT JOIN colleges c ON u.college_id = c.id
             LEFT JOIN majors m ON u.major_id = m.id
            WHERE u.id = ?`,
          [studentId]
        );
        return firstRow(rows);
      }
    },
    get_today_schedule: {
      description: '查询当前学生今天的课程安排',
      async execute() {
        const [[student]] = await pool.execute('SELECT class_name FROM users WHERE id = ?', [studentId]);
        if (!student?.class_name) return [];
        const [rows] = await pool.execute(
          `SELECT s.course_name, s.classroom, s.start_time, s.end_time, s.day_of_week, u.name AS teacher_name
             FROM schedules s
             LEFT JOIN users u ON s.teacher_id = u.id
            WHERE s.class_name = ? AND s.day_of_week = ?
            ORDER BY s.start_time`,
          [student.class_name, dayOfWeekFromDate()]
        );
        return rowsToCompactText(rows);
      }
    },
    get_activity_detail: {
      description: '查询某个活动的详细信息和我的报名状态',
      async execute({ activity_id, id } = {}) {
        const targetId = Number(activity_id || id);
        if (!targetId) return null;
        const [activityRows] = await pool.execute(
          `SELECT a.*, u.name AS organizer_name,
                  (SELECT COUNT(*) FROM activity_participants WHERE activity_id = a.id AND status = 1) AS joined_count
             FROM activities a
             JOIN users u ON a.organizer_id = u.id
            WHERE a.id = ?`,
          [targetId]
        );
        const activity = firstRow(activityRows);
        if (!activity) return null;
        const [participationRows] = await pool.execute(
          'SELECT id, status, applied_at, approved_at FROM activity_participants WHERE activity_id = ? AND student_id = ?',
          [targetId, studentId]
        );
        const participation = firstRow(participationRows);
        return {
          ...activity,
          my_status: participation ? participation.status : null,
          my_participation: participation || null
        };
      }
    },
    get_pending_homework: {
      description: '查询当前学生未提交的作业',
      async execute() {
        const [[student]] = await pool.execute('SELECT class_name FROM users WHERE id = ?', [studentId]);
        if (!student?.class_name) return [];
        const [rows] = await pool.execute(
          `SELECT t.id, t.title, t.content, t.deadline, t.created_at
             FROM tasks t
             LEFT JOIN task_submissions s ON s.task_id = t.id AND s.student_id = ?
            WHERE t.target_class = ? AND s.id IS NULL
            ORDER BY t.deadline IS NULL, t.deadline ASC, t.created_at DESC`,
          [studentId, student.class_name]
        );
        return rowsToCompactText(rows);
      }
    },
    get_my_activities: {
      description: '查询当前学生已报名或参与的活动',
      async execute() {
        const [rows] = await pool.execute(
          `SELECT p.id AS participant_id, p.status AS apply_status, p.applied_at, p.approved_at,
                  a.id AS activity_id, a.title, a.description, a.category, a.score_type, a.score_value,
                  a.start_time, a.end_time, a.location, a.status AS activity_status
             FROM activity_participants p
             JOIN activities a ON p.activity_id = a.id
            WHERE p.student_id = ?
            ORDER BY p.applied_at DESC
            LIMIT 12`,
          [studentId]
        );
        return rowsToCompactText(rows);
      }
    },
    get_my_assessment: {
      description: '查询当前学生最新综测分数',
      async execute() {
        const [rows] = await pool.execute(
          `SELECT c.*, u.name, u.class_name
             FROM comprehensive_scores c
             JOIN users u ON c.student_id = u.id
            WHERE c.student_id = ?
            ORDER BY c.semester DESC
            LIMIT 1`,
          [studentId]
        );
        return firstRow(rows);
      }
    },
    get_my_score_records: {
      description: '查询当前学生的加分明细',
      async execute() {
        const [rows] = await pool.execute(
          `SELECT r.*, a.title AS activity_title, a.category AS activity_category,
                  u.name AS submitter_name, t.name AS reviewer_name
             FROM activity_score_records r
             LEFT JOIN activities a ON r.activity_id = a.id
             LEFT JOIN users u ON r.submitted_by = u.id
             LEFT JOIN users t ON r.reviewed_by = t.id
            WHERE r.student_id = ?
            ORDER BY r.submitted_at DESC
            LIMIT 12`,
          [studentId]
        );
        return rowsToCompactText(rows);
      }
    },
    get_my_leave_requests: {
      description: '查询当前学生的请假申请记录',
      async execute() {
        const [rows] = await pool.execute(
          `SELECT l.*, u.name AS teacher_name
             FROM leave_requests l
             LEFT JOIN users u ON l.teacher_id = u.id
            WHERE l.student_id = ?
            ORDER BY l.created_at DESC
            LIMIT 10`,
          [studentId]
        );
        return rowsToCompactText(rows);
      }
    },
    get_recent_grades: {
      description: '查询当前学生最近成绩',
      async execute() {
        const [rows] = await pool.execute(
          `SELECT g.course_name, g.score, g.exam_type, g.remark, g.created_at, u.name AS teacher_name
             FROM grades g
             LEFT JOIN users u ON g.teacher_id = u.id
            WHERE g.student_id = ?
            ORDER BY g.created_at DESC
            LIMIT 10`,
          [studentId]
        );
        return rowsToCompactText(rows);
      }
    },
    get_my_attendance: {
      description: '查询当前学生最近考勤',
      async execute() {
        const [rows] = await pool.execute(
          `SELECT course_name, date, status, remark, check_in_at, created_at
             FROM attendance
            WHERE student_id = ?
            ORDER BY date DESC, created_at DESC
            LIMIT 10`,
          [studentId]
        );
        return rowsToCompactText(rows);
      }
    },
    get_classmates: {
      description: '查询当前学生的同班同学信息',
      async execute() {
        const [studentRows] = await pool.execute(
          'SELECT class_name, college_id, major_id FROM users WHERE id = ?',
          [studentId]
        );
        const student = firstRow(studentRows);
        if (!student) return [];

        if (student.class_name) {
          const [rows] = await pool.execute(
            `SELECT u.id, u.username, u.name, u.avatar, u.phone, u.email, u.signature,
                    u.class_name, c.name AS college, m.name AS major
               FROM users u
               LEFT JOIN colleges c ON u.college_id = c.id
               LEFT JOIN majors m ON u.major_id = m.id
              WHERE u.class_name = ? AND u.role = 'student' AND u.id != ?
              ORDER BY u.name
              LIMIT 20`,
            [student.class_name, studentId]
          );
          return rowsToCompactText(rows, 12);
        }

        if (student.college_id || student.major_id) {
          const conditions = [];
          const params = [];
          if (student.major_id) {
            conditions.push('u.major_id = ?');
            params.push(student.major_id);
          } else if (student.college_id) {
            conditions.push('u.college_id = ?');
            params.push(student.college_id);
          }
          params.push(studentId);
          const [rows] = await pool.execute(
            `SELECT u.id, u.username, u.name, u.avatar, u.phone, u.email, u.signature,
                    u.class_name, c.name AS college, m.name AS major
               FROM users u
               LEFT JOIN colleges c ON u.college_id = c.id
               LEFT JOIN majors m ON u.major_id = m.id
              WHERE u.role = 'student' AND ${conditions.join(' AND ')} AND u.id != ?
              ORDER BY u.class_name, u.name
              LIMIT 20`,
            params
          );
          return rowsToCompactText(rows, 12);
        }

        const [rows] = await pool.execute(
          `SELECT u.id, u.username, u.name, u.avatar, u.phone, u.email, u.signature,
                  u.class_name, c.name AS college, m.name AS major
             FROM users u
             LEFT JOIN colleges c ON u.college_id = c.id
             LEFT JOIN majors m ON u.major_id = m.id
            WHERE u.role = 'student' AND u.id != ?
            ORDER BY u.class_name, u.name
            LIMIT 20`,
          [studentId]
        );
        return rowsToCompactText(rows, 12);
      }
    },
    get_college_major_map: {
      description: '查询学院和专业的对应关系',
      async execute() {
        const [colleges] = await pool.execute('SELECT id, name, description FROM colleges ORDER BY id');
        const [majors] = await pool.execute('SELECT id, college_id, name, description FROM majors ORDER BY college_id, id');
        return colleges.map(college => ({
          ...college,
          majors: majors.filter(major => major.college_id === college.id)
        }));
      }
    },
    get_notices: {
      description: '查询最新公告',
      async execute() {
        const [rows] = await pool.execute(
          `SELECT title, content, type, created_at
             FROM notices
            WHERE type IN ('all', 'student')
            ORDER BY created_at DESC
            LIMIT 8`
        );
        return rowsToCompactText(rows);
      }
    },
    get_available_activities: {
      description: '查询当前可看的活动列表',
      async execute() {
        const [rows] = await pool.execute(
          `SELECT title, description, category, score_type, score_value, max_participants, start_time, end_time, location, status
             FROM activities
            WHERE status = 1
            ORDER BY start_time DESC
            LIMIT 10`
        );
        return rowsToCompactText(rows);
      }
    },
    draft_leave_request: {
      description: '根据用户需求生成请假申请草稿',
      async execute({ reason = '', start_date = '', end_date = '' } = {}) {
        return {
          student_id: studentId,
          start_date,
          end_date,
          reason: String(reason || '').slice(0, 200)
        };
      }
    }
  };

  return tools;
};

const runCampusAgent = async ({ studentId, provider, model, baseUrl, apiKey, messages, temperature = 0.3, maxTokens = 1200 }) => {
  const defaults = getProviderDefaults(provider);
  const tools = createTools({ studentId });
  const toolTrace = [];
  let totalUsage = emptyUsage();
  let conversation = Array.isArray(messages)
    ? messages.slice(-12).map((message) => ({
        ...message,
        content: normalizeTextValue(message.content)
      }))
    : [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const result = await callChatCompletion({
      provider,
      apiKey,
      model,
      baseUrl,
      temperature,
      maxTokens,
      messages: [
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}\n可用工具：\n${Object.entries(tools)
            .map(([name, tool]) => `- ${name}: ${tool.description}`)
            .join('\n')}`
        },
        ...conversation
      ]
    });
    totalUsage = addUsage(totalUsage, result.usage);

    const parsed = safeJsonParse(result.content);
    if (!parsed) {
      toolTrace.push({
        type: 'final',
        round: round + 1,
        content: '模型直接回答，未调用工具',
        usage: result.usage
      });
      return {
        answer: cleanAnswerText(result.content),
        provider,
        provider_label: defaults.label,
        model: result.model,
        usage: totalUsage,
        tool_trace: toolTrace
      };
    }

    if (parsed.type === 'final') {
      toolTrace.push({
        type: 'final',
        round: round + 1,
        content: parsed.answer || '',
        usage: result.usage
      });
      return {
        answer: cleanAnswerText(parsed.answer || ''),
        provider,
        provider_label: defaults.label,
        model: result.model,
        usage: totalUsage,
        tool_trace: toolTrace
      };
    }

    if (parsed.type !== 'tool' || !parsed.tool || !tools[parsed.tool]) {
      toolTrace.push({
        type: 'final',
        round: round + 1,
        content: '模型未选择可用工具',
        usage: result.usage
      });
      return {
        answer: cleanAnswerText(result.content),
        provider,
        provider_label: defaults.label,
        model: result.model,
        usage: totalUsage,
        tool_trace: toolTrace
      };
    }

    const toolArgs = parsed.args && typeof parsed.args === 'object' ? parsed.args : {};
    const toolResult = normalizeTextValue(await tools[parsed.tool].execute(toolArgs));
    const toolResultText = hasSuspiciousText(toolResult)
      ? JSON.stringify(toolResult, null, 2)
      : formatToolResult(toolResult);
    toolTrace.push({
      type: 'tool',
      round: round + 1,
      tool: parsed.tool,
      args: toolArgs,
      result: toolResult
    });

    conversation = [
      ...conversation,
      { role: 'assistant', content: result.content },
      { role: 'user', content: `工具 ${parsed.tool} 返回结果：\n${toolResultText}\n\n请基于以上结果继续回答，并且只输出最终 JSON。` }
    ];
  }

  return {
    answer: 'AI 工具调用轮次已达上限，请重新描述你的问题。',
    provider,
    provider_label: defaults.label,
    model,
    usage: totalUsage,
    tool_trace: toolTrace
  };
};

module.exports = {
  runCampusAgent
};
