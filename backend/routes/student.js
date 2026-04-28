const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.use(roleMiddleware(['student']));

// 学生统计
router.get('/statistics', async (req, res) => {
  const studentId = req.user.id;
  try {
    const [[{ count: taskCount }]] = await pool.execute(
      'SELECT COUNT(*) as count FROM tasks WHERE target_class = (SELECT class_name FROM users WHERE id = ?)',
      [studentId]
    );
    const [[{ count: submitCount }]] = await pool.execute('SELECT COUNT(*) as count FROM task_submissions WHERE student_id = ?', [studentId]);
    const [[{ count: unreadCount }]] = await pool.execute(
      `SELECT COUNT(*) as count FROM notices
       WHERE (type = 'all' OR type = 'student')
         AND created_at > IFNULL((SELECT last_login FROM users WHERE id = ?), '1970-01-01')`,
      [studentId]
    );
    res.json({ code: 200, data: { taskCount, submitCount, unreadCount } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 作业任务
router.get('/tasks', async (req, res) => {
  const studentId = req.user.id;
  try {
    const [studentRows] = await pool.execute('SELECT class_name FROM users WHERE id = ?', [studentId]);
    if (studentRows.length === 0) return res.json({ code: 400, message: '学生不存在' });
    const className = studentRows[0].class_name;
    const [rows] = await pool.execute(
      `SELECT t.*, s.id as submission_id, s.status as submit_status, s.score, s.comment, s.file_url, s.file_name
       FROM tasks t
       LEFT JOIN task_submissions s ON t.id = s.task_id AND s.student_id = ?
       WHERE t.target_class = ?
       ORDER BY t.created_at DESC`,
      [studentId, className]
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 提交作业
router.post('/tasks/:id/submit', async (req, res) => {
  const studentId = req.user.id;
  const { content, file_url, file_name } = req.body;
  try {
    const [existing] = await pool.execute('SELECT id FROM task_submissions WHERE task_id = ? AND student_id = ?', [req.params.id, studentId]);
    if (existing.length > 0) {
      await pool.execute('UPDATE task_submissions SET content = ?, file_url = ?, file_name = ?, status = 0, created_at = NOW() WHERE id = ?', [content, file_url || null, file_name || null, existing[0].id]);
      return res.json({ code: 200, message: '更新成功' });
    }
    await pool.execute(
      'INSERT INTO task_submissions (task_id, student_id, content, file_url, file_name, status, created_at) VALUES (?, ?, ?, ?, ?, 0, NOW())',
      [req.params.id, studentId, content, file_url || null, file_name || null]
    );
    res.json({ code: 200, message: '提交成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 课程表
router.get('/schedule', async (req, res) => {
  const studentId = req.user.id;
  try {
    const [studentRows] = await pool.execute('SELECT class_name FROM users WHERE id = ?', [studentId]);
    if (studentRows.length === 0) return res.json({ code: 400, message: '学生不存在' });
    const className = studentRows[0].class_name;
    const [rows] = await pool.execute(
      'SELECT s.*, u.name as teacher_name FROM schedules s LEFT JOIN users u ON s.teacher_id = u.id WHERE s.class_name = ? ORDER BY s.day_of_week, s.start_time',
      [className]
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 成绩查询
router.get('/grades', async (req, res) => {
  const studentId = req.user.id;
  try {
    const [rows] = await pool.execute(
      'SELECT g.*, u.name as teacher_name FROM grades g LEFT JOIN users u ON g.teacher_id = u.id WHERE g.student_id = ? ORDER BY g.created_at DESC',
      [studentId]
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 论坛
router.get('/forum/posts', async (req, res) => {
  const { keyword, category, sort = 'latest', page = 1, pageSize = 10 } = req.query;
  const userId = req.user.id;
  try {
    let sql = `SELECT p.*, u.name as author_name, u.avatar,
      EXISTS(SELECT 1 FROM forum_likes WHERE post_id = p.id AND user_id = ?) AS is_liked
      FROM forum_posts p JOIN users u ON p.user_id = u.id WHERE 1=1`;
    const params = [userId];
    if (keyword) {
      sql += ' AND (p.title LIKE ? OR p.content LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (category) {
      sql += ' AND p.category = ?';
      params.push(category);
    }
    const orderBy = sort === 'hot'
      ? 'p.is_pinned DESC, p.like_count DESC, p.reply_count DESC, p.created_at DESC'
      : 'p.is_pinned DESC, p.created_at DESC';
    const offset = (+page - 1) * +pageSize;
    const [rows] = await pool.query(`${sql} ORDER BY ${orderBy} LIMIT ${+pageSize} OFFSET ${offset}`, params);
    let countSql = 'SELECT COUNT(*) as count FROM forum_posts p JOIN users u ON p.user_id = u.id WHERE 1=1';
    const countParams = [];
    if (keyword) {
      countSql += ' AND (p.title LIKE ? OR p.content LIKE ?)';
      countParams.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (category) {
      countSql += ' AND p.category = ?';
      countParams.push(category);
    }
    const [[{ count }]] = await pool.execute(countSql, countParams);
    // 解析 JSON 字段
    rows.forEach(r => {
      r.images = r.images ? JSON.parse(r.images) : [];
      r.attachments = r.attachments ? JSON.parse(r.attachments) : [];
      r.is_liked = !!r.is_liked;
    });
    res.json({ code: 200, data: { list: rows, total: count } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 热度排行榜(取前10)
router.get('/forum/hot', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT p.id, p.title, p.like_count, p.reply_count, p.view_count, p.created_at,
              u.name as author_name, u.avatar
       FROM forum_posts p JOIN users u ON p.user_id = u.id
       ORDER BY p.like_count DESC, p.reply_count DESC, p.view_count DESC LIMIT 10`
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.get('/forum/posts/:id', async (req, res) => {
  const userId = req.user.id;
  try {
    const [[post]] = await pool.execute(
      `SELECT p.*, u.name as author_name, u.avatar,
       EXISTS(SELECT 1 FROM forum_likes WHERE post_id = p.id AND user_id = ?) AS is_liked
       FROM forum_posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
      [userId, req.params.id]
    );
    if (!post) return res.json({ code: 404, message: '帖子不存在' });
    post.images = post.images ? JSON.parse(post.images) : [];
    post.attachments = post.attachments ? JSON.parse(post.attachments) : [];
    post.is_liked = !!post.is_liked;
    const [replies] = await pool.execute(
      `SELECT r.*, u.name as author_name, u.avatar, pu.name as parent_author_name
       FROM forum_replies r
       JOIN users u ON r.user_id = u.id
       LEFT JOIN forum_replies pr ON r.parent_id = pr.id
       LEFT JOIN users pu ON pr.user_id = pu.id
       WHERE r.post_id = ? ORDER BY r.created_at`,
      [req.params.id]
    );
    await pool.execute('UPDATE forum_posts SET view_count = view_count + 1 WHERE id = ?', [req.params.id]);
    res.json({ code: 200, data: { post, replies } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/forum/posts', async (req, res) => {
  const { title, content, category = 'general', images = [], attachments = [] } = req.body;
  const userId = req.user.id;
  try {
    const [result] = await pool.execute(
      `INSERT INTO forum_posts (user_id, title, content, category, images, attachments, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId, title, content, category,
        images.length ? JSON.stringify(images) : null,
        attachments.length ? JSON.stringify(attachments) : null
      ]
    );
    res.json({ code: 200, message: '发布成功', data: { id: result.insertId } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/forum/posts/:id/reply', async (req, res) => {
  const { content, parent_id } = req.body;
  const userId = req.user.id;
  try {
    await pool.execute(
      'INSERT INTO forum_replies (post_id, user_id, parent_id, content, created_at) VALUES (?, ?, ?, ?, NOW())',
      [req.params.id, userId, parent_id || null, content]
    );
    await pool.execute(
      'UPDATE forum_posts SET reply_count = reply_count + 1 WHERE id = ?',
      [req.params.id]
    );
    res.json({ code: 200, message: '回复成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 点赞 / 取消点赞(toggle)
router.post('/forum/posts/:id/like', async (req, res) => {
  const postId = req.params.id;
  const userId = req.user.id;
  try {
    const [[exist]] = await pool.execute(
      'SELECT id FROM forum_likes WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );
    if (exist) {
      await pool.execute('DELETE FROM forum_likes WHERE id = ?', [exist.id]);
      await pool.execute('UPDATE forum_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?', [postId]);
      const [[{ like_count }]] = await pool.execute('SELECT like_count FROM forum_posts WHERE id = ?', [postId]);
      return res.json({ code: 200, message: '已取消点赞', data: { liked: false, like_count } });
    }
    await pool.execute('INSERT INTO forum_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
    await pool.execute('UPDATE forum_posts SET like_count = like_count + 1 WHERE id = ?', [postId]);
    const [[{ like_count }]] = await pool.execute('SELECT like_count FROM forum_posts WHERE id = ?', [postId]);
    res.json({ code: 200, message: '点赞成功', data: { liked: true, like_count } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 招聘信息
router.get('/jobs', async (req, res) => {
  const { keyword, category, page = 1, pageSize = 10 } = req.query;
  try {
    let sql = 'SELECT * FROM jobs WHERE status = 1';
    const params = [];
    if (keyword) {
      sql += ' AND (title LIKE ? OR company LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    const offset = (+page - 1) * +pageSize;
    const [rows] = await pool.query(`${sql} ORDER BY created_at DESC LIMIT ${+pageSize} OFFSET ${offset}`, params);
    const [[{ count }]] = await pool.execute(sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as count FROM'), params);
    res.json({ code: 200, data: { list: rows, total: count } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.get('/jobs/:id', async (req, res) => {
  try {
    const [[row]] = await pool.execute('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
    res.json({ code: 200, data: row });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 考勤
router.get('/attendance', async (req, res) => {
  const studentId = req.user.id;
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC',
      [studentId]
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 课堂签到 - 当前是否有进行中的签到 GET /api/student/attendance-sessions/active
router.get('/attendance-sessions/active', async (req, res) => {
  const studentId = req.user.id;
  try {
    // 自动关闭已过期 session
    await pool.execute('UPDATE attendance_sessions SET status = 2 WHERE status = 1 AND end_at <= NOW()');
    // 查我的班级
    const [[me]] = await pool.execute('SELECT class_name FROM users WHERE id = ?', [studentId]);
    if (!me?.class_name) {
      return res.json({ code: 200, data: null });
    }
    const [[s]] = await pool.execute(
      `SELECT * FROM attendance_sessions
       WHERE class_name = ? AND status = 1 AND end_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [me.class_name]
    );
    if (!s) return res.json({ code: 200, data: null });
    // 我的签到状态
    const [[record]] = await pool.execute(
      'SELECT id, status, check_in_at FROM attendance WHERE session_id = ? AND student_id = ?',
      [s.id, studentId]
    );
    res.json({ code: 200, data: { session: s, record: record || null } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 学生签到 POST /api/student/attendance-sessions/:id/check-in
router.post('/attendance-sessions/:id/check-in', async (req, res) => {
  const studentId = req.user.id;
  const sessionId = Number(req.params.id);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[s]] = await conn.execute('SELECT * FROM attendance_sessions WHERE id = ?', [sessionId]);
    if (!s) {
      await conn.rollback();
      return res.status(404).json({ code: 404, message: '签到不存在' });
    }
    // 班级校验
    const [[me]] = await conn.execute('SELECT class_name FROM users WHERE id = ?', [studentId]);
    if (me.class_name !== s.class_name) {
      await conn.rollback();
      return res.status(403).json({ code: 403, message: '此签到不属于你的班级' });
    }
    // 状态判定
    const now = new Date();
    const lateAt = new Date(s.late_at);
    const endAt = new Date(s.end_at);
    if (now > endAt) {
      await conn.rollback();
      return res.status(400).json({ code: 400, message: '签到已结束' });
    }
    const newStatus = now <= lateAt ? 'present' : 'late';
    // 找到预写行
    const [[record]] = await conn.execute(
      'SELECT id, status FROM attendance WHERE session_id = ? AND student_id = ?',
      [sessionId, studentId]
    );
    if (!record) {
      await conn.rollback();
      return res.status(404).json({ code: 404, message: '没有你的签到记录' });
    }
    if (record.status === 'present' || record.status === 'late') {
      await conn.rollback();
      return res.status(400).json({ code: 400, message: '你已完成签到' });
    }
    await conn.execute(
      'UPDATE attendance SET status = ?, check_in_at = NOW() WHERE id = ?',
      [newStatus, record.id]
    );
    await conn.commit();
    res.json({
      code: 200,
      message: newStatus === 'present' ? '签到成功' : '签到成功(已迟到)',
      data: { status: newStatus }
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ code: 500, message: err.message });
  } finally {
    conn.release();
  }
});

// 反馈
router.post('/feedback', async (req, res) => {
  const { title, content, type } = req.body;
  const userId = req.user.id;
  try {
    await pool.execute(
      'INSERT INTO feedbacks (user_id, title, content, type, status, created_at) VALUES (?, ?, ?, ?, 0, NOW())',
      [userId, title, content, type]
    );
    res.json({ code: 200, message: '提交成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.get('/feedback', async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await pool.execute('SELECT * FROM feedbacks WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 通知
router.get('/notices', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM notices WHERE type = "all" OR type = "student" ORDER BY created_at DESC LIMIT 20');
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

/* ==================== 请假功能 ==================== */

// 申请请假/晚归/不归
router.post('/leave', async (req, res) => {
  const studentId = req.user.id;
  const { start_date, end_date, type, reason, parent_consent_url, late_time } = req.body;
  // 晚归和不归必须上传家长知情书
  if ((type === 'late_return' || type === 'absence') && !parent_consent_url) {
    return res.json({ code: 400, message: '晚归/不归申请必须上传家长知情书' });
  }
  try {
    await pool.execute(
      'INSERT INTO leave_requests (student_id, start_date, end_date, type, reason, parent_consent_url, late_time, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())',
      [studentId, start_date, end_date || start_date, type, reason, parent_consent_url || null, late_time || null]
    );
    res.json({ code: 200, message: '申请已提交，等待审批' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 我的请假记录
router.get('/leave', async (req, res) => {
  const studentId = req.user.id;
  try {
    const [rows] = await pool.execute(
      `SELECT l.*, u.name as teacher_name FROM leave_requests l
       LEFT JOIN users u ON l.teacher_id = u.id
       WHERE l.student_id = ? ORDER BY l.created_at DESC`,
      [studentId]
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

/* ==================== 综测功能 ==================== */

// 查看我的综测分数
router.get('/assessment', async (req, res) => {
  const studentId = req.user.id;
  try {
    const [[row]] = await pool.execute(
      `SELECT c.*, u.name, u.class_name FROM comprehensive_scores c
       JOIN users u ON c.student_id = u.id
       WHERE c.student_id = ? ORDER BY c.semester DESC LIMIT 1`,
      [studentId]
    );
    if (!row) {
      return res.json({ code: 200, data: null, message: '暂无综测记录' });
    }
    res.json({ code: 200, data: row });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 综测排行榜
router.get('/assessment/rank', async (req, res) => {
  const { semester = '2024-2025-2', page = 1, pageSize = 20 } = req.query;
  try {
    const offset = (+page - 1) * +pageSize;
    const [rows] = await pool.query(
      `SELECT c.*, u.name, u.class_name,
        RANK() OVER (ORDER BY c.total_score DESC) as rank_num
       FROM comprehensive_scores c
       JOIN users u ON c.student_id = u.id
       WHERE c.semester = ?
       LIMIT ${+pageSize} OFFSET ${offset}`,
      [semester]
    );
    const [[{ count }]] = await pool.execute(
      'SELECT COUNT(*) as count FROM comprehensive_scores WHERE semester = ?',
      [semester]
    );
    // 优秀学生（前10%或总分>=85）
    const excellentThreshold = 85;
    const [excellent] = await pool.execute(
      `SELECT c.*, u.name, u.class_name FROM comprehensive_scores c
       JOIN users u ON c.student_id = u.id
       WHERE c.semester = ? AND c.total_score >= ?
       ORDER BY c.total_score DESC`,
      [semester, excellentThreshold]
    );
    res.json({ code: 200, data: { list: rows, total: count, excellent } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

/* ==================== 活动广场 ==================== */

// 创建活动
router.post('/activities', async (req, res) => {
  const studentId = req.user.id;
  const { title, description, category, score_type, score_value, max_participants, start_time, end_time, location } = req.body;
  try {
    const [result] = await pool.execute(
      'INSERT INTO activities (title, description, category, score_type, score_value, max_participants, start_time, end_time, location, organizer_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())',
      [title, description, category, score_type, score_value, max_participants || 0, start_time, end_time, location || null, studentId]
    );
    res.json({ code: 200, message: '活动创建成功，等待老师审批', data: { id: result.insertId } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 我发起的活动（必须放在 /activities/:id 之前）
router.get('/activities/organized', async (req, res) => {
  const studentId = req.user.id;
  try {
    const [rows] = await pool.execute(
      `SELECT a.*, u.name as organizer_name,
        (SELECT COUNT(*) FROM activity_participants WHERE activity_id = a.id AND status = 1) as joined_count
       FROM activities a
       JOIN users u ON a.organizer_id = u.id
       WHERE a.organizer_id = ?
       ORDER BY a.created_at DESC`,
      [studentId]
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 获取我发起的活动的参与者
router.get('/activities/:id/participants', async (req, res) => {
  const studentId = req.user.id;
  try {
    const [[activity]] = await pool.execute('SELECT * FROM activities WHERE id = ? AND organizer_id = ?', [req.params.id, studentId]);
    if (!activity) return res.json({ code: 403, message: '无权查看或活动不存在' });
    const [rows] = await pool.execute(
      `SELECT p.*, u.name as student_name, u.class_name
       FROM activity_participants p
       JOIN users u ON p.student_id = u.id
       WHERE p.activity_id = ?
       ORDER BY p.applied_at DESC`,
      [req.params.id]
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 审核我发起的活动的参与者（仅决定是否允许参与，不再自动加分；加分需走加分名单流程）
router.put('/activities/:id/participants/:pid', async (req, res) => {
  const studentId = req.user.id;
  const { status } = req.body;
  try {
    const [[activity]] = await pool.execute('SELECT * FROM activities WHERE id = ? AND organizer_id = ?', [req.params.id, studentId]);
    if (!activity) return res.json({ code: 403, message: '无权审核或活动不存在' });
    if (activity.status !== 1) return res.json({ code: 400, message: '活动未通过审批，无法审核参与者' });
    await pool.execute(
      'UPDATE activity_participants SET status = ?, approved_at = NOW() WHERE id = ? AND activity_id = ?',
      [status, req.params.pid, req.params.id]
    );
    const msg = status === 1 ? '已通过' : (status === 2 ? '已拒绝' : '已更新');
    res.json({ code: 200, message: `审核${msg}` });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 组织者：查看本活动已提交的加分记录（用于发起前端区分哪些人已经在加分名单里）
router.get('/activities/:id/score-records', async (req, res) => {
  const studentId = req.user.id;
  try {
    const [[activity]] = await pool.execute('SELECT * FROM activities WHERE id = ? AND organizer_id = ?', [req.params.id, studentId]);
    if (!activity) return res.json({ code: 403, message: '无权查看或活动不存在' });
    const [rows] = await pool.execute(
      `SELECT r.*, u.name as student_name, u.class_name
       FROM activity_score_records r
       JOIN users u ON r.student_id = u.id
       WHERE r.activity_id = ?
       ORDER BY r.submitted_at DESC`,
      [req.params.id]
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 组织者：批量提交加分名单（针对当前活动的若干已通过报名）
router.post('/activities/:id/score-submission', async (req, res) => {
  const studentId = req.user.id;
  const activityId = req.params.id;
  const { participant_ids } = req.body;
  if (!Array.isArray(participant_ids) || participant_ids.length === 0) {
    return res.json({ code: 400, message: '请至少选择一名学生' });
  }
  try {
    const [[activity]] = await pool.execute('SELECT * FROM activities WHERE id = ? AND organizer_id = ?', [activityId, studentId]);
    if (!activity) return res.json({ code: 403, message: '无权操作或活动不存在' });
    if (activity.status !== 1) return res.json({ code: 400, message: '活动未通过审批，无法提交加分名单' });

    // 拉取选中的报名记录，校验合法性
    const placeholders = participant_ids.map(() => '?').join(',');
    const [participants] = await pool.query(
      `SELECT * FROM activity_participants WHERE id IN (${placeholders}) AND activity_id = ?`,
      [...participant_ids, activityId]
    );
    const valid = participants.filter(p => p.status === 1);
    if (valid.length === 0) {
      return res.json({ code: 400, message: '所选记录均不是已通过的报名，无法提交' });
    }

    let inserted = 0;
    let skipped = 0;
    for (const p of valid) {
      try {
        await pool.execute(
          `INSERT INTO activity_score_records
           (activity_id, student_id, participant_id, score_type, score_value, semester, status, submitted_by, submitted_at)
           VALUES (?, ?, ?, ?, ?, '2024-2025-2', 0, ?, NOW())`,
          [activityId, p.student_id, p.id, activity.score_type, activity.score_value, studentId]
        );
        inserted++;
      } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
          skipped++;
        } else {
          throw e;
        }
      }
    }
    res.json({
      code: 200,
      message: skipped > 0
        ? `已提交 ${inserted} 条，${skipped} 条已存在跳过`
        : `已提交 ${inserted} 条加分申请，等待教师审核`,
      data: { inserted, skipped }
    });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 学生：我的加分明细（综测分数页用）
router.get('/score-records', async (req, res) => {
  const studentId = req.user.id;
  try {
    const [rows] = await pool.execute(
      `SELECT r.*, a.title as activity_title, a.category as activity_category,
              u.name as submitter_name, t.name as reviewer_name
       FROM activity_score_records r
       LEFT JOIN activities a ON r.activity_id = a.id
       LEFT JOIN users u ON r.submitted_by = u.id
       LEFT JOIN users t ON r.reviewed_by = t.id
       WHERE r.student_id = ?
       ORDER BY r.submitted_at DESC`,
      [studentId]
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 我的活动（必须放在 /activities/:id 之前）
router.get('/activities/my', async (req, res) => {
  const studentId = req.user.id;
  try {
    const [rows] = await pool.execute(
      `SELECT p.*, a.title, a.description, a.category, a.score_type, a.score_value,
        a.start_time, a.end_time, a.location, a.status as activity_status
       FROM activity_participants p
       JOIN activities a ON p.activity_id = a.id
       WHERE p.student_id = ?
       ORDER BY p.applied_at DESC`,
      [studentId]
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 活动列表（已审批通过的活动）
router.get('/activities', async (req, res) => {
  const studentId = req.user.id;
  const { keyword, category, page = 1, pageSize = 10 } = req.query;
  try {
    let sql = `SELECT a.*, u.name as organizer_name,
      (SELECT COUNT(*) FROM activity_participants WHERE activity_id = a.id AND status = 1) as joined_count
      FROM activities a
      JOIN users u ON a.organizer_id = u.id
      WHERE a.status = 1`;
    const params = [];
    if (keyword) {
      sql += ' AND (a.title LIKE ? OR a.description LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (category) {
      sql += ' AND a.category = ?';
      params.push(category);
    }
    sql += ' ORDER BY a.start_time DESC';
    const offset = (+page - 1) * +pageSize;
    const [rows] = await pool.query(`${sql} LIMIT ${+pageSize} OFFSET ${offset}`, params);
    // 为每个活动查询当前学生的报名状态
    for (const row of rows) {
      const [[participation]] = await pool.execute(
        'SELECT status FROM activity_participants WHERE activity_id = ? AND student_id = ?',
        [row.id, studentId]
      );
      row.my_status = participation ? participation.status : null;
    }
    let simpleCount = 'SELECT COUNT(*) as count FROM activities a WHERE a.status = 1';
    const countParams = [];
    if (keyword) {
      simpleCount += ' AND (a.title LIKE ? OR a.description LIKE ?)';
      countParams.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (category) {
      simpleCount += ' AND a.category = ?';
      countParams.push(category);
    }
    const [[{ count }]] = await pool.execute(simpleCount, countParams);
    res.json({ code: 200, data: { list: rows, total: count } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 活动详情
router.get('/activities/:id', async (req, res) => {
  const studentId = req.user.id;
  try {
    const [[activity]] = await pool.execute(
      `SELECT a.*, u.name as organizer_name,
        (SELECT COUNT(*) FROM activity_participants WHERE activity_id = a.id AND status = 1) as joined_count
       FROM activities a
       JOIN users u ON a.organizer_id = u.id
       WHERE a.id = ?`,
      [req.params.id]
    );
    if (!activity) return res.json({ code: 404, message: '活动不存在' });
    // 查询当前学生是否已报名
    const [[participation]] = await pool.execute(
      'SELECT * FROM activity_participants WHERE activity_id = ? AND student_id = ?',
      [req.params.id, studentId]
    );
    res.json({ code: 200, data: { ...activity, my_status: participation ? participation.status : null } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 报名/抢活动
router.post('/activities/:id/apply', async (req, res) => {
  const studentId = req.user.id;
  const activityId = req.params.id;
  try {
    const [[activity]] = await pool.execute('SELECT * FROM activities WHERE id = ? AND status = 1', [activityId]);
    if (!activity) return res.json({ code: 400, message: '活动不存在或未通过审批' });
    // 检查是否已报名
    const [[existing]] = await pool.execute(
      'SELECT * FROM activity_participants WHERE activity_id = ? AND student_id = ?',
      [activityId, studentId]
    );
    if (existing) return res.json({ code: 400, message: '您已申请该活动，请勿重复申请' });
    // 检查人数限制
    if (activity.max_participants > 0) {
      const [[{ count }]] = await pool.execute(
        'SELECT COUNT(*) as count FROM activity_participants WHERE activity_id = ? AND status = 1',
        [activityId]
      );
      if (count >= activity.max_participants) {
        return res.json({ code: 400, message: '该活动报名人数已满' });
      }
    }
    await pool.execute(
      'INSERT INTO activity_participants (activity_id, student_id, status, applied_at) VALUES (?, ?, 0, NOW())',
      [activityId, studentId]
    );
    res.json({ code: 200, message: '报名成功，等待审核' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 同学列表
router.get('/classmates', async (req, res) => {
  const studentId = req.user.id;
  try {
    const [studentRows] = await pool.execute(
      'SELECT class_name, college_id, major_id FROM users WHERE id = ?',
      [studentId]
    );
    if (studentRows.length === 0) return res.json({ code: 400, message: '学生不存在' });
    const { class_name: className, college_id, major_id } = studentRows[0];

    // If no class, try to find classmates by college/major, otherwise show all students
    let rows = [];
    if (className) {
      const [classmates] = await pool.execute(
        `SELECT u.id, u.username, u.name, u.avatar, u.phone, u.email, u.signature,
                u.class_name, c.name AS college, m.name AS major
         FROM users u
         LEFT JOIN colleges c ON u.college_id = c.id
         LEFT JOIN majors m ON u.major_id = m.id
         WHERE u.class_name = ? AND u.role = 'student' AND u.id != ?`,
        [className, studentId]
      );
      rows = classmates;
    } else if (college_id) {
      const [classmates] = await pool.execute(
        `SELECT u.id, u.username, u.name, u.avatar, u.phone, u.email, u.signature,
                u.class_name, c.name AS college, m.name AS major
         FROM users u
         LEFT JOIN colleges c ON u.college_id = c.id
         LEFT JOIN majors m ON u.major_id = m.id
         WHERE u.college_id = ? AND u.role = 'student' AND u.id != ?`,
        [college_id, studentId]
      );
      rows = classmates;
    } else {
      // No class or college assigned, show all other students
      const [classmates] = await pool.execute(
        `SELECT u.id, u.username, u.name, u.avatar, u.phone, u.email, u.signature,
                u.class_name, c.name AS college, m.name AS major
         FROM users u
         LEFT JOIN colleges c ON u.college_id = c.id
         LEFT JOIN majors m ON u.major_id = m.id
         WHERE u.role = 'student' AND u.id != ?`,
        [studentId]
      );
      rows = classmates;
    }

    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 学院专业列表
router.get('/colleges', async (req, res) => {
  try {
    const [colleges] = await pool.execute('SELECT id, name, description FROM colleges ORDER BY id');
    const [majors] = await pool.execute('SELECT id, college_id, name, description FROM majors ORDER BY college_id, id');

    const result = colleges.map(c => ({
      ...c,
      majors: majors.filter(m => m.college_id === c.id)
    }));

    res.json({ code: 200, data: result });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

/* ==================== 每日背单词（每天3次机会） ==================== */

// 自动建表并修复错误约束（每天应允许多条记录）
(async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS word_bank (
        id INT AUTO_INCREMENT PRIMARY KEY,
        word VARCHAR(100) NOT NULL,
        meaning VARCHAR(255) NOT NULL,
        options JSON,
        UNIQUE KEY uk_word (word)
      )
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS word_study_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        study_date DATE NOT NULL,
        total_words INT DEFAULT 0,
        correct_count INT DEFAULT 0,
        accuracy DECIMAL(5,2) DEFAULT 0,
        score_added TINYINT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_student_date (student_id, study_date)
      )
    `);
    // 若存在旧版错误的唯一约束则删除（业务允许每天3次）
    const [indexes] = await pool.execute(`
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'word_study_records'
        AND INDEX_NAME = 'uk_student_date'
    `);
    if (indexes.length > 0) {
      await pool.execute('ALTER TABLE word_study_records DROP INDEX uk_student_date');
      console.log('[DB Fix] 已删除 word_study_records 的错误唯一约束 uk_student_date');
    }

    // 修复 activity_score_records：删除错误的唯一约束，并补 source_type 字段
    try {
      await pool.execute(`
        ALTER TABLE activity_score_records
        ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'activity' COMMENT 'activity=活动加分, system=系统加分'
      `);
    } catch (e) { /* 字段已存在则忽略 */ }

    const [scoreIndexes] = await pool.execute(`
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'activity_score_records'
        AND INDEX_NAME = 'uk_activity_student_score'
    `);
    if (scoreIndexes.length > 0) {
      await pool.execute('ALTER TABLE activity_score_records DROP INDEX uk_activity_student_score');
      console.log('[DB Fix] 已删除 activity_score_records 的错误唯一约束 uk_activity_student_score');
    }

    // 修复 leave_requests：补全晚归/不归相关字段
    try {
      await pool.execute(`
        ALTER TABLE leave_requests
        ADD COLUMN IF NOT EXISTS parent_consent_url VARCHAR(255) DEFAULT NULL COMMENT '家长知情书附件URL',
        ADD COLUMN IF NOT EXISTS late_time TIME DEFAULT NULL COMMENT '晚归预计时间'
      `);
    } catch (e) { /* 字段已存在则忽略 */ }
    try {
      await pool.execute(`
        ALTER TABLE leave_requests
        MODIFY COLUMN type ENUM('sick','personal','other','late_return','absence') DEFAULT 'personal'
      `);
    } catch (e) { /* 枚举已扩展或失败则忽略 */ }
  } catch (e) {
    console.error('[DB Fix] 单词表初始化失败:', e.message);
  }
})();

// 获取今日单词和已尝试记录
router.get('/daily-words', async (req, res) => {
  const studentId = req.user.id;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [records] = await pool.execute(
      'SELECT * FROM word_study_records WHERE student_id = ? AND study_date = ? ORDER BY created_at',
      [studentId, today]
    );
    const attemptCount = records.length;
    const bestRecord = records.length > 0 ? records.reduce((best, r) => r.accuracy > best.accuracy ? r : best, records[0]) : null;
    const hasScoreAdded = records.some(r => r.score_added === 1);
    const remaining = Math.max(0, 3 - attemptCount);
    if (remaining === 0) {
      return res.json({
        code: 200,
        data: {
          studied: true,
          attempts: records,
          bestRecord,
          hasScoreAdded,
          remaining: 0
        },
        message: '今日3次机会已用完'
      });
    }
    // 随机抽取50个单词
    const [rows] = await pool.execute(
      'SELECT id, word, meaning, options FROM word_bank ORDER BY RAND() LIMIT 50'
    );
    const words = rows.map(row => {
      let options = row.options;
      if (typeof options === 'string') {
        try { options = JSON.parse(options); } catch (e) { options = []; }
      }
      if (!Array.isArray(options)) options = [];
      const allOptions = [...options, row.word].sort(() => Math.random() - 0.5);
      return { id: row.id, word: row.word, meaning: row.meaning, options: allOptions };
    });
    res.json({
      code: 200,
      data: {
        studied: false,
        words,
        attempts: records,
        bestRecord,
        hasScoreAdded,
        remaining
      }
    });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 提交单词测试（最多3次，以最高正确率那次加分）
router.post('/daily-words/submit', async (req, res) => {
  const studentId = req.user.id;
  const { answers } = req.body;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [records] = await pool.execute(
      'SELECT * FROM word_study_records WHERE student_id = ? AND study_date = ?',
      [studentId, today]
    );
    if (records.length >= 3) {
      return res.json({ code: 400, message: '今日3次机会已用完' });
    }
    const wordIds = Object.keys(answers).map(Number);
    if (wordIds.length === 0) {
      return res.json({ code: 400, message: '请提交答案' });
    }
    const [words] = await pool.execute(
      `SELECT id, word FROM word_bank WHERE id IN (${wordIds.map(() => '?').join(',')})`,
      wordIds
    );
    let correctCount = 0;
    words.forEach(w => { if (answers[w.id] === w.word) correctCount++; });
    const totalWords = wordIds.length;
    const accuracy = +((correctCount / totalWords) * 100).toFixed(2);
    // 保存本次记录
    await pool.execute(
      'INSERT INTO word_study_records (student_id, study_date, total_words, correct_count, accuracy, score_added, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [studentId, today, totalWords, correctCount, accuracy, 0]
    );
    // 判断是否需要加分（本次是最高正确率且达标且今天还没加过分）
    let scoreAdded = false;
    const hasScoreAdded = records.some(r => r.score_added === 1);
    const prevBestAccuracy = records.length > 0 ? Math.max(...records.map(r => r.accuracy)) : 0;
    if (!hasScoreAdded && totalWords >= 50 && accuracy >= 80 && accuracy >= prevBestAccuracy) {
      const semester = '2024-2025-2';
      const [[cs]] = await pool.execute(
        'SELECT * FROM comprehensive_scores WHERE student_id = ? AND semester = ?',
        [studentId, semester]
      );
      if (!cs) {
        await pool.execute(
          `INSERT INTO comprehensive_scores (student_id, academic_score, moral_score, sports_score, arts_score, labor_score, total_score, semester)
           VALUES (?, 0, 0, 0, 0, 0, 0, ?)`,
          [studentId, semester]
        );
      }
      await pool.execute(
        `UPDATE comprehensive_scores
         SET academic_score = academic_score + 0.5,
             total_score = (academic_score * 0.60 + moral_score * 0.16 + sports_score * 0.08 + arts_score * 0.08 + labor_score * 0.08)
         WHERE student_id = ? AND semester = ?`,
        [studentId, semester]
      );
      // 标记本次记录已加分
      await pool.execute(
        'UPDATE word_study_records SET score_added = 1 WHERE student_id = ? AND study_date = ? ORDER BY created_at DESC LIMIT 1',
        [studentId, today]
      );
      // 同时写入加分明细，便于学生查看记录
      await pool.execute(
        `INSERT INTO activity_score_records
         (activity_id, student_id, score_type, score_value, semester, status, submitted_by, submitted_at, remark, source_type)
         VALUES (0, ?, 'academic', 0.5, ?, 1, ?, NOW(), '每日背单词完成加分', 'system')`,
        [studentId, semester, studentId]
      );
      scoreAdded = true;
    }
    res.json({
      code: 200,
      message: scoreAdded ? '恭喜！本次为最佳成绩，智育分+0.5' : '提交成功',
      data: { totalWords, correctCount, accuracy, scoreAdded, attempt: records.length + 1 }
    });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 查询今日学习记录
router.get('/daily-words/today', async (req, res) => {
  const studentId = req.user.id;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [records] = await pool.execute(
      'SELECT * FROM word_study_records WHERE student_id = ? AND study_date = ? ORDER BY created_at',
      [studentId, today]
    );
    res.json({ code: 200, data: records });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

/* ==================== 小游戏 ==================== */

// 记录游戏成绩
router.post('/games/play', async (req, res) => {
  const studentId = req.user.id;
  const { game_type, score, level, play_time } = req.body;
  try {
    if (!['minesweeper', 'sudoku', 'chess', 'gomoku', 'doudizhu', 'sokoban', 'idiom', 'snake'].includes(game_type)) {
      return res.json({ code: 400, message: '游戏类型错误' });
    }
    const today = new Date().toISOString().slice(0, 10);
    const [[{ count }]] = await pool.execute(
      'SELECT COUNT(*) as count FROM game_records WHERE student_id = ? AND game_type = ? AND play_date = ?',
      [studentId, game_type, today]
    );
    if (count >= 5) {
      return res.json({ code: 400, message: '今日该游戏5次机会已用完' });
    }
    await pool.execute(
      'INSERT INTO game_records (student_id, game_type, score, level, play_time, play_date, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [studentId, game_type, score || 0, level || 'easy', play_time || 0, today]
    );
    res.json({ code: 200, message: '成绩已记录', data: { remaining: 4 - count } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 查询今日游戏次数
router.get('/games/today', async (req, res) => {
  const studentId = req.user.id;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [rows] = await pool.execute(
      'SELECT game_type, COUNT(*) as count FROM game_records WHERE student_id = ? AND play_date = ? GROUP BY game_type',
      [studentId, today]
    );
    const result = { minesweeper: 0, sudoku: 0, chess: 0, gomoku: 0, doudizhu: 0, sokoban: 0, idiom: 0, snake: 0 };
    rows.forEach(r => { result[r.game_type] = r.count; });
    res.json({ code: 200, data: result });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 游戏排行榜（累计得分）
router.get('/games/leaderboard', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT g.student_id, u.name, u.avatar, SUM(g.score) as total_score,
        COUNT(*) as total_plays,
        RANK() OVER (ORDER BY SUM(g.score) DESC) as rank_num
       FROM game_records g
       JOIN users u ON g.student_id = u.id
       GROUP BY g.student_id
       ORDER BY total_score DESC
       LIMIT 50`
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 我的游戏排名和总分
router.get('/games/my-rank', async (req, res) => {
  const studentId = req.user.id;
  try {
    const [[total]] = await pool.execute(
      'SELECT SUM(score) as total_score, COUNT(*) as total_plays FROM game_records WHERE student_id = ?',
      [studentId]
    );
    const [[rankRow]] = await pool.execute(
      `SELECT rank_num FROM (
        SELECT student_id, RANK() OVER (ORDER BY SUM(score) DESC) as rank_num
        FROM game_records GROUP BY student_id
      ) r WHERE student_id = ?`,
      [studentId]
    );
    res.json({
      code: 200,
      data: {
        totalScore: total.total_score || 0,
        totalPlays: total.total_plays || 0,
        rank: rankRow ? rankRow.rank_num : null
      }
    });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;
