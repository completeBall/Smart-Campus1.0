const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.use(roleMiddleware(['teacher']));

// 教师统计
router.get('/statistics', async (req, res) => {
  const teacherId = req.user.id;
  try {
    const [[{ count: taskCount }]] = await pool.execute('SELECT COUNT(*) as count FROM tasks WHERE teacher_id = ?', [teacherId]);
    const [[{ count: studentCount }]] = await pool.execute(
      'SELECT COUNT(DISTINCT s.student_id) as count FROM task_submissions s JOIN tasks t ON s.task_id = t.id WHERE t.teacher_id = ?',
      [teacherId]
    );
    const [[{ count: pendingCount }]] = await pool.execute(
      'SELECT COUNT(*) as count FROM task_submissions s JOIN tasks t ON s.task_id = t.id WHERE t.teacher_id = ? AND s.status = 0',
      [teacherId]
    );
    res.json({ code: 200, data: { taskCount, studentCount, pendingCount } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 班级列表
router.get('/classes', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT DISTINCT class_name FROM users WHERE role = "student" AND class_name IS NOT NULL');
    res.json({ code: 200, data: rows.map(r => r.class_name) });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 任务管理
router.get('/tasks', async (req, res) => {
  const teacherId = req.user.id;
  try {
    const [rows] = await pool.execute(
      'SELECT t.*, (SELECT COUNT(*) FROM task_submissions WHERE task_id = t.id) as submit_count FROM tasks t WHERE t.teacher_id = ? ORDER BY t.created_at DESC',
      [teacherId]
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/tasks', async (req, res) => {
  const { title, content, target_class, deadline } = req.body;
  const teacherId = req.user.id;
  try {
    await pool.execute(
      'INSERT INTO tasks (teacher_id, title, content, target_class, deadline, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [teacherId, title, content, target_class, deadline]
    );
    res.json({ code: 200, message: '发布成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 作业提交列表
router.get('/submissions', async (req, res) => {
  const { task_id, status } = req.query;
  const teacherId = req.user.id;
  try {
    let sql = `SELECT s.*, u.name as student_name, u.class_name, t.title as task_title
               FROM task_submissions s
               JOIN users u ON s.student_id = u.id
               JOIN tasks t ON s.task_id = t.id
               WHERE t.teacher_id = ?`;
    const params = [teacherId];
    if (task_id) {
      sql += ' AND s.task_id = ?';
      params.push(task_id);
    }
    if (status !== undefined && status !== '') {
      sql += ' AND s.status = ?';
      params.push(+status);
    }
    const [rows] = await pool.execute(sql + ' ORDER BY s.created_at DESC', params);
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 批改作业
router.put('/submissions/:id', async (req, res) => {
  const { score, comment, status } = req.body;
  try {
    await pool.execute(
      'UPDATE task_submissions SET score = ?, comment = ?, status = ?, reviewed_at = NOW() WHERE id = ?',
      [score, comment, status, req.params.id]
    );
    res.json({ code: 200, message: '批改成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 课程表
router.get('/schedule', async (req, res) => {
  const teacherId = req.user.id;
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM schedules WHERE teacher_id = ? ORDER BY day_of_week, start_time',
      [teacherId]
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/schedule', async (req, res) => {
  const { course_name, class_name, day_of_week, start_time, end_time, classroom } = req.body;
  const teacherId = req.user.id;
  try {
    await pool.execute(
      'INSERT INTO schedules (teacher_id, course_name, class_name, day_of_week, start_time, end_time, classroom) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [teacherId, course_name, class_name, day_of_week, start_time, end_time, classroom]
    );
    res.json({ code: 200, message: '添加成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.put('/schedule/:id', async (req, res) => {
  const { course_name, class_name, day_of_week, start_time, end_time, classroom, status, adjust_reason } = req.body;
  try {
    await pool.execute(
      'UPDATE schedules SET course_name = ?, class_name = ?, day_of_week = ?, start_time = ?, end_time = ?, classroom = ?, status = ?, adjust_reason = ? WHERE id = ?',
      [course_name, class_name, day_of_week, start_time, end_time, classroom, status || 'normal', adjust_reason || null, req.params.id]
    );
    res.json({ code: 200, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.delete('/schedule/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM schedules WHERE id = ?', [req.params.id]);
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 成绩管理
router.get('/grades', async (req, res) => {
  const { class_name, course_name } = req.query;
  const teacherId = req.user.id;
  try {
    let sql = `SELECT g.*, u.name as student_name, u.class_name FROM grades g JOIN users u ON g.student_id = u.id WHERE g.teacher_id = ?`;
    const params = [teacherId];
    if (class_name) {
      sql += ' AND u.class_name = ?';
      params.push(class_name);
    }
    if (course_name) {
      sql += ' AND g.course_name = ?';
      params.push(course_name);
    }
    const [rows] = await pool.execute(sql + ' ORDER BY g.created_at DESC', params);
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/grades', async (req, res) => {
  const { student_id, course_name, score, exam_type, remark } = req.body;
  const teacherId = req.user.id;
  try {
    await pool.execute(
      'INSERT INTO grades (teacher_id, student_id, course_name, score, exam_type, remark, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [teacherId, student_id, course_name, score, exam_type, remark]
    );
    res.json({ code: 200, message: '录入成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.put('/grades/:id', async (req, res) => {
  const { score, remark } = req.body;
  try {
    await pool.execute('UPDATE grades SET score = ?, remark = ? WHERE id = ?', [score, remark, req.params.id]);
    res.json({ code: 200, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

/* ==================== 审批管理 ==================== */

// 请假审批列表
router.get('/leave', async (req, res) => {
  const { status, class_name } = req.query;
  try {
    let sql = `SELECT l.*, u.name as student_name, u.class_name
               FROM leave_requests l
               JOIN users u ON l.student_id = u.id
               WHERE 1=1`;
    const params = [];
    if (status !== undefined && status !== '') {
      sql += ' AND l.status = ?';
      params.push(+status);
    }
    if (class_name) {
      sql += ' AND u.class_name = ?';
      params.push(class_name);
    }
    const [rows] = await pool.execute(sql + ' ORDER BY l.created_at DESC', params);
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 审批请假
router.put('/leave/:id', async (req, res) => {
  const teacherId = req.user.id;
  const { status, reply } = req.body;
  try {
    await pool.execute(
      'UPDATE leave_requests SET status = ?, teacher_id = ?, reply = ?, updated_at = NOW() WHERE id = ?',
      [status, teacherId, reply || null, req.params.id]
    );
    const msg = status === 1 ? '已通过' : (status === 2 ? '已拒绝' : '已更新');
    res.json({ code: 200, message: `请假申请${msg}` });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 活动审批列表
router.get('/activities', async (req, res) => {
  const { status } = req.query;
  try {
    let sql = `SELECT a.*, u.name as organizer_name,
      (SELECT COUNT(*) FROM activity_participants WHERE activity_id = a.id AND status = 1) as joined_count
      FROM activities a
      JOIN users u ON a.organizer_id = u.id
      WHERE 1=1`;
    const params = [];
    if (status !== undefined && status !== '') {
      sql += ' AND a.status = ?';
      params.push(+status);
    }
    const [rows] = await pool.execute(sql + ' ORDER BY a.created_at DESC', params);
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 审批活动（通过/拒绝）
router.put('/activities/:id', async (req, res) => {
  const { status } = req.body;
  try {
    await pool.execute(
      'UPDATE activities SET status = ? WHERE id = ?',
      [status, req.params.id]
    );
    const msg = status === 1 ? '已通过' : (status === 2 ? '已拒绝' : '已更新');
    res.json({ code: 200, message: `活动${msg}` });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 活动参与者审核列表
router.get('/activities/:id/participants', async (req, res) => {
  try {
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

// 审核活动参与者（仅决定是否允许参与，不再自动加分；加分需走加分名单流程）
router.put('/activities/:id/participants/:pid', async (req, res) => {
  const teacherId = req.user.id;
  const { status } = req.body;
  try {
    await pool.execute(
      'UPDATE activity_participants SET status = ?, approved_at = NOW(), approved_by = ? WHERE id = ?',
      [status, teacherId, req.params.pid]
    );
    const msg = status === 1 ? '已通过' : (status === 2 ? '已拒绝' : '已更新');
    res.json({ code: 200, message: `审核${msg}` });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

/* ==================== 加分名单审核 ==================== */

// 加分名单列表
router.get('/score-records', async (req, res) => {
  const { status, activity_id } = req.query;
  try {
    let sql = `SELECT r.*, a.title as activity_title, a.category as activity_category,
                      s.name as student_name, s.class_name,
                      o.name as submitter_name, t.name as reviewer_name
               FROM activity_score_records r
               LEFT JOIN activities a ON r.activity_id = a.id
               JOIN users s ON r.student_id = s.id
               LEFT JOIN users o ON r.submitted_by = o.id
               LEFT JOIN users t ON r.reviewed_by = t.id
               WHERE 1=1`;
    const params = [];
    if (status !== undefined && status !== '') {
      sql += ' AND r.status = ?';
      params.push(+status);
    }
    if (activity_id) {
      sql += ' AND r.activity_id = ?';
      params.push(+activity_id);
    }
    sql += ' ORDER BY r.submitted_at DESC';
    const [rows] = await pool.execute(sql, params);
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 审核加分申请（status=1 通过则加分到 comprehensive_scores）
router.put('/score-records/:id', async (req, res) => {
  const teacherId = req.user.id;
  const { status, remark } = req.body;
  if (![1, 2].includes(+status)) {
    return res.json({ code: 400, message: '无效的审核状态' });
  }
  try {
    const [[record]] = await pool.execute(
      'SELECT * FROM activity_score_records WHERE id = ?',
      [req.params.id]
    );
    if (!record) return res.json({ code: 404, message: '加分记录不存在' });
    if (record.status !== 0) return res.json({ code: 400, message: '该记录已审核，请勿重复操作' });

    await pool.execute(
      'UPDATE activity_score_records SET status = ?, reviewed_by = ?, reviewed_at = NOW(), remark = ? WHERE id = ?',
      [+status, teacherId, remark || null, req.params.id]
    );

    if (+status === 1 && record.score_value > 0) {
      const scoreFieldMap = {
        academic: 'academic_score',
        moral: 'moral_score',
        sports: 'sports_score',
        arts: 'arts_score',
        labor: 'labor_score'
      };
      const field = scoreFieldMap[record.score_type];
      if (field) {
        const [[existing]] = await pool.execute(
          'SELECT * FROM comprehensive_scores WHERE student_id = ? AND semester = ?',
          [record.student_id, record.semester]
        );
        if (!existing) {
          await pool.execute(
            `INSERT INTO comprehensive_scores (student_id, academic_score, moral_score, sports_score, arts_score, labor_score, total_score, semester)
             VALUES (?, 0, 0, 0, 0, 0, 0, ?)`,
            [record.student_id, record.semester]
          );
        }
        await pool.execute(
          `UPDATE comprehensive_scores
           SET ${field} = ${field} + ?,
               total_score = (academic_score * 0.60 + moral_score * 0.16 + sports_score * 0.08 + arts_score * 0.08 + labor_score * 0.08)
           WHERE student_id = ? AND semester = ?`,
          [record.score_value, record.student_id, record.semester]
        );
      }
    }
    const msg = +status === 1 ? '已通过并加分' : '已拒绝';
    res.json({ code: 200, message: msg });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 学生列表
router.get('/students', async (req, res) => {
  const { class_name, keyword, page = 1, pageSize = 20 } = req.query;
  try {
    let sql = 'SELECT id, username, name, class_name, phone, email, avatar, status, created_at FROM users WHERE role = "student"';
    const params = [];
    if (class_name) {
      sql += ' AND class_name = ?';
      params.push(class_name);
    }
    if (keyword) {
      sql += ' AND (username LIKE ? OR name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    const offset = (+page - 1) * +pageSize;
    const countSql = sql.replace('SELECT id, username, name, class_name, phone, email, avatar, status, created_at FROM users WHERE role = "student"', 'SELECT COUNT(*) as count FROM users WHERE role = "student"');
    const [rows] = await pool.query(`${sql} ORDER BY class_name, id DESC LIMIT ${+pageSize} OFFSET ${offset}`, params);
    const [[{ count }]] = await pool.execute(countSql, params);
    res.json({ code: 200, data: { list: rows, total: count } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// ========== 课堂签到 ==========

// 自动关闭过期 session 的辅助
async function closeExpiredSessions() {
  await pool.execute(
    'UPDATE attendance_sessions SET status = 2 WHERE status = 1 AND end_at <= NOW()'
  );
}

// 发起签到 POST /api/teacher/attendance-sessions
router.post('/attendance-sessions', async (req, res) => {
  const { schedule_id, course_name, class_name, date } = req.body;
  if (!course_name || !class_name) {
    return res.status(400).json({ code: 400, message: '课程名和班级不能为空' });
  }
  const today = date || new Date().toISOString().slice(0, 10);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // 查同班同学
    const [students] = await conn.execute(
      'SELECT id FROM users WHERE role = "student" AND status = 1 AND class_name = ?',
      [class_name]
    );
    if (students.length === 0) {
      await conn.rollback();
      return res.status(400).json({ code: 400, message: `班级 ${class_name} 没有学生` });
    }
    // 同班今天的同课程同时段是否已有进行中签到
    const [[existing]] = await conn.execute(
      `SELECT id FROM attendance_sessions
       WHERE class_name = ? AND course_name = ? AND date = ? AND status = 1 AND end_at > NOW()`,
      [class_name, course_name, today]
    );
    if (existing) {
      await conn.rollback();
      return res.status(400).json({ code: 400, message: '该课程此刻已有进行中的签到' });
    }
    // 创建 session
    const [result] = await conn.execute(
      `INSERT INTO attendance_sessions
        (teacher_id, schedule_id, course_name, class_name, date, start_at, late_at, end_at, status)
       VALUES (?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 3 MINUTE), DATE_ADD(NOW(), INTERVAL 5 MINUTE), 1)`,
      [req.user.id, schedule_id || null, course_name, class_name, today]
    );
    const sessionId = result.insertId;
    // 预写 attendance 行(默认 absent)
    for (const s of students) {
      await conn.execute(
        `INSERT INTO attendance (student_id, course_name, date, status, session_id, check_in_at)
         VALUES (?, ?, ?, 'absent', ?, NULL)`,
        [s.id, course_name, today, sessionId]
      );
    }
    await conn.commit();
    res.json({ code: 200, message: '签到已发起', data: { id: sessionId, expected: students.length } });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ code: 500, message: err.message });
  } finally {
    conn.release();
  }
});

// 教师查看自己的签到列表 GET /api/teacher/attendance-sessions?status=1|2
router.get('/attendance-sessions', async (req, res) => {
  try {
    await closeExpiredSessions();
    const params = [req.user.id];
    let where = 'WHERE teacher_id = ?';
    if (req.query.status) {
      where += ' AND status = ?';
      params.push(Number(req.query.status));
    }
    const [rows] = await pool.execute(
      `SELECT s.*,
        (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id) AS total,
        (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id AND a.status = 'present') AS present_count,
        (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id AND a.status = 'late') AS late_count,
        (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id AND a.status = 'absent') AS absent_count
       FROM attendance_sessions s
       ${where}
       ORDER BY s.id DESC
       LIMIT 100`,
      params
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 某次签到的学生记录 GET /api/teacher/attendance-sessions/:id/records
router.get('/attendance-sessions/:id/records', async (req, res) => {
  const sessionId = Number(req.params.id);
  try {
    await closeExpiredSessions();
    const [[s]] = await pool.execute(
      'SELECT * FROM attendance_sessions WHERE id = ? AND teacher_id = ?',
      [sessionId, req.user.id]
    );
    if (!s) return res.status(404).json({ code: 404, message: '签到不存在' });
    const [rows] = await pool.execute(
      `SELECT a.id, a.student_id, a.status, a.check_in_at, u.username, u.name, u.avatar
       FROM attendance a
       JOIN users u ON u.id = a.student_id
       WHERE a.session_id = ?
       ORDER BY FIELD(a.status,'present','late','absent'), u.id`,
      [sessionId]
    );
    res.json({ code: 200, data: { session: s, records: rows } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 提前关闭签到 PUT /api/teacher/attendance-sessions/:id/close
router.put('/attendance-sessions/:id/close', async (req, res) => {
  const sessionId = Number(req.params.id);
  try {
    const [result] = await pool.execute(
      'UPDATE attendance_sessions SET status = 2, end_at = NOW() WHERE id = ? AND teacher_id = ? AND status = 1',
      [sessionId, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(400).json({ code: 400, message: '会话不存在或已结束' });
    }
    res.json({ code: 200, message: '签到已关闭' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;
