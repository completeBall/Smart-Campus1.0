const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.use(roleMiddleware(['admin']));

// 获取统计信息
router.get('/statistics', async (req, res) => {
  try {
    const [[{ count: studentCount }]] = await pool.execute("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
    const [[{ count: teacherCount }]] = await pool.execute("SELECT COUNT(*) as count FROM users WHERE role = 'teacher'");
    const [[{ count: taskCount }]] = await pool.execute('SELECT COUNT(*) as count FROM tasks');
    const [[{ count: feedbackCount }]] = await pool.execute('SELECT COUNT(*) as count FROM feedbacks WHERE status = 0');
    res.json({ code: 200, data: { studentCount, teacherCount, taskCount, feedbackCount } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 学院 + 专业(级联选择数据源)
router.get('/colleges-majors', async (req, res) => {
  try {
    const [colleges] = await pool.execute('SELECT id, name FROM colleges ORDER BY id');
    const [majors] = await pool.execute('SELECT id, college_id, name FROM majors ORDER BY id');
    const tree = colleges.map(c => ({
      value: c.id,
      label: c.name,
      children: majors
        .filter(m => m.college_id === c.id)
        .map(m => ({ value: m.id, label: m.name }))
    }));
    res.json({ code: 200, data: tree });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 用户管理
router.get('/users', async (req, res) => {
  const { keyword, role, page = 1, pageSize = 10 } = req.query;
  try {
    let where = ' WHERE 1=1';
    const params = [];
    if (keyword) {
      where += ' AND (u.username LIKE ? OR u.name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (role) {
      where += ' AND u.role = ?';
      params.push(role);
    }
    const offset = (+page - 1) * +pageSize;
    const dataSql = `SELECT u.id, u.username, u.name, u.role, u.avatar, u.class_name, u.phone, u.email, u.status, u.created_at,
                            u.college_id, u.major_id, c.name AS college_name, m.name AS major_name
                       FROM users u
                       LEFT JOIN colleges c ON u.college_id = c.id
                       LEFT JOIN majors  m ON u.major_id   = m.id
                      ${where}
                      ORDER BY u.created_at DESC
                      LIMIT ${+pageSize} OFFSET ${offset}`;
    const [rows] = await pool.query(dataSql, params);
    const [[{ count }]] = await pool.execute(`SELECT COUNT(*) as count FROM users u ${where}`, params);
    res.json({ code: 200, data: { list: rows, total: count } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/users', async (req, res) => {
  const { username, name, role, password = '123456', class_name, phone, email, college_id, major_id } = req.body;
  try {
    if (!username || !name || !role) {
      return res.json({ code: 400, message: '账号、姓名和角色不能为空' });
    }
    const [[existing]] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) return res.json({ code: 400, message: '用户名已存在' });
    const hash = await bcrypt.hash(password || '123456', 10);
    await pool.execute(
      `INSERT INTO users (username, password, name, role, class_name, phone, email, college_id, major_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
      [
        username,
        hash,
        name,
        role,
        class_name || null,
        phone || null,
        email || null,
        college_id || null,
        major_id || null
      ]
    );
    res.json({ code: 200, message: '创建成功,初始密码为 123456' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.put('/users/:id', async (req, res) => {
  const { name, class_name, phone, email, status, college_id, major_id } = req.body;
  try {
    await pool.execute(
      `UPDATE users
          SET name = ?, class_name = ?, phone = ?, email = ?, status = ?,
              college_id = ?, major_id = ?
        WHERE id = ?`,
      [
        name,
        class_name || null,
        phone || null,
        email || null,
        status,
        college_id || null,
        major_id || null,
        req.params.id
      ]
    );
    res.json({ code: 200, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 重置密码
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const hash = await bcrypt.hash('123456', 10);
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hash, req.params.id]);
    res.json({ code: 200, message: '密码已重置为123456' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 操作日志
router.get('/logs', async (req, res) => {
  const { keyword, page = 1, pageSize = 10 } = req.query;
  try {
    let sql = `SELECT l.*, u.name as user_name, u.role FROM operation_logs l LEFT JOIN users u ON l.user_id = u.id WHERE 1=1`;
    const params = [];
    if (keyword) {
      sql += ' AND (u.name LIKE ? OR l.action LIKE ? OR l.detail LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    const offset = (+page - 1) * +pageSize;
    const [rows] = await pool.query(`${sql} ORDER BY l.created_at DESC LIMIT ${+pageSize} OFFSET ${offset}`, params);
    const [[{ count }]] = await pool.execute(sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as count FROM'), params);
    res.json({ code: 200, data: { list: rows, total: count } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 反馈管理
router.get('/feedbacks', async (req, res) => {
  const { status, page = 1, pageSize = 10 } = req.query;
  try {
    let sql = 'SELECT f.*, u.name as user_name, u.role as user_role FROM feedbacks f LEFT JOIN users u ON f.user_id = u.id WHERE 1=1';
    const params = [];
    if (status !== undefined && status !== '') {
      sql += ' AND f.status = ?';
      params.push(+status);
    }
    const offset = (+page - 1) * +pageSize;
    const [rows] = await pool.query(`${sql} ORDER BY f.created_at DESC LIMIT ${+pageSize} OFFSET ${offset}`, params);
    const [[{ count }]] = await pool.execute(sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as count FROM'), params);
    res.json({ code: 200, data: { list: rows, total: count } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.put('/feedbacks/:id', async (req, res) => {
  const { reply, status } = req.body;
  try {
    await pool.execute('UPDATE feedbacks SET reply = ?, status = ?, reply_at = NOW() WHERE id = ?', [reply, status, req.params.id]);
    res.json({ code: 200, message: '回复成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 通知公告
router.get('/notices', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM notices ORDER BY created_at DESC');
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/notices', async (req, res) => {
  const { title, content, type = 'all' } = req.body;
  try {
    await pool.execute('INSERT INTO notices (title, content, type, created_at) VALUES (?, ?, ?, NOW())', [title, content, type]);
    res.json({ code: 200, message: '发布成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.delete('/notices/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM notices WHERE id = ?', [req.params.id]);
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;
