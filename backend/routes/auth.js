const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { SECRET_KEY } = require('../middleware/auth');

// 登录
router.post('/login', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ? AND role = ?',
      [username, role]
    );
    if (rows.length === 0) {
      return res.json({ code: 400, message: '用户不存在或角色错误' });
    }
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.json({ code: 400, message: '密码错误' });
    }
    // Get college and major names if available
    let collegeName = null
    let majorName = null
    if (user.college_id) {
      const [[collegeRow]] = await pool.execute('SELECT name FROM colleges WHERE id = ?', [user.college_id])
      if (collegeRow) collegeName = collegeRow.name
    }
    if (user.major_id) {
      const [[majorRow]] = await pool.execute('SELECT name FROM majors WHERE id = ?', [user.major_id])
      if (majorRow) majorName = majorRow.name
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      SECRET_KEY,
      { expiresIn: '24h' }
    );
    await pool.execute(
      'INSERT INTO operation_logs (user_id, action, detail, created_at) VALUES (?, ?, ?, NOW())',
      [user.id, '登录', `${user.name} 登录了系统`]
    );
    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          class_name: user.class_name,
          college: collegeName,
          major: majorName
        }
      }
    });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 修改密码
router.post('/change-password', async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) return res.json({ code: 400, message: '用户不存在' });
    const user = rows[0];
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) {
      return res.json({ code: 400, message: '原密码错误' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hash, userId]);
    res.json({ code: 200, message: '密码修改成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;
