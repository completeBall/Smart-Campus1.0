const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'smart_campus'
  });

  console.log('Starting migration...');

  // 1. Create colleges table
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS colleges (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL COMMENT '学院名称',
      description TEXT COMMENT '学院简介',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('Created colleges table');

  // 2. Create majors table
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS majors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      college_id INT NOT NULL COMMENT '所属学院ID',
      name VARCHAR(100) NOT NULL COMMENT '专业名称',
      description TEXT COMMENT '专业简介',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('Created majors table');

  // 2.5 清理历史重复数据(早期版本未加 UNIQUE 约束,可能产生重复行)
  // 这些操作幂等:当库中无重复时执行 0 行,有重复时合并到最小 id
  // 第一步:把 users 中指向重复 major 的引用统一指向同 (college_id, name) 组里 id 最小的那个
  const [fixUsers] = await conn.execute(`
    UPDATE users u
    JOIN majors m_old ON u.major_id = m_old.id
    JOIN (
      SELECT MIN(id) AS keep_id, college_id, name
      FROM majors
      GROUP BY college_id, name
    ) m_new
      ON m_new.college_id = m_old.college_id
     AND m_new.name = m_old.name
    SET u.major_id = m_new.keep_id
    WHERE u.major_id <> m_new.keep_id
  `);
  if (fixUsers.affectedRows > 0) {
    console.log(`Repointed ${fixUsers.affectedRows} user rows to canonical major_id`);
  }

  // 第二步:删除 majors 表中除每组最小 id 之外的所有重复行
  const [delMajors] = await conn.execute(`
    DELETE m FROM majors m
    INNER JOIN (
      SELECT MIN(id) AS keep_id, college_id, name
      FROM majors
      GROUP BY college_id, name
    ) keepers
      ON keepers.college_id = m.college_id
     AND keepers.name = m.name
    WHERE m.id <> keepers.keep_id
  `);
  if (delMajors.affectedRows > 0) {
    console.log(`Removed ${delMajors.affectedRows} duplicate major rows`);
  }

  // 第三步:删除 colleges 表中无 users 引用且无 majors 引用的重复学院
  // (按 name 分组,只保留每组最小 id)
  const [delColleges] = await conn.execute(`
    DELETE c FROM colleges c
    INNER JOIN (
      SELECT MIN(id) AS keep_id, name
      FROM colleges
      GROUP BY name
    ) keepers ON keepers.name = c.name
    WHERE c.id <> keepers.keep_id
      AND NOT EXISTS (SELECT 1 FROM users u WHERE u.college_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM majors m WHERE m.college_id = c.id)
  `);
  if (delColleges.affectedRows > 0) {
    console.log(`Removed ${delColleges.affectedRows} duplicate college rows`);
  }

  // 2.6 为 colleges 和 majors 添加 UNIQUE 约束,防止后续重复
  try {
    await conn.execute(`ALTER TABLE colleges ADD UNIQUE KEY uk_college_name (name)`);
    console.log('Added UNIQUE constraint on colleges.name');
  } catch (e) {
    if (e.code !== 'ER_DUP_KEYNAME') throw e;
  }
  try {
    await conn.execute(`ALTER TABLE majors ADD UNIQUE KEY uk_major_college_name (college_id, name)`);
    console.log('Added UNIQUE constraint on majors(college_id, name)');
  } catch (e) {
    if (e.code !== 'ER_DUP_KEYNAME') throw e;
  }

  // 3. Add college_id and major_id to users table
  try {
    await conn.execute(`ALTER TABLE users ADD COLUMN college_id INT DEFAULT NULL COMMENT '学院ID'`);
    console.log('Added college_id to users');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    console.log('college_id already exists');
  }

  try {
    await conn.execute(`ALTER TABLE users ADD COLUMN major_id INT DEFAULT NULL COMMENT '专业ID'`);
    console.log('Added major_id to users');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    console.log('major_id already exists');
  }

  // 4. Seed colleges data
  const collegesData = [
    { name: '人工智能学院', description: '面向未来科技发展趋势，培养具备人工智能理论基础和实践能力的高素质技术人才。学院拥有先进的实验室和产学研合作平台。' },
    { name: '智能制造与装备学院', description: '聚焦智能制造前沿技术，培养掌握现代制造技术、自动化控制及智能装备设计的复合型工程技术人才。' },
    { name: '航天北斗技术学院', description: '依托国家航天战略，专注北斗导航、卫星通信与航天电子技术的研究与人才培养，服务国家空天信息产业发展。' },
    { name: '生命健康学院', description: '融合生物学、医学与工程技术，培养生物医药、健康管理和医疗器械领域的创新人才，助力健康中国建设。' },
    { name: '财贸学院', description: '培养具备现代财务管理、国际贸易和金融分析能力的应用型人才，拥有完善的实训基地和企业合作资源。' },
    { name: '艺术设计学院', description: '融合传统美学与数字创意，培养具有创新思维和国际视野的艺术设计人才，涵盖视觉传达、环境艺术等多个方向。' },
    { name: '应用外语学院', description: '注重语言应用能力培养，开设多语种专业，培养具备跨文化交际能力和专业翻译技能的国际化人才。' },
    { name: '管理学院', description: '培养掌握现代管理理论和方法的复合型管理人才，涵盖工商管理、人力资源、市场营销等热门专业方向。' },
    { name: '材料学院', description: '聚焦新材料研发与应用，培养掌握材料设计、制备与检测技术的工程人才，服务国家先进制造业发展需求。' },
    { name: '生态环境技术学院', description: '响应国家生态文明建设战略，培养环境监测、生态修复和绿色技术领域的专业技术人才。' }
  ];

  for (const c of collegesData) {
    await conn.execute(
      'INSERT IGNORE INTO colleges (name, description) VALUES (?, ?)',
      [c.name, c.description]
    );
  }
  console.log('Seeded colleges data');

  // 5. Seed majors data
  const majorsData = [
    // 人工智能学院 (id=1)
    { college_id: 1, name: '人工智能技术应用', description: '学习机器学习、深度学习、计算机视觉等核心技术，培养AI系统开发与应用能力，可从事算法工程师、AI产品经理等岗位。' },
    { college_id: 1, name: '大数据技术与应用', description: '掌握数据采集、存储、处理与可视化技术，培养大数据分析与应用开发能力，服务数字经济产业发展。' },
    { college_id: 1, name: '智能产品开发', description: '融合软硬件技术，学习嵌入式系统、物联网和智能硬件设计，培养智能产品全链路开发能力。' },
    { college_id: 1, name: '云计算技术应用', description: '学习云平台架构、容器技术和分布式系统，培养云计算运维与开发能力，适应企业数字化转型需求。' },
    { college_id: 1, name: '软件技术', description: '面向软件产业需求，系统学习软件工程、Web开发、移动应用、数据库与云服务等核心技术，培养具备软件设计、开发与项目管理能力的高素质应用型人才。' },

    // 智能制造与装备学院 (id=2)
    { college_id: 2, name: '智能制造装备技术', description: '学习数控技术、工业机器人编程与调试，培养智能产线设计、运维与优化的专业能力。' },
    { college_id: 2, name: '机电一体化技术', description: '融合机械、电子与计算机技术，培养机电设备设计、安装调试与维护的复合型技术人才。' },
    { college_id: 2, name: '工业互联网技术', description: '学习工业网络架构、设备互联与数据采集，培养工业数字化转型技术服务能力。' },
    { college_id: 2, name: '数控技术', description: '掌握数控编程、精密加工与质量检测技术，培养高端制造领域的高技能人才。' },

    // 航天北斗技术学院 (id=3)
    { college_id: 3, name: '卫星通信与导航技术', description: '学习北斗导航原理、卫星通信系统，培养卫星地面站运维与导航定位技术应用能力。' },
    { college_id: 3, name: '无人机应用技术', description: '掌握无人机飞行控制、载荷应用与数据处理技术，培养无人机行业应用与系统集成能力。' },
    { college_id: 3, name: '航天电子技术', description: '学习航天器电子设备设计、测试与可靠性分析，培养航天电子领域的专业技术人才。' },

    // 生命健康学院 (id=4)
    { college_id: 4, name: '生物制药技术', description: '学习生物药物研发、生产与质量控制技术，培养生物医药产业急需的技术人才。' },
    { college_id: 4, name: '医学检验技术', description: '掌握临床检验、生化分析与病理诊断技术，培养医疗机构和检验中心的检验技术人才。' },
    { college_id: 4, name: '康复治疗技术', description: '学习运动康复、物理治疗与作业治疗技术，培养医疗机构和社区康复中心的专业治疗师。' },
    { college_id: 4, name: '健康管理', description: '掌握健康评估、慢病管理与健康促进知识，培养健康产业管理和健康咨询服务的专业人才。' },

    // 财贸学院 (id=5)
    { college_id: 5, name: '大数据与会计', description: '融合传统会计与数据分析技术，培养具备财务数据处理与智能财务分析能力的复合型人才。' },
    { college_id: 5, name: '国际经济与贸易', description: '学习国际贸易规则、跨境电商运营，培养具备国际视野的外贸业务与运营管理人才。' },
    { college_id: 5, name: '金融服务与管理', description: '掌握金融产品设计、风险管理与投资分析技能，培养银行、证券、保险等金融机构的服务与管理人才。' },
    { college_id: 5, name: '电子商务', description: '学习电商平台运营、网络营销与供应链管理，培养数字商务领域的创业与运营人才。' },

    // 艺术设计学院 (id=6)
    { college_id: 6, name: '视觉传达设计', description: '学习品牌设计、广告创意与数字媒体设计，培养具备创意思维和设计执行能力的视觉设计人才。' },
    { college_id: 6, name: '环境艺术设计', description: '掌握室内外空间设计、景观规划与展示设计技能，培养环境设计领域的创意与实施人才。' },
    { college_id: 6, name: '数字媒体艺术设计', description: '学习UI/UX设计、动效设计与交互媒体开发，培养互联网和新媒体行业的数字创意人才。' },
    { college_id: 6, name: '产品艺术设计', description: '融合工业设计美学与用户需求分析，培养产品造型设计、原型开发与用户体验优化的设计人才。' },

    // 应用外语学院 (id=7)
    { college_id: 7, name: '商务英语', description: '强化英语语言能力与商务沟通技能，培养国际贸易、跨境电商和涉外企业的英语应用型人才。' },
    { college_id: 7, name: '应用日语', description: '系统学习日语语言与日本文化，培养日企翻译、跨境电商对日业务及旅游服务的日语专业人才。' },
    { college_id: 7, name: '应用韩语', description: '掌握韩语语言能力与韩国文化知识，培养韩企服务、文化交流及跨境电商韩语运营人才。' },

    // 管理学院 (id=8)
    { college_id: 8, name: '工商企业管理', description: '学习企业战略、运营管理与组织行为学，培养具备综合管理能力的企业中基层管理人才。' },
    { college_id: 8, name: '人力资源管理', description: '掌握招聘配置、培训开发与绩效管理技能，培养企业HR领域的高素质专业人才。' },
    { college_id: 8, name: '市场营销', description: '学习市场调研、品牌策划与数字营销，培养具有创新思维和市场敏感度的营销专业人才。' },
    { college_id: 8, name: '现代物流管理', description: '掌握供应链规划、仓储配送与物流信息技术，培养现代物流与供应链管理的专业人才。' },
    { college_id: 8, name: '小学英语教育', description: '掌握小学英语教学设计与实践、儿童心理与班级管理能力，培养具备学科管理与语言教育复合能力的小学英语教育专业人才。' },

    // 材料学院 (id=9)
    { college_id: 9, name: '新能源材料技术', description: '学习太阳能电池、储能材料与氢能技术，培养新能源产业急需的材料研发与应用人才。' },
    { college_id: 9, name: '高分子材料智能制造', description: '掌握高分子材料合成、加工与智能制造技术，培养新材料产业的高技能工程技术人才。' },
    { college_id: 9, name: '材料成型与控制技术', description: '学习铸造、焊接与模具设计技术，培养材料成型工艺设计与质量控制的专业人才。' },

    // 生态环境技术学院 (id=10)
    { college_id: 10, name: '环境监测技术', description: '掌握大气、水质、土壤等环境要素的监测与分析方法，培养环境监测站及第三方检测机构的技术人才。' },
    { college_id: 10, name: '生态修复技术', description: '学习土壤修复、水体治理与生态恢复技术，培养环保企业和政府部门的生态修复专业人才。' },
    { college_id: 10, name: '绿色低碳技术', description: '掌握碳排放核算、节能减排与清洁生产技术，培养企业碳管理和绿色转型的技术服务人才。' },
    { college_id: 10, name: '园林工程技术', description: '学习园林规划设计、植物配置与绿化施工技术，培养园林景观设计与工程实施的专业人才。' }
  ];

  for (const m of majorsData) {
    await conn.execute(
      'INSERT IGNORE INTO majors (college_id, name, description) VALUES (?, ?, ?)',
      [m.college_id, m.name, m.description]
    );
  }
  console.log('Seeded majors data');

  // 6. Update existing students with college/major/class info
  // 获取各学院和专业 ID（按插入顺序推算，如存在不一致请根据实际数据调整）
  // student1 (t个球) -> 人工智能学院 -> 软件技术 -> 软件技术一班
  // student2 (李四) -> 人工智能学院 -> 软件技术 -> 软件技术一班
  // student3 (王五) -> 生命健康学院 -> 健康管理 -> 健康管理二班
  // student4 (赵六) -> 生命健康学院 -> 健康管理 -> 健康管理二班

  // 先获取软件技术和健康管理专业的实际 id
  const [[swMajor]] = await conn.execute(
    'SELECT id FROM majors WHERE college_id = 1 AND name = ?',
    ['软件技术']
  );
  const [[healthMajor]] = await conn.execute(
    'SELECT id FROM majors WHERE college_id = 4 AND name = ?',
    ['健康管理']
  );

  const swMajorId = swMajor ? swMajor.id : 5;   // 软件技术在第5个插入
  const healthMajorId = healthMajor ? healthMajor.id : 15; // 健康管理在第15个插入

  await conn.execute(
    `UPDATE users SET college_id = 1, major_id = ?, class_name = '软件技术一班' WHERE id = 4`,
    [swMajorId]
  );
  await conn.execute(
    `UPDATE users SET college_id = 1, major_id = ?, class_name = '软件技术一班' WHERE id = 5`,
    [swMajorId]
  );
  await conn.execute(
    `UPDATE users SET college_id = 4, major_id = ?, class_name = '健康管理二班' WHERE id = 6`,
    [healthMajorId]
  );
  await conn.execute(
    `UPDATE users SET college_id = 4, major_id = ?, class_name = '健康管理二班' WHERE id = 7`,
    [healthMajorId]
  );
  console.log('Updated existing students with college/major info');

  // 7. Seed jobs data (仅在表为空时插入,避免重复)
  const [[jobCount]] = await conn.execute('SELECT COUNT(*) AS cnt FROM jobs');
  if (jobCount.cnt === 0) {
    const jobsData = [
      ['华为技术有限公司', 'Java后端开发工程师', '技术', '15k-25k', '深圳', '负责公司核心业务系统开发与维护', '本科及以上学历，熟悉Spring Boot、MySQL、Redis', 'hr@huawei.com'],
      ['腾讯科技', '前端开发工程师', '技术', '18k-30k', '深圳', '负责腾讯产品前端开发', '本科及以上学历，熟悉Vue/React，有实际项目经验', 'hr@tencent.com'],
      ['阿里巴巴', '算法工程师', '技术', '25k-40k', '杭州', '负责推荐算法优化', '硕士及以上学历，熟悉机器学习、深度学习', 'hr@alibaba.com'],
      ['字节跳动', '产品经理', '产品', '20k-35k', '北京', '负责抖音某模块产品规划', '本科及以上学历，有3年以上产品经验', 'hr@bytedance.com'],
      ['影视飓风', '视频剪辑师', '技术', '8k-15k', '杭州', '负责自媒体视频剪辑、调色及特效制作，参与创意策划', '熟练使用Premiere、DaVinci Resolve、After Effects，有短视频剪辑经验优先', 'hr@ysjf.com'],
      ['影视飓风', '影视编导', '技术', '10k-20k', '杭州', '负责视频内容策划、脚本撰写及现场执导', '影视传媒相关专业，具备优秀的文案能力和镜头语言理解', 'hr@ysjf.com'],
      ['影视飓风', '摄影师', '技术', '8k-18k', '杭州', '负责商业拍摄、产品摄影及活动跟拍', '熟练使用各类摄影器材，具备良好的构图和灯光把控能力', 'hr@ysjf.com'],
      ['广东电子厂', '流水线操作工', '技术', '4k-6k', '东莞', '负责电子产品组装、检测及包装工作', '身体健康，能适应两班倒，无经验可培训', 'hr@gddzc.com'],
      ['广东电子厂', '质检员', '技术', '5k-7k', '东莞', '负责电子产品来料检验、过程检验及成品出货检验', '工作细心负责，有质检经验优先', 'hr@gddzc.com'],
      ['广东电子厂', '仓库管理员', '技术', '4.5k-6k', '东莞', '负责物料收发、库存管理及盘点工作', '熟悉ERP系统操作，有仓库管理经验优先', 'hr@gddzc.com']
    ];

    for (const j of jobsData) {
      await conn.execute(
        'INSERT INTO jobs (company, title, category, salary, location, description, requirements, contact) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        j
      );
    }
    console.log('Seeded jobs data');
  } else {
    console.log('Jobs data already exists, skip seeding');
  }

  // 8. 扩展 game_records.game_type 枚举: sokoban, idiom, snake
  try {
    await conn.execute(`
      ALTER TABLE game_records
      MODIFY COLUMN game_type ENUM('minesweeper','sudoku','chess','gomoku','doudizhu','sokoban','idiom','snake') NOT NULL
    `);
    console.log('Extended game_records.game_type ENUM with sokoban, idiom, snake');
  } catch (e) {
    // 如果 ENUM 已经包含这些值或者表不存在，忽略
    if (e.code !== 'ER_DUP_FIELDNAME' && !e.message.includes('Duplicate')) {
      console.log('game_type ENUM may already contain new values or table missing:', e.message);
    }
  }

  // 9. 为 task_submissions 添加文件字段（作业附件上传）
  try {
    await conn.execute(`ALTER TABLE task_submissions ADD COLUMN file_url VARCHAR(500) DEFAULT NULL COMMENT '附件URL'`);
    console.log('Added file_url to task_submissions');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    console.log('file_url already exists in task_submissions');
  }
  try {
    await conn.execute(`ALTER TABLE task_submissions ADD COLUMN file_name VARCHAR(255) DEFAULT NULL COMMENT '附件原文件名'`);
    console.log('Added file_name to task_submissions');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    console.log('file_name already exists in task_submissions');
  }

  // 10. 为 activity_score_records 添加 source_type 字段，便于区分系统加分和活动加分
  try {
    await conn.execute(`ALTER TABLE activity_score_records ADD COLUMN source_type VARCHAR(50) DEFAULT 'activity' COMMENT '来源类型：activity活动 / system系统'`);
    console.log('Added source_type to activity_score_records');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    console.log('source_type already exists in activity_score_records');
  }

  await conn.end();
  console.log('Migration completed successfully!');
}

// 支持独立运行（node database/migrate_colleges.js）
if (require.main === module) {
  migrate().catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });
}

module.exports = migrate;
