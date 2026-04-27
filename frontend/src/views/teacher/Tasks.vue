<template>
  <div class="tasks-page">
    <el-card>
      <template #header>
        <div class="header-actions">
          <span class="card-title">任务管理</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>发布任务
          </el-button>
        </div>
      </template>

      <el-table :data="tasks" v-loading="loading" stripe>
        <el-table-column type="index" width="60" align="center" />
        <el-table-column prop="title" label="任务标题" show-overflow-tooltip />
        <el-table-column prop="target_class" label="目标班级" width="120" />
        <el-table-column prop="deadline" label="截止时间" width="160" />
        <el-table-column prop="submit_count" label="已提交" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="info">{{ row.submit_count }} 人</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="发布时间" width="160" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-popconfirm title="确定删除该任务吗？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="发布任务" width="500px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入任务标题" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="form.content" type="textarea" rows="4" placeholder="请输入任务内容" />
        </el-form-item>
        <el-form-item label="班级" prop="target_class">
          <el-select v-model="form.target_class" placeholder="请选择班级" style="width: 100%">
            <el-option v-for="c in classes" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="截止时间" prop="deadline">
          <el-date-picker v-model="form.deadline" type="datetime" placeholder="选择截止时间" style="width: 100%" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { getTasks, createTask, deleteTask, getClasses } from '@/api/teacher'

const loading = ref(false)
const tasks = ref([])
const classes = ref([])
const dialogVisible = ref(false)
const formRef = ref()
const form = reactive({ title: '', content: '', target_class: '', deadline: '' })

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
  target_class: [{ required: true, message: '请选择班级', trigger: 'change' }],
  deadline: [{ required: true, message: '请选择截止时间', trigger: 'change' }]
}

const loadData = async () => {
  loading.value = true
  try {
    const { data } = await getTasks()
    tasks.value = data
    const { data: clsData } = await getClasses()
    classes.value = clsData
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  form.title = ''
  form.content = ''
  form.target_class = ''
  form.deadline = ''
  dialogVisible.value = true
}

const submitForm = async () => {
  await formRef.value.validate()
  await createTask(form)
  ElMessage.success('发布成功')
  dialogVisible.value = false
  loadData()
}

const handleDelete = async (row) => {
  await deleteTask(row.id)
  ElMessage.success('删除成功')
  loadData()
}

loadData()
</script>

<style scoped lang="scss">
.tasks-page {
  .header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
