<template>
  <div class="chat-page">
    <el-card class="chat-card" body-style="padding: 0;">
      <div class="chat-layout">
        <!-- 左侧会话列表 -->
        <div class="chat-sidebar">
          <div class="sidebar-header">
            <span>会话列表</span>
            <el-tooltip content="刷新会话">
              <el-button text @click="loadConversations">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
          <div class="sidebar-tabs">
            <div
              :class="['tab', { active: filterType === 'all' }]"
              @click="filterType = 'all'"
            >全部</div>
            <div
              :class="['tab', { active: filterType === 'user' }]"
              @click="filterType = 'user'"
            >好友</div>
            <div
              :class="['tab', { active: filterType === 'group' }]"
              @click="filterType = 'group'"
            >群聊</div>
          </div>
          <div class="conv-list">
            <div
              v-for="c in filteredConversations"
              :key="`${c.type}-${c.id}`"
              :class="['conv-item', { active: isActive(c) }]"
              @click="selectConversation(c)"
            >
              <el-avatar v-if="c.type === 'user'" :size="40" :src="c.avatar">
                {{ c.name?.charAt(0) }}
              </el-avatar>
              <div v-else class="group-avatar">
                <el-icon size="22"><ChatRound /></el-icon>
              </div>
              <div class="conv-info">
                <div class="conv-top">
                  <span class="conv-name">{{ c.name }}</span>
                  <span class="conv-time" v-if="c.last_message_at">{{ formatShort(c.last_message_at) }}</span>
                </div>
                <div class="conv-bottom">
                  <span class="conv-msg">{{ c.last_message || (c.type === 'group' ? `${c.member_count} 位成员` : '@' + c.username) }}</span>
                </div>
              </div>
            </div>
            <el-empty v-if="filteredConversations.length === 0" description="暂无会话" :image-size="80" />
          </div>
        </div>

        <!-- 右侧消息流 -->
        <div class="chat-main">
          <div v-if="!current" class="empty-chat">
            <el-empty description="选择一个好友或群聊开始聊天" />
          </div>
          <template v-else>
            <div class="chat-header">
              <span class="chat-title">{{ current.name }}</span>
              <span class="chat-meta" v-if="current.type === 'group'">{{ current.member_count }} 位成员</span>
              <span class="chat-meta" v-else>@{{ current.username }}</span>
            </div>
            <div ref="messagesScroll" class="messages-area">
              <div v-if="messages.length === 0" class="no-messages">
                <el-icon size="40"><ChatLineRound /></el-icon>
                <p>开始你们的对话吧</p>
              </div>
              <div
                v-for="m in messages"
                :key="m.id"
                :class="['message-row', { mine: m.sender_id === myId }]"
              >
                <el-avatar :size="36" :src="m.sender_avatar" class="msg-avatar">
                  {{ m.sender_name?.charAt(0) }}
                </el-avatar>
                <div class="message-bubble-wrap">
                  <div class="msg-meta">
                    <span class="msg-name">{{ m.sender_name }}</span>
                    <span class="msg-time">{{ formatTime(m.created_at) }}</span>
                  </div>
                  <div :class="['message-bubble', { 'is-image': isImageMsg(m.content) }]">
                    <el-image
                      v-if="isImageMsg(m.content)"
                      :src="parseImageUrl(m.content)"
                      :preview-src-list="[parseImageUrl(m.content)]"
                      :preview-teleported="true"
                      fit="contain"
                      class="msg-image"
                    />
                    <template v-else>{{ m.content }}</template>
                  </div>
                </div>
              </div>
            </div>
            <div class="composer">
              <div class="composer-tools">
                <el-popover
                  placement="top-start"
                  :width="280"
                  trigger="click"
                  popper-class="emoji-popover"
                >
                  <template #reference>
                    <el-button text class="tool-btn" title="表情">
                      <span class="tool-emoji">😀</span>
                    </el-button>
                  </template>
                  <div class="emoji-grid">
                    <span
                      v-for="e in emojiList"
                      :key="e"
                      class="emoji-item"
                      @click="appendEmoji(e)"
                    >{{ e }}</span>
                  </div>
                </el-popover>
                <el-button text class="tool-btn" title="发送图片" :loading="uploading" @click="pickImage">
                  <el-icon size="18"><Picture /></el-icon>
                </el-button>
                <input
                  ref="imageInput"
                  type="file"
                  accept="image/*"
                  style="display:none"
                  @change="onImageSelected"
                />
              </div>
              <div class="composer-row">
                <el-input
                  v-model="draft"
                  type="textarea"
                  :rows="2"
                  resize="none"
                  placeholder="输入消息,Enter 发送,Shift+Enter 换行"
                  @keydown.enter="onEnter"
                />
                <el-button type="primary" @click="onSend" :loading="sending" :disabled="!draft.trim()">
                  发送
                </el-button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import {
  getFriends,
  getMyGroups,
  getUserChat,
  getGroupChat,
  sendMessage,
  markChatRead
} from '@/api/social'
import { uploadImage } from '@/api/profile'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const myId = userStore.userInfo.id

const friends = ref([])
const groups = ref([])
const filterType = ref('all')
const current = ref(null)
const messages = ref([])
const draft = ref('')
const sending = ref(false)
const messagesScroll = ref()
const uploading = ref(false)
const imageInput = ref()
let pollTimer = null
let convPollTimer = null

const emojiList = [
  '😀','😁','😂','🤣','😃','😄','😅','😆',
  '😉','😊','😍','😘','😗','😜','🤪','😎',
  '🤩','🥳','😏','😒','😞','😔','😟','😕',
  '🙁','😢','😭','😤','😠','😡','🤬','🤯',
  '😱','😨','😰','😥','😓','🤗','🤔','🤭',
  '🤫','🤥','😶','😐','😑','😬','🙄','😯',
  '😪','😴','🤤','😋','😛','🤑','🤠','😈',
  '👍','👎','👌','✌️','🤞','🤟','🤘','👏',
  '🙏','💪','❤️','💔','💯','🔥','✨','🎉',
  '🎊','🎁','🌹','🌸','🌟','⭐','☀️','🌈'
]

const conversations = computed(() => {
  const a = friends.value.map(f => ({
    type: 'user',
    id: f.id,
    name: f.name,
    username: f.username,
    avatar: f.avatar,
    last_message: f.last_message,
    last_message_at: f.last_message_at
  }))
  const b = groups.value.map(g => ({
    type: 'group',
    id: g.id,
    name: g.name,
    member_count: g.member_count,
    last_message: g.last_message,
    last_message_at: g.last_message_at
  }))
  return [...a, ...b].sort((x, y) => {
    const tx = x.last_message_at ? dayjs(x.last_message_at).valueOf() : 0
    const ty = y.last_message_at ? dayjs(y.last_message_at).valueOf() : 0
    return ty - tx
  })
})

const filteredConversations = computed(() => {
  if (filterType.value === 'all') return conversations.value
  return conversations.value.filter(c => c.type === filterType.value)
})

const isActive = (c) => current.value && current.value.type === c.type && current.value.id === c.id

const formatShort = (t) => {
  if (!t) return ''
  const m = dayjs(t)
  return m.isSame(dayjs(), 'day') ? m.format('HH:mm') : m.format('MM-DD')
}
const formatTime = (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : ''

// 图片消息标记: [img]URL[/img]
const IMG_RE = /^\[img\](.+?)\[\/img\]$/
const isImageMsg = (content) => typeof content === 'string' && IMG_RE.test(content.trim())
const parseImageUrl = (content) => {
  if (!content) return ''
  const m = content.trim().match(IMG_RE)
  return m ? m[1] : ''
}

const appendEmoji = (e) => {
  draft.value = (draft.value || '') + e
}

const pickImage = () => {
  if (!current.value) {
    ElMessage.warning('请先选择会话')
    return
  }
  imageInput.value && imageInput.value.click()
}

const onImageSelected = async (e) => {
  const file = e.target.files && e.target.files[0]
  // 重置 input,允许重新选择同一张图
  if (e.target) e.target.value = ''
  if (!file) return
  if (!/^image\//.test(file.type)) {
    ElMessage.warning('仅支持图片')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过 5MB')
    return
  }
  if (!current.value) return
  uploading.value = true
  try {
    const { data } = await uploadImage(file)
    const url = data && data.urls && data.urls[0]
    if (!url) {
      ElMessage.error('图片上传失败')
      return
    }
    const content = `[img]${url}[/img]`
    const { data: msg } = await sendMessage(current.value.type, current.value.id, content)
    messages.value.push(msg)
    await nextTick()
    scrollToBottom()
    loadConversations()
  } catch (err) {
    // intercepted
  } finally {
    uploading.value = false
  }
}

const loadConversations = async () => {
  const [{ data: f }, { data: g }] = await Promise.all([getFriends(), getMyGroups()])
  friends.value = f || []
  groups.value = g || []
}

const lastIdSeen = computed(() => messages.value.length ? messages.value[messages.value.length - 1].id : 0)

const fetchMessages = async (incremental = false) => {
  if (!current.value) return
  const afterId = incremental ? lastIdSeen.value : 0
  const fn = current.value.type === 'user' ? getUserChat : getGroupChat
  try {
    const { data } = await fn(current.value.id, afterId)
    if (incremental) {
      if (data && data.length) {
        messages.value = [...messages.value, ...data]
        await nextTick()
        scrollToBottom()
        markRead()
      }
    } else {
      messages.value = data || []
      await nextTick()
      scrollToBottom()
      markRead()
    }
  } catch (e) {
    // intercepted
  }
}

const markRead = async () => {
  if (!current.value || !messages.value.length) return
  const lastId = messages.value[messages.value.length - 1].id
  try {
    await markChatRead(current.value.type, current.value.id, lastId)
  } catch (e) {
    // 忽略
  }
}

const scrollToBottom = () => {
  if (messagesScroll.value) {
    messagesScroll.value.scrollTop = messagesScroll.value.scrollHeight
  }
}

const selectConversation = async (c) => {
  current.value = c
  messages.value = []
  // 同步 URL
  router.replace({ path: route.path, query: { type: c.type, id: c.id } })
  await fetchMessages(false)
  startPolling()
}

const startPolling = () => {
  stopPolling()
  pollTimer = setInterval(() => {
    if (current.value) fetchMessages(true)
  }, 5000)
}

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

const onSend = async () => {
  const text = draft.value.trim()
  if (!text || !current.value) return
  sending.value = true
  try {
    const { data } = await sendMessage(current.value.type, current.value.id, text)
    messages.value.push(data)
    draft.value = ''
    await nextTick()
    scrollToBottom()
    // 异步刷新左侧会话(更新 last_message)
    loadConversations()
  } catch (e) {
    // intercepted
  } finally {
    sending.value = false
  }
}

const onEnter = (e) => {
  if (e.shiftKey) return
  e.preventDefault()
  onSend()
}

const tryPickFromQuery = () => {
  const type = route.query.type
  const id = Number(route.query.id)
  if (!type || !id) return
  const c = conversations.value.find(x => x.type === type && x.id === id)
  if (c) selectConversation(c)
}

watch(() => route.query, () => {
  // 路径相同但 query 变化时重新选择
  if (route.query.type && route.query.id) tryPickFromQuery()
})

onMounted(async () => {
  await loadConversations()
  if (route.query.type && route.query.id) {
    tryPickFromQuery()
  } else if (conversations.value.length) {
    selectConversation(conversations.value[0])
  }
  // 顺便起一个 30s 的会话列表轮询(为了拿最新 last_message)
  convPollTimer = setInterval(loadConversations, 30000)
})

onBeforeUnmount(() => {
  stopPolling()
  if (convPollTimer) clearInterval(convPollTimer)
})
</script>

<style scoped lang="scss">
.chat-page {
  .chat-card {
    height: calc(100vh - 110px);
  }
  .chat-layout {
    display: flex;
    height: 100%;
  }
  .chat-sidebar {
    width: 280px;
    border-right: 1px solid #ebeef5;
    display: flex;
    flex-direction: column;
    background: #fafafa;
    .sidebar-header {
      padding: 12px 16px;
      font-weight: 600;
      font-size: 15px;
      border-bottom: 1px solid #ebeef5;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .sidebar-tabs {
      display: flex;
      padding: 8px;
      gap: 6px;
      border-bottom: 1px solid #ebeef5;
      .tab {
        flex: 1;
        text-align: center;
        font-size: 13px;
        padding: 6px 0;
        border-radius: 16px;
        cursor: pointer;
        color: #606266;
        &:hover {
          background: #ecf0fe;
        }
        &.active {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: #fff;
        }
      }
    }
    .conv-list {
      flex: 1;
      overflow-y: auto;
    }
    .conv-item {
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      border-bottom: 1px solid #f0f2f5;
      transition: background 0.2s;
      &:hover { background: #f0f0fc; }
      &.active {
        background: linear-gradient(90deg, rgba(102,126,234,0.18), rgba(118,75,162,0.12));
      }
      .group-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .conv-info {
        flex: 1;
        min-width: 0;
        .conv-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          .conv-name {
            font-weight: 600;
            color: #303133;
            font-size: 14px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .conv-time {
            font-size: 11px;
            color: #c0c4cc;
            flex-shrink: 0;
            margin-left: 6px;
          }
        }
        .conv-bottom {
          margin-top: 3px;
          .conv-msg {
            font-size: 12px;
            color: #909399;
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }
    }
  }
  .chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    .empty-chat {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .chat-header {
      padding: 14px 20px;
      border-bottom: 1px solid #ebeef5;
      display: flex;
      align-items: center;
      gap: 10px;
      .chat-title {
        font-weight: 600;
        font-size: 16px;
      }
      .chat-meta {
        color: #909399;
        font-size: 12px;
      }
    }
    .messages-area {
      flex: 1;
      overflow-y: auto;
      padding: 16px 20px;
      background: #f7f8fa;
      .no-messages {
        text-align: center;
        margin-top: 80px;
        color: #c0c4cc;
        p { margin-top: 8px; font-size: 14px; }
      }
    }
    .message-row {
      display: flex;
      gap: 8px;
      margin-bottom: 14px;
      &.mine {
        flex-direction: row-reverse;
        .message-bubble-wrap { align-items: flex-end; }
        .msg-meta { flex-direction: row-reverse; }
        .message-bubble {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
        }
      }
      .message-bubble-wrap {
        display: flex;
        flex-direction: column;
        max-width: 70%;
      }
      .msg-meta {
        display: flex;
        gap: 8px;
        align-items: center;
        font-size: 11px;
        color: #c0c4cc;
        margin-bottom: 3px;
        .msg-name { font-weight: 500; color: #909399; }
      }
      .message-bubble {
        padding: 10px 14px;
        border-radius: 12px;
        background: #fff;
        color: #303133;
        font-size: 14px;
        line-height: 1.6;
        word-break: break-word;
        white-space: pre-wrap;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        &.is-image {
          padding: 4px;
          background: transparent !important;
          box-shadow: none;
        }
        .msg-image {
          max-width: 220px;
          max-height: 220px;
          border-radius: 8px;
          display: block;
          cursor: zoom-in;
          background: #f0f2f5;
        }
      }
    }
    .composer {
      border-top: 1px solid #ebeef5;
      padding: 8px 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      .composer-tools {
        display: flex;
        align-items: center;
        gap: 4px;
        .tool-btn {
          padding: 4px 8px;
          height: 30px;
          .tool-emoji {
            font-size: 18px;
            line-height: 1;
          }
        }
      }
      .composer-row {
        display: flex;
        gap: 12px;
        align-items: flex-end;
      }
      :deep(.el-textarea) {
        flex: 1;
      }
    }
  }
}
.emoji-popover {
  .emoji-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 4px;
    max-height: 240px;
    overflow-y: auto;
    .emoji-item {
      font-size: 22px;
      text-align: center;
      cursor: pointer;
      padding: 4px 0;
      border-radius: 6px;
      transition: background 0.15s;
      user-select: none;
      &:hover {
        background: #f0f2f5;
      }
    }
  }
}
</style>
