<template>
  <div class="feedback-page">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span class="card-title">提交反馈</span>
          </template>
          <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
            <el-form-item label="类型" prop="type">
              <el-radio-group v-model="form.type">
                <el-radio-button label="suggestion">建议</el-radio-button>
                <el-radio-button label="complaint">投诉</el-radio-button>
                <el-radio-button label="bug">Bug</el-radio-button>
                <el-radio-button label="other">其他</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="标题" prop="title">
              <el-input v-model="form.title" placeholder="请输入标题" />
            </el-form-item>
            <el-form-item label="内容" prop="content">
              <el-input v-model="form.content" type="textarea" rows="5" placeholder="请详细描述你的问题或建议" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="submitFeedback">提交反馈</el-button>
              <el-button @click="resetForm">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span class="card-title">我的反馈</span>
          </template>
          <el-empty v-if="feedbacks.length === 0" description="暂无反馈记录" />
          <div v-else class="feedback-list">
            <div v-for="item in feedbacks" :key="item.id" class="feedback-item">
              <div class="feedback-header">
                <span class="feedback-title">{{ item.title }}</span>
                <el-tag :type="item.status === 0 ? 'warning' : 'success'" size="small">
                  {{ item.status === 0 ? '待处理' : '已处理' }}
                </el-tag>
              </div>
              <div class="feedback-content">{{ item.content }}</div>
              <div class="feedback-time">{{ item.created_at }}</div>
              <div v-if="item.reply" class="feedback-reply">
                <div class="reply-label">管理员回复：</div>
                <div class="reply-content">{{ item.reply }}</div>
                <div class="reply-time">{{ item.reply_at }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { submitFeedback as submitFeedbackApi, getMyFeedback } from '@/api/student'

const formRef = ref()
const form = reactive({ type: 'suggestion', title: '', content: '' })
const feedbacks = ref([])

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
}

const loadData = async () => {
  const { data } = await getMyFeedback()
  feedbacks.value = data
}

const submitFeedback = async () => {
  await formRef.value.validate()
  await submitFeedbackApi(form)
  ElMessage.success('反馈提交成功')
  resetForm()
  loadData()
}

const resetForm = () => {
  form.type = 'suggestion'
  form.title = ''
  form.content = ''
}

loadData()
</script>

<style scoped lang="scss">
.feedback-page {
  .feedback-list {
    .feedback-item {
      padding: 16px;
      border-bottom: 1px solid #f0f0f0;
      &:last-child { border-bottom: none; }
      .feedback-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        .feedback-title {
          font-weight: 500;
          color: #333;
        }
      }
      .feedback-content {
        color: #666;
        font-size: 14px;
        line-height: 1.6;
        margin-bottom: 8px;
      }
      .feedback-time {
        font-size: 12px;
        color: #999;
      }
      .feedback-reply {
        margin-top: 12px;
        padding: 12px;
        background: #f0f9ff;
        border-radius: 8px;
        .reply-label {
          font-weight: 500;
          color: #667eea;
          margin-bottom: 6px;
        }
        .reply-content {
          color: #555;
          line-height: 1.6;
        }
        .reply-time {
          font-size: 12px;
          color: #999;
          margin-top: 6px;
        }
      }
    }
  }
}
</style>
