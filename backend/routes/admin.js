const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const xlsx = require('xlsx');
const multer = require('multer');
const { PROVIDERS, callChatCompletion, getProviderDefaults, maskKey } = require('../services/aiClient');

router.use(authMiddleware);
router.use(roleMiddleware(['admin']));

const uploadExcel = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function normalizeYouthImages(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }
  return [];
}

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

// 青年共创：管理员地图热度
router.get('/youth-creation/regions', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT province_code, province_name, city_code, city_name,
              SUM(status = 'approved') AS post_count,
              SUM(status = 'pending') AS pending_count
       FROM youth_creation_posts
       GROUP BY province_code, province_name, city_code, city_name`
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 青年共创：管理员审核列表
router.get('/youth-creation/posts', async (req, res) => {
  const { status = 'pending', province_code, city_code, page = 1, pageSize = 20 } = req.query;
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (status && status !== 'all') {
      where += ' AND p.status = ?';
      params.push(String(status));
    }
    if (province_code) {
      where += ' AND p.province_code = ?';
      params.push(String(province_code));
    }
    if (city_code) {
      where += ' AND p.city_code = ?';
      params.push(String(city_code));
    }
    const safePageSize = Math.min(Math.max(Number(pageSize) || 20, 1), 50);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * safePageSize;
    const [rows] = await pool.query(
      `SELECT p.*,
              COALESCE(NULLIF(p.author_name, ''), u.name) AS author_name,
              u.name AS publisher_name,
              u.username AS publisher_username,
              u.class_name AS publisher_class,
              u.avatar,
              reviewer.name AS reviewer_name
       FROM youth_creation_posts p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN users reviewer ON reviewer.id = p.reviewed_by
       ${where}
       ORDER BY FIELD(p.status, 'pending', 'approved', 'rejected'), p.created_at DESC
       LIMIT ${safePageSize} OFFSET ${offset}`,
      params
    );
    const [[{ count }]] = await pool.execute(
      `SELECT COUNT(*) AS count FROM youth_creation_posts p ${where}`,
      params
    );
    rows.forEach((row) => {
      row.images = normalizeYouthImages(row.images);
    });
    res.json({ code: 200, data: { list: rows, total: count } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 青年共创：审核通过
router.put('/youth-creation/posts/:id/approve', async (req, res) => {
  try {
    const [result] = await pool.execute(
      `UPDATE youth_creation_posts
       SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), review_note = NULL
       WHERE id = ?`,
      [req.user.id, req.params.id]
    );
    if (!result.affectedRows) return res.json({ code: 404, message: '分享不存在' });
    res.json({ code: 200, message: '审核通过' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 青年共创：删除分享
router.delete('/youth-creation/posts/:id', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM youth_creation_posts WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.json({ code: 404, message: '分享不存在' });
    res.json({ code: 200, message: '删除成功' });
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

const DEFAULT_BG_IMAGE = '/uploads/defaults/default-bg.jpg';
const DEFAULT_FEATURED_PHOTOS = JSON.stringify([DEFAULT_BG_IMAGE]);

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
      `INSERT INTO users (username, password, name, role, class_name, phone, email, college_id, major_id, status, background_image, featured_photos, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NOW())`,
      [
        username,
        hash,
        name,
        role,
        class_name || null,
        phone || null,
        email || null,
        college_id || null,
        major_id || null,
        DEFAULT_BG_IMAGE,
        DEFAULT_FEATURED_PHOTOS
      ]
    );
    res.json({ code: 200, message: '创建成功,初始密码为 123456' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 下载用户导入模板（必须在 /users/:id 之前注册，避免被动态路由截获）
router.get('/users/template', async (req, res) => {
  try {
    const wb = xlsx.utils.book_new();
    const data = [
      ['账号', '姓名', '角色(admin/teacher/student)', '班级', '手机号', '邮箱', '学院ID', '专业ID'],
      ['zhangsan', '张三', 'student', '软件技术一班', '13800138000', 'zhangsan@example.com', 1, 1],
      ['', '', '', '', '', '', '', '']
    ];
    const ws = xlsx.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 15 }, { wch: 10 }, { wch: 28 }, { wch: 15 },
      { wch: 15 }, { wch: 22 }, { wch: 10 }, { wch: 10 }
    ];
    xlsx.utils.book_append_sheet(wb, ws, '用户导入模板');
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="用户导入模板.xlsx"');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 批量导入用户
router.post('/users/import', uploadExcel.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '请上传Excel文件' });
    }
    const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (rows.length < 2) {
      return res.json({ code: 400, message: 'Excel文件为空或缺少数据行' });
    }

    const headers = rows[0].map(h => String(h).trim());
    const headerMap = {
      '账号': 'username', '姓名': 'name', '角色': 'role',
      '班级': 'class_name', '手机号': 'phone', '邮箱': 'email',
      '学院ID': 'college_id', '专业ID': 'major_id'
    };
    const colIndex = {};
    headers.forEach((h, i) => {
      if (headerMap[h]) colIndex[headerMap[h]] = i;
    });

    if (colIndex.username === undefined || colIndex.name === undefined || colIndex.role === undefined) {
      return res.json({ code: 400, message: 'Excel缺少必填列：账号、姓名、角色' });
    }

    const success = [];
    const failed = [];

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const username = String(row[colIndex.username] || '').trim();
        const name = String(row[colIndex.name] || '').trim();
        const role = String(row[colIndex.role] || '').trim();

        if (!username && !name && !role) continue;
        if (!username || !name || !role) {
          failed.push({ row: i + 1, reason: '账号、姓名或角色为空' });
          continue;
        }
        if (!['admin', 'teacher', 'student'].includes(role)) {
          failed.push({ row: i + 1, reason: `角色"${role}"不合法，必须是admin/teacher/student之一` });
          continue;
        }
        const [[existing]] = await conn.execute('SELECT id FROM users WHERE username = ?', [username]);
        if (existing) {
          failed.push({ row: i + 1, reason: `账号"${username}"已存在` });
          continue;
        }
        const hash = await bcrypt.hash('123456', 10);
        const class_name = colIndex.class_name !== undefined ? (String(row[colIndex.class_name] || '').trim() || null) : null;
        const phone = colIndex.phone !== undefined ? (String(row[colIndex.phone] || '').trim() || null) : null;
        const email = colIndex.email !== undefined ? (String(row[colIndex.email] || '').trim() || null) : null;
        const college_id = colIndex.college_id !== undefined ? (parseInt(row[colIndex.college_id]) || null) : null;
        const major_id = colIndex.major_id !== undefined ? (parseInt(row[colIndex.major_id]) || null) : null;

        await conn.execute(
          `INSERT INTO users (username, password, name, role, class_name, phone, email, college_id, major_id, status, background_image, featured_photos, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NOW())`,
          [username, hash, name, role, class_name, phone, email, college_id, major_id, DEFAULT_BG_IMAGE, DEFAULT_FEATURED_PHOTOS]
        );
        success.push(username);
      }

      await conn.commit();
      res.json({
        code: 200,
        message: `导入完成，成功${success.length}条，失败${failed.length}条`,
        data: { successCount: success.length, failedCount: failed.length, failed }
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
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

const getAiSettingRow = async () => {
  const [[row]] = await pool.execute('SELECT * FROM ai_settings ORDER BY id LIMIT 1');
  return row;
};

const getAiUsageSummary = async () => {
  const [[summary]] = await pool.execute(`
    SELECT
      COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
      COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
      COALESCE(SUM(total_tokens), 0) AS total_tokens,
      COUNT(*) AS request_count,
      COALESCE(SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END), 0) AS success_count
    FROM ai_usage_logs
  `);
  const [recent] = await pool.execute(`
    SELECT l.*, u.name AS user_name, u.role AS user_role
    FROM ai_usage_logs l
    LEFT JOIN users u ON l.user_id = u.id
    ORDER BY l.created_at DESC
    LIMIT 20
  `);
  return { summary, recent };
};

const sanitizeAiSetting = (row) => {
  if (!row) {
    const defaults = getProviderDefaults('deepseek');
    return {
      provider: 'deepseek',
      provider_label: defaults.label,
      model: defaults.model,
      base_url: defaults.baseUrl,
      enabled: 0,
      has_key: false,
      api_key_masked: ''
    };
  }
  const defaults = getProviderDefaults(row.provider);
  return {
    id: row.id,
    provider: row.provider,
    provider_label: defaults.label,
    model: row.model || defaults.model,
    base_url: row.base_url || defaults.baseUrl,
    enabled: Number(row.enabled || 0),
    has_key: !!row.api_key,
    api_key_masked: maskKey(row.api_key),
    last_test_status: row.last_test_status,
    last_test_message: row.last_test_message,
    last_test_at: row.last_test_at,
    updated_at: row.updated_at
  };
};

const recordAiUsage = async ({ userId, provider, model, usage, purpose, success = 1, errorMessage = null }) => {
  await pool.execute(
    `INSERT INTO ai_usage_logs
     (user_id, provider, model, prompt_tokens, completion_tokens, total_tokens, purpose, success, error_message, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      userId || null,
      provider,
      model || null,
      usage?.prompt_tokens || 0,
      usage?.completion_tokens || 0,
      usage?.total_tokens || 0,
      purpose,
      success,
      errorMessage ? String(errorMessage).slice(0, 255) : null
    ]
  );
};

router.get('/ai-settings', async (req, res) => {
  try {
    const row = await getAiSettingRow();
    const usage = await getAiUsageSummary();
    res.json({
      code: 200,
      data: {
        setting: sanitizeAiSetting(row),
        providers: PROVIDERS,
        usage
      }
    });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.put('/ai-settings', async (req, res) => {
  const { provider, api_key, model, base_url, enabled } = req.body;
  try {
    if (!PROVIDERS[provider]) {
      return res.json({ code: 400, message: '不支持的 AI 服务商' });
    }
    const defaults = getProviderDefaults(provider);
    const row = await getAiSettingRow();
    const finalKey = api_key ? String(api_key).trim() : (row?.api_key || null);
    const finalModel = String(model || defaults.model).trim();
    const finalBaseUrl = String(base_url || defaults.baseUrl).trim();
    const finalEnabled = enabled ? 1 : 0;

    if (row) {
      await pool.execute(
        `UPDATE ai_settings
            SET provider = ?, api_key = ?, model = ?, base_url = ?, enabled = ?, updated_by = ?, updated_at = NOW()
          WHERE id = ?`,
        [provider, finalKey, finalModel, finalBaseUrl, finalEnabled, req.user.id, row.id]
      );
    } else {
      await pool.execute(
        `INSERT INTO ai_settings (provider, api_key, model, base_url, enabled, updated_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [provider, finalKey, finalModel, finalBaseUrl, finalEnabled, req.user.id]
      );
    }

    const saved = await getAiSettingRow();
    res.json({ code: 200, message: 'AI 配置已保存', data: sanitizeAiSetting(saved) });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

router.post('/ai-settings/test', async (req, res) => {
  try {
    const row = await getAiSettingRow();
    const provider = req.body.provider || row?.provider || 'deepseek';
    if (!PROVIDERS[provider]) {
      return res.json({ code: 400, message: '不支持的 AI 服务商' });
    }
    const defaults = getProviderDefaults(provider);
    const apiKey = req.body.api_key ? String(req.body.api_key).trim() : row?.api_key;
    const model = String(req.body.model || row?.model || defaults.model).trim();
    const baseUrl = String(req.body.base_url || row?.base_url || defaults.baseUrl).trim();

    const result = await callChatCompletion({
      provider,
      apiKey,
      model,
      baseUrl,
      temperature: 0.2,
      maxTokens: 64,
      messages: [
        { role: 'system', content: '你是智慧校园系统的 AI 连接测试助手。' },
        { role: 'user', content: '请用一句话回复：AI 连接测试成功。' }
      ]
    });

    await recordAiUsage({
      userId: req.user.id,
      provider,
      model: result.model,
      usage: result.usage,
      purpose: 'test',
      success: 1
    });
    if (row?.id) {
      await pool.execute(
        `UPDATE ai_settings
            SET enabled = 1, last_test_status = 'success', last_test_message = ?, last_test_at = NOW()
          WHERE id = ?`,
        [result.content.slice(0, 255), row.id]
      );
    }

    res.json({
      code: 200,
      message: 'AI 连接测试成功',
      data: {
        reply: result.content,
        provider,
        model: result.model,
        usage: result.usage
      }
    });
  } catch (err) {
    const row = await getAiSettingRow().catch(() => null);
    const provider = req.body.provider || row?.provider || 'deepseek';
    const model = req.body.model || row?.model || getProviderDefaults(provider).model;
    await recordAiUsage({
      userId: req.user.id,
      provider,
      model,
      usage: {},
      purpose: 'test',
      success: 0,
      errorMessage: err.message
    }).catch(() => {});
    if (row?.id) {
      await pool.execute(
        `UPDATE ai_settings
            SET last_test_status = 'failed', last_test_message = ?, last_test_at = NOW()
          WHERE id = ?`,
        [String(err.message).slice(0, 255), row.id]
      ).catch(() => {});
    }
    res.json({ code: 400, message: `AI 连接测试失败：${err.message}` });
  }
});

module.exports = router;
