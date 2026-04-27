const mysql = require('mysql2/promise');

/**
 * 把"人工智能学院"里隐含的"计算机"专业替换成"软件技术",
 * 并把现有 student1、student2 的 class_name 改成 "软件技术一班"
 */
async function migrate() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'smart_campus'
  });

  console.log('[migrate_software_major] Starting...');

  // 1. 找到人工智能学院的 id
  const [[aiCollege]] = await conn.execute(
    'SELECT id FROM colleges WHERE name = ?',
    ['人工智能学院']
  );
  if (!aiCollege) {
    console.log('[migrate_software_major] 人工智能学院 not found, skipping');
    await conn.end();
    return;
  }
  const aiCollegeId = aiCollege.id;
  console.log(`[migrate_software_major] 人工智能学院 id = ${aiCollegeId}`);

  // 2. 删除可能存在的"计算机"专业(如果以前误加过)
  const [delResult] = await conn.execute(
    `DELETE FROM majors WHERE college_id = ? AND name = ?`,
    [aiCollegeId, '计算机']
  );
  if (delResult.affectedRows > 0) {
    console.log(`[migrate_software_major] 已删除 计算机 专业 ${delResult.affectedRows} 条`);
  }

  // 3. 添加"软件技术"专业(若不存在)
  const [[existing]] = await conn.execute(
    'SELECT id FROM majors WHERE college_id = ? AND name = ?',
    [aiCollegeId, '软件技术']
  );

  let softwareMajorId;
  if (existing) {
    softwareMajorId = existing.id;
    console.log(`[migrate_software_major] 软件技术 已存在 id = ${softwareMajorId}`);
  } else {
    const [insertResult] = await conn.execute(
      'INSERT INTO majors (college_id, name, description) VALUES (?, ?, ?)',
      [
        aiCollegeId,
        '软件技术',
        '面向软件产业需求,系统学习软件工程、Web 开发、移动应用、数据库与云服务等核心技术,培养具备软件设计、开发与项目管理能力的高素质应用型人才。'
      ]
    );
    softwareMajorId = insertResult.insertId;
    console.log(`[migrate_software_major] 已创建 软件技术 专业 id = ${softwareMajorId}`);
  }

  // 4. 把 class_name 含"计算机"的学生统一改成"软件技术一班"
  //    并把原本指向其他人工智能学院专业的 student1/2 重定向到 软件技术
  const [updResult] = await conn.execute(
    `UPDATE users SET class_name = '软件技术一班' WHERE role = 'student' AND class_name LIKE '%计算机%'`
  );
  console.log(`[migrate_software_major] 已更新 class_name 为 软件技术一班: ${updResult.affectedRows} 行`);

  // 5. 把这些学生的 college/major 都对齐到 人工智能学院/软件技术
  const [aiResult] = await conn.execute(
    `UPDATE users SET college_id = ?, major_id = ? WHERE role = 'student' AND class_name = '软件技术一班'`,
    [aiCollegeId, softwareMajorId]
  );
  console.log(`[migrate_software_major] 已更新 软件技术一班 学生的 学院/专业: ${aiResult.affectedRows} 行`);

  // 6. 把 schedules 表里 class_name 含"计算机"的也跟着改成 软件技术一班
  const [schResult] = await conn.execute(
    `UPDATE schedules SET class_name = '软件技术一班' WHERE class_name LIKE '%计算机%'`
  );
  console.log(`[migrate_software_major] 已更新 schedules 中 class_name: ${schResult.affectedRows} 行`);

  // 7. tasks 表里 target_class 含"计算机"的也改
  const [taskResult] = await conn.execute(
    `UPDATE tasks SET target_class = '软件技术一班' WHERE target_class LIKE '%计算机%'`
  );
  console.log(`[migrate_software_major] 已更新 tasks 中 target_class: ${taskResult.affectedRows} 行`);

  await conn.end();
  console.log('[migrate_software_major] Done.');
}

migrate().catch(err => {
  console.error('[migrate_software_major] Failed:', err.message);
  process.exit(1);
});
