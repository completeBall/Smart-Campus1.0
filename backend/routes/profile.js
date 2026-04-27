const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const { authMiddleware } = require('../middleware/auth')

router.use(authMiddleware)

// 获取当前用户信息
router.get('/', async (req, res) => {
  try {
    const [[user]] = await pool.execute(
      `SELECT u.id, u.username, u.name, u.role, u.avatar, u.class_name, u.phone, u.email, u.signature, u.status, u.created_at,
              u.college_id, u.major_id, u.background_image, u.featured_photos, c.name AS college, m.name AS major
       FROM users u
       LEFT JOIN colleges c ON u.college_id = c.id
       LEFT JOIN majors m ON u.major_id = m.id
       WHERE u.id = ?`,
      [req.user.id]
    )
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' })
    }
    res.json({ code: 200, data: user })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
})

// 更新用户信息（学生不允许自行修改班级/学院/专业）
router.put('/', async (req, res) => {
  const { name, phone, email, avatar, signature, background_image, featured_photos } = req.body
  try {
    await pool.execute(
      `UPDATE users
          SET name = ?, phone = ?, email = ?, avatar = ?, signature = ?, background_image = ?, featured_photos = ?
        WHERE id = ?`,
      [name, phone || null, email || null, avatar || null, signature || null, background_image || null, featured_photos ? JSON.stringify(featured_photos) : null, req.user.id]
    )
    const [[user]] = await pool.execute(
      `SELECT u.id, u.username, u.name, u.role, u.avatar, u.class_name, u.phone, u.email, u.signature, u.status, u.created_at,
              u.college_id, u.major_id, u.background_image, u.featured_photos, c.name AS college, m.name AS major
       FROM users u
       LEFT JOIN colleges c ON u.college_id = c.id
       LEFT JOIN majors m ON u.major_id = m.id
       WHERE u.id = ?`,
      [req.user.id]
    )
    res.json({ code: 200, message: '更新成功', data: user })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
})

module.exports = router
