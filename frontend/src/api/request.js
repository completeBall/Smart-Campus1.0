import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000
})

request.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

request.interceptors.response.use(
  (response) => {
    // blob / arraybuffer 响应直接返回，不做 JSON 校验
    if (response.config.responseType === 'blob' || response.config.responseType === 'arraybuffer') {
      return response.data
    }
    const res = response.data
    if (res.code !== 200) {
      // 401/403 静默处理，只跳转不弹窗
      if (res.code === 401 || res.code === 403) {
        const userStore = useUserStore()
        console.warn(`[Auth] 接口返回 ${res.code}，请求: ${response.config.url}，消息: ${res.message}`)
        userStore.logout()
        window.location.href = '/login'
        return Promise.reject(new Error(res.message))
      }
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message))
    }
    return res
  },
  (error) => {
    const isLoginPage = window.location.pathname === '/login'
    const status = error.response?.status
    // 401/403 权限不足时自动登出
    if (status === 401 || status === 403) {
      const userStore = useUserStore()
      console.warn(`[Auth] HTTP ${status}，请求: ${error.config?.url || 'unknown'}，触发自动登出`)
      userStore.logout()
      window.location.href = '/login'
      return Promise.reject(error)
    }
    // 登录页不弹网络错误，避免刷屏
    if (!isLoginPage) {
      let msg = error.message || '网络错误'
      if (msg === 'Network Error') msg = '网络连接失败，请检查后端服务是否启动'
      if (msg.includes('timeout')) msg = '请求超时，请稍后重试'
      ElMessage.error(msg)
    }
    return Promise.reject(error)
  }
)

export default request
