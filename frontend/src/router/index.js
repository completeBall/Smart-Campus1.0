import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/Login.vue')
  },
  {
    path: '/admin',
    component: () => import('@/components/Layout.vue'),
    meta: { role: 'admin' },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard', component: () => import('@/views/admin/Dashboard.vue') },
      { path: 'users', component: () => import('@/views/admin/Users.vue') },
      { path: 'logs', component: () => import('@/views/admin/Logs.vue') },
      { path: 'feedback', component: () => import('@/views/admin/Feedback.vue') },
      { path: 'notices', component: () => import('@/views/admin/Notices.vue') },
      { path: 'profile', component: () => import('@/views/profile/Profile.vue') }
    ]
  },
  {
    path: '/teacher',
    component: () => import('@/components/Layout.vue'),
    meta: { role: 'teacher' },
    children: [
      { path: '', redirect: '/teacher/dashboard' },
      { path: 'dashboard', component: () => import('@/views/teacher/Dashboard.vue') },
      { path: 'tasks', component: () => import('@/views/teacher/Tasks.vue') },
      { path: 'submissions', component: () => import('@/views/teacher/Submissions.vue') },
      { path: 'schedule', component: () => import('@/views/teacher/Schedule.vue') },
      { path: 'grades', component: () => import('@/views/teacher/Grades.vue') },
      { path: 'approvals', component: () => import('@/views/teacher/Approvals.vue') },
      { path: 'students', component: () => import('@/views/teacher/Students.vue') },
      { path: 'friends', component: () => import('@/views/social/Friends.vue') },
      { path: 'chat', component: () => import('@/views/social/Chat.vue') },
      { path: 'u/:id', component: () => import('@/views/profile/UserProfile.vue') },
      { path: 'attendance-sessions/:id', component: () => import('@/views/teacher/AttendanceSession.vue') },
      { path: 'profile', component: () => import('@/views/profile/Profile.vue') }
    ]
  },
  {
    path: '/student',
    component: () => import('@/components/Layout.vue'),
    meta: { role: 'student' },
    children: [
      { path: '', redirect: '/student/dashboard' },
      { path: 'dashboard', component: () => import('@/views/student/Dashboard.vue') },
      { path: 'homework', component: () => import('@/views/student/Homework.vue') },
      { path: 'forum', component: () => import('@/views/student/Forum.vue') },
      { path: 'forum/:id', component: () => import('@/views/student/ForumDetail.vue') },
      { path: 'schedule', component: () => import('@/views/student/Schedule.vue') },
      { path: 'grades', component: () => import('@/views/student/Grades.vue') },
      { path: 'jobs', component: () => import('@/views/student/Jobs.vue') },
      { path: 'jobs/:id', component: () => import('@/views/student/JobDetail.vue') },
      { path: 'attendance', component: () => import('@/views/student/Attendance.vue') },
      { path: 'leave', component: () => import('@/views/student/Leave.vue') },
      { path: 'assessment', component: () => import('@/views/student/Assessment.vue') },
      { path: 'activities', component: () => import('@/views/student/Activities.vue') },
      { path: 'daily-words', component: () => import('@/views/student/DailyWords.vue') },
      { path: 'minesweeper', component: () => import('@/views/student/Minesweeper.vue') },
      { path: 'sudoku', component: () => import('@/views/student/Sudoku.vue') },
      { path: 'chess', component: () => import('@/views/student/Chess.vue') },
      { path: 'gomoku', component: () => import('@/views/student/Gomoku.vue') },
      { path: 'classmates', component: () => import('@/views/student/Classmates.vue') },
      { path: 'colleges', component: () => import('@/views/student/Colleges.vue') },
      { path: 'feedback', component: () => import('@/views/student/Feedback.vue') },
      { path: 'friends', component: () => import('@/views/social/Friends.vue') },
      { path: 'chat', component: () => import('@/views/social/Chat.vue') },
      { path: 'u/:id', component: () => import('@/views/profile/UserProfile.vue') },
      { path: 'doudizhu', component: () => import('@/views/student/Doudizhu.vue') },
      { path: 'idiom', component: () => import('@/views/student/Idiom.vue') },
      { path: 'sokoban', component: () => import('@/views/student/Sokoban.vue') },
      { path: 'snake', component: () => import('@/views/student/Snake.vue') },
      { path: 'profile', component: () => import('@/views/profile/Profile.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  if (to.path === '/login') {
    next()
  } else if (!userStore.token) {
    console.warn(`[Router] 拦截到 ${to.path}，token 为空，跳转登录页`)
    next('/login')
  } else if (to.meta.role && to.meta.role !== userStore.userInfo.role) {
    console.warn(`[Router] 拦截到 ${to.path}，角色不匹配 (需要 ${to.meta.role}，当前 ${userStore.userInfo.role})，跳转登录页`)
    next('/login')
  } else {
    next()
  }
})

export default router
