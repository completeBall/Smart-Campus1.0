<template>
  <div class="smart-ai-page">
    <aside class="ai-side">
      <div class="brand">
        <div class="brand-icon">
          <el-icon><MagicStick /></el-icon>
        </div>
        <div>
          <h2>智能 AI</h2>
          <p>{{ status.enabled ? `${status.provider_label} · ${status.model}` : '等待管理员启用' }}</p>
        </div>
      </div>

      <div class="usage-box">
        <span>我的使用量</span>
        <strong>{{ status.usage?.total_tokens || 0 }}</strong>
        <p>{{ status.usage?.request_count || 0 }} 次对话请求</p>
      </div>

      <div class="quick-list">
        <button v-for="item in prompts" :key="item" type="button" @click="usePrompt(item)">
          {{ item }}
        </button>
      </div>
    </aside>

    <section class="chat-panel">
      <div class="chat-head">
        <div>
          <h3>校园学习助手</h3>
          <span v-if="status.enabled">当前模型：{{ status.model }}</span>
          <span v-else>{{ status.message || '管理员暂未启用智能 AI' }}</span>
        </div>
        <el-button circle @click="refreshStatus">
          <el-icon><RefreshRight /></el-icon>
        </el-button>
      </div>

      <div ref="messageBoxRef" class="message-box">
        <el-empty v-if="messages.length === 0" description="开始一次新的对话" />
        <div
          v-for="(item, index) in messages"
          :key="index"
          class="message-row"
          :class="item.role"
        >
          <div class="avatar">
            <el-icon v-if="item.role === 'assistant'"><MagicStick /></el-icon>
            <el-icon v-else><User /></el-icon>
          </div>
          <div class="bubble">
            <div class="content">{{ item.content }}</div>
            <div v-if="item.usage" class="token-line">
              tokens {{ item.usage.total_tokens || 0 }}
            </div>
          </div>
        </div>
        <div v-if="sending" class="message-row assistant">
          <div class="avatar"><el-icon><MagicStick /></el-icon></div>
          <div class="bubble loading-bubble">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>

      <div class="input-bar">
        <el-input
          v-model="input"
          type="textarea"
          :rows="3"
          resize="none"
          maxlength="2000"
          show-word-limit
          :disabled="!status.enabled || sending"
          placeholder="输入你想咨询的问题"
          @keydown.ctrl.enter.prevent="sendMessage"
        />
        <div class="send-actions">
          <el-button :disabled="messages.length === 0 || sending" @click="clearChat">清空</el-button>
          <el-button type="primary" :loading="sending" :disabled="!status.enabled" @click="sendMessage">
            <el-icon><Promotion /></el-icon>
            发送
          </el-button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { nextTick, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { chatWithAi, getAiStatus } from '@/api/student'

const status = ref({ enabled: false, usage: {} })
const messages = ref([])
const input = ref('')
const sending = ref(false)
const messageBoxRef = ref()

const prompts = [
  '帮我制定今天的学习计划',
  '这道题我不会，帮我拆解思路',
  '帮我润色一段作业回答',
  '期末复习怎么安排更高效'
]

const scrollToBottom = () => {
  nextTick(() => {
    if (messageBoxRef.value) {
      messageBoxRef.value.scrollTop = messageBoxRef.value.scrollHeight
    }
  })
}

const refreshStatus = async () => {
  try {
    const { data } = await getAiStatus()
    status.value = data
  } catch (e) {
    status.value = {
      enabled: false,
      message: 'AI 接口暂不可用，请确认后端已更新并重启',
      usage: status.value.usage || {}
    }
  }
}

const usePrompt = (text) => {
  input.value = text
}

const clearChat = () => {
  messages.value = []
}

const sendMessage = async () => {
  const content = input.value.trim()
  if (!content) {
    ElMessage.warning('请输入问题')
    return
  }
  if (!status.value.enabled) {
    ElMessage.warning('管理员暂未启用智能 AI')
    return
  }

  messages.value.push({ role: 'user', content })
  input.value = ''
  sending.value = true
  scrollToBottom()

  try {
    const payloadMessages = messages.value.map(item => ({
      role: item.role,
      content: item.content
    }))
    const { data } = await chatWithAi({ messages: payloadMessages })
    messages.value.push({
      role: 'assistant',
      content: data.answer,
      usage: data.usage
    })
    status.value.usage = {
      ...(status.value.usage || {}),
      request_count: Number(status.value.usage?.request_count || 0) + 1,
      total_tokens: Number(status.value.usage?.total_tokens || 0) + Number(data.usage?.total_tokens || 0)
    }
  } catch (e) {
    messages.value.push({
      role: 'assistant',
      content: e.message || 'AI 暂时无法回复，请稍后再试。'
    })
  } finally {
    sending.value = false
    scrollToBottom()
  }
}

refreshStatus()
</script>

<style scoped lang="scss">
.smart-ai-page {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 18px;
  min-height: calc(100vh - 110px);

  .ai-side,
  .chat-panel {
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 8px 28px rgba(15, 23, 42, 0.06);
  }

  .ai-side {
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 14px;

    .brand-icon {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 24px;
      background: linear-gradient(135deg, #1677ff, #22c55e);
    }

    h2 {
      margin: 0 0 5px;
      color: #111827;
      font-size: 22px;
    }

    p {
      margin: 0;
      color: #6b7280;
      font-size: 13px;
    }
  }

  .usage-box {
    padding: 18px;
    border-radius: 8px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;

    span {
      color: #6b7280;
      font-size: 13px;
    }

    strong {
      display: block;
      margin: 8px 0 4px;
      color: #111827;
      font-size: 30px;
      line-height: 1;
    }

    p {
      margin: 0;
      color: #9ca3af;
      font-size: 12px;
    }
  }

  .quick-list {
    display: grid;
    gap: 10px;

    button {
      width: 100%;
      text-align: left;
      border: 1px solid #e5e7eb;
      background: #fff;
      color: #374151;
      border-radius: 8px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        border-color: #409eff;
        color: #1677ff;
        background: #f0f7ff;
      }
    }
  }

  .chat-panel {
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }

  .chat-head {
    height: 72px;
    padding: 0 22px;
    border-bottom: 1px solid #eef2f7;
    display: flex;
    align-items: center;
    justify-content: space-between;

    h3 {
      margin: 0 0 5px;
      color: #111827;
      font-size: 18px;
    }

    span {
      color: #6b7280;
      font-size: 13px;
    }
  }

  .message-box {
    flex: 1;
    min-height: 420px;
    padding: 22px;
    overflow-y: auto;
    background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
  }

  .message-row {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;

    &.user {
      flex-direction: row-reverse;

      .bubble {
        background: #1677ff;
        color: #fff;
        border-color: #1677ff;
      }

      .avatar {
        background: #dbeafe;
        color: #1677ff;
      }
    }

    &.assistant .avatar {
      background: #dcfce7;
      color: #16a34a;
    }
  }

  .avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
  }

  .bubble {
    max-width: min(720px, 78%);
    padding: 12px 14px;
    border-radius: 8px;
    background: #fff;
    border: 1px solid #e5e7eb;
    color: #1f2937;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .token-line {
    margin-top: 8px;
    color: #9ca3af;
    font-size: 12px;
  }

  .loading-bubble {
    display: inline-flex;
    gap: 5px;
    align-items: center;

    span {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #9ca3af;
      animation: blink 1s infinite ease-in-out;

      &:nth-child(2) {
        animation-delay: 0.15s;
      }

      &:nth-child(3) {
        animation-delay: 0.3s;
      }
    }
  }

  .input-bar {
    border-top: 1px solid #eef2f7;
    padding: 16px;
    background: #fff;
  }

  .send-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 12px;
  }
}

@keyframes blink {
  0%, 80%, 100% { opacity: 0.35; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-3px); }
}

@media (max-width: 900px) {
  .smart-ai-page {
    grid-template-columns: 1fr;

    .ai-side {
      order: 2;
    }

    .bubble {
      max-width: 86%;
    }
  }
}
</style>
