<template>
  <div class="homework-page">
    <el-card>
      <template #header>
        <div class="header-actions">
          <span class="card-title">我的作业</span>
          <el-radio-group v-model="filterStatus" @change="filterTasks">
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="pending">待完成</el-radio-button>
            <el-radio-button label="submitted">已提交</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <el-empty v-if="filteredTasks.length === 0" description="暂无作业" />
      <div v-else class="task-cards">
        <el-card v-for="task in filteredTasks" :key="task.id" class="task-card" shadow="hover">
          <div class="task-header">
            <h4>{{ task.title }}</h4>
            <el-tag :type="getStatusType(task)" effect="dark">{{ getStatusText(task) }}</el-tag>
          </div>
          <p class="task-content">{{ task.content }}</p>
          <div class="task-footer">
            <div class="task-meta">
              <span><el-icon><Clock /></el-icon> 截止：{{ task.deadline }}</span>
              <span><el-icon><User /></el-icon> {{ task.teacher_name || '教师' }}</span>
              <span v-if="task.file_url" class="file-tag">📎 有附件</span>
            </div>
            <div class="task-actions">
              <el-button v-if="task.submit_status === null" type="primary" size="small" @click="handleSubmit(task)">
                去提交
              </el-button>
              <div v-else class="score-info">
                <span v-if="task.score !== null" :class="task.score >= 60 ? 'pass' : 'fail'">
                  分数：{{ task.score }}
                </span>
                <span v-else class="reviewing">待批改</span>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </el-card>

    <!-- 提交作业对话框 -->
    <el-dialog v-model="dialogVisible" title="提交作业" width="560px">
      <div v-if="currentTask" class="task-detail">
        <h4>{{ currentTask.title }}</h4>
        <p>{{ currentTask.content }}</p>
      </div>
      <el-form :model="form" label-width="80px">
        <el-form-item label="作答内容">
          <el-input v-model="form.content" type="textarea" rows="6" placeholder="请输入作答内容" />
        </el-form-item>
        <el-form-item label="附件">
          <el-upload
            action="#"
            :auto-upload="false"
            :show-file-list="true"
            :limit="1"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            accept="image/*,.pdf,.doc,.docx,.zip,.rar,.txt"
          >
            <el-button type="primary" size="small" :loading="uploadingFile">
              <el-icon><Upload /></el-icon>选择文件
            </el-button>
            <template #tip>
              <div class="upload-tip">支持图片、PDF、Word、压缩包等，最大 10MB</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitHomework">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { getStudentTasks, submitHomework as submitHomeworkApi } from '@/api/student'
import { uploadForumFile } from '@/api/student'

const route = useRoute()
const router = useRouter()

const tasks = ref([])
const filterStatus = ref(route.query.filter || 'all')
const dialogVisible = ref(false)
const currentTask = ref(null)
const form = reactive({ content: '', file_url: '', file_name: '' })
const uploadingFile = ref(false)

const filteredTasks = computed(() => {
  if (filterStatus.value === 'pending') return tasks.value.filter(t => t.submit_status === null)
  if (filterStatus.value === 'submitted') return tasks.value.filter(t => t.submit_status !== null)
  return tasks.value
})

const loadData = async () => {
  const { data } = await getStudentTasks()
  tasks.value = data
}

const filterTasks = () => {
  // 切换筛选时同步到 URL query，便于从 Dashboard 跳转后保持状态
  if (filterStatus.value !== 'all') {
    router.replace({ query: { ...route.query, filter: filterStatus.value } })
  } else {
    const { filter, ...rest } = route.query
    router.replace({ query: rest })
  }
}

onMounted(() => {
  loadData()
})

const getStatusType = (task) => {
  if (task.submit_status === null) return 'warning'
  if (task.score === null) return 'info'
  return task.score >= 60 ? 'success' : 'danger'
}

const getStatusText = (task) => {
  if (task.submit_status === null) return '待完成'
  if (task.score === null) return '待批改'
  return `已批改 ${task.score}分`
}

const handleSubmit = (task) => {
  currentTask.value = task
  form.content = ''
  form.file_url = ''
  form.file_name = ''
  dialogVisible.value = true
}

const handleFileChange = async (uploadFile) => {
  const file = uploadFile.raw
  if (!file) return
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 10MB')
    return
  }
  uploadingFile.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadForumFile(fd)
    form.file_url = res.data.url
    form.file_name = res.data.name
    ElMessage.success('文件上传成功')
  } catch (err) {
    ElMessage.error('文件上传失败')
  } finally {
    uploadingFile.value = false
  }
}

const handleFileRemove = () => {
  form.file_url = ''
  form.file_name = ''
}

const submitHomework = async () => {
  if (!form.content.trim() && !form.file_url) {
    ElMessage.warning('请输入作答内容或上传附件')
    return
  }
  await submitHomeworkApi(currentTask.value.id, {
    content: form.content,
    file_url: form.file_url,
    file_name: form.file_name
  })
  ElMessage.success('提交成功')
  dialogVisible.value = false
  loadData()
}

loadData()
</script>

<style scoped lang="scss">
.homework-page {
  .header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .card-title {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
  }
  .task-cards {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
  .task-card {
    border-radius: 16px;
    border: none;
    background: linear-gradient(135deg, #ffffff 0%, #f8f9fc 100%);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: linear-gradient(180deg, #409eff 0%, #1677ff 100%);
      border-radius: 16px 0 0 16px;
    }

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(64, 158, 255, 0.15);
    }

    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      padding-left: 8px;
      h4 {
        margin: 0;
        color: #1a1a2e;
        font-size: 16px;
        font-weight: 600;
        letter-spacing: 0.3px;
      }
      .el-tag {
        border-radius: 20px;
        padding: 0 14px;
        height: 28px;
        font-weight: 500;
        font-size: 12px;
      }
    }
    .task-content {
      color: #606266;
      font-size: 14px;
      line-height: 1.7;
      margin-bottom: 18px;
      padding-left: 8px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .task-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-left: 8px;
      .task-meta {
        display: flex;
        gap: 16px;
        font-size: 13px;
        color: #909399;
        span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .el-icon {
          font-size: 14px;
          color: #c0c4cc;
        }
      }
      .task-actions {
        .el-button {
          border-radius: 20px;
          padding: 8px 20px;
          font-weight: 500;
          transition: all 0.3s ease;
          &:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
          }
        }
      }
    }
    .score-info {
      padding: 6px 14px;
      border-radius: 20px;
      background: #f4f4f5;
      .pass { color: #67c23a; font-weight: 700; font-size: 14px; }
      .fail { color: #f56c6c; font-weight: 700; font-size: 14px; }
      .reviewing { color: #909399; font-size: 13px; font-weight: 500; }
    }
  }

  // 状态色条
  .task-card:has(.el-tag--warning)::before {
    background: linear-gradient(180deg, #e6a23c 0%, #d48a1a 100%);
  }
  .task-card:has(.el-tag--success)::before {
    background: linear-gradient(180deg, #67c23a 0%, #529b22 100%);
  }
  .task-card:has(.el-tag--danger)::before {
    background: linear-gradient(180deg, #f56c6c 0%, #d9363e 100%);
  }
  .task-card:has(.el-tag--info)::before {
    background: linear-gradient(180deg, #909399 0%, #6b6d71 100%);
  }

  // 有附件的标识
  .file-tag {
    color: #409eff;
    font-size: 12px;
    background: rgba(64, 158, 255, 0.08);
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 500;
  }

  // 对话框样式
  :deep(.el-dialog) {
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.12);

    .el-dialog__header {
      background: linear-gradient(135deg, #f0f5ff 0%, #e6f0ff 100%);
      padding: 20px 24px;
      margin: 0;
      border-bottom: 1px solid #e4e7ed;

      .el-dialog__title {
        font-size: 18px;
        font-weight: 700;
        color: #1a1a2e;
      }
    }

    .el-dialog__body {
      padding: 24px;
    }

    .el-dialog__footer {
      padding: 16px 24px 24px;
      border-top: 1px solid #f0f0f0;

      .el-button {
        border-radius: 10px;
        padding: 10px 24px;
        font-weight: 500;
        transition: all 0.3s ease;
      }
      .el-button--primary {
        background: linear-gradient(135deg, #409eff 0%, #1677ff 100%);
        border: none;
        box-shadow: 0 4px 14px rgba(64, 158, 255, 0.35);
        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(64, 158, 255, 0.45);
        }
      }
    }
  }

  .task-detail {
    margin-bottom: 20px;
    padding: 18px 20px;
    background: linear-gradient(135deg, #f0f5ff 0%, #f5f7fa 100%);
    border-radius: 14px;
    border: 1px solid #e8ecf4;
    h4 {
      margin: 0 0 10px;
      font-size: 16px;
      font-weight: 600;
      color: #1a1a2e;
    }
    p {
      color: #606266;
      margin: 0;
      line-height: 1.7;
      font-size: 14px;
    }
  }

  .upload-tip {
    font-size: 12px;
    color: #a8abb2;
    margin-top: 6px;
    padding-left: 4px;
  }

  :deep(.el-form-item__label) {
    font-weight: 500;
    color: #606266;
  }

  :deep(.el-textarea__inner) {
    border-radius: 12px;
    padding: 12px 16px;
    line-height: 1.7;
    transition: all 0.3s ease;
    &:focus {
      box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
    }
  }

  :deep(.el-upload .el-button) {
    border-radius: 10px;
    background: linear-gradient(135deg, #409eff 0%, #1677ff 100%);
    border: none;
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.25);
    transition: all 0.3s ease;
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(64, 158, 255, 0.35);
    }
  }
}
</style>
