const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const { authMiddleware } = require('../middleware/auth')

router.use(authMiddleware)

// 工具: 规范化好友 pair (a < b)
const pair = (x, y) => (x < y ? [x, y] : [y, x])

// ========== 用户搜索 ==========
// GET /api/social/search-users?keyword=xxx
router.get('/search-users', async (req, res) => {
  const keyword = (req.query.keyword || '').trim()
  if (!keyword) return res.json({ code: 200, data: [] })
  try {
    const like = `%${keyword}%`
    const [rows] = await pool.execute(
      `SELECT id, username, name, role, avatar, signature, class_name
       FROM users
       WHERE (username LIKE ? OR name LIKE ?) AND id <> ? AND status = 1
       ORDER BY id ASC
       LIMIT 20`,
      [like, like, req.user.id]
    )
    res.json({ code: 200, data: rows })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
})

// ========== 公开主页 ==========
// GET /api/social/users/:id/profile
router.get('/users/:id/profile', async (req, res) => {
  const targetId = Number(req.params.id)
  const myId = req.user.id
  try {
    const [[user]] = await pool.execute(
      `SELECT u.id, u.username, u.name, u.role, u.avatar, u.class_name, u.signature, u.background_image, u.featured_photos, u.created_at,
              c.name AS college, m.name AS major
       FROM users u
       LEFT JOIN colleges c ON u.college_id = c.id
       LEFT JOIN majors m ON u.major_id = m.id
       WHERE u.id = ? AND u.status = 1`,
      [targetId]
    )
    if (!user) return res.status(404).json({ code: 404, message: '用户不存在' })

    // 综测分(仅学生有)
    let score = null
    if (user.role === 'student') {
      const [[s]] = await pool.execute(
        `SELECT academic_score, moral_score, sports_score, arts_score, labor_score, total_score, semester, is_excellent
         FROM comprehensive_scores
         WHERE student_id = ?
         ORDER BY semester DESC LIMIT 1`,
        [targetId]
      )
      score = s || null
    }

    // 24小时状态(公开,好友可见)
    const [[st]] = await pool.execute(
      `SELECT emoji, text, expires_at, created_at
       FROM user_statuses
       WHERE user_id = ? AND expires_at > NOW()`,
      [targetId]
    )
    const status = st || null

    // 与当前用户的关系
    let relation = 'self'
    if (targetId !== myId) {
      const [a, b] = pair(myId, targetId)
      const [[fr]] = await pool.execute(
        'SELECT id FROM friendships WHERE user_a_id = ? AND user_b_id = ?',
        [a, b]
      )
      if (fr) {
        relation = 'friends'
      } else {
        // 是否有未处理的申请
        const [[outReq]] = await pool.execute(
          'SELECT id FROM friend_requests WHERE from_user_id = ? AND to_user_id = ? AND status = 0',
          [myId, targetId]
        )
        if (outReq) {
          relation = 'pending_out'
        } else {
          const [[inReq]] = await pool.execute(
            'SELECT id FROM friend_requests WHERE from_user_id = ? AND to_user_id = ? AND status = 0',
            [targetId, myId]
          )
          relation = inReq ? 'pending_in' : 'none'
        }
      }
    }

    res.json({ code: 200, data: { user, score, status, relation } })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
})

// ========== 24小时状态 ==========
// GET /api/social/me/status
router.get('/me/status', async (req, res) => {
  try {
    const [[st]] = await pool.execute(
      `SELECT emoji, text, expires_at, created_at
       FROM user_statuses
       WHERE user_id = ? AND expires_at > NOW()`,
      [req.user.id]
    )
    res.json({ code: 200, data: st || null })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
})

// POST /api/social/me/status {emoji, text}
router.post('/me/status', async (req, res) => {
  const emoji = (req.body.emoji || '').trim()
  const text = (req.body.text || '').trim().slice(0, 100)
  if (!emoji) return res.status(400).json({ code: 400, message: '请选择心情' })
  try {
    await pool.execute(
      `INSERT INTO user_statuses (user_id, emoji, text, expires_at, created_at)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR), NOW())
       ON DUPLICATE KEY UPDATE emoji = VALUES(emoji), text = VALUES(text),
         expires_at = VALUES(expires_at), created_at = VALUES(created_at)`,
      [req.user.id, emoji, text || null]
    )
    const [[st]] = await pool.execute(
      `SELECT emoji, text, expires_at, created_at FROM user_statuses WHERE user_id = ?`,
      [req.user.id]
    )
    res.json({ code: 200, message: '状态已发布', data: st })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
})

// DELETE /api/social/me/status
router.delete('/me/status', async (req, res) => {
  try {
    await pool.execute('DELETE FROM user_statuses WHERE user_id = ?', [req.user.id])
    res.json({ code: 200, message: '已清除' })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
})

// ========== 好友申请 ==========
// 发送好友申请 POST /api/social/friend-requests {to_user_id}
router.post('/friend-requests', async (req, res) => {
  const fromId = req.user.id
  const toId = Number(req.body.to_user_id)
  if (!toId || toId === fromId) {
    return res.status(400).json({ code: 400, message: '参数错误' })
  }
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    // 检查目标存在
    const [[u]] = await conn.execute('SELECT id FROM users WHERE id = ? AND status = 1', [toId])
    if (!u) {
      await conn.rollback()
      return res.status(404).json({ code: 404, message: '用户不存在' })
    }
    // 已是好友
    const [a, b] = pair(fromId, toId)
    const [[fr]] = await conn.execute(
      'SELECT id FROM friendships WHERE user_a_id = ? AND user_b_id = ?',
      [a, b]
    )
    if (fr) {
      await conn.rollback()
      return res.status(400).json({ code: 400, message: '你们已经是好友了' })
    }
    // 反向已存在 pending → 自动同意
    const [[reverse]] = await conn.execute(
      'SELECT id FROM friend_requests WHERE from_user_id = ? AND to_user_id = ? AND status = 0',
      [toId, fromId]
    )
    if (reverse) {
      await conn.execute(
        'UPDATE friend_requests SET status = 1, responded_at = NOW() WHERE id = ?',
        [reverse.id]
      )
      await conn.execute(
        'INSERT IGNORE INTO friendships (user_a_id, user_b_id) VALUES (?, ?)',
        [a, b]
      )
      await conn.commit()
      return res.json({ code: 200, message: '已自动添加为好友', data: { auto_accepted: true } })
    }
    // 已存在自己发出的 pending
    const [[outReq]] = await conn.execute(
      'SELECT id, status FROM friend_requests WHERE from_user_id = ? AND to_user_id = ?',
      [fromId, toId]
    )
    if (outReq) {
      if (outReq.status === 0) {
        await conn.rollback()
        return res.status(400).json({ code: 400, message: '已发送过申请,等待对方处理' })
      }
      // 之前被拒绝/同意,重置为新的 pending
      await conn.execute(
        'UPDATE friend_requests SET status = 0, created_at = NOW(), responded_at = NULL WHERE id = ?',
        [outReq.id]
      )
    } else {
      await conn.execute(
        'INSERT INTO friend_requests (from_user_id, to_user_id) VALUES (?, ?)',
        [fromId, toId]
      )
    }
    await conn.commit()
    res.json({ code: 200, message: '申请已发送' })
  } catch (err) {
    await conn.rollback()
    res.status(500).json({ code: 500, message: err.message })
  } finally {
    conn.release()
  }
})

// 收到的好友申请 GET /api/social/friend-requests
router.get('/friend-requests', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT fr.id, fr.status, fr.created_at,
              u.id AS from_user_id, u.username, u.name, u.avatar, u.role, u.signature, u.class_name
       FROM friend_requests fr
       JOIN users u ON fr.from_user_id = u.id
       WHERE fr.to_user_id = ? AND fr.status = 0
       ORDER BY fr.created_at DESC`,
      [req.user.id]
    )
    res.json({ code: 200, data: rows })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
})

// 处理好友申请 PUT /api/social/friend-requests/:id {status: 1|2}
router.put('/friend-requests/:id', async (req, res) => {
  const reqId = Number(req.params.id)
  const status = Number(req.body.status)
  if (![1, 2].includes(status)) {
    return res.status(400).json({ code: 400, message: '参数错误' })
  }
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[fr]] = await conn.execute(
      'SELECT * FROM friend_requests WHERE id = ? AND to_user_id = ?',
      [reqId, req.user.id]
    )
    if (!fr) {
      await conn.rollback()
      return res.status(404).json({ code: 404, message: '申请不存在' })
    }
    if (fr.status !== 0) {
      await conn.rollback()
      return res.status(400).json({ code: 400, message: '该申请已处理' })
    }
    await conn.execute(
      'UPDATE friend_requests SET status = ?, responded_at = NOW() WHERE id = ?',
      [status, reqId]
    )
    if (status === 1) {
      const [a, b] = pair(fr.from_user_id, fr.to_user_id)
      await conn.execute(
        'INSERT IGNORE INTO friendships (user_a_id, user_b_id) VALUES (?, ?)',
        [a, b]
      )
    }
    await conn.commit()
    res.json({ code: 200, message: status === 1 ? '已同意' : '已拒绝' })
  } catch (err) {
    await conn.rollback()
    res.status(500).json({ code: 500, message: err.message })
  } finally {
    conn.release()
  }
})

// ========== 好友列表 ==========
// GET /api/social/friends
router.get('/friends', async (req, res) => {
  const myId = req.user.id
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.username, u.name, u.role, u.avatar, u.signature, u.class_name,
        (SELECT content FROM messages
         WHERE target_type='user' AND
           ((sender_id = ? AND target_id = u.id) OR (sender_id = u.id AND target_id = ?))
         ORDER BY id DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM messages
         WHERE target_type='user' AND
           ((sender_id = ? AND target_id = u.id) OR (sender_id = u.id AND target_id = ?))
         ORDER BY id DESC LIMIT 1) AS last_message_at
       FROM friendships f
       JOIN users u ON u.id = IF(f.user_a_id = ?, f.user_b_id, f.user_a_id)
       WHERE f.user_a_id = ? OR f.user_b_id = ?
       ORDER BY last_message_at DESC, f.created_at DESC`,
      [myId, myId, myId, myId, myId, myId, myId]
    )
    res.json({ code: 200, data: rows })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
})

// 删除好友 DELETE /api/social/friendships/:friend_id
router.delete('/friendships/:friend_id', async (req, res) => {
  const friendId = Number(req.params.friend_id)
  const myId = req.user.id
  try {
    const [a, b] = pair(myId, friendId)
    const [result] = await pool.execute(
      'DELETE FROM friendships WHERE user_a_id = ? AND user_b_id = ?',
      [a, b]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: '不是好友关系' })
    }
    // 同时清理双向 friend_requests
    await pool.execute(
      `DELETE FROM friend_requests
       WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)`,
      [myId, friendId, friendId, myId]
    )
    res.json({ code: 200, message: '已删除好友' })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
})

// ========== 聊天记录 ==========
const isFriend = async (a, b) => {
  const [x, y] = pair(a, b)
  const [[r]] = await pool.execute(
    'SELECT id FROM friendships WHERE user_a_id = ? AND user_b_id = ?',
    [x, y]
  )
  return !!r
}

const isGroupMember = async (groupId, userId) => {
  const [[r]] = await pool.execute(
    'SELECT id FROM chat_group_members WHERE group_id = ? AND user_id = ?',
    [groupId, userId]
  )
  return !!r
}

// 私聊记录 GET /api/social/chats/user/:peer_id?after_id=
router.get('/chats/user/:peer_id', async (req, res) => {
  const peerId = Number(req.params.peer_id)
  const myId = req.user.id
  const afterId = Number(req.query.after_id || 0)
  try {
    if (!(await isFriend(myId, peerId))) {
      return res.status(403).json({ code: 403, message: '不是好友关系' })
    }
    // 双向 (我发给对方 / 对方发给我),limit 50
    const [rows] = await pool.execute(
      `SELECT m.id, m.sender_id, m.target_type, m.target_id, m.content, m.created_at,
              u.name AS sender_name, u.avatar AS sender_avatar
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.target_type = 'user'
         AND ((m.sender_id = ? AND m.target_id = ?) OR (m.sender_id = ? AND m.target_id = ?))
         AND m.id > ?
       ORDER BY m.id ASC
       LIMIT 200`,
      [myId, peerId, peerId, myId, afterId]
    )
    res.json({ code: 200, data: rows })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
})

// 群聊记录 GET /api/social/chats/group/:group_id?after_id=
router.get('/chats/group/:group_id', async (req, res) => {
  const groupId = Number(req.params.group_id)
  const myId = req.user.id
  const afterId = Number(req.query.after_id || 0)
  try {
    if (!(await isGroupMember(groupId, myId))) {
      return res.status(403).json({ code: 403, message: '不是该群成员' })
    }
    const [rows] = await pool.execute(
      `SELECT m.id, m.sender_id, m.target_type, m.target_id, m.content, m.created_at,
              u.name AS sender_name, u.avatar AS sender_avatar
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.target_type = 'group' AND m.target_id = ? AND m.id > ?
       ORDER BY m.id ASC
       LIMIT 200`,
      [groupId, afterId]
    )
    res.json({ code: 200, data: rows })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
})

// 发消息 POST /api/social/messages {target_type, target_id, content}
router.post('/messages', async (req, res) => {
  const { target_type, target_id, content } = req.body
  const myId = req.user.id
  if (!['user', 'group'].includes(target_type) || !target_id || !content || !content.trim()) {
    return res.status(400).json({ code: 400, message: '参数错误' })
  }
  const text = content.trim()
  if (text.length > 2000) {
    return res.status(400).json({ code: 400, message: '消息过长(最多2000字)' })
  }
  try {
    if (target_type === 'user') {
      if (!(await isFriend(myId, target_id))) {
        return res.status(403).json({ code: 403, message: '不是好友关系' })
      }
    } else {
      if (!(await isGroupMember(target_id, myId))) {
        return res.status(403).json({ code: 403, message: '不是该群成员' })
      }
    }
    const [result] = await pool.execute(
      'INSERT INTO messages (sender_id, target_type, target_id, content) VALUES (?, ?, ?, ?)',
      [myId, target_type, target_id, text]
    )
    const [[msg]] = await pool.execute(
      `SELECT m.id, m.sender_id, m.target_type, m.target_id, m.content, m.created_at,
              u.name AS sender_name, u.avatar AS sender_avatar
       FROM messages m JOIN users u ON u.id = m.sender_id
       WHERE m.id = ?`,
      [result.insertId]
    )
    res.json({ code: 200, message: '发送成功', data: msg })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
})

// ========== 群聊 ==========
// 创建群聊 POST /api/social/groups {name, member_ids: []}
router.post('/groups', async (req, res) => {
  const { name, member_ids } = req.body
  const myId = req.user.id
  if (!name || !name.trim() || !Array.isArray(member_ids)) {
    return res.status(400).json({ code: 400, message: '参数错误' })
  }
  // 至少有1个其他成员
  const otherIds = [...new Set(member_ids.map(Number).filter(id => id && id !== myId))]
  if (otherIds.length === 0) {
    return res.status(400).json({ code: 400, message: '至少邀请1个好友' })
  }
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    // 校验全部是好友
    for (const uid of otherIds) {
      const [a, b] = pair(myId, uid)
      const [[f]] = await conn.execute(
        'SELECT id FROM friendships WHERE user_a_id = ? AND user_b_id = ?',
        [a, b]
      )
      if (!f) {
        await conn.rollback()
        return res.status(400).json({ code: 400, message: `用户 ${uid} 不是你的好友` })
      }
    }
    const [result] = await conn.execute(
      'INSERT INTO chat_groups (name, owner_id) VALUES (?, ?)',
      [name.trim(), myId]
    )
    const groupId = result.insertId
    // 加入成员(包括自己)
    const allMembers = [myId, ...otherIds]
    for (const uid of allMembers) {
      await conn.execute(
        'INSERT IGNORE INTO chat_group_members (group_id, user_id) VALUES (?, ?)',
        [groupId, uid]
      )
    }
    await conn.commit()
    res.json({ code: 200, message: '创建成功', data: { id: groupId, name: name.trim() } })
  } catch (err) {
    await conn.rollback()
    res.status(500).json({ code: 500, message: err.message })
  } finally {
    conn.release()
  }
})

// 我的群聊 GET /api/social/groups
router.get('/groups', async (req, res) => {
  const myId = req.user.id
  try {
    const [rows] = await pool.execute(
      `SELECT g.id, g.name, g.avatar, g.owner_id, g.created_at,
        (SELECT COUNT(*) FROM chat_group_members m WHERE m.group_id = g.id) AS member_count,
        (SELECT m.content FROM messages m WHERE m.target_type='group' AND m.target_id = g.id
         ORDER BY m.id DESC LIMIT 1) AS last_message,
        (SELECT m.created_at FROM messages m WHERE m.target_type='group' AND m.target_id = g.id
         ORDER BY m.id DESC LIMIT 1) AS last_message_at
       FROM chat_groups g
       JOIN chat_group_members cm ON cm.group_id = g.id
       WHERE cm.user_id = ?
       ORDER BY last_message_at DESC, g.created_at DESC`,
      [myId]
    )
    res.json({ code: 200, data: rows })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
})

// 群详情 GET /api/social/groups/:id
router.get('/groups/:id', async (req, res) => {
  const groupId = Number(req.params.id)
  const myId = req.user.id
  try {
    if (!(await isGroupMember(groupId, myId))) {
      return res.status(403).json({ code: 403, message: '不是该群成员' })
    }
    const [[group]] = await pool.execute(
      'SELECT id, name, avatar, owner_id, created_at FROM chat_groups WHERE id = ?',
      [groupId]
    )
    if (!group) return res.status(404).json({ code: 404, message: '群聊不存在' })
    const [members] = await pool.execute(
      `SELECT u.id, u.username, u.name, u.role, u.avatar, cm.joined_at
       FROM chat_group_members cm JOIN users u ON u.id = cm.user_id
       WHERE cm.group_id = ?
       ORDER BY cm.joined_at ASC`,
      [groupId]
    )
    res.json({ code: 200, data: { ...group, members } })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
})

// 邀请新成员 POST /api/social/groups/:id/members {user_ids: []}
router.post('/groups/:id/members', async (req, res) => {
  const groupId = Number(req.params.id)
  const myId = req.user.id
  const userIds = Array.isArray(req.body.user_ids) ? req.body.user_ids.map(Number).filter(Boolean) : []
  if (userIds.length === 0) {
    return res.status(400).json({ code: 400, message: '请选择要邀请的好友' })
  }
  try {
    const [[g]] = await pool.execute('SELECT owner_id FROM chat_groups WHERE id = ?', [groupId])
    if (!g) return res.status(404).json({ code: 404, message: '群聊不存在' })
    if (g.owner_id !== myId) {
      return res.status(403).json({ code: 403, message: '只有群主可以邀请成员' })
    }
    let added = 0
    for (const uid of userIds) {
      if (uid === myId) continue
      const [a, b] = pair(myId, uid)
      const [[f]] = await pool.execute(
        'SELECT id FROM friendships WHERE user_a_id = ? AND user_b_id = ?',
        [a, b]
      )
      if (!f) continue
      const [r] = await pool.execute(
        'INSERT IGNORE INTO chat_group_members (group_id, user_id) VALUES (?, ?)',
        [groupId, uid]
      )
      if (r.affectedRows > 0) added++
    }
    res.json({ code: 200, message: `已邀请 ${added} 位成员`, data: { added } })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
})

// 移除成员 / 退群 DELETE /api/social/groups/:id/members/:uid
router.delete('/groups/:id/members/:uid', async (req, res) => {
  const groupId = Number(req.params.id)
  const targetUid = Number(req.params.uid)
  const myId = req.user.id
  try {
    const [[g]] = await pool.execute('SELECT owner_id FROM chat_groups WHERE id = ?', [groupId])
    if (!g) return res.status(404).json({ code: 404, message: '群聊不存在' })
    // 群主可以踢任何人(不包括自己,自己退群=解散),自己可以退群
    if (targetUid !== myId && g.owner_id !== myId) {
      return res.status(403).json({ code: 403, message: '只有群主可以移除成员' })
    }
    if (targetUid === g.owner_id) {
      // 群主退出 = 解散
      await pool.execute('DELETE FROM chat_groups WHERE id = ?', [groupId])
      return res.json({ code: 200, message: '群聊已解散' })
    }
    await pool.execute(
      'DELETE FROM chat_group_members WHERE group_id = ? AND user_id = ?',
      [groupId, targetUid]
    )
    res.json({ code: 200, message: targetUid === myId ? '已退出群聊' : '已移除成员' })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
})

// ========== 未读消息 / 已读标记 ==========
// 未读汇总 GET /api/social/unread-summary
// 返回 {total, peers: [{type:'user',id,unread}, {type:'group',id,unread}]}
router.get('/unread-summary', async (req, res) => {
  const myId = req.user.id
  try {
    // 私聊未读: 对方发给我的消息中,id > 我对该会话的 last_msg_id
    const [userPeers] = await pool.execute(
      `SELECT m.sender_id AS peer_id, COUNT(*) AS unread
       FROM messages m
       LEFT JOIN chat_reads r ON r.user_id = ? AND r.target_type = 'user' AND r.target_id = m.sender_id
       WHERE m.target_type = 'user' AND m.target_id = ? AND m.sender_id <> ?
         AND m.id > IFNULL(r.last_msg_id, 0)
       GROUP BY m.sender_id`,
      [myId, myId, myId]
    )
    // 群聊未读: 我所在群中, 别人发的消息 id > 我对该群的 last_msg_id
    const [groupPeers] = await pool.execute(
      `SELECT m.target_id AS peer_id, COUNT(*) AS unread
       FROM messages m
       JOIN chat_group_members cm ON cm.group_id = m.target_id AND cm.user_id = ?
       LEFT JOIN chat_reads r ON r.user_id = ? AND r.target_type = 'group' AND r.target_id = m.target_id
       WHERE m.target_type = 'group' AND m.sender_id <> ?
         AND m.id > IFNULL(r.last_msg_id, 0)
       GROUP BY m.target_id`,
      [myId, myId, myId]
    )
    const peers = [
      ...userPeers.map(r => ({ type: 'user', id: r.peer_id, unread: Number(r.unread) })),
      ...groupPeers.map(r => ({ type: 'group', id: r.peer_id, unread: Number(r.unread) }))
    ]
    const total = peers.reduce((s, p) => s + p.unread, 0)
    res.json({ code: 200, data: { total, peers } })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
})

// 标记已读 POST /api/social/chat-reads {target_type, target_id, last_msg_id}
router.post('/chat-reads', async (req, res) => {
  const { target_type, target_id, last_msg_id } = req.body
  if (!['user', 'group'].includes(target_type) || !target_id) {
    return res.status(400).json({ code: 400, message: '参数错误' })
  }
  try {
    await pool.execute(
      `INSERT INTO chat_reads (user_id, target_type, target_id, last_msg_id)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE last_msg_id = GREATEST(last_msg_id, VALUES(last_msg_id))`,
      [req.user.id, target_type, Number(target_id), Number(last_msg_id) || 0]
    )
    res.json({ code: 200, message: 'ok' })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message })
  }
})

module.exports = router
