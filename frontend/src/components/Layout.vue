<template>
  <div class="layout">
    <el-container>
      <el-aside width="220px" class="sidebar">
        <div class="logo">
          <el-icon size="28"><School /></el-icon>
          <span>智慧校园</span>
        </div>
        <el-menu
          :default-active="activeMenu"
          router
          class="sidebar-menu"
          background-color="#1a1a2e"
          text-color="#b8c5d6"
          active-text-color="#fff"
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
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
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

const unreadTotal = ref(0)
const hasActiveAttendance = ref(false)
let pollTimer = null

const activeMenu = computed(() => route.path)

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
    '/student/classmates': '我的同学',
    '/student/friends': '我的好友',
    '/student/chat': '聊天',
    '/student/colleges': '学院专业',
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
  pollTimer = setInterval(refreshAll, 10000)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped lang="scss">
.layout {
  min-height: 100vh;
}

.sidebar {
  background: #1a1a2e;
  min-height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;

  .logo {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 20px;
    font-weight: bold;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    gap: 10px;

    span {
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  }
}

.sidebar-menu {
  border-right: none;
}

:deep(.el-menu-item:hover) {
  background: rgba(102, 126, 234, 0.15) !important;
}

:deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%) !important;
}

.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  position: sticky;
  top: 0;
  z-index: 99;
  margin-left: 220px;
}

.header-right {
  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 4px 12px;
    border-radius: 20px;
    transition: background 0.3s;

    &:hover {
      background: #f5f5f5;
    }
  }

  .user-avatar {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    font-weight: bold;
  }

  .user-name {
    font-size: 14px;
    color: #333;
  }
}

.main-content {
  margin-left: 220px;
  background: #f0f2f5;
  min-height: calc(100vh - 60px);
  padding: 20px;
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
    box-shadow: 0 0 0 1px #1a1a2e;
  }
}
</style>
