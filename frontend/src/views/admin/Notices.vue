<template>
  <div class="notices-page">
    <el-card class="main-card" :body-style="{ padding: '0' }">
      <template #header>
        <div class="header-actions">
          <div class="header-left">
            <el-icon size="20" color="#667eea"><Bell /></el-icon>
            <span class="card-title">通知公告</span>
            <el-tag v-if="notices.length" type="info" effect="plain" size="small" round>{{ notices.length }} 条</el-tag>
          </div>
          <el-button type="primary" size="large" class="publish-btn" @click="handleAdd">
            <el-icon><Plus /></el-icon>发布公告
          </el-button>
        </div>
      </template>

      <div class="timeline-wrapper">
        <el-empty v-if="notices.length === 0" description="暂无公告" />
        <el-timeline v-else>
          <el-timeline-item
            v-for="item in notices"
            :key="item.id"
            :timestamp="formatDate(item.created_at)"
            placement="top"
            type="primary"
          >
            <template #dot>
              <div class="custom-dot" :class="`type-${item.type}`">
                <el-icon size="14"><Bell /></el-icon>
              </div>
            </template>
            <div class="notice-card" :class="`type-${item.type}`">
              <div class="notice-header">
                <h4 class="notice-title">{{ item.title }}</h4>
                <el-tooltip content="删除" placement="top">
                  <el-button circle size="small" type="danger" plain @click="handleDelete(item)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </el-tooltip>
              </div>
              <p class="notice-body">{{ item.content }}</p>
              <div class="notice-footer">
                <el-tag
                  size="small"
                  :type="tagTypeMap[item.type]"
                  effect="dark"
                  round
                  class="notice-tag"
                >
                  <el-icon size="12"><User v-if="item.type !== 'all'" /><UserFilled v-else /></el-icon>
                  {{ typeMap[item.type] }}
                </el-tag>
                <span class="notice-time">{{ formatTime(item.created_at) }}</span>
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-card>

    <!-- 发布公告对话框 -->
    <el-dialog v-model="dialogVisible" title="发布公告" width="520px" class="notice-dialog">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入公告标题" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="6"
            placeholder="请输入公告内容..."
            maxlength="2000"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="接收对象">
          <el-radio-group v-model="form.type">
            <el-radio-button label="all">
              <el-icon><UserFilled /></el-icon> 全部
            </el-radio-button>
            <el-radio-button label="teacher">
              <el-icon><User /></el-icon> 教师
            </el-radio-button>
            <el-radio-button label="student">
              <el-icon><User /></el-icon> 学生
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">
          <el-icon><Promotion /></el-icon> 发布
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bell, Plus, Delete, User, UserFilled, Promotion } from '@element-plus/icons-vue'
import { getNotices, createNotice, deleteNotice } from '@/api/admin'

const notices = ref([])
const dialogVisible = ref(false)
const formRef = ref()
const submitting = ref(false)
const form = reactive({ title: '', content: '', type: 'all' })
const typeMap = { all: '全部', teacher: '教师', student: '学生' }
const tagTypeMap = { all: 'primary', teacher: 'warning', student: 'success' }

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
}

const formatDate = (s) => {
  if (!s) return ''
  const d = new Date(s)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

const formatTime = (s) => {
  if (!s) return ''
  const d = new Date(s)
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
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
  submitting.value = true
  try {
    await createNotice(form)
    ElMessage.success('发布成功')
    dialogVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error('发布失败')
  } finally {
    submitting.value = false
  }
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
  .main-card {
    border-radius: 20px;
    border: none;
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.04);
    overflow: hidden;

    :deep(.el-card__header) {
      padding: 18px 24px;
      border-bottom: 1px solid #f0f0f0;
    }
  }

  .header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;

      .card-title {
        font-size: 18px;
        font-weight: 700;
        color: #1a1a2e;
      }
    }

    .publish-btn {
      border-radius: 12px;
      padding: 0 20px;
      background: linear-gradient(135deg, #409eff 0%, #1677ff 100%);
      border: none;
      box-shadow: 0 4px 14px rgba(64, 158, 255, 0.3);
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(64, 158, 255, 0.4);
      }
    }
  }

  .timeline-wrapper {
    padding: 24px 32px 32px;
    max-height: calc(100vh - 180px);
    overflow-y: auto;

    :deep(.el-timeline) {
      padding-left: 8px;
    }

    :deep(.el-timeline-item__node) {
      display: none;
    }

    :deep(.el-timeline-item__wrapper) {
      padding-left: 28px;
    }

    :deep(.el-timeline-item__timestamp) {
      color: #909399;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 8px;
    }

    :deep(.el-timeline-item__tail) {
      border-left: 2px solid #e8ecf4;
      left: 16px;
    }
  }

  .custom-dot {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    position: relative;
    z-index: 2;

    &.type-all {
      background: linear-gradient(135deg, #409eff, #1677ff);
    }
    &.type-teacher {
      background: linear-gradient(135deg, #e6a23c, #d48a1a);
    }
    &.type-student {
      background: linear-gradient(135deg, #67c23a, #529b22);
    }
  }

  .notice-card {
    border-radius: 16px;
    padding: 20px 22px;
    background: linear-gradient(135deg, #ffffff 0%, #f8f9fc 100%);
    border: 1px solid #eef0f5;
    transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      border-radius: 16px 0 0 16px;
      transition: width 0.3s ease;
    }

    &:hover {
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
      transform: translateY(-2px);

      &::before {
        width: 6px;
      }
    }

    &.type-all::before {
      background: linear-gradient(180deg, #409eff, #1677ff);
    }
    &.type-teacher::before {
      background: linear-gradient(180deg, #e6a23c, #d48a1a);
    }
    &.type-student::before {
      background: linear-gradient(180deg, #67c23a, #529b22);
    }
  }

  .notice-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
    gap: 12px;

    .notice-title {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: #1a1a2e;
      line-height: 1.4;
      letter-spacing: 0.3px;
    }
  }

  .notice-body {
    margin: 0 0 14px;
    color: #606266;
    line-height: 1.7;
    font-size: 14px;
  }

  .notice-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .notice-tag {
      padding: 0 12px;
      height: 26px;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 4px;

      .el-icon {
        font-size: 12px;
      }
    }

    .notice-time {
      font-size: 12px;
      color: #c0c4cc;
    }
  }
}

.notice-dialog {
  :deep(.el-dialog) {
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.12);
  }

  :deep(.el-dialog__header) {
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

  :deep(.el-dialog__body) {
    padding: 24px;
  }

  :deep(.el-dialog__footer) {
    padding: 16px 24px 24px;
    border-top: 1px solid #f0f0f0;

    .el-button {
      border-radius: 10px;
      padding: 10px 24px;
      font-weight: 500;
    }

    .el-button--primary {
      background: linear-gradient(135deg, #409eff 0%, #1677ff 100%);
      border: none;
      box-shadow: 0 4px 14px rgba(64, 158, 255, 0.35);
    }
  }

  :deep(.el-radio-button__inner) {
    border-radius: 10px !important;
    border-left: 1px solid #dcdfe6;
    padding: 8px 18px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
}
</style>
