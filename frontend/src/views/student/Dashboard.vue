<template>
  <div class="dashboard">
    <div class="welcome-banner">
      <span class="banner-orb banner-orb-one" aria-hidden="true"></span>
      <span class="banner-orb banner-orb-two" aria-hidden="true"></span>
      <span class="banner-shine" aria-hidden="true"></span>
      <div class="welcome-text">
        <h2>欢迎回来，{{ userStore.userInfo.name }} 👋</h2>
        <p>今天是 {{ today }}，祝你学习愉快！</p>
      </div>
      <div class="welcome-icon">
        <img v-if="!logoFailed" :src="logoUrl" alt="智慧校园" class="welcome-logo" @error="logoFailed = true" />
        <el-icon v-else size="64" color="#fff"><Sunny /></el-icon>
      </div>
    </div>

    <!-- 今日状态 (24小时) -->
    <el-card class="status-card" shadow="hover">
      <div class="status-content">
        <div class="status-avatar">
          <el-avatar :size="58" :src="userStore.userInfo.avatar">
            {{ userStore.userInfo.name?.charAt(0) || 'U' }}
          </el-avatar>
          <span v-if="myStatus" class="avatar-emoji">{{ myStatus.emoji }}</span>
        </div>
        <div class="status-text">
          <div v-if="myStatus" class="status-active">
            <div class="status-line">
              <span class="status-msg">{{ myStatus.text || '想说点什么...' }}</span>
              <el-tag size="small" type="info" effect="plain" round>
                <el-icon><Clock /></el-icon> {{ remainingText }}
              </el-tag>
            </div>
            <div class="status-meta">设置于 {{ formatStatusTime(myStatus.created_at) }}</div>
          </div>
          <div v-else class="status-empty">
            <div class="empty-title">嗨，{{ userStore.userInfo.name || '同学' }}！分享一下你今天的心情吧</div>
            <div class="empty-tip">设置一个 24 小时状态，让同学们看到你的近况</div>
          </div>
        </div>
        <div class="status-actions">
          <el-button v-if="!myStatus" type="primary" round @click="openStatusDialog">
            <el-icon><EditPen /></el-icon>设置状态
          </el-button>
          <template v-else>
            <el-button round @click="openStatusDialog">
              <el-icon><Edit /></el-icon>修改
            </el-button>
            <el-button type="danger" plain round @click="clearStatus">
              <el-icon><Delete /></el-icon>清除
            </el-button>
          </template>
        </div>
      </div>
    </el-card>

    <div class="stats-row">
      <el-card
        v-for="item in stats"
        :key="item.title"
        :body-style="{ padding: '20px' }"
        shadow="hover"
        class="stat-card"
        @click="handleStatClick(item.title)"
      >
        <div class="stat-content">
          <div class="stat-icon" :style="{ background: item.gradient }">
            <el-icon size="24" color="#fff"><component :is="item.icon" /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ item.value }}</div>
            <div class="stat-title">{{ item.title }}</div>
          </div>
        </div>
      </el-card>
    </div>

    <el-row :gutter="20">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <span class="card-title">
              <el-icon><Document /></el-icon>
              待完成作业
            </span>
          </template>
          <div v-if="pendingTasks.length === 0" class="empty-text">暂无待完成作业</div>
          <div v-else class="task-list">
            <div v-for="task in pendingTasks" :key="task.id" class="task-item" @click="goHomework">
              <div class="task-title">{{ task.title }}</div>
              <div class="task-meta">
                <span class="deadline">截止：{{ task.deadline }}</span>
                <el-tag size="small" type="warning">未提交</el-tag>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <!-- 最新公告卡片已移除 -->
    </el-row>

    <el-row :gutter="20" class="calendar-row">
      <el-col :span="12">
        <el-card shadow="hover" class="calendar-card">
          <template #header>
            <div class="calendar-header">
              <span class="card-title">
                <el-icon><Calendar /></el-icon>
                学习日历
              </span>
              <el-button class="birthday-settings-button" @click="openBirthdayDialog">
                <span class="birthday-settings-icon">
                  <el-icon><Plus /></el-icon>
                </span>
                <span>生日设置</span>
              </el-button>
            </div>
          </template>
          <el-calendar v-model="calendarDate">
            <template #date-cell="{ data }">
              <div class="calendar-cell" :class="getCalendarCellClass(data)">
                <span class="cell-day">{{ data.day.split('-')[2] }}</span>
                <span v-if="getHoliday(data)" class="cell-holiday" :title="getHoliday(data).name">
                  <span class="holiday-icon">{{ getHoliday(data).emoji }}</span>
                </span>
                <div v-if="getCalendarDateClass(data)" class="cell-dots">
                  <span v-if="getCalendarDateClass(data).includes('task')" class="dot task"></span>
                  <span v-if="getCalendarDateClass(data).includes('schedule')" class="dot schedule"></span>
                </div>
                <span v-if="getHoliday(data)" class="cell-holiday-name">
                  {{ getHoliday(data).name }}
                </span>
                <div v-if="getBirthdays(data).length" class="birthday-list">
                  <span
                    v-for="birthday in getBirthdays(data)"
                    :key="birthday.id"
                    class="birthday-chip"
                    :title="birthday.name + '生日'"
                  >
                    🎂 {{ birthday.name }}
                  </span>
                </div>
              </div>
            </template>
          </el-calendar>
          <div class="calendar-legend">
            <span class="legend-item"><span class="dot task"></span> 作业截止</span>
            <span class="legend-item"><span class="dot schedule"></span> 有课程</span>
            <span class="legend-item"><span class="dot both"></span> 均有</span>
            <span class="legend-item"><span class="legend-emoji">🎉</span> 节日</span>
            <span class="legend-item"><span class="legend-emoji">🎒</span> 校历</span>
            <span class="legend-item"><span class="legend-emoji">🎂</span> 生日</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="schedule-card" shadow="hover">
          <template #header>
            <span class="card-title">
              <el-icon><Clock /></el-icon>
              今日课程
            </span>
          </template>
          <div v-if="todaySchedule.length === 0" class="empty-text">今日无课程</div>
          <el-timeline v-else>
            <el-timeline-item
              v-for="item in todaySchedule"
              :key="item.id"
              :type="item.status === 'adjusted' ? 'warning' : 'primary'"
            >
              <div class="schedule-item">
                <span class="time">{{ item.start_time }} - {{ item.end_time }}</span>
                <span class="course">{{ item.course_name }}</span>
                <span class="room">{{ item.classroom }}</span>
                <el-tag v-if="item.status === 'adjusted'" size="small" type="warning">已调课</el-tag>
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>

    <!-- 学习备忘录 -->
    <MemoBoard />
    <el-row v-if="false" :gutter="20" class="memo-row">
      <el-col :span="24">
        <el-card class="memo-card" shadow="hover">
          <template #header>
            <div class="memo-header">
              <span class="card-title">
                <el-icon><Notebook /></el-icon>
                学习备忘录
                <el-tag size="small" round type="info" effect="plain" class="memo-count">
                  {{ memos.length }} 条
                </el-tag>
              </span>
              <div class="memo-filter">
                <el-radio-group v-model="memoFilter" size="small">
                  <el-radio-button label="all">全部</el-radio-button>
                  <el-radio-button label="todo">待办</el-radio-button>
                  <el-radio-button label="done">已完成</el-radio-button>
                </el-radio-group>
              </div>
            </div>
          </template>

          <!-- 添加 -->
          <div class="memo-add">
            <el-input
              v-model="memoInput"
              placeholder="写下你想记的事,例如:周三前提交实验报告..."
              maxlength="80"
              show-word-limit
              @keyup.enter="addMemo"
            >
              <template #prefix><el-icon><EditPen /></el-icon></template>
            </el-input>
            <el-select v-model="memoColor" size="default" style="width: 110px" placeholder="颜色">
              <el-option v-for="c in memoColors" :key="c.value" :label="c.label" :value="c.value">
                <span class="color-dot" :style="{ background: c.color }"></span>
                {{ c.label }}
              </el-option>
            </el-select>
            <el-button type="primary" round @click="addMemo">
              <el-icon><Plus /></el-icon>添加
            </el-button>
          </div>

          <!-- 列表 -->
          <div v-if="filteredMemos.length === 0" class="memo-empty">
            <el-empty description="还没有备忘事项,记下今天要做的事吧 ✏️" :image-size="80" />
          </div>
          <div v-else class="memo-list">
            <div
              v-for="memo in filteredMemos"
              :key="memo.id"
              class="memo-item"
              :class="['color-' + memo.color, { done: memo.done }]"
            >
              <el-checkbox :model-value="memo.done" @change="toggleMemo(memo)" />
              <div class="memo-body">
                <div class="memo-text">{{ memo.text }}</div>
                <div class="memo-meta">
                  <el-icon><Clock /></el-icon>
                  <span>{{ formatMemoTime(memo.created_at) }}</span>
                  <span v-if="memo.done" class="meta-done">已完成 · {{ formatMemoTime(memo.done_at) }}</span>
                </div>
              </div>
              <el-button link type="danger" size="small" class="memo-del" @click="deleteMemo(memo)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 状态设置弹窗 -->
    <el-dialog
      v-model="statusDialogVisible"
      title="设置今日状态"
      width="520px"
      :close-on-click-modal="false"
      class="status-dialog"
    >
      <div class="dialog-section">
        <div class="section-label">选一个心情</div>
        <div class="emoji-grid">
          <div
            v-for="opt in EMOJI_OPTIONS"
            :key="opt.emoji"
            class="emoji-option"
            :class="{ active: form.emoji === opt.emoji }"
            @click="form.emoji = opt.emoji"
          >
            <span class="emoji-icon">{{ opt.emoji }}</span>
            <span class="emoji-label">{{ opt.label }}</span>
          </div>
        </div>
      </div>
      <div class="dialog-section">
        <div class="section-label">说点什么</div>
        <el-input
          v-model="form.text"
          type="textarea"
          :rows="3"
          placeholder="分享一下你的近况、学习心得或今日感受..."
          maxlength="50"
          show-word-limit
        />
      </div>
      <div class="dialog-tip">
        <el-icon><InfoFilled /></el-icon>
        <span>状态将在 24 小时后自动消失，期间好友访问你的主页时可以看到</span>
      </div>
      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" round @click="saveStatus">
          <el-icon><Promotion /></el-icon>发布
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="birthdayDialogVisible"
      title="生日设置"
      width="560px"
      :close-on-click-modal="false"
      class="birthday-dialog"
    >
      <div class="birthday-own">
        <el-form label-width="88px">
          <el-form-item label="我的生日">
            <el-date-picker
              v-model="birthdayForm.mine.date"
              type="date"
              placeholder="选择自己的生日"
              value-format="YYYY-MM-DD"
              format="MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </el-form>
      </div>
      <div class="birthday-head">
        <span>同学生日</span>
        <el-button link type="primary" @click="addBirthdayRow">
          <el-icon><Plus /></el-icon>
          添加同学
        </el-button>
      </div>
      <div class="birthday-rows">
        <div v-for="(item, index) in birthdayForm.classmates" :key="item.id" class="birthday-row">
          <el-input v-model="item.name" placeholder="同学姓名" maxlength="12" />
          <el-date-picker
            v-model="item.date"
            type="date"
            placeholder="生日"
            value-format="YYYY-MM-DD"
            format="MM-DD"
            style="width: 160px"
          />
          <el-button link type="danger" @click="removeBirthdayRow(index)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
      <template #footer>
        <el-button @click="birthdayDialogVisible = false">取消</el-button>
        <el-button type="primary" round @click="saveBirthdays">保存</el-button>
      </template>
    </el-dialog>

    <!-- 通知列表弹窗 -->
    <el-dialog v-model="noticeDialogVisible" title="最新公告" width="600px">
      <div v-if="notices.length === 0" class="empty-text">暂无公告</div>
      <div v-else class="notice-dialog-list">
        <div v-for="notice in notices" :key="notice.id" class="notice-dialog-item">
          <div class="notice-dialog-title">{{ notice.title }}</div>
          <div class="notice-dialog-time">{{ notice.created_at }}</div>
          <div class="notice-dialog-content">{{ notice.content || '暂无详细内容' }}</div>
        </div>
      </div>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getStudentStatistics, getStudentTasks, getStudentSchedule, getStudentNotices } from '@/api/student'
import { getMyStatus, setMyStatus, clearMyStatus } from '@/api/social'
import MemoBoard from './MemoBoard.vue'

const router = useRouter()
const userStore = useUserStore()
const today = computed(() => dayjs().format('YYYY年MM月DD日 dddd'))
const logoUrl = '/logo.png'
const logoFailed = ref(false)
const stats = ref([
  { title: '我的任务', value: 0, icon: 'Document', gradient: 'linear-gradient(135deg, #123e81 0%, #0a152d 100%)' },
  { title: '已提交', value: 0, icon: 'CircleCheck', gradient: 'linear-gradient(135deg, #38bdf8 0%, #f5576c 100%)' },
  { title: '新通知', value: 0, icon: 'Bell', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }
])
const pendingTasks = ref([])
const todaySchedule = ref([])
const notices = ref([])
const calendarDate = ref(new Date())
const calendarEvents = ref([])
const birthdayDialogVisible = ref(false)
const birthdayForm = reactive({
  mine: {
    name: '',
    date: ''
  },
  classmates: []
})

// ===== 状态(24小时) =====
const myStatus = ref(null)
const statusDialogVisible = ref(false)
const form = ref({ emoji: '😊', text: '' })
const now = ref(Date.now())
let nowTimer = null

const EMOJI_OPTIONS = [
  { emoji: '😊', label: '开心' },
  { emoji: '🥳', label: '庆祝' },
  { emoji: '😴', label: '困倦' },
  { emoji: '📚', label: '学习中' },
  { emoji: '☕', label: '摸鱼' },
  { emoji: '💪', label: '冲刺' },
  { emoji: '🎮', label: '游戏中' },
  { emoji: '🏃', label: '运动' },
  { emoji: '🍜', label: '干饭' },
  { emoji: '🧠', label: '思考' },
  { emoji: '😭', label: '崩溃' },
  { emoji: '🌧️', label: 'emo' },
  { emoji: '😎', label: '酷' },
  { emoji: '🥰', label: '心动' },
  { emoji: '🤔', label: '疑惑' },
  { emoji: '🤯', label: '震惊' },
  { emoji: '🤢', label: '恶心' },
  { emoji: '🤡', label: '小丑' },
  { emoji: '👻', label: '隐身' },
  { emoji: '🤖', label: 'AI模式' },
  { emoji: '🔥', label: '燃起来了' },
  { emoji: '💤', label: '已睡' },
  { emoji: '🌙', label: '熬夜' },
  { emoji: '🌞', label: '元气' }
]

const statusKey = computed(() => `dashboard_status_${userStore.userInfo.id || 'anon'}`)

// 把后端返回的 ISO 时间转为时间戳, 统一字段
const normalizeStatus = (raw) => {
  if (!raw) return null
  return {
    emoji: raw.emoji,
    text: raw.text || '',
    created_at: raw.created_at ? new Date(raw.created_at).getTime() : Date.now(),
    expires_at: raw.expires_at ? new Date(raw.expires_at).getTime() : (Date.now() + 24 * 3600 * 1000)
  }
}

const loadStatus = async () => {
  try {
    const res = await getMyStatus()
    const obj = normalizeStatus(res.data)
    if (!obj || obj.expires_at <= Date.now()) {
      myStatus.value = null
    } else {
      myStatus.value = obj
    }
  } catch (e) {
    myStatus.value = null
  }
}

const openStatusDialog = () => {
  if (myStatus.value) {
    form.value = { emoji: myStatus.value.emoji, text: myStatus.value.text }
  } else {
    form.value = { emoji: '😊', text: '' }
  }
  statusDialogVisible.value = true
}

const saveStatus = async () => {
  try {
    const res = await setMyStatus(form.value.emoji, form.value.text.trim())
    myStatus.value = normalizeStatus(res.data)
    statusDialogVisible.value = false
    ElMessage.success('状态已发布,24 小时内好友可见')
  } catch (e) {
    ElMessage.error(e.message || '发布失败')
  }
}

const clearStatus = async () => {
  try {
    await clearMyStatus()
    myStatus.value = null
    ElMessage.success('已清除状态')
  } catch (e) {
    ElMessage.error(e.message || '清除失败')
  }
}

const remainingText = computed(() => {
  if (!myStatus.value) return ''
  const ms = myStatus.value.expires_at - now.value
  if (ms <= 0) return '已过期'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n) => String(n).padStart(2, '0')
  return `还剩 ${pad(h)}:${pad(m)}:${pad(s)}`
})

const formatStatusTime = (ts) => {
  if (!ts) return ''
  return dayjs(ts).format('MM月DD日 HH:mm')
}

// ===== 节假日配置 =====
// 固定公历日期
const HOLIDAYS_FIXED = {
  '01-01': { name: '元旦', emoji: '🎉' },
  '02-14': { name: '情人节', emoji: '💝' },
  '03-08': { name: '妇女节', emoji: '🌷' },
  '03-12': { name: '植树节', emoji: '🌱' },
  '04-05': { name: '清明节', emoji: '🌿' },
  '05-01': { name: '劳动节', emoji: '👷' },
  '05-04': { name: '青年节', emoji: '✊' },
  '06-01': { name: '儿童节', emoji: '🎈' },
  '07-01': { name: '建党节', emoji: '🚩' },
  '07-14': { name: '暑假开始', emoji: '🏖️' },
  '08-01': { name: '建军节', emoji: '🎖️' },
  '09-03': { name: '开学日', emoji: '🎒' },
  '09-10': { name: '教师节', emoji: '🍎' },
  '10-01': { name: '国庆节', emoji: '🇨🇳' },
  '11-11': { name: '双十一', emoji: '🛒' },
  '12-25': { name: '圣诞节', emoji: '🎄' },
  '12-31': { name: '跨年夜', emoji: '🎆' }
}
// 农历对应公历(按年份)
const HOLIDAYS_LUNAR = {
  '2025-01-29': { name: '春节', emoji: '🧧' },
  '2025-02-12': { name: '元宵节', emoji: '🏮' },
  '2025-05-31': { name: '端午节', emoji: '🐉' },
  '2025-08-29': { name: '七夕', emoji: '💞' },
  '2025-10-06': { name: '中秋节', emoji: '🌕' },
  '2025-10-29': { name: '重阳节', emoji: '🍂' },
  '2026-02-17': { name: '春节', emoji: '🧧' },
  '2026-03-03': { name: '元宵节', emoji: '🏮' },
  '2026-06-19': { name: '端午节', emoji: '🐉' },
  '2026-08-20': { name: '七夕', emoji: '💞' },
  '2026-09-25': { name: '中秋节', emoji: '🌕' },
  '2026-10-19': { name: '重阳节', emoji: '🍂' },
  '2027-02-06': { name: '春节', emoji: '🧧' },
  '2027-06-09': { name: '端午节', emoji: '🐉' },
  '2027-09-15': { name: '中秋节', emoji: '🌕' }
}

const getHoliday = (data) => {
  const dateStr = data.day.split(' ')[0]
  const md = dateStr.slice(5)
  return HOLIDAYS_LUNAR[dateStr] || HOLIDAYS_FIXED[md] || null
}

const birthdayKey = computed(() => `dashboard_birthdays_${userStore.userInfo.id || 'anon'}`)

const emptyBirthday = () => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name: '',
  date: ''
})

const normalizeBirthday = (item = {}) => ({
  id: item.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name: item.name || '',
  date: item.date || ''
})

const loadBirthdays = () => {
  try {
    const raw = localStorage.getItem(birthdayKey.value)
    const parsed = raw ? JSON.parse(raw) : {}
    birthdayForm.mine.name = parsed.mine?.name || userStore.userInfo.name || '我'
    birthdayForm.mine.date = parsed.mine?.date || ''
    birthdayForm.classmates = Array.isArray(parsed.classmates)
      ? parsed.classmates.map(normalizeBirthday)
      : []
  } catch (e) {
    birthdayForm.mine.name = userStore.userInfo.name || '我'
    birthdayForm.mine.date = ''
    birthdayForm.classmates = []
  }
}

const saveBirthdays = () => {
  const classmates = birthdayForm.classmates
    .map((item) => normalizeBirthday(item))
    .filter((item) => item.name.trim() && item.date)
    .map((item) => ({ ...item, name: item.name.trim() }))

  birthdayForm.classmates = classmates
  birthdayForm.mine.name = userStore.userInfo.name || '我'
  localStorage.setItem(birthdayKey.value, JSON.stringify({
    mine: { name: birthdayForm.mine.name, date: birthdayForm.mine.date || '' },
    classmates
  }))
  birthdayDialogVisible.value = false
  ElMessage.success('生日已保存')
}

const openBirthdayDialog = () => {
  loadBirthdays()
  birthdayDialogVisible.value = true
}

const addBirthdayRow = () => {
  birthdayForm.classmates.push(emptyBirthday())
}

const removeBirthdayRow = (index) => {
  birthdayForm.classmates.splice(index, 1)
}

const getBirthdays = (data) => {
  const dateStr = data.day.split(' ')[0]
  const md = dateStr.slice(5)
  const birthdays = []
  if (birthdayForm.mine.date && birthdayForm.mine.date.slice(5) === md) {
    birthdays.push({ id: 'mine', name: userStore.userInfo.name || '我', date: birthdayForm.mine.date })
  }
  birthdayForm.classmates.forEach((item) => {
    if (item.name && item.date && item.date.slice(5) === md) {
      birthdays.push(item)
    }
  })
  return birthdays
}

const lastReadNoticeKey = computed(() => `last_read_notice_${userStore.userInfo.id || 'anon'}`)

const getUnreadNoticeCount = () => {
  if (!notices.value.length) return 0
  const lastRead = localStorage.getItem(lastReadNoticeKey.value)
  if (!lastRead) return notices.value.length
  const readTime = new Date(lastRead).getTime()
  return notices.value.filter(n => new Date(n.created_at).getTime() > readTime).length
}

const loadData = async () => {
  try {
    const { data } = await getStudentStatistics()
    stats.value[0].value = data.taskCount
    stats.value[1].value = data.submitCount

    const { data: taskData } = await getStudentTasks()
    pendingTasks.value = taskData.filter(t => t.submit_status === null).slice(0, 3)

    const { data: schData } = await getStudentSchedule()
    const todayDay = dayjs().day() || 7
    todaySchedule.value = schData.filter(s => s.day_of_week === todayDay)

    const { data: noticeData } = await getStudentNotices()
    notices.value = noticeData
    // 前端自己计算未读通知数（基于上次查看时间）
    stats.value[2].value = getUnreadNoticeCount()

    // 构建日历事件
    const events = []
    taskData.forEach(t => {
      if (t.deadline) events.push({ date: t.deadline.slice(0, 10), type: 'task', title: t.title })
    })
    schData.forEach(s => {
      const start = dayjs().startOf('week').add(s.day_of_week - 1, 'day')
      events.push({ date: start.format('YYYY-MM-DD'), type: 'schedule', title: s.course_name })
    })
    calendarEvents.value = events
  } catch (e) {}
}

const getCalendarDateClass = (data) => {
  const dateStr = data.day.split(' ')[0]
  const hasTask = calendarEvents.value.some(e => e.date === dateStr && e.type === 'task')
  const hasSchedule = calendarEvents.value.some(e => e.date === dateStr && e.type === 'schedule')
  if (hasTask && hasSchedule) return 'both-dot'
  if (hasTask) return 'task-dot'
  if (hasSchedule) return 'schedule-dot'
  return ''
}

const getCalendarCellClass = (data) => {
  const dateStr = data.day.split(' ')[0]
  const isToday = dateStr === dayjs().format('YYYY-MM-DD')
  const holiday = getHoliday(data)
  const cls = []
  if (isToday) cls.push('is-today')
  if (holiday) cls.push('is-holiday')
  if (getBirthdays(data).length) cls.push('is-birthday')
  return cls.join(' ')
}

const goHomework = () => {
  router.push('/student/homework')
}

const handleStatClick = (title) => {
  if (title === '我的任务') {
    router.push('/student/homework')
  } else if (title === '已提交') {
    router.push({ path: '/student/homework', query: { filter: 'submitted' } })
  } else if (title === '新通知') {
    openNoticeDialog()
  }
}

// ===== 通知弹窗 =====
const noticeDialogVisible = ref(false)
const openNoticeDialog = () => {
  noticeDialogVisible.value = true
  // 标记通知已读
  localStorage.setItem(lastReadNoticeKey.value, new Date().toISOString())
  stats.value[2].value = 0
}

// ===== 学习备忘录 =====
const memos = ref([])
const memoInput = ref('')
const memoColor = ref('blue')
const memoFilter = ref('all')
const memoColors = [
  { value: 'blue',   label: '蓝色', color: '#4facfe' },
  { value: 'pink',   label: '粉色', color: '#f5576c' },
  { value: 'green',  label: '绿色', color: '#42b983' },
  { value: 'yellow', label: '黄色', color: '#f6a609' },
  { value: 'purple', label: '海蓝', color: '#3b82f6' }
]

const memoKey = computed(() => `dashboard_memos_${userStore.userInfo.id || 'anon'}`)

const loadMemos = () => {
  try {
    const raw = localStorage.getItem(memoKey.value)
    memos.value = raw ? JSON.parse(raw) : []
  } catch (e) {
    memos.value = []
  }
}

const saveMemos = () => {
  try {
    localStorage.setItem(memoKey.value, JSON.stringify(memos.value))
  } catch (e) {}
}

const addMemo = () => {
  const text = memoInput.value.trim()
  if (!text) {
    ElMessage.warning('请输入备忘内容')
    return
  }
  memos.value.unshift({
    id: Date.now() + Math.random(),
    text,
    color: memoColor.value,
    done: false,
    created_at: Date.now(),
    done_at: null
  })
  saveMemos()
  memoInput.value = ''
  ElMessage.success('已添加')
}

const toggleMemo = (memo) => {
  memo.done = !memo.done
  memo.done_at = memo.done ? Date.now() : null
  saveMemos()
}

const deleteMemo = (memo) => {
  memos.value = memos.value.filter(m => m.id !== memo.id)
  saveMemos()
  ElMessage.success('已删除')
}

const filteredMemos = computed(() => {
  if (memoFilter.value === 'todo') return memos.value.filter(m => !m.done)
  if (memoFilter.value === 'done') return memos.value.filter(m => m.done)
  return memos.value
})

const formatMemoTime = (ts) => {
  if (!ts) return ''
  const d = dayjs(ts)
  const today = dayjs().startOf('day')
  if (d.isAfter(today)) return '今天 ' + d.format('HH:mm')
  if (d.isAfter(today.subtract(1, 'day'))) return '昨天 ' + d.format('HH:mm')
  return d.format('MM-DD HH:mm')
}

const handleVisibilityChange = () => {
  if (!document.hidden) {
    loadData()
  }
}

onMounted(() => {
  loadData()
  loadStatus()
  loadMemos()
  loadBirthdays()
  // 每秒刷新一次"剩余时间",过期自动重新加载
  nowTimer = setInterval(() => {
    now.value = Date.now()
    if (myStatus.value && myStatus.value.expires_at <= now.value) {
      loadStatus()
    }
  }, 1000)
  // 页面重新可见时刷新数据（切换标签页/后台回到前台）
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  if (nowTimer) clearInterval(nowTimer)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped lang="scss">
.dashboard {
  .welcome-banner {
    background: linear-gradient(120deg, #123e81 0%, #0a2b62 38%, #0a152d 72%, #123e81 100%);
    background-size: 240% 240%;
    border-radius: 16px;
    padding: 30px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    color: #fff;
    position: relative;
    overflow: hidden;
    isolation: isolate;
    box-shadow: 0 16px 38px rgba(10, 21, 45, 0.2);
    animation: banner-gradient 12s ease-in-out infinite, banner-enter 650ms cubic-bezier(0.22, 1, 0.36, 1) both;
    transition: transform 300ms ease, box-shadow 300ms ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 22px 48px rgba(10, 21, 45, 0.26);
    }

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: -1;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
      background-size: 28px 28px;
      mask-image: linear-gradient(90deg, black, transparent 88%);
      pointer-events: none;
    }

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: -1;
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.06), transparent 42%);
      pointer-events: none;
    }

    .banner-orb {
      position: absolute;
      z-index: -1;
      border-radius: 50%;
      filter: blur(2px);
      pointer-events: none;
    }

    .banner-orb-one {
      top: -150px;
      right: 7%;
      width: 330px;
      height: 330px;
      background: radial-gradient(circle, rgba(76, 151, 255, 0.32) 0%, rgba(76, 151, 255, 0) 68%);
      animation: orb-float-one 8s ease-in-out infinite alternate;
    }

    .banner-orb-two {
      bottom: -180px;
      left: 28%;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0) 70%);
      animation: orb-float-two 10s ease-in-out infinite alternate;
    }

    .banner-shine {
      position: absolute;
      top: -55%;
      left: -22%;
      width: 16%;
      height: 210%;
      z-index: 0;
      opacity: 0;
      transform: rotate(18deg);
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
      animation: banner-shine 7s ease-in-out 1.5s infinite;
      pointer-events: none;
    }

    .welcome-text,
    .welcome-icon {
      position: relative;
      z-index: 1;
    }

    .welcome-text {
      animation: welcome-copy-enter 700ms 120ms cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    .welcome-icon {
      animation: welcome-logo-float 4s ease-in-out infinite;
    }

    h2 {
      font-size: 26px;
      margin-bottom: 8px;
      font-weight: 600;
    }
    p {
      opacity: 0.92;
      font-size: 14px;
    }

    .welcome-logo {
      width: 88px;
      height: 88px;
      object-fit: contain;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 16px;
      padding: 8px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
      transition: transform 300ms ease, box-shadow 300ms ease;
    }

    &:hover .welcome-logo {
      transform: translateY(-4px) rotate(2deg) scale(1.03);
      box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18);
    }
  }

  @keyframes banner-enter {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes banner-gradient {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }

  @keyframes orb-float-one {
    from { transform: translate3d(0, 0, 0) scale(0.92); opacity: 0.65; }
    to { transform: translate3d(42px, 24px, 0) scale(1.12); opacity: 1; }
  }

  @keyframes orb-float-two {
    from { transform: translate3d(-20px, 0, 0) scale(1); opacity: 0.55; }
    to { transform: translate3d(34px, -24px, 0) scale(1.16); opacity: 0.86; }
  }

  @keyframes banner-shine {
    0%, 60% { left: -22%; opacity: 0; }
    66% { opacity: 0.9; }
    82%, 100% { left: 112%; opacity: 0; }
  }

  @keyframes welcome-copy-enter {
    from { opacity: 0; transform: translateX(-18px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes welcome-logo-float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-7px) rotate(1.5deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    .welcome-banner,
    .welcome-text,
    .welcome-icon,
    .banner-orb,
    .banner-shine {
      animation: none !important;
    }
  }

  // ===== 状态卡片 =====
  .status-card {
    margin-bottom: 20px;
    border-radius: 14px;
    border: none;
    background: linear-gradient(135deg, #fff 0%, #f8f9ff 100%);
    transition: all 0.25s;
    &:hover { transform: translateY(-2px); }

    .status-content {
      display: flex;
      align-items: center;
      gap: 18px;
    }
    .status-avatar {
      position: relative;
      flex-shrink: 0;
      .avatar-emoji {
        position: absolute;
        bottom: -4px;
        right: -4px;
        background: #fff;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        border: 2px solid #fff;
      }
    }
    .status-text {
      flex: 1;
      min-width: 0;
    }
    .status-active {
      .status-line {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .status-msg {
        font-size: 16px;
        color: #303133;
        font-weight: 500;
        line-height: 1.5;
      }
      .status-meta {
        margin-top: 6px;
        font-size: 12px;
        color: #909399;
      }
    }
    .status-empty {
      .empty-title {
        font-size: 15px;
        color: #303133;
        font-weight: 500;
        margin-bottom: 4px;
      }
      .empty-tip {
        font-size: 13px;
        color: #909399;
      }
    }
    .status-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
  }

  .stats-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-bottom: 20px;
  }

  .stat-card {
    border-radius: 12px;
    border: none;
    transition: all 0.25s;
    cursor: pointer;
    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    }
  }

  .stat-content {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .stat-icon {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
  .stat-value {
    font-size: 26px;
    font-weight: bold;
    color: #303133;
    line-height: 1.2;
  }
  .stat-title {
    font-size: 13px;
    color: #909399;
    margin-top: 2px;
  }

  .card-title {
    font-weight: 600;
    color: #303133;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  :deep(.el-card) {
    border-radius: 12px;
    transition: all 0.25s;
  }

  .task-list, .notice-list {
    .task-item, .notice-item {
      padding: 14px 0;
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
      transition: all 0.3s;
      &:last-child { border-bottom: none; }
      &:hover { background: #f9f9f9; padding-left: 8px; }
    }
    .task-title {
      font-weight: 500;
      color: #333;
      margin-bottom: 6px;
    }
    .task-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .deadline { color: #999; font-size: 13px; }
    }
  }

  .notice-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    .notice-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #123e81;
      margin-top: 6px;
      flex-shrink: 0;
    }
    .notice-title {
      font-weight: 500;
      color: #333;
      margin-bottom: 4px;
    }
    .notice-time {
      color: #999;
      font-size: 12px;
    }
  }

  .schedule-card {
    margin-top: 0;
  }
  .schedule-item {
    display: flex;
    align-items: center;
    gap: 16px;
    .time { color: #123e81; font-weight: 500; min-width: 120px; }
    .course { font-weight: 500; flex: 1; }
    .room { color: #999; font-size: 13px; }
  }

  .empty-text {
    text-align: center;
    color: #999;
    padding: 30px;
  }

  .calendar-row {
    margin-top: 20px;
    .calendar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;

      .birthday-settings-button {
        height: 34px;
        min-height: 34px;
        padding: 0 13px 0 7px;
        gap: 7px;
        color: #334155;
        border: 1px solid #e2e8f0;
        border-radius: 999px;
        background: #fff;
        font-size: 12px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);

        &:hover,
        &:focus {
          color: #0a1b33;
          border-color: #cbd5e1;
          background: #f8fafc;
          box-shadow: 0 7px 18px rgba(15, 23, 42, 0.08);
        }

        &:active {
          transform: translateY(0);
        }
      }

      .birthday-settings-icon {
        width: 22px;
        height: 22px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        color: #123e81;
        border-radius: 50%;
        background: #eaf1fb;

        .el-icon {
          margin: 0;
          font-size: 13px;
        }
      }
    }
    .calendar-card {
      :deep(.el-calendar__title) {
        font-weight: 600;
      }
      :deep(.el-calendar-table .el-calendar-day) {
        height: 74px;
        padding: 5px;
        transition: background 180ms ease;
      }
      :deep(.el-calendar-table td.is-selected .calendar-cell) {
        color: #0a1b33;
        background: #eef4fc;
        box-shadow: inset 0 0 0 1px #d9e5f4;
      }
    }
    .calendar-cell {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 2px;
      border-radius: 10px;
      transition: transform 180ms ease, background 180ms ease, box-shadow 180ms ease;

      &:hover {
        transform: translateY(-1px);
        background: #f7f9fc;
        box-shadow: 0 5px 14px rgba(15, 23, 42, 0.06);
      }
      .cell-day {
        font-size: 14px;
        font-weight: 500;
      }
      .cell-holiday {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;

        .holiday-icon {
          width: 25px;
          height: 25px;
          display: grid;
          place-items: center;
          font-size: 15px;
          border: 1px solid rgba(251, 113, 133, 0.18);
          border-radius: 9px;
          background: linear-gradient(145deg, #fff7ed, #fff1f2);
          box-shadow: 0 4px 10px rgba(244, 63, 94, 0.09);
        }
      }
      .cell-holiday-name {
        font-size: 10px;
        color: #f56c6c;
        font-weight: 600;
        line-height: 1;
        white-space: nowrap;
      }
      .birthday-list {
        display: grid;
        gap: 2px;
        max-width: 100%;
        justify-items: center;
      }
      .birthday-chip {
        max-width: 64px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        border-radius: 999px;
        padding: 1px 5px;
        background: #fff0f6;
        color: #d93672;
        font-size: 10px;
        line-height: 1.4;
        font-weight: 600;
      }
      .cell-dots {
        display: flex;
        gap: 3px;
        .dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          &.task { background: #f56c6c; }
          &.schedule { background: #409eff; }
        }
      }
      &.is-today {
        background: #eef4fc;
        box-shadow: inset 0 0 0 1px #d7e4f4;

        .cell-day {
          color: #123e81;
          font-weight: 700;
        }
      }
      &.is-holiday {
        background: linear-gradient(145deg, rgba(255, 247, 237, 0.9), rgba(255, 241, 242, 0.82));
        box-shadow: inset 0 0 0 1px rgba(251, 113, 133, 0.12);
      }
      &.is-birthday {
        background: linear-gradient(145deg, rgba(253, 242, 248, 0.92), rgba(255, 251, 235, 0.88));
        box-shadow: inset 0 0 0 1px rgba(236, 72, 153, 0.12);
      }
    }
    .calendar-legend {
      display: flex;
      justify-content: center;
      gap: 18px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
      flex-wrap: wrap;
      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: #666;
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          &.task { background: #f56c6c; }
          &.schedule { background: #409eff; }
          &.both {
            background: linear-gradient(135deg, #f56c6c 50%, #409eff 50%);
          }
        }
        .legend-emoji {
          font-size: 14px;
          line-height: 1;
        }
      }
    }
  }

  .birthday-dialog {
    .birthday-own {
      padding: 4px 0 10px;
      border-bottom: 1px solid #ebeef5;
      margin-bottom: 14px;
    }
    .birthday-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      font-weight: 600;
      color: #303133;
    }
    .birthday-rows {
      display: grid;
      gap: 10px;
    }
    .birthday-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 160px 32px;
      gap: 10px;
      align-items: center;
    }
  }

  .memo-row {
    margin-top: 20px;
    .memo-card {
      border-radius: 12px;
      .memo-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
        .card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          .memo-count {
            margin-left: 4px;
          }
        }
      }
      .memo-add {
        display: flex;
        gap: 10px;
        margin-bottom: 14px;
        align-items: center;
        .el-input { flex: 1; }
        .color-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 6px;
          vertical-align: middle;
        }
      }
      .memo-empty {
        padding: 16px 0;
      }
      .memo-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 12px;
        .memo-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 10px;
          background: #fafbff;
          border-left: 4px solid #4facfe;
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 14px rgba(102, 126, 234, 0.15);
          }
          &.color-blue   { border-left-color: #4facfe; background: #f0f7ff; }
          &.color-pink   { border-left-color: #f5576c; background: #fff5f7; }
          &.color-green  { border-left-color: #42b983; background: #f1fbf4; }
          &.color-yellow { border-left-color: #f6a609; background: #fff8eb; }
          &.color-purple { border-left-color: #3b82f6; background: #f6f1ff; }
          &.done {
            opacity: 0.55;
            .memo-text {
              text-decoration: line-through;
              color: #909399;
            }
          }
          .memo-body {
            flex: 1;
            min-width: 0;
            .memo-text {
              font-size: 14px;
              color: #303133;
              line-height: 1.5;
              word-break: break-word;
            }
            .memo-meta {
              margin-top: 6px;
              font-size: 11px;
              color: #909399;
              display: flex;
              align-items: center;
              gap: 4px;
              flex-wrap: wrap;
              .meta-done {
                color: #42b983;
                margin-left: 6px;
              }
            }
          }
          .memo-del {
            opacity: 0.5;
            transition: opacity 0.2s;
          }
          &:hover .memo-del { opacity: 1; }
        }
      }
    }
  }
}

  .notice-dialog-list {
    max-height: 500px;
    overflow-y: auto;
    .notice-dialog-item {
      padding: 16px 0;
      border-bottom: 1px solid #f0f0f0;
      &:last-child { border-bottom: none; }
      .notice-dialog-title {
        font-weight: 600;
        font-size: 15px;
        color: #303133;
        margin-bottom: 6px;
      }
      .notice-dialog-time {
        font-size: 12px;
        color: #909399;
        margin-bottom: 8px;
      }
      .notice-dialog-content {
        font-size: 14px;
        color: #606266;
        line-height: 1.6;
      }
    }
  }

// ===== 状态对话框 =====
.status-dialog {
  .dialog-section {
    margin-bottom: 18px;
    .section-label {
      font-size: 14px;
      font-weight: 600;
      color: #303133;
      margin-bottom: 10px;
    }
  }
  .emoji-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
  }
  .emoji-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 6px;
    border: 2px solid #ebeef5;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    background: #fff;
    &:hover {
      border-color: #c6cdf7;
      transform: translateY(-2px);
    }
    &.active {
      border-color: #123e81;
      background: linear-gradient(135deg, #f0f3ff 0%, #f9faff 100%);
      box-shadow: 0 4px 10px rgba(102, 126, 234, 0.18);
    }
    .emoji-icon {
      font-size: 24px;
      line-height: 1;
    }
    .emoji-label {
      font-size: 11px;
      color: #606266;
    }
  }
  .dialog-tip {
    margin-top: 12px;
    padding: 10px 14px;
    background: #f0f9ff;
    color: #409eff;
    border-radius: 8px;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
}
</style>
