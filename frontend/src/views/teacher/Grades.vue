<template>
  <div class="grades-page">
    <el-card>
      <template #header>
        <div class="header-actions">
          <div class="filters">
            <el-select v-model="filterClass" placeholder="班级筛选" clearable style="width: 140px" @change="loadData">
              <el-option v-for="c in classes" :key="c" :label="c" :value="c" />
            </el-select>
            <el-input v-model="filterCourse" placeholder="课程搜索" clearable style="width: 180px" @keyup.enter="loadData" />
            <el-button type="primary" @click="loadData">搜索</el-button>
          </div>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>录入成绩
          </el-button>
        </div>
      </template>

      <el-table :data="grades" v-loading="loading" stripe>
        <el-table-column type="index" width="60" align="center" />
        <el-table-column prop="student_name" label="学生" width="120" />
        <el-table-column prop="class_name" label="班级" width="120" />
        <el-table-column prop="course_name" label="课程" width="140" />
        <el-table-column prop="score" label="分数" width="100">
          <template #default="{ row }">
            <el-tag :type="row.score >= 60 ? 'success' : 'danger'" effect="dark">{{ row.score }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="exam_type" label="考试类型" width="120" />
        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
        <el-table-column prop="created_at" label="录入时间" width="160" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑成绩' : '录入成绩'" width="500px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="学生" prop="student_id" v-if="!isEdit">
          <el-select-v2
            v-model="form.student_id"
            :options="studentOptions"
            placeholder="请选择学生"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="课程" prop="course_name">
          <el-input v-model="form.course_name" placeholder="请输入课程名称" />
        </el-form-item>
        <el-form-item label="分数" prop="score">
          <el-input-number v-model="form.score" :min="0" :max="100" style="width: 150px" />
        </el-form-item>
        <el-form-item label="考试类型">
          <el-select v-model="form.exam_type" placeholder="请选择考试类型" style="width: 100%">
            <el-option label="平时测验" value="平时测验" />
            <el-option label="期中考试" value="期中考试" />
            <el-option label="期末考试" value="期末考试" />
            <el-option label="实验报告" value="实验报告" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { getTeacherGrades, addGrade, updateGrade } from '@/api/teacher'
import { getUsers } from '@/api/admin'

const loading = ref(false)
const grades = ref([])
const classes = ref([])
const studentOptions = ref([])
const filterClass = ref('')
const filterCourse = ref('')
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const form = reactive({ id: null, student_id: '', course_name: '', score: 60, exam_type: '平时测验', remark: '' })

const rules = {
  student_id: [{ required: true, message: '请选择学生', trigger: 'change' }],
  course_name: [{ required: true, message: '请输入课程名称', trigger: 'blur' }],
  score: [{ required: true, message: '请输入分数', trigger: 'blur' }]
}

const loadData = async () => {
  loading.value = true
  try {
    const { data } = await getTeacherGrades({ class_name: filterClass.value, course_name: filterCourse.value })
    grades.value = data
    const uniqueClasses = [...new Set(data.map(g => g.class_name).filter(Boolean))]
    classes.value = uniqueClasses
  } finally {
    loading.value = false
  }
}

const loadStudents = async () => {
  const { data } = await getUsers({ role: 'student', pageSize: 1000 })
  studentOptions.value = data.list.map(s => ({ value: s.id, label: `${s.name} (${s.class_name || '无班级'})` }))
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(form, { id: null, student_id: '', course_name: '', score: 60, exam_type: '平时测验', remark: '' })
  loadStudents()
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(form, row)
  dialogVisible.value = true
}

const submitForm = async () => {
  await formRef.value.validate()
  if (isEdit.value) {
    await updateGrade(form.id, { score: form.score, remark: form.remark })
    ElMessage.success('更新成功')
  } else {
    await addGrade(form)
    ElMessage.success('录入成功')
  }
  dialogVisible.value = false
  loadData()
}

loadData()
</script>

<style scoped lang="scss">
.grades-page {
  .header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .filters {
      display: flex;
      gap: 10px;
    }
  }
}
</style>
