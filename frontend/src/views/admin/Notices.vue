<template>
  <div class="notices-page">
    <el-card>
      <template #header>
        <div class="header-actions">
          <span class="card-title">通知公告</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>发布公告
          </el-button>
        </div>
      </template>

      <el-timeline>
        <el-timeline-item
          v-for="item in notices"
          :key="item.id"
          :timestamp="item.created_at"
          placement="top"
        >
          <el-card>
            <div class="notice-item">
              <div class="notice-content">
                <h4>{{ item.title }}</h4>
                <p>{{ item.content }}</p>
                <el-tag size="small" :type="item.type === 'all' ? 'primary' : item.type === 'teacher' ? 'warning' : 'success'">
                  {{ typeMap[item.type] }}
                </el-tag>
              </div>
              <el-button link type="danger" @click="handleDelete(item)">删除</el-button>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </el-card>

    <!-- 发布公告对话框 -->
    <el-dialog v-model="dialogVisible" title="发布公告" width="500px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入标题" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="form.content" type="textarea" rows="5" placeholder="请输入公告内容" />
        </el-form-item>
        <el-form-item label="接收对象">
          <el-radio-group v-model="form.type">
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="teacher">教师</el-radio-button>
            <el-radio-button label="student">学生</el-radio-button>
          </el-radio-group>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { getNotices, createNotice, deleteNotice } from '@/api/admin'

const notices = ref([])
const dialogVisible = ref(false)
const formRef = ref()
const form = reactive({ title: '', content: '', type: 'all' })
const typeMap = { all: '全部', teacher: '教师', student: '学生' }

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
}

const loadData = async () => {
  const { data } = await getNotices()
  notices.value = data
}

const handleAdd = () => {
  form.title = ''
  form.content = ''
  form.type = 'all'
  dialogVisible.value = true
}

const submitForm = async () => {
  await formRef.value.validate()
  await createNotice(form)
  ElMessage.success('发布成功')
  dialogVisible.value = false
  loadData()
}

const handleDelete = async (row) => {
  await ElMessageBox.confirm('确定删除该公告吗？', '提示', { type: 'warning' })
  await deleteNotice(row.id)
  ElMessage.success('删除成功')
  loadData()
}

loadData()
</script>

<style scoped lang="scss">
.notices-page {
  .header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .notice-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .notice-content {
    flex: 1;
    h4 {
      margin: 0 0 8px;
      color: #333;
    }
    p {
      margin: 0 0 10px;
      color: #666;
      line-height: 1.6;
    }
  }
}
</style>
