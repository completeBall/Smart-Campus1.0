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
        <span>Token 用量</span>
        <strong>{{ status.usage?.total_tokens || 0 }}</strong>
        <p>{{ status.usage?.request_count || 0 }} 次对话请求</p>
      </div>

      <div class="quick-list">
        <div class="quick-title">快捷提问</div>
        <button v-for="item in prompts" :key="item" type="button" @click="usePrompt(item)">
          <el-icon><ChatLineRound /></el-icon>
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
        <div v-if="messages.length === 0" class="empty-chat">
          <div class="empty-icon">
            <el-icon><MagicStick /></el-icon>
          </div>
          <h3>开始一次新的对话</h3>
          <p>可以输入问题，也可以上传图片、代码、笔记或文档内容让 AI 帮你分析。</p>
        </div>
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
            <div v-if="item.attachments?.length" class="message-attachments">
              <div v-for="file in item.attachments" :key="file.id" class="message-file">
                <img v-if="file.kind === 'image'" :src="file.dataUrl" :alt="file.name" />
                <el-icon v-else><Document /></el-icon>
                <span>{{ file.name }}</span>
              </div>
            </div>
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
        <div v-if="attachments.length" class="attachment-list">
          <div v-for="file in attachments" :key="file.id" class="attachment-chip">
            <img v-if="file.kind === 'image'" :src="file.dataUrl" :alt="file.name" />
            <el-icon v-else><Document /></el-icon>
            <div>
              <strong>{{ file.name }}</strong>
              <span>{{ formatSize(file.size) }} · {{ file.kind === 'image' ? '图片' : file.hasSheet ? '表格文件' : file.hasText ? '文本文件' : '文件' }}</span>
            </div>
            <el-button circle text @click="removeAttachment(file.id)">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
        </div>

        <el-input
          v-model="input"
          type="textarea"
          :rows="3"
          resize="none"
          maxlength="2000"
          show-word-limit
          :disabled="!status.enabled || sending"
          placeholder="输入你想咨询的问题，回车发送，Shift+Enter 换行"
          @keydown="handleInputKeydown"
        />
        <input
          ref="photoInputRef"
          class="hidden-file-input"
          type="file"
          multiple
          accept="image/*"
          hidden
          style="display: none"
          @change="handleFileChange"
        />
        <input
          ref="fileInputRef"
          class="hidden-file-input"
          type="file"
          multiple
          accept=".txt,.md,.json,.csv,.log,.js,.ts,.vue,.py,.java,.c,.cpp,.h,.html,.css,.xml,.yaml,.yml,.xls,.xlsx"
          hidden
          style="display: none"
          @change="handleFileChange"
        />
        <div class="send-actions">
          <div class="upload-actions">
            <el-tooltip content="上传照片" placement="top">
              <el-button class="tool-btn" :disabled="sending || attachments.length >= MAX_ATTACHMENTS || !status.enabled" @click="openPhotoPicker">
                <el-icon><Picture /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="上传文件" placement="top">
              <el-button class="tool-btn" :disabled="sending || attachments.length >= MAX_ATTACHMENTS || !status.enabled" @click="openFilePicker">
                <el-icon><FolderOpened /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
          <div class="primary-actions">
            <el-button class="clear-btn" :disabled="messages.length === 0 || sending" @click="clearChat">清空</el-button>
            <el-button class="send-btn" type="primary" :loading="sending" :disabled="!status.enabled" @click="sendMessage">
              <el-icon><Promotion /></el-icon>
              发送
            </el-button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { nextTick, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { chatWithAi, getAiStatus } from '@/api/student'

const MAX_ATTACHMENTS = 6
const MAX_FILE_SIZE = 2 * 1024 * 1024
const TEXT_EXTENSIONS = ['txt', 'md', 'json', 'csv', 'log', 'js', 'ts', 'vue', 'py', 'java', 'c', 'cpp', 'h', 'html', 'css', 'xml', 'yaml', 'yml']
const SPREADSHEET_EXTENSIONS = ['xls', 'xlsx']

const status = ref({ enabled: false, usage: {} })
const messages = ref([])
const input = ref('')
const sending = ref(false)
const attachments = ref([])
const messageBoxRef = ref()
const photoInputRef = ref()
const fileInputRef = ref()

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

const openFilePicker = () => {
  fileInputRef.value?.click()
}

const openPhotoPicker = () => {
  photoInputRef.value?.click()
}

const formatSize = (size) => {
  if (!size) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

const isTextFile = (file) => {
  const ext = file.name.split('.').pop()?.toLowerCase()
  return file.type.startsWith('text/') || TEXT_EXTENSIONS.includes(ext)
}

const isSpreadsheetFile = (file) => {
  const ext = file.name.split('.').pop()?.toLowerCase()
  return SPREADSHEET_EXTENSIONS.includes(ext)
}

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(file)
})

const readAsText = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsText(file)
})

const handleFileChange = async (event) => {
  const files = Array.from(event.target.files || [])
  event.target.value = ''
  if (!files.length) return

  for (const file of files) {
    if (attachments.value.length >= MAX_ATTACHMENTS) {
      ElMessage.warning(`最多上传 ${MAX_ATTACHMENTS} 个附件`)
      break
    }
    if (file.size > MAX_FILE_SIZE) {
      ElMessage.warning(`${file.name} 超过 2MB，已跳过`)
      continue
    }

    try {
      const base = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size
      }

      if (file.type.startsWith('image/')) {
        attachments.value.push({
          ...base,
          kind: 'image',
          dataUrl: await readAsDataUrl(file)
        })
      } else if (isTextFile(file)) {
        attachments.value.push({
          ...base,
          kind: 'file',
          hasText: true,
          text: String(await readAsText(file)).slice(0, 6000)
        })
      } else if (isSpreadsheetFile(file)) {
        attachments.value.push({
          ...base,
          kind: 'file',
          hasSheet: true,
          dataUrl: await readAsDataUrl(file)
        })
      } else {
        attachments.value.push({
          ...base,
          kind: 'file',
          hasText: false
        })
      }
    } catch (e) {
      ElMessage.error(`${file.name} 读取失败`)
    }
  }
}

const removeAttachment = (id) => {
  attachments.value = attachments.value.filter(item => item.id !== id)
}

const handleInputKeydown = (event) => {
  if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return
  event.preventDefault()
  sendMessage()
}

const sendMessage = async () => {
  const content = input.value.trim()
  if (!content && attachments.value.length === 0) {
    ElMessage.warning('请输入问题或添加附件')
    return
  }
  if (!status.value.enabled) {
    ElMessage.warning('管理员暂未启用智能 AI')
    return
  }

  const sentAttachments = attachments.value.map(item => ({ ...item }))
  messages.value.push({ role: 'user', content: content || '请分析这些附件。', attachments: sentAttachments })
  input.value = ''
  attachments.value = []
  sending.value = true
  scrollToBottom()

  try {
    const payloadMessages = messages.value.map(item => ({
      role: item.role,
      content: item.content,
      attachments: item.attachments || []
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
    border: 1px solid rgba(226, 232, 240, 0.9);
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
  }

  .ai-side {
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      inset: 0 0 auto;
      height: 96px;
      background: linear-gradient(135deg, rgba(64, 158, 255, 0.16), rgba(34, 197, 94, 0.12));
      pointer-events: none;
    }

    > * {
      position: relative;
    }
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
      background:
        radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.55), transparent 32%),
        linear-gradient(135deg, #1677ff, #22c55e);
      box-shadow: 0 12px 24px rgba(22, 119, 255, 0.28);
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
    background: linear-gradient(180deg, #ffffff, #f8fafc);
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

    .quick-title {
      color: #64748b;
      font-size: 13px;
      font-weight: 600;
    }

    button {
      width: 100%;
      text-align: left;
      border: 1px solid #e5e7eb;
      background: #fff;
      color: #374151;
      border-radius: 8px;
      padding: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;

      &:hover {
        border-color: #409eff;
        color: #1677ff;
        background: #f0f7ff;
        transform: translateY(-1px);
        box-shadow: 0 10px 22px rgba(22, 119, 255, 0.09);
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
    background: linear-gradient(180deg, #ffffff, #fbfdff);

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
    background:
      radial-gradient(circle at 50% 12%, rgba(64, 158, 255, 0.08), transparent 24%),
      linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
  }

  .empty-chat {
    height: 100%;
    min-height: 360px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: #94a3b8;

    .empty-icon {
      width: 72px;
      height: 72px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      color: #409eff;
      font-size: 32px;
      background: linear-gradient(135deg, rgba(64, 158, 255, 0.15), rgba(34, 197, 94, 0.12));
      border: 1px solid rgba(64, 158, 255, 0.18);
    }

    h3 {
      margin: 0 0 8px;
      color: #334155;
      font-size: 18px;
    }

    p {
      width: min(520px, 90%);
      margin: 0;
      color: #94a3b8;
      line-height: 1.7;
      font-size: 14px;
    }
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

  .message-attachments {
    display: grid;
    gap: 8px;
    margin-top: 10px;
  }

  .message-file {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    max-width: 280px;
    padding: 7px 9px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.16);
    border: 1px solid rgba(255, 255, 255, 0.24);

    img {
      width: 42px;
      height: 42px;
      object-fit: cover;
      border-radius: 6px;
    }

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
    }
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
    background: linear-gradient(180deg, #ffffff, #f8fbff);

    :deep(.el-textarea__inner) {
      min-height: 88px !important;
      border-radius: 8px;
      border-color: #dbe4f0;
      background: rgba(248, 250, 252, 0.8);
      box-shadow: none;
      transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;

      &:focus {
        border-color: #409eff;
        background: #fff;
        box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.12);
      }
    }
  }

  .attachment-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 12px;
  }

  .attachment-chip {
    display: flex;
    align-items: center;
    gap: 9px;
    max-width: 310px;
    min-height: 50px;
    padding: 7px 8px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #f8fafc;

    img {
      width: 38px;
      height: 38px;
      object-fit: cover;
      border-radius: 6px;
    }

    > div {
      min-width: 0;
      flex: 1;
    }

    strong,
    span {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    strong {
      color: #111827;
      font-size: 13px;
      font-weight: 600;
    }

    span {
      color: #6b7280;
      font-size: 12px;
    }
  }

  .hidden-file-input {
    display: none;
  }

  .send-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 12px;
  }

  .upload-actions,
  .primary-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .tool-btn {
    width: 42px;
    height: 38px;
    padding: 0;
    border-radius: 8px;
    border-color: #dbe4f0;
    color: #1677ff;
    background: #fff;

    &:hover,
    &:focus {
      border-color: #409eff;
      color: #1677ff;
      background: #f0f7ff;
    }
  }

  .clear-btn {
    border-radius: 8px;
    border-color: #dbe4f0;
    color: #64748b;
  }

  .send-btn {
    min-width: 92px;
    border-radius: 8px;
    border: none;
    background: linear-gradient(135deg, #409eff, #1677ff);
    box-shadow: 0 10px 22px rgba(22, 119, 255, 0.24);
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

    .send-actions {
      flex-wrap: wrap;
      align-items: stretch;

      .el-button {
        flex: 1;
      }

      .upload-actions,
      .primary-actions {
        width: 100%;
      }
    }
  }
}
</style>
