<template>
  <div class="layout">
    <el-container>
      <el-aside width="220px" class="sidebar">
        <div class="logo">
          <button
            ref="themeToggleRef"
            type="button"
            class="logo-mark"
            :aria-label="isDarkTheme ? '切换到浅色主题' : '切换到深色主题'"
            :title="isDarkTheme ? '切换到浅色主题' : '切换到深色主题'"
            @click="toggleTheme"
            >
              <img src="/logos/campus-bird.png" alt="智慧校园">
            </button>
          <div class="logo-copy">
            <span>智慧校园</span>
            <small>SMART CAMPUS 2.0</small>
          </div>
        </div>
        <el-menu
          :default-active="activeMenu"
          router
          class="sidebar-menu"
        >
          <!-- 管理员菜单 -->
          <template v-if="userStore.userInfo.role === 'admin'">
            <el-menu-item index="/admin/dashboard">
              <el-icon><DataLine /></el-icon>
              <span>数据概览</span>
            </el-menu-item>
            <el-menu-item index="/admin/users">
              <el-icon><User /></el-icon>
              <span>用户管理</span>
            </el-menu-item>
            <el-menu-item index="/admin/logs">
              <el-icon><Document /></el-icon>
              <span>操作日志</span>
            </el-menu-item>
            <el-menu-item index="/admin/feedback">
              <el-icon><ChatDotRound /></el-icon>
              <span>反馈管理</span>
            </el-menu-item>
            <el-menu-item index="/admin/notices">
              <el-icon><Bell /></el-icon>
              <span>通知公告</span>
            </el-menu-item>
            <el-menu-item index="/admin/ai-settings">
              <el-icon><Connection /></el-icon>
              <span>AI 设置</span>
            </el-menu-item>
            <el-menu-item index="/admin/youth-creation">
              <el-icon><Location /></el-icon>
              <span>青年共创审核</span>
            </el-menu-item>
          </template>

          <!-- 教师菜单 -->
          <template v-if="userStore.userInfo.role === 'teacher'">
            <el-menu-item index="/teacher/dashboard">
              <el-icon><DataLine /></el-icon>
              <span>教学概览</span>
            </el-menu-item>
            <el-menu-item index="/teacher/tasks">
              <el-icon><EditPen /></el-icon>
              <span>发布任务</span>
            </el-menu-item>
            <el-menu-item index="/teacher/submissions">
              <el-icon><DocumentChecked /></el-icon>
              <span>批改作业</span>
            </el-menu-item>
            <el-menu-item index="/teacher/schedule">
              <el-icon><Calendar /></el-icon>
              <span>课程表</span>
            </el-menu-item>
            <el-menu-item index="/teacher/grades">
              <el-icon><TrendCharts /></el-icon>
              <span>成绩管理</span>
            </el-menu-item>
            <el-menu-item index="/teacher/approvals">
              <el-icon><CircleCheck /></el-icon>
              <span>审批管理</span>
            </el-menu-item>
            <el-menu-item index="/teacher/students">
              <el-icon><User /></el-icon>
              <span>学生管理</span>
            </el-menu-item>
            <el-menu-item index="/teacher/friends">
              <el-icon><UserFilled /></el-icon>
              <span>我的好友</span>
            </el-menu-item>
            <el-menu-item index="/teacher/chat">
              <el-icon><ChatLineRound /></el-icon>
              <el-badge :is-dot="unreadTotal > 0" class="menu-badge">
                <span>聊天</span>
              </el-badge>
            </el-menu-item>
          </template>

          <!-- 学生菜单 -->
          <template v-if="userStore.userInfo.role === 'student'">
            <el-menu-item index="/student/dashboard">
              <el-icon><DataLine /></el-icon>
              <span>首页</span>
            </el-menu-item>
            <el-menu-item index="/student/homework">
              <el-icon><EditPen /></el-icon>
              <span>我的作业</span>
            </el-menu-item>
            <el-menu-item index="/student/schedule">
              <el-icon><Calendar /></el-icon>
              <span>课程表</span>
            </el-menu-item>
            <el-menu-item index="/student/grades">
              <el-icon><TrendCharts /></el-icon>
              <span>成绩查询</span>
            </el-menu-item>
            <el-menu-item index="/student/forum">
              <el-icon><ChatDotRound /></el-icon>
              <span>校园论坛</span>
            </el-menu-item>
            <el-menu-item index="/student/ai">
              <el-icon><MagicStick /></el-icon>
              <span>智能 AI</span>
            </el-menu-item>
            <el-menu-item index="/student/jobs">
              <el-icon><Briefcase /></el-icon>
              <span>企业招聘</span>
            </el-menu-item>
            <el-menu-item index="/student/attendance">
              <el-icon><Timer /></el-icon>
              <el-badge :is-dot="hasActiveAttendance" class="menu-badge">
                <span>考勤记录</span>
              </el-badge>
            </el-menu-item>
            <el-menu-item index="/student/leave">
              <el-icon><DocumentChecked /></el-icon>
              <span>请假申请</span>
            </el-menu-item>
            <el-menu-item index="/student/assessment">
              <el-icon><Medal /></el-icon>
              <span>综测分数</span>
            </el-menu-item>
            <el-menu-item index="/student/activities">
              <el-icon><Football /></el-icon>
              <span>活动广场</span>
            </el-menu-item>
            <el-menu-item index="/student/youth-creation">
              <el-icon><Location /></el-icon>
              <span>青年共创</span>
            </el-menu-item>
            <el-menu-item index="/student/classmates">
              <el-icon><User /></el-icon>
              <span>我的同学</span>
            </el-menu-item>
            <el-menu-item index="/student/friends">
              <el-icon><UserFilled /></el-icon>
              <span>我的好友</span>
            </el-menu-item>
            <el-menu-item index="/student/chat">
              <el-icon><ChatLineRound /></el-icon>
              <el-badge :is-dot="unreadTotal > 0" class="menu-badge">
                <span>聊天</span>
              </el-badge>
            </el-menu-item>
            <el-menu-item index="/student/colleges">
              <el-icon><School /></el-icon>
              <span>学院专业</span>
            </el-menu-item>
            <el-menu-item index="/student/feedback">
              <el-icon><Service /></el-icon>
              <span>意见反馈</span>
            </el-menu-item>
          </template>
        </el-menu>
      </el-aside>

      <el-container>
        <el-header class="header">
          <div class="header-left">
            <el-breadcrumb>
              <el-breadcrumb-item :to="{ path: '/' + userStore.userInfo.role + '/dashboard' }">
                首页
              </el-breadcrumb-item>
              <el-breadcrumb-item>{{ pageTitle }}</el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          <div class="header-right">
            <button
              type="button"
              class="weather-pill"
              :class="{ loading: weather.loading }"
              :title="weather.error || '点击刷新实时天气'"
              @click="loadWeather(true)"
            >
              <span class="weather-icon" aria-hidden="true">{{ weather.icon }}</span>
              <span class="weather-copy">
                <strong>{{ weather.loading ? '获取天气' : `${weather.temperature}°` }}</strong>
                <small>{{ weather.label }} · {{ weather.location }}</small>
              </span>
            </button>
            <el-dropdown @command="handleCommand">
              <span class="user-info">
                <el-avatar :size="32" :src="userStore.userInfo.avatar" class="user-avatar">
                  {{ userStore.userInfo.name?.charAt(0) }}
                </el-avatar>
                <span class="user-name">{{ userStore.userInfo.name }}</span>
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                  <el-dropdown-item command="password">修改密码</el-dropdown-item>
                  <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>

        <el-main class="main-content">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </el-main>
      </el-container>
    </el-container>

    <!-- 修改密码对话框 -->
    <el-dialog v-model="passwordVisible" title="修改密码" width="400px">
      <el-form :model="passwordForm" label-width="100px" :rules="passwordRules" ref="passwordRef">
        <el-form-item label="原密码" prop="oldPassword">
          <el-input v-model="passwordForm.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPassword">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { changePassword } from '@/api/auth'
import { getUnreadSummary } from '@/api/social'
import { getActiveAttendanceSession } from '@/api/student'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const passwordVisible = ref(false)
const passwordRef = ref()
const passwordForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const themeToggleRef = ref()
const isDarkTheme = ref(document.documentElement.dataset.theme === 'dark')
const weather = reactive({
  loading: true,
  temperature: '--',
  label: '实时天气',
  icon: '☀️',
  location: '当前位置',
  error: ''
})

const unreadTotal = ref(0)
const hasActiveAttendance = ref(false)
let pollTimer = null

const WEATHER_CODES = {
  0: ['晴朗', '☀️'],
  1: ['大部晴朗', '🌤️'],
  2: ['多云', '⛅'],
  3: ['阴天', '☁️'],
  45: ['有雾', '🌫️'],
  48: ['雾凇', '🌫️'],
  51: ['小毛雨', '🌦️'],
  53: ['毛毛雨', '🌦️'],
  55: ['较强毛雨', '🌧️'],
  61: ['小雨', '🌦️'],
  63: ['中雨', '🌧️'],
  65: ['大雨', '🌧️'],
  71: ['小雪', '🌨️'],
  73: ['中雪', '🌨️'],
  75: ['大雪', '❄️'],
  80: ['阵雨', '🌦️'],
  81: ['较强阵雨', '🌧️'],
  82: ['强阵雨', '⛈️'],
  95: ['雷雨', '⛈️'],
  96: ['雷雨冰雹', '⛈️'],
  99: ['强雷雨冰雹', '⛈️']
}

const getWeatherPosition = (force = false) => new Promise((resolve) => {
  const cached = localStorage.getItem('campus-weather-position')
  if (!force && cached) {
    try {
      const position = JSON.parse(cached)
      if (Date.now() - position.savedAt < 6 * 60 * 60 * 1000) {
        resolve(position)
        return
      }
    } catch (e) {
      localStorage.removeItem('campus-weather-position')
    }
  }

  if (!navigator.geolocation) {
    resolve({ latitude: 39.9042, longitude: 116.4074, location: '北京' })
    return
  }

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const position = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        location: '当前位置',
        savedAt: Date.now()
      }
      localStorage.setItem('campus-weather-position', JSON.stringify(position))
      resolve(position)
    },
    () => resolve({ latitude: 39.9042, longitude: 116.4074, location: '北京' }),
    { enableHighAccuracy: false, timeout: 5000, maximumAge: 30 * 60 * 1000 }
  )
})

const loadWeather = async (force = false) => {
  weather.loading = true
  weather.error = ''
  try {
    const position = await getWeatherPosition(force)
    const params = new URLSearchParams({
      latitude: position.latitude,
      longitude: position.longitude,
      current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m',
      timezone: 'auto'
    })
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
    if (!response.ok) throw new Error('天气服务暂时不可用')
    const data = await response.json()
    const current = data.current || {}
    const [label, icon] = WEATHER_CODES[current.weather_code] || ['实时天气', '🌤️']
    weather.temperature = Math.round(current.temperature_2m)
    weather.label = label
    weather.icon = icon
    weather.location = position.location
  } catch (error) {
    weather.error = error.message || '天气加载失败，点击重试'
    weather.label = '点击重试'
    weather.icon = '🌤️'
  } finally {
    weather.loading = false
  }
}

const activeMenu = computed(() => route.path)

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme
  localStorage.setItem('campus-theme', theme)
  isDarkTheme.value = theme === 'dark'
}

const toggleTheme = async (event) => {
  const nextTheme = isDarkTheme.value ? 'light' : 'dark'
  const rect = themeToggleRef.value?.getBoundingClientRect()
  const x = event?.clientX || (rect ? rect.left + rect.width / 2 : 0)
  const y = event?.clientY || (rect ? rect.top + rect.height / 2 : 0)
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!document.startViewTransition || reduceMotion) {
    applyTheme(nextTheme)
    return
  }

  const transition = document.startViewTransition(() => applyTheme(nextTheme))
  await transition.ready
  document.documentElement.animate(
    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
    {
      duration: 720,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      pseudoElement: '::view-transition-new(root)'
    }
  )
}

const refreshUnread = async () => {
  try {
    const role = userStore.userInfo?.role
    if (role !== 'student' && role !== 'teacher') return
    const res = await getUnreadSummary()
    unreadTotal.value = res.data?.total || 0
  } catch (e) {
    // 忽略
  }
}

const refreshActiveAttendance = async () => {
  try {
    if (userStore.userInfo?.role !== 'student') {
      hasActiveAttendance.value = false
      return
    }
    const res = await getActiveAttendanceSession()
    const data = res.data
    const myStatus = data?.record?.status
    if (data && data.session && (myStatus === 'absent' || !myStatus)) {
      hasActiveAttendance.value = true
    } else {
      hasActiveAttendance.value = false
    }
  } catch (e) {
    hasActiveAttendance.value = false
  }
}

const refreshAll = () => {
  refreshUnread()
  refreshActiveAttendance()
}

// 进入聊天页时,认为已查看,清空红点(实际清空在 Chat.vue 内调用 markChatRead)
watch(() => route.path, (p) => {
  if (p && (p.endsWith('/chat'))) {
    // 进入聊天页面后稍后刷新一下,等待 markChatRead 落地
    setTimeout(refreshUnread, 1500)
  }
  if (p && (p.endsWith('/attendance'))) {
    setTimeout(refreshActiveAttendance, 1500)
  }
})

const pageTitle = computed(() => {
  const titles = {
    '/admin/dashboard': '数据概览',
    '/admin/users': '用户管理',
    '/admin/logs': '操作日志',
    '/admin/feedback': '反馈管理',
    '/admin/notices': '通知公告',
    '/admin/ai-settings': 'AI 设置',
    '/teacher/dashboard': '教学概览',
    '/teacher/tasks': '发布任务',
    '/teacher/submissions': '批改作业',
    '/teacher/schedule': '课程表',
    '/teacher/grades': '成绩管理',
    '/teacher/approvals': '审批管理',
    '/teacher/students': '学生管理',
    '/teacher/friends': '我的好友',
    '/teacher/chat': '聊天',
    '/student/dashboard': '首页',
    '/student/homework': '我的作业',
    '/student/schedule': '课程表',
    '/student/grades': '成绩查询',
    '/student/forum': '校园论坛',
    '/student/jobs': '企业招聘',
    '/student/attendance': '考勤记录',
    '/student/leave': '请假申请',
    '/student/assessment': '综测分数',
    '/student/activities': '活动广场',
    '/student/youth-creation': '青年共创',
    '/student/classmates': '我的同学',
    '/student/friends': '我的好友',
    '/student/chat': '聊天',
    '/student/colleges': '学院专业',
    '/student/ai': '智能 AI',
    '/student/feedback': '意见反馈'
  }
  // 处理动态路由
  if (route.path.match(/^\/(student|teacher)\/u\/\d+/)) return '同学主页'
  if (route.path.match(/^\/teacher\/attendance-sessions\/\d+/)) return '签到详情'
  return titles[route.path] || ''
})

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [{ required: true, message: '请输入新密码', trigger: 'blur' }, { min: 6, message: '密码至少6位', trigger: 'blur' }],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.value.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const handleCommand = (cmd) => {
  if (cmd === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' }).then(() => {
      userStore.logout()
      router.push('/login')
      ElMessage.success('已退出登录')
    })
  } else if (cmd === 'password') {
    passwordVisible.value = true
    passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  } else if (cmd === 'profile') {
    router.push(`/${userStore.userInfo.role}/profile`)
  }
}

const submitPassword = async () => {
  await passwordRef.value.validate()
  await changePassword({
    userId: userStore.userInfo.id,
    oldPassword: passwordForm.value.oldPassword,
    newPassword: passwordForm.value.newPassword
  })
  ElMessage.success('密码修改成功')
  passwordVisible.value = false
}

onMounted(() => {
  refreshAll()
  loadWeather()
  pollTimer = setInterval(refreshAll, 10000)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped lang="scss">
.layout {
  min-height: 100vh;
  background: #f9fafb;
}

.sidebar {
  width: 220px !important;
  height: calc(100vh - 24px);
  position: fixed;
  left: 12px;
  top: 12px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(226, 232, 240, 0.82);
  border-radius: 28px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(24px);

  .logo {
    min-height: 88px;
    display: flex;
    align-items: center;
    padding: 0 18px;
    gap: 12px;
    border-bottom: 1px solid rgba(226, 232, 240, 0.72);

    .logo-mark {
      appearance: none;
      padding: 0;
      width: 42px;
      height: 42px;
      flex: 0 0 42px;
      display: grid;
      place-items: center;
      overflow: hidden;
      border: 1px solid rgba(226, 232, 240, 0.8);
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
      cursor: pointer;
      position: relative;
      transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;

      &:hover {
        transform: scale(1.06) rotate(-3deg);
        border-color: #cbd9ed;
        box-shadow: 0 11px 26px rgba(18, 62, 129, 0.14);
      }

      &:active {
        transform: scale(0.96);
      }

      img {
        width: 30px;
        height: 30px;
        object-fit: contain;
      }

    }

    .logo-copy {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    span {
      color: #0a1b33;
      font-family: "Outfit", "Microsoft YaHei", sans-serif;
      font-size: 18px;
      font-weight: 600;
      letter-spacing: -0.03em;
      white-space: nowrap;
    }

    small {
      color: #94a3b8;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.12em;
      white-space: nowrap;
    }
  }
}

.sidebar-menu {
  border-right: none;
  flex: 1;
  padding: 12px 10px 18px;
  overflow-y: auto;
  overflow-x: hidden;
  background: transparent;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #dbe2ea;
    border-radius: 6px;
  }
}

:deep(.sidebar-menu .el-menu-item) {
  height: 48px;
  margin: 3px 0;
  padding: 0 14px !important;
  color: #64748b;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
  transition: color 180ms ease, background 180ms ease, transform 180ms ease, box-shadow 180ms ease;

  .el-icon {
    margin-right: 12px;
    color: #94a3b8;
    font-size: 18px;
    transition: color 180ms ease;
  }
}

:deep(.sidebar-menu .el-menu-item:hover) {
  color: #0a1b33 !important;
  background: #f1f5f9 !important;
  transform: translateX(2px);

  .el-icon {
    color: #0a1b33;
  }
}

:deep(.sidebar-menu .el-menu-item.is-active) {
  color: #0a1b33 !important;
  background: #f5f8fc !important;
  border: 1px solid #dbe5f2;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);

  .el-icon {
    width: 28px;
    height: 28px;
    margin-left: -6px;
    margin-right: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #123e81;
    border-radius: 50%;
    background: #eaf1fb;
  }
}

.header {
  height: 72px;
  background: rgba(249, 250, 251, 0.88);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(226, 232, 240, 0.7);
  backdrop-filter: blur(18px);
  position: sticky;
  top: 0;
  z-index: 99;
  margin-left: 244px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;

  .weather-pill {
    appearance: none;
    min-width: 154px;
    height: 46px;
    padding: 6px 13px 6px 8px;
    display: flex;
    align-items: center;
    gap: 9px;
    color: #0a1b33;
    border: 1px solid #dfe7f1;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.78);
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
    cursor: pointer;
    transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;

    &:hover {
      transform: translateY(-1px);
      border-color: #c4d3e6;
      box-shadow: 0 11px 28px rgba(18, 62, 129, 0.1);
    }

    &.loading .weather-icon {
      animation: weather-pulse 1s ease-in-out infinite;
    }
  }

  .weather-icon {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    flex: 0 0 32px;
    font-size: 20px;
    border-radius: 11px;
    background: linear-gradient(135deg, #eaf3ff, #f7fbff);
  }

  .weather-copy {
    min-width: 0;
    display: grid;
    gap: 1px;
    text-align: left;

    strong {
      color: inherit;
      font-size: 14px;
      line-height: 1.2;
    }

    small {
      max-width: 104px;
      overflow: hidden;
      color: #718096;
      font-size: 10px;
      line-height: 1.2;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 4px 12px;
    border-radius: 20px;
    transition: background 0.3s;

    &:hover {
      background: #fff;
    }
  }

  .user-avatar {
    background: #0a152d;
    color: #fff;
    font-weight: bold;
  }

  .user-name {
    font-size: 14px;
    color: #333;
  }
}

@keyframes weather-pulse {
  50% { transform: scale(0.88); opacity: 0.62; }
}

.main-content {
  margin-left: 244px;
  background: #f9fafb;
  min-height: calc(100vh - 72px);
  padding: 24px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.menu-badge {
  display: inline-flex;
  align-items: center;
  line-height: 1;
  :deep(.el-badge__content.is-dot) {
    top: 6px;
    right: -2px;
  }
  :deep(.el-badge__content) {
    border: none;
    box-shadow: 0 0 0 2px #fff;
  }
}

@media (max-width: 900px) {
  .sidebar {
    left: 8px;
    top: 8px;
    width: 196px !important;
    height: calc(100vh - 16px);
    border-radius: 24px;

    .logo {
      padding: 0 14px;
    }
  }

  .header,
  .main-content {
    margin-left: 212px;
  }

  .main-content {
    padding: 18px;
  }
}
</style>
