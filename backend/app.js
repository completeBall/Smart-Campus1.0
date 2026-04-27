const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } })
// 论坛图片上传(最大5MB,只允许图片)
const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true)
    else cb(new Error('仅允许上传图片'))
  }
})
// 论坛附件上传(最大10MB,允许常见文档/压缩包)
const fileUpload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/student', require('./routes/student'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/social', require('./routes/social'));

// 上传文件静态服务
app.use('/uploads', express.static('uploads'));

// 头像/背景图/照片上传接口(单张,最大5MB)
const photoUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true)
    else cb(new Error('仅允许上传图片'))
  }
})
app.post('/api/upload/avatar', (req, res) => {
  photoUpload.single('avatar')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ code: 400, message: '图片大小不能超过5MB' })
      }
      return res.status(400).json({ code: 400, message: err.message })
    }
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '请上传文件' })
    }
    res.json({ code: 200, data: { url: `/uploads/${req.file.filename}` } })
  })
})

// 论坛图片上传(支持多张)
app.post('/api/upload/image', (req, res) => {
  imageUpload.array('images', 9)(req, res, (err) => {
    if (err) return res.status(400).json({ code: 400, message: err.message })
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ code: 400, message: '请上传图片' })
    }
    const urls = req.files.map(f => `/uploads/${f.filename}`)
    res.json({ code: 200, data: { urls } })
  })
})

// 论坛附件上传(单个,需要保留原文件名以便下载)
app.post('/api/upload/file', (req, res) => {
  fileUpload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ code: 400, message: err.message })
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '请上传文件' })
    }
    res.json({
      code: 200,
      data: {
        url: `/uploads/${req.file.filename}`,
        name: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
        size: req.file.size
      }
    })
  })
})

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: '服务运行中' });
});

// 启动时自动执行数据库迁移
const migrate = require('./database/migrate_colleges');
migrate().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`智慧校园后端服务已启动: http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('启动失败（数据库迁移出错）:', err.message);
  process.exit(1);
});
