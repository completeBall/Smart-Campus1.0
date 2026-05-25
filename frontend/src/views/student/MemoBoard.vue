<template>
  <section class="memo-board">
    <el-card class="memo-card" shadow="hover">
      <template #header>
        <div class="memo-header">
          <div class="memo-title">
            <el-icon><Notebook /></el-icon>
            <span>学习备忘录</span>
            <el-tag size="small" round effect="plain" class="memo-count">{{ memos.length }} 条</el-tag>
          </div>
          <div class="memo-header-actions">
            <el-radio-group v-model="memoFilter" size="small" class="memo-filter">
              <el-radio-button label="all">全部</el-radio-button>
              <el-radio-button label="todo">待办</el-radio-button>
              <el-radio-button label="done">已完成</el-radio-button>
              <el-radio-button label="starred">星标</el-radio-button>
            </el-radio-group>
            <el-button type="primary" round @click="openEditor()">
              <el-icon><Plus /></el-icon>
              新建
            </el-button>
          </div>
        </div>
      </template>

      <div class="memo-summary">
        <div class="summary-item">
          <span class="summary-value">{{ todoCount }}</span>
          <span class="summary-label">待办</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">{{ doneCount }}</span>
          <span class="summary-label">已完成</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">{{ starredCount }}</span>
          <span class="summary-label">星标</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">{{ reminderCount }}</span>
          <span class="summary-label">提醒</span>
        </div>
      </div>

      <div v-if="filteredMemos.length === 0" class="memo-empty">
        <el-empty description="暂无备忘录，试试新建一条学习计划" :image-size="82" />
      </div>

      <div v-else class="memo-grid">
        <article
          v-for="memo in filteredMemos"
          :key="memo.id"
          class="memo-item"
          :class="memoItemClass(memo)"
        >
          <div class="memo-topline">
            <div class="memo-tags">
              <el-tag size="small" effect="plain" :type="memo.done ? 'success' : 'info'">
                {{ memo.done ? '已完成' : '待办' }}
              </el-tag>
              <el-tag v-if="memo.starred" size="small" type="warning" effect="dark">星标</el-tag>
              <el-tag size="small" :type="getMemoState(memo).type" effect="plain">
                {{ getMemoState(memo).label }}
              </el-tag>
            </div>
            <div class="memo-actions">
              <el-tooltip content="星标置顶" placement="top">
                <el-button link class="action-btn" @click="toggleStar(memo)">
                  <el-icon><component :is="memo.starred ? 'StarFilled' : 'Star'" /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="编辑" placement="top">
                <el-button link class="action-btn" @click="openEditor(memo)">
                  <el-icon><Edit /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除" placement="top">
                <el-button link type="danger" class="action-btn" @click="deleteMemo(memo)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </div>

          <div class="memo-content">
            <button
              type="button"
              class="memo-check"
              :class="{ checked: memo.done }"
              :aria-label="memo.done ? '标记为未完成' : '标记为已完成'"
              @click="toggleDone(memo)"
            >
              <el-icon v-if="memo.done"><Check /></el-icon>
            </button>
            <div class="memo-body">
              <div class="memo-text">{{ memo.text }}</div>
              <div class="memo-meta">
                <div class="meta-line">
                  <el-icon><Calendar /></el-icon>
                  <span>开始 {{ formatTime(memo.start_at) }}</span>
                </div>
                <div class="meta-line">
                  <el-icon><Timer /></el-icon>
                  <span>截止 {{ formatTime(memo.deadline_at) }}</span>
                </div>
                <div class="meta-line">
                  <el-icon><Bell /></el-icon>
                  <span>提醒 {{ memo.reminders.length }} 次</span>
                </div>
              </div>
              <div v-if="memo.reminders.length" class="reminder-list">
                <div
                  v-for="reminder in memo.reminders"
                  :key="reminder.id"
                  class="reminder-chip"
                  :class="{ fired: reminder.firedAt }"
                >
                  <el-icon><AlarmClock /></el-icon>
                  <span>{{ formatTime(reminder.datetime) }}</span>
                  <el-tag size="small" type="info" effect="plain">{{ repeatLabel(reminder.repeatMode) }}</el-tag>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </el-card>

    <el-dialog
      v-model="editorVisible"
      :title="editorMode === 'edit' ? '编辑备忘录' : '新建备忘录'"
      width="760px"
      :close-on-click-modal="false"
      class="memo-dialog"
    >
      <el-form label-width="88px" class="memo-form">
        <el-form-item label="内容">
          <el-input
            v-model="editorForm.text"
            type="textarea"
            :rows="3"
            maxlength="120"
            show-word-limit
            placeholder="写下要记住的学习任务、截止事项或待办提醒"
          />
        </el-form-item>

        <el-row :gutter="14" class="time-row">
          <el-col :span="12">
            <el-form-item label="开始时间">
              <el-date-picker
                v-model="editorForm.startAt"
                type="datetime"
                placeholder="选择开始时间"
                value-format="YYYY-MM-DD HH:mm:ss"
                format="YYYY-MM-DD HH:mm"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="截止时间">
              <el-date-picker
                v-model="editorForm.deadlineAt"
                type="datetime"
                placeholder="选择截止时间"
                value-format="YYYY-MM-DD HH:mm:ss"
                format="YYYY-MM-DD HH:mm"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="14">
          <el-col :span="12">
            <el-form-item label="颜色">
              <el-select v-model="editorForm.color" style="width: 100%">
                <el-option v-for="item in memoColors" :key="item.value" :label="item.label" :value="item.value">
                  <span class="color-dot" :style="{ background: item.color }"></span>
                  {{ item.label }}
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="星标">
              <el-switch
                v-model="editorForm.starred"
                inline-prompt
                active-text="置顶"
                inactive-text="普通"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="14">
          <el-col :span="12">
            <el-form-item label="状态">
              <el-switch
                v-model="editorForm.done"
                inline-prompt
                active-text="已完成"
                inactive-text="待办"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <div class="reminder-box">
          <div class="reminder-head">
            <div>
              <div class="section-title">重复提醒</div>
              <div class="section-tip">可为同一条待办添加多个提醒时间，也可以设置按天或按周重复提醒。</div>
            </div>
            <el-button link type="primary" @click="addReminderRow">
              <el-icon><Plus /></el-icon>
              添加提醒
            </el-button>
          </div>

          <div v-if="editorForm.reminders.length === 0" class="reminder-empty">
            还没有设置提醒，点右上角可以补上第一条
          </div>

          <div v-else class="reminder-editor-list">
            <div v-for="(reminder, index) in editorForm.reminders" :key="reminder.localId" class="reminder-editor-row">
              <el-date-picker
                v-model="reminder.datetime"
                type="datetime"
                placeholder="提醒时间"
                value-format="YYYY-MM-DD HH:mm:ss"
                format="YYYY-MM-DD HH:mm"
                style="flex: 1"
              />
              <el-select v-model="reminder.repeatMode" style="width: 128px">
                <el-option label="只提醒一次" value="once" />
                <el-option label="每天重复" value="daily" />
                <el-option label="每周重复" value="weekly" />
              </el-select>
              <el-button link type="danger" @click="removeReminderRow(index)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="editorVisible = false">取消</el-button>
        <el-button type="primary" round @click="saveEditor">
          <el-icon><Check /></el-icon>
          保存
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const now = ref(Date.now())
let clockTimer = null

const memoColors = [
  { value: 'blue', label: '蓝色', color: '#4facfe' },
  { value: 'pink', label: '粉色', color: '#f5576c' },
  { value: 'green', label: '绿色', color: '#42b983' },
  { value: 'yellow', label: '黄色', color: '#f6a609' },
  { value: 'purple', label: '紫色', color: '#9b6dff' }
]

const memoFilter = ref('all')
const memos = ref([])
const editorVisible = ref(false)
const editorMode = ref('create')
const editingMemoId = ref(null)
const editorForm = reactive({
  text: '',
  color: 'blue',
  starred: false,
  done: false,
  startAt: '',
  deadlineAt: '',
  reminders: []
})

const memoKey = computed(() => `dashboard_memos_${userStore.userInfo.id || 'anon'}`)

const emptyReminder = () => ({
  localId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  datetime: dayjs().add(1, 'day').hour(9).minute(0).second(0).format('YYYY-MM-DD HH:mm:ss'),
  repeatMode: 'once',
  firedAt: null
})

const cloneForm = () => ({
  text: '',
  color: 'blue',
  starred: false,
  done: false,
  startAt: '',
  deadlineAt: '',
  reminders: []
})

const normalizeReminder = (raw = {}) => ({
  localId: raw.localId || raw.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  datetime: raw.datetime || raw.remindAt || raw.time || '',
  repeatMode: raw.repeatMode || raw.repeat || 'once',
  firedAt: raw.firedAt || null
})

const normalizeMemo = (raw = {}) => ({
  id: raw.id ?? `${Date.now()}-${Math.random()}`,
  text: raw.text || '',
  color: raw.color || 'blue',
  starred: Boolean(raw.starred),
  done: Boolean(raw.done),
  start_at: raw.start_at || raw.startAt || '',
  deadline_at: raw.deadline_at || raw.deadlineAt || raw.deadline || '',
  created_at: raw.created_at || raw.createdAt || Date.now(),
  updated_at: raw.updated_at || raw.updatedAt || Date.now(),
  done_at: raw.done_at || raw.doneAt || null,
  reminders: Array.isArray(raw.reminders)
    ? raw.reminders.map(normalizeReminder)
    : raw.reminder_at
      ? [normalizeReminder({ datetime: raw.reminder_at, repeatMode: raw.reminder_repeat || 'once', firedAt: raw.reminder_fired_at || null })]
      : []
})

const loadMemos = () => {
  try {
    const raw = localStorage.getItem(memoKey.value)
    const parsed = raw ? JSON.parse(raw) : []
    const normalized = Array.isArray(parsed) ? parsed.map(normalizeMemo) : []
    memos.value = normalized
    saveMemos()
  } catch (e) {
    memos.value = []
  }
}

const saveMemos = () => {
  try {
    localStorage.setItem(memoKey.value, JSON.stringify(memos.value))
  } catch (e) {}
}

const parseTime = (value) => {
  if (!value) return null
  const ts = dayjs(value).valueOf()
  return Number.isNaN(ts) ? null : ts
}

const formatTime = (value) => {
  if (!value) return '未设置'
  const d = dayjs(value)
  if (!d.isValid()) return '未设置'
  const today = dayjs().startOf('day')
  if (d.isSame(today, 'day')) return `今天 ${d.format('HH:mm')}`
  if (d.isSame(today.subtract(1, 'day'), 'day')) return `昨天 ${d.format('HH:mm')}`
  return d.format('MM-DD HH:mm')
}

const repeatLabel = (mode) => {
  if (mode === 'daily') return '每天'
  if (mode === 'weekly') return '每周'
  return '一次'
}

const memoState = (memo) => {
  if (memo.done) return { label: '已完成', type: 'success' }
  const startTs = parseTime(memo.start_at)
  const deadlineTs = parseTime(memo.deadline_at)
  if (deadlineTs && now.value > deadlineTs) return { label: '已逾期', type: 'danger' }
  if (startTs && now.value < startTs) return { label: '未开始', type: 'info' }
  if (deadlineTs && deadlineTs - now.value <= 6 * 60 * 60 * 1000) return { label: '临近截止', type: 'warning' }
  return { label: memo.starred ? '已置顶' : '进行中', type: memo.starred ? 'warning' : 'info' }
}

const getMemoState = (memo) => memoState(memo)

const memoItemClass = (memo) => [
  `color-${memo.color}`,
  {
    starred: memo.starred,
    done: memo.done,
    overdue: !memo.done && parseTime(memo.deadline_at) && now.value > parseTime(memo.deadline_at),
    upcoming: !memo.done && parseTime(memo.start_at) && now.value < parseTime(memo.start_at)
  }
]

const sortMemos = (list) => [...list].sort((a, b) => {
  if (a.starred !== b.starred) return a.starred ? -1 : 1
  if (a.done !== b.done) return a.done ? 1 : -1
  const aDeadline = parseTime(a.deadline_at) ?? Number.POSITIVE_INFINITY
  const bDeadline = parseTime(b.deadline_at) ?? Number.POSITIVE_INFINITY
  if (aDeadline !== bDeadline) return aDeadline - bDeadline
  const aStart = parseTime(a.start_at) ?? Number.POSITIVE_INFINITY
  const bStart = parseTime(b.start_at) ?? Number.POSITIVE_INFINITY
  if (aStart !== bStart) return aStart - bStart
  return (b.updated_at || b.created_at || 0) - (a.updated_at || a.created_at || 0)
})

const filteredMemos = computed(() => {
  const list = memoFilter.value === 'todo'
    ? memos.value.filter((item) => !item.done)
    : memoFilter.value === 'done'
      ? memos.value.filter((item) => item.done)
      : memoFilter.value === 'starred'
        ? memos.value.filter((item) => item.starred)
        : memos.value
  return sortMemos(list)
})

const todoCount = computed(() => memos.value.filter((item) => !item.done).length)
const doneCount = computed(() => memos.value.filter((item) => item.done).length)
const starredCount = computed(() => memos.value.filter((item) => item.starred).length)
const reminderCount = computed(() => memos.value.reduce((total, item) => total + (item.reminders?.length || 0), 0))

const resetEditor = () => {
  Object.assign(editorForm, cloneForm())
}

const openEditor = (memo = null) => {
  editorMode.value = memo ? 'edit' : 'create'
  editingMemoId.value = memo ? memo.id : null
  resetEditor()
  if (memo) {
    editorForm.text = memo.text || ''
    editorForm.color = memo.color || 'blue'
    editorForm.starred = Boolean(memo.starred)
    editorForm.done = Boolean(memo.done)
    editorForm.startAt = memo.start_at || ''
    editorForm.deadlineAt = memo.deadline_at || ''
    editorForm.reminders = (memo.reminders || []).map((item) => ({ ...normalizeReminder(item) }))
  } else {
    editorForm.reminders = []
  }
  editorVisible.value = true
}

const addReminderRow = () => {
  editorForm.reminders.push(emptyReminder())
}

const removeReminderRow = (index) => {
  editorForm.reminders.splice(index, 1)
}

const saveEditor = () => {
  const text = editorForm.text.trim()
  if (!text) {
    ElMessage.warning('请先输入备忘内容')
    return
  }

  if (editorForm.startAt && editorForm.deadlineAt && dayjs(editorForm.deadlineAt).isBefore(dayjs(editorForm.startAt))) {
    ElMessage.warning('截止时间不能早于开始时间')
    return
  }

  const normalizedReminders = editorForm.reminders
    .filter((item) => item.datetime)
    .map((item) => ({
      localId: item.localId || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      datetime: item.datetime,
      repeatMode: item.repeatMode || 'once',
      firedAt: item.firedAt || null
    }))

  const existingMemo = editingMemoId.value
    ? memos.value.find((item) => item.id === editingMemoId.value)
    : null

  const payload = {
    id: editingMemoId.value || `${Date.now()}-${Math.random()}`,
    text,
    color: editorForm.color,
    starred: editorForm.starred,
    done: Boolean(editorForm.done),
    start_at: editorForm.startAt || '',
    deadline_at: editorForm.deadlineAt || '',
    created_at: existingMemo?.created_at || Date.now(),
    updated_at: Date.now(),
    done_at: existingMemo?.done_at || null,
    reminders: normalizedReminders
  }
  payload.done_at = payload.done ? (existingMemo?.done_at || Date.now()) : null

  if (editorMode.value === 'edit') {
    const index = memos.value.findIndex((item) => item.id === editingMemoId.value)
    if (index !== -1) {
      memos.value[index] = payload
    }
  } else {
    memos.value.unshift(payload)
  }

  saveMemos()
  editorVisible.value = false
  scanReminders()
  ElMessage.success(editorMode.value === 'edit' ? '备忘录已更新' : '备忘录已创建')
}

const toggleDone = (memo) => {
  memo.done = !memo.done
  memo.done_at = memo.done ? Date.now() : null
  memo.updated_at = Date.now()
  saveMemos()
}

const toggleStar = (memo) => {
  memo.starred = !memo.starred
  memo.updated_at = Date.now()
  saveMemos()
  ElMessage.success(memo.starred ? '已置顶' : '已取消置顶')
}

const deleteMemo = async (memo) => {
  try {
    await ElMessageBox.confirm('确定删除这条备忘录吗？', '删除备忘录', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    memos.value = memos.value.filter((item) => item.id !== memo.id)
    saveMemos()
    ElMessage.success('已删除')
  } catch (e) {}
}

const notifyReminder = (memo, reminder) => {
  ElNotification({
    title: '备忘录提醒',
    message: `${memo.text} · ${formatTime(reminder.datetime)}`,
    type: 'warning',
    duration: 5000
  })
}

const scanReminders = () => {
  const nowTs = Date.now()
  let changed = false

  memos.value.forEach((memo) => {
    if (memo.done || !Array.isArray(memo.reminders)) return
    memo.reminders.forEach((reminder) => {
      const remindTs = parseTime(reminder.datetime)
      if (!remindTs || remindTs > nowTs) return

      const lastFired = parseTime(reminder.firedAt)
      if (lastFired && lastFired >= remindTs) return

      notifyReminder(memo, reminder)
      changed = true

      if (reminder.repeatMode === 'daily' || reminder.repeatMode === 'weekly') {
        const step = reminder.repeatMode === 'weekly' ? 7 : 1
        let next = dayjs(reminder.datetime)
        while (next.valueOf() <= nowTs) {
          next = next.add(step, 'day')
        }
        reminder.datetime = next.format('YYYY-MM-DD HH:mm:ss')
        reminder.firedAt = null
      } else {
        reminder.firedAt = nowTs
      }
    })
  })

  if (changed) saveMemos()
}

const handleVisibilityChange = () => {
  if (!document.hidden) {
    now.value = Date.now()
    scanReminders()
  }
}

watch(memos, saveMemos, { deep: true })

onMounted(() => {
  loadMemos()
  scanReminders()
  clockTimer = setInterval(() => {
    now.value = Date.now()
    scanReminders()
  }, 1000)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped lang="scss">
.memo-card {
  border-radius: 14px;
  border: none;
  background: linear-gradient(180deg, #ffffff 0%, #f8faff 100%);
}

.memo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.memo-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: #303133;
}

.memo-count {
  margin-left: 2px;
}

.memo-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.memo-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-item {
  border-radius: 12px;
  padding: 12px 14px;
  background: #f6f8ff;
  border: 1px solid #e9eeff;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-value {
  font-size: 22px;
  line-height: 1;
  font-weight: 700;
  color: #303133;
}

.summary-label {
  font-size: 12px;
  color: #909399;
}

.memo-empty {
  padding: 8px 0 2px;
}

.memo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.memo-item {
  padding: 14px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #edf1fb;
  border-left: 4px solid #4facfe;
  box-shadow: 0 10px 24px rgba(102, 126, 234, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(102, 126, 234, 0.12);
  }
}

.memo-item.color-blue { border-left-color: #4facfe; }
.memo-item.color-pink { border-left-color: #f5576c; }
.memo-item.color-green { border-left-color: #42b983; }
.memo-item.color-yellow { border-left-color: #f6a609; }
.memo-item.color-purple { border-left-color: #9b6dff; }
.memo-item.starred {
  background: linear-gradient(180deg, #fffdf2 0%, #ffffff 100%);
}
.memo-item.done {
  opacity: 0.72;
}
.memo-item.overdue {
  background: linear-gradient(180deg, #fff7f7 0%, #ffffff 100%);
}
.memo-item.upcoming {
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
}

.memo-topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.memo-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.memo-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.action-btn {
  color: #606266;
}

.memo-content {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.memo-check {
  margin-top: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #c0c4cc;
  background: #fff;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding: 0;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #409eff;
    box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.12);
  }

  &.checked {
    background: #409eff;
    border-color: #409eff;
    color: #fff;
  }
}

.memo-body {
  flex: 1;
  min-width: 0;
}

.memo-text {
  font-size: 15px;
  line-height: 1.6;
  color: #303133;
  word-break: break-word;
  font-weight: 500;
}

.memo-item.done .memo-text {
  text-decoration: line-through;
  color: #909399;
}

.memo-meta {
  display: grid;
  gap: 6px;
  margin-top: 10px;
}

.meta-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #606266;
  min-width: 0;
}

.reminder-list {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.reminder-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #f5f7ff;
  color: #4c5cc7;
  font-size: 12px;
}

.reminder-chip.fired {
  background: #fff5f5;
  color: #f56c6c;
}

.memo-dialog {
  .memo-form {
    padding-top: 4px;
  }

  .time-row {
    :deep(.el-date-editor.el-input),
    :deep(.el-date-editor.el-input__wrapper) {
      width: 100%;
    }
  }
}

.reminder-box {
  margin-top: 6px;
  padding: 14px;
  border-radius: 12px;
  background: #f8faff;
  border: 1px solid #e8eeff;
}

.reminder-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: #303133;
}

.section-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.reminder-empty {
  font-size: 13px;
  color: #909399;
  padding: 10px 0 2px;
}

.reminder-editor-list {
  display: grid;
  gap: 10px;
}

.reminder-editor-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.color-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}

@media (max-width: 1200px) {
  .memo-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .memo-header,
  .memo-header-actions,
  .reminder-head,
  .reminder-editor-row {
    flex-direction: column;
    align-items: stretch;
  }

  .memo-summary {
    grid-template-columns: 1fr;
  }

  .memo-grid {
    grid-template-columns: 1fr;
  }

  .reminder-editor-row {
    gap: 8px;
  }
}
</style>
