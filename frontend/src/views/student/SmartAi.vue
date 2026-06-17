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
        <span>累计 Token</span>
        <strong>{{ status.usage?.total_tokens || 0 }}</strong>
        <p>{{ status.usage?.request_count || 0 }} 次 Agent 会话</p>
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
          <h3>校园 Agent</h3>
          <span v-if="status.enabled">当前模型：{{ status.model }}</span>
          <span v-else>{{ status.message || '管理员暂未启用智能 AI' }}</span>
        </div>
        <el-button circle class="refresh-button" title="刷新 AI 状态" aria-label="刷新 AI 状态" @click="refreshStatus">
          <el-icon><RefreshRight /></el-icon>
        </el-button>
      </div>

      <div class="message-stage">
        <div ref="messageBoxRef" class="message-box">
          <div v-if="messages.length === 0" class="empty-chat">
            <div class="empty-icon">
              <el-icon><MagicStick /></el-icon>
            </div>
            <h3>开始一次新的 Agent 对话</h3>
            <p>可以查询课表、作业、成绩、考勤、公告和活动，也可以继续上传图片或文件让 AI 分析。</p>
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
            </div>
          </div>
        </div>

        <div v-if="curtainVisible" class="agent-curtain" :class="{ opening: curtainOpening }">
          <div class="curtain-panel curtain-top"></div>
          <div class="curtain-panel curtain-bottom"></div>
          <div class="curtain-center">
            <div class="chatgpt-loader" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <i>GPT</i>
            </div>
            <div class="curtain-status">
              <strong>Agent 正在运行</strong>
              <span>{{ thinkingCopy }}</span>
            </div>
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
          placeholder="问 Agent：今天有什么课、还有哪些作业没交、最近成绩怎么样..."
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

    <aside class="agent-side">
      <div class="agent-side-head">
        <div>
          <h3>执行详情</h3>
          <span>{{ latestAssistant ? '最近一次回答' : '等待 Agent 响应' }}</span>
        </div>
        <div class="panel-switch">
          <button type="button" :class="{ active: rightPanelTab === 'trace' }" @click="rightPanelTab = 'trace'">
            调用记录
          </button>
          <button type="button" :class="{ active: rightPanelTab === 'tools' }" @click="rightPanelTab = 'tools'">
            工具清单
          </button>
        </div>
      </div>

      <template v-if="rightPanelTab === 'trace'">
        <div class="usage-grid">
          <div v-if="latestUsage" class="usage-detail">
            <div>
              <span>总计</span>
              <strong>{{ latestUsage.total_tokens || 0 }}</strong>
            </div>
            <div>
              <span>输入</span>
              <strong>{{ latestUsage.prompt_tokens || 0 }}</strong>
            </div>
            <div>
              <span>输出</span>
              <strong>{{ latestUsage.completion_tokens || 0 }}</strong>
            </div>
          </div>
          <el-empty v-else description="暂无消耗记录" :image-size="70" />
        </div>

        <div class="trace-summary">
          <div class="trace-summary-head">
            <span>工具调用轨迹</span>
            <strong>{{ latestToolTrace.length }} 步</strong>
          </div>
          <div v-if="visibleToolTrace.length" class="tool-trace">
            <div
              v-for="(trace, traceIndex) in visibleToolTrace"
              :key="traceIndex"
              class="trace-item"
              :class="trace.type"
            >
              <div class="trace-dot"></div>
              <div class="trace-body">
                <strong>{{ getTraceTitle(trace) }}</strong>
                <span>{{ getTraceDesc(trace) }}</span>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无工具调用" :image-size="70" />
        </div>
      </template>

      <template v-else>
        <div class="agent-tool-list">
          <div class="tool-list-head">
            <span>可调用工具</span>
            <strong>{{ Object.keys(toolLabels).length }} 项</strong>
          </div>
          <div class="tool-grid">
            <div v-for="item in toolEntries" :key="item.key" class="agent-tool">
              <strong>{{ item.label }}</strong>
              <span>{{ item.key }}</span>
            </div>
          </div>
        </div>
      </template>
    </aside>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { chatWithAgent, getAiStatus } from '@/api/student'

const MAX_ATTACHMENTS = 6
const MAX_FILE_SIZE = 2 * 1024 * 1024
const TEXT_EXTENSIONS = ['txt', 'md', 'json', 'csv', 'log', 'js', 'ts', 'vue', 'py', 'java', 'c', 'cpp', 'h', 'html', 'css', 'xml', 'yaml', 'yml']
const SPREADSHEET_EXTENSIONS = ['xls', 'xlsx']

const status = ref({ enabled: false, usage: {} })
const messages = ref([])
const input = ref('')
const sending = ref(false)
const thinkingStep = ref(0)
const thinkingTimer = ref(null)
const curtainTimer = ref(null)
const curtainVisible = ref(false)
const curtainOpening = ref(false)
const rightPanelTab = ref('trace')
const attachments = ref([])
const messageBoxRef = ref()
const photoInputRef = ref()
const fileInputRef = ref()

const prompts = [
  '我今天有什么课？',
  '还有哪些作业没交？',
  '最近成绩怎么样？',
  '帮我制定今天的学习计划',
  '我的综测分和加分记录怎么样？',
  '最近有哪些适合我报名的活动？'
]

const toolLabels = {
  get_student_profile: '个人档案',
  get_today_schedule: '今日课表',
  get_pending_homework: '待交作业',
  get_recent_grades: '最近成绩',
  get_my_attendance: '考勤记录',
  get_notices: '最新公告',
  get_available_activities: '可报名活动',
  get_activity_detail: '活动详情',
  get_my_activities: '我的活动',
  get_my_assessment: '综测成绩',
  get_my_score_records: '加分明细',
  get_my_leave_requests: '请假记录',
  get_classmates: '同学信息',
  get_college_major_map: '学院专业',
  draft_leave_request: '请假草稿'
}

const toolEntries = computed(() => Object.entries(toolLabels).map(([key, label]) => ({ key, label })))

const latestAssistant = computed(() => {
  return [...messages.value].reverse().find(item => item.role === 'assistant') || null
})

const latestUsage = computed(() => latestAssistant.value?.usage || null)
const latestToolTrace = computed(() => latestAssistant.value?.toolTrace || [])
const visibleToolTrace = computed(() => latestToolTrace.value.slice(-6))
const thinkingCopy = computed(() => {
  if (!sending.value) return '等待回答'
  const steps = ['正在理解问题', '正在检索工具', '正在生成回复']
  return steps[thinkingStep.value] || steps[0]
})

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

const startThinking = () => {
  if (thinkingTimer.value) {
    clearInterval(thinkingTimer.value)
    thinkingTimer.value = null
  }
  if (curtainTimer.value) {
    clearTimeout(curtainTimer.value)
    curtainTimer.value = null
  }
  curtainVisible.value = true
  curtainOpening.value = false
  thinkingStep.value = 0
  thinkingTimer.value = setInterval(() => {
    thinkingStep.value = (thinkingStep.value + 1) % 3
  }, 900)
}

const stopThinking = () => {
  if (thinkingTimer.value) {
    clearInterval(thinkingTimer.value)
    thinkingTimer.value = null
  }
  thinkingStep.value = 0
  if (!curtainVisible.value) return
  curtainOpening.value = true
  curtainTimer.value = setTimeout(() => {
    curtainVisible.value = false
    curtainOpening.value = false
    curtainTimer.value = null
  }, 680)
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

const getTraceTitle = (trace) => {
  if (trace.type === 'tool') return `调用工具：${toolLabels[trace.tool] || trace.tool}`
  return '生成最终回答'
}

const getTraceDesc = (trace) => {
  if (trace.type === 'tool') {
    const args = JSON.stringify(trace.args || {})
    return `第 ${trace.round || 1} 轮 · 参数 ${args}`
  }
  return `第 ${trace.round || 1} 轮 · 消耗 ${trace.usage?.total_tokens || 0} tokens`
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
  startThinking()
  scrollToBottom()

  try {
    const payloadMessages = messages.value.map(item => ({
      role: item.role,
      content: item.content,
      attachments: item.attachments || []
    }))
    const { data } = await chatWithAgent({ messages: payloadMessages })
    messages.value.push({
      role: 'assistant',
      content: data.answer,
      usage: data.usage,
      toolTrace: data.tool_trace || []
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
    stopThinking()
    scrollToBottom()
  }
}

refreshStatus()

onBeforeUnmount(() => {
  if (thinkingTimer.value) clearInterval(thinkingTimer.value)
  if (curtainTimer.value) clearTimeout(curtainTimer.value)
})
</script>

<style scoped lang="scss">
.smart-ai-page {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) 300px;
  gap: 18px;
  height: calc(100vh - 110px);
  min-height: 620px;
  overflow: hidden;

  .ai-side,
  .chat-panel,
  .agent-side {
    background: #fff;
    border-radius: 8px;
    border: 1px solid rgba(226, 232, 240, 0.9);
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
  }

  .ai-side,
  .agent-side {
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
    min-height: 0;
  }

  .ai-side {
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      inset: 0 0 auto;
      height: 92px;
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
    gap: 12px;

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
    padding: 16px;
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
    min-height: 0;
    overflow: hidden;

    .quick-title {
      color: #64748b;
      font-size: 13px;
      font-weight: 600;
    }

    button {
      width: 100%;
      min-height: 46px;
      text-align: left;
      border: 1px solid #e5e7eb;
      background: #fff;
      color: #374151;
      border-radius: 8px;
      padding: 10px 12px;
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
    min-height: 0;
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

    .refresh-button {
      width: 38px !important;
      min-width: 38px !important;
      max-width: 38px !important;
      height: 38px !important;
      min-height: 38px !important;
      max-height: 38px !important;
      padding: 0 !important;
      flex: 0 0 38px;
      border-radius: 50% !important;
      color: #64748b;
      background: #fff;
      box-shadow: 0 5px 14px rgba(15, 23, 42, 0.07);

      &:hover,
      &:focus {
        color: #2563eb;
        border-color: #bfd4ef;
        background: #f5f9ff;
      }
    }
  }

  .message-stage {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .message-box {
    height: 100%;
    padding: 22px;
    overflow-y: auto;
    overscroll-behavior: contain;
    background:
      radial-gradient(circle at 50% 12%, rgba(64, 158, 255, 0.08), transparent 24%),
      linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);

    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.38);
    }
  }

  .agent-curtain {
    position: absolute;
    inset: 0;
    z-index: 4;
    overflow: hidden;
    pointer-events: none;
    background:
      radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.12), transparent 26%),
      radial-gradient(circle at 50% 35%, rgba(22, 119, 255, 0.16), transparent 32%);
  }

  .agent-curtain::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: calc(50% - 2px);
    z-index: 1;
    height: 4px;
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.99), rgba(30, 41, 59, 0.98));
    box-shadow: 0 0 18px rgba(22, 119, 255, 0.2);
    animation: curtainSeamClose 0.48s cubic-bezier(0.2, 0.85, 0.25, 1) both;
  }

  .curtain-panel {
    position: absolute;
    left: 0;
    width: 100%;
    height: calc(50% + 2px);
    background:
      linear-gradient(90deg, rgba(22, 119, 255, 0.12) 0 1px, transparent 1px 42px),
      linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 46%),
      linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.96));
    border-color: rgba(96, 165, 250, 0.36);
    box-shadow: 0 0 32px rgba(22, 119, 255, 0.18);
    animation-duration: 0.48s;
    animation-timing-function: cubic-bezier(0.2, 0.85, 0.25, 1);
    animation-fill-mode: both;
  }

  .curtain-top {
    top: 0;
    animation-name: curtainTopClose;
  }

  .curtain-bottom {
    bottom: 0;
    animation-name: curtainBottomClose;
  }

  .agent-curtain.opening {
    animation: curtainFade 0.68s ease forwards;

    &::after {
      animation: curtainSeamOpen 0.35s ease forwards;
    }

    .curtain-top {
      animation-name: curtainTopOpen;
      animation-duration: 0.68s;
    }

    .curtain-bottom {
      animation-name: curtainBottomOpen;
      animation-duration: 0.68s;
    }

    .curtain-center {
      animation: loaderExit 0.35s ease forwards;
    }
  }

  .curtain-center {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 18px;
    color: #e0f2fe;
  }

  .chatgpt-loader {
    position: relative;
    width: 84px;
    height: 84px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background:
      radial-gradient(circle, rgba(15, 23, 42, 0.95) 0 42%, transparent 44%),
      conic-gradient(from 90deg, #22c55e, #38bdf8, #2563eb, #22c55e);
    box-shadow:
      0 0 0 1px rgba(125, 211, 252, 0.34),
      0 0 36px rgba(56, 189, 248, 0.36),
      0 0 72px rgba(34, 197, 94, 0.18);
    animation: spinAgentIcon 1.5s linear infinite;

    &::before,
    &::after {
      content: '';
      position: absolute;
      inset: 10px;
      border-radius: 50%;
      border: 1px solid rgba(226, 232, 240, 0.52);
    }

    &::after {
      inset: 22px;
      border-color: rgba(34, 197, 94, 0.52);
      box-shadow: inset 0 0 16px rgba(56, 189, 248, 0.24);
    }

    span {
      position: absolute;
      width: 34px;
      height: 12px;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(226, 232, 240, 0.92), rgba(56, 189, 248, 0.78));
      transform-origin: 42px 6px;
      opacity: 0.9;

      &:nth-child(1) { transform: rotate(0deg) translateX(20px); }
      &:nth-child(2) { transform: rotate(60deg) translateX(20px); }
      &:nth-child(3) { transform: rotate(120deg) translateX(20px); }
      &:nth-child(4) { transform: rotate(180deg) translateX(20px); }
      &:nth-child(5) { transform: rotate(240deg) translateX(20px); }
      &:nth-child(6) { transform: rotate(300deg) translateX(20px); }
    }

    i {
      position: relative;
      z-index: 1;
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      color: #e0f2fe;
      background: rgba(15, 23, 42, 0.92);
      border: 1px solid rgba(226, 232, 240, 0.32);
      font-style: normal;
      font-weight: 800;
      font-size: 13px;
      animation: spinAgentIconReverse 1.5s linear infinite;
    }
  }

  .curtain-status {
    display: grid;
    gap: 6px;
    text-align: center;

    strong {
      color: #f8fafc;
      font-size: 18px;
      letter-spacing: 0;
    }

    span {
      color: #93c5fd;
      font-size: 13px;
    }
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

  .input-bar {
    flex: 0 0 auto;
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

  .agent-side-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;

    h3 {
      margin: 0 0 4px;
      color: #111827;
      font-size: 18px;
    }

    span {
      color: #64748b;
      font-size: 12px;
    }
  }

  .panel-switch {
    width: 100%;
    padding: 4px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    border-radius: 8px;
    background: #eef2f7;

    button {
      height: 32px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #64748b;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;

      &.active {
        color: #0f172a;
        background: #fff;
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
      }
    }
  }

  .usage-grid,
  .trace-summary,
  .agent-tool-list {
    min-width: 0;
  }

  .usage-detail {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;

    div {
      min-height: 62px;
      padding: 10px 12px;
      border-radius: 8px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92)),
        radial-gradient(circle at 100% 0, rgba(22, 119, 255, 0.18), transparent 34%);
      border: 1px solid #dbe4f0;
    }

    span {
      display: block;
      margin-bottom: 6px;
      color: #64748b;
      font-size: 12px;
    }

    strong {
      color: #111827;
      font-size: 20px;
      line-height: 1;
    }
  }

  .trace-summary {
    display: grid;
    gap: 12px;
    padding: 14px;
    border-radius: 8px;
    background:
      linear-gradient(180deg, rgba(248, 250, 252, 0.94), rgba(255, 255, 255, 0.96)),
      radial-gradient(circle at 0 0, rgba(34, 197, 94, 0.16), transparent 35%);
    border: 1px solid #e2e8f0;
    overflow: hidden;
  }

  .trace-summary-head,
  .tool-list-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #64748b;
    font-size: 13px;

    strong {
      color: #1677ff;
      font-size: 13px;
    }
  }

  .tool-trace {
    display: grid;
    gap: 10px;
    max-height: min(44vh, 360px);
    overflow-y: auto;
    padding-right: 2px;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.32);
    }
  }

  .trace-item {
    display: grid;
    grid-template-columns: 12px minmax(0, 1fr);
    gap: 8px;
    align-items: start;
    padding: 10px;
    border-radius: 8px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;

    &.tool .trace-dot {
      background: #1677ff;
    }

    &.final .trace-dot {
      background: #16a34a;
    }
  }

  .trace-dot {
    width: 8px;
    height: 8px;
    margin-top: 7px;
    border-radius: 50%;
    background: #94a3b8;
    box-shadow: 0 0 0 4px rgba(148, 163, 184, 0.14);
  }

  .trace-body {
    display: grid;
    gap: 2px;
    min-width: 0;

    strong {
      color: #1f2937;
      font-size: 13px;
    }

    span {
      color: #64748b;
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .agent-tool-list {
    display: grid;
    gap: 12px;
    padding: 14px;
    border-radius: 8px;
    background:
      linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.96)),
      radial-gradient(circle at 100% 0, rgba(22, 119, 255, 0.14), transparent 32%);
    border: 1px solid #e5e7eb;
    overflow: hidden;
  }

  .quick-title {
    color: #64748b;
    font-size: 13px;
    font-weight: 600;
  }

  .tool-grid {
    display: grid;
    gap: 8px;
    max-height: min(58vh, 470px);
    overflow-y: auto;
    padding-right: 2px;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.32);
    }
  }

  .agent-tool {
    min-height: 54px;
    display: grid;
    gap: 3px;
    align-content: center;
    padding: 8px 10px;
    border-radius: 8px;
    color: #334155;
    background: #fff;
    border: 1px solid #e2e8f0;
    font-size: 13px;

    strong {
      color: #1f2937;
      font-size: 13px;
    }

    span {
      color: #94a3b8;
      font-size: 11px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(22, 119, 255, 0.35); }
  70% { box-shadow: 0 0 0 8px rgba(22, 119, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(22, 119, 255, 0); }
}

@keyframes spinAgentIcon {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes spinAgentIconReverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}

@keyframes curtainTopClose {
  from { transform: translateY(-100%); }
  to { transform: translateY(0); }
}

@keyframes curtainBottomClose {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes curtainSeamClose {
  from { opacity: 0; transform: scaleX(0.96); }
  to { opacity: 1; transform: scaleX(1); }
}

@keyframes curtainSeamOpen {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes curtainTopOpen {
  from { transform: translateY(0); }
  to { transform: translateY(-102%); }
}

@keyframes curtainBottomOpen {
  from { transform: translateY(0); }
  to { transform: translateY(102%); }
}

@keyframes loaderExit {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.95); }
}

@keyframes curtainFade {
  from { opacity: 1; }
  to { opacity: 0; }
}

@media (max-width: 1200px) {
  .smart-ai-page {
    grid-template-columns: 240px minmax(0, 1fr);
    height: calc(100vh - 110px);

    .agent-side {
      grid-column: 1 / -1;
      order: 3;
    }

    .agent-tool-list,
    .tool-grid,
    .tool-trace {
      max-height: none;
    }
  }
}

@media (max-width: 900px) {
  .smart-ai-page {
    grid-template-columns: 1fr;
    height: calc(100vh - 110px);

    .ai-side {
      order: 2;
    }

    .chat-panel {
      order: 1;
    }

    .agent-side {
      order: 3;
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

    .usage-detail {
      grid-template-columns: 1fr;
    }
  }
}
</style>
