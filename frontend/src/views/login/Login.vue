<template>
  <div class="login-page">
    <!-- 动态背景粒子 -->
    <div class="particles">
      <div v-for="n in 30" :key="n" class="particle" :style="getParticleStyle(n)"></div>
    </div>

    <div class="login-container">
      <!-- 左侧登录卡片 -->
      <div class="login-left">
        <div class="glass-card">
          <div class="login-header">
            <el-icon size="48" class="logo-icon"><School /></el-icon>
            <h1 class="title">智慧校园</h1>
            <p class="subtitle">Smart Campus Management System</p>
          </div>

          <el-tabs v-model="activeRole" class="role-tabs" stretch>
            <el-tab-pane label="学生登录" name="student" />
            <el-tab-pane label="教师登录" name="teacher" />
            <el-tab-pane label="管理员" name="admin" />
          </el-tabs>

          <el-form :model="form" :rules="rules" ref="formRef" class="login-form">
            <el-form-item prop="username">
              <el-input
                v-model="form.username"
                placeholder="请输入账号"
                size="large"
                :prefix-icon="User"
                class="custom-input"
              />
            </el-form-item>
            <el-form-item prop="password">
              <el-input
                v-model="form.password"
                type="password"
                placeholder="请输入密码"
                size="large"
                :prefix-icon="Lock"
                show-password
                class="custom-input"
                @keyup.enter="handleLogin"
              />
            </el-form-item>
            <div class="login-options">
              <el-checkbox v-model="remember">记住密码</el-checkbox>
              <span class="default-pwd">默认密码: 123456</span>
            </div>
            <el-button
              type="primary"
              size="large"
              class="login-btn"
              :loading="loading"
              @click="handleLogin"
            >
              登 录
            </el-button>
          </el-form>

          <div class="login-footer">
            <p>© 智慧校园系统 | t个球测试专用版</p>
          </div>
        </div>
      </div>

      <!-- 右侧主题图片区 -->
      <div class="login-right">
        <div class="right-content">
          <div class="floating-shapes">
            <div class="shape shape-1"></div>
            <div class="shape shape-2"></div>
            <div class="shape shape-3"></div>
            <div class="shape shape-4"></div>
          </div>
          <div class="right-text">
            <h2>智慧校园 未来已来</h2>
            <p>融合信息技术与教育教学，打造数字化、智能化、个性化的现代教育新生态</p>
            <div class="feature-tags">
              <span class="tag"><el-icon><Monitor /></el-icon> 智能管理</span>
              <span class="tag"><el-icon><Reading /></el-icon> 在线学习</span>
              <span class="tag"><el-icon><Connection /></el-icon> 互动交流</span>
              <span class="tag"><el-icon><OfficeBuilding /></el-icon> 校企合作</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, School, Monitor, Reading, Connection, OfficeBuilding } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { login } from '@/api/auth'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)
const activeRole = ref('student')
const remember = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const getParticleStyle = (n) => {
  const size = Math.random() * 6 + 2
  const left = Math.random() * 100
  const delay = Math.random() * 10
  const duration = Math.random() * 10 + 10
  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${left}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`
  }
}

const handleLogin = async () => {
  await formRef.value.validate()
  loading.value = true
  try {
    const res = await login({
      username: form.username,
      password: form.password,
      role: activeRole.value
    })
    userStore.setToken(res.data.token)
    userStore.setUserInfo(res.data.user)
    ElMessage.success('登录成功')
    router.push(`/${activeRole.value}/dashboard`)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

/* 粒子背景 */
.particles {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  overflow: hidden;
  pointer-events: none;
}

.particle {
  position: absolute;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  animation: float linear infinite;
  bottom: -10px;
}

@keyframes float {
  0% {
    transform: translateY(0) scale(1);
    opacity: 0.8;
  }
  100% {
    transform: translateY(-100vh) scale(0.2);
    opacity: 0;
  }
}

.login-container {
  display: flex;
  width: 1000px;
  height: 600px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 1;
}

/* 左侧毛玻璃卡片 */
.login-left {
  width: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.2);
}

.glass-card {
  width: 100%;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;

  .logo-icon {
    color: #fff;
    margin-bottom: 10px;
  }

  .title {
    color: #fff;
    font-size: 28px;
    font-weight: bold;
    margin-bottom: 6px;
    letter-spacing: 4px;
  }

  .subtitle {
    color: rgba(255, 255, 255, 0.7);
    font-size: 12px;
    letter-spacing: 1px;
  }
}

.role-tabs {
  margin-bottom: 20px;

  :deep(.el-tabs__nav-wrap::after) {
    background: rgba(255, 255, 255, 0.2);
  }

  :deep(.el-tabs__item) {
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;

    &.is-active {
      color: #fff;
    }
  }

  :deep(.el-tabs__active-bar) {
    background: #fff;
  }
}

.login-form {
  .custom-input {
    :deep(.el-input__wrapper) {
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: none;
      border-radius: 10px;
      padding: 4px 15px;

      &.is-focus {
        border-color: rgba(255, 255, 255, 0.5);
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
      }
    }

    :deep(.el-input__inner) {
      color: #fff;
      height: 42px;

      &::placeholder {
        color: rgba(255, 255, 255, 0.5);
      }
    }

    :deep(.el-input__icon) {
      color: rgba(255, 255, 255, 0.7);
    }
  }
}

.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 16px 0 24px;

  :deep(.el-checkbox__label) {
    color: rgba(255, 255, 255, 0.8);
    font-size: 13px;
  }

  :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
    background-color: #fff;
    border-color: #fff;
  }

  :deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
    color: #fff;
  }

  .default-pwd {
    color: rgba(255, 255, 255, 0.6);
    font-size: 12px;
  }
}

.login-btn {
  width: 100%;
  height: 46px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 4px;
  background: linear-gradient(90deg, #fff 0%, #f0f0f0 100%);
  color: #667eea;
  border: none;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
    background: #fff;
  }
}

.login-footer {
  margin-top: 30px;
  text-align: center;

  p {
    color: rgba(255, 255, 255, 0.5);
    font-size: 12px;
  }
}

/* 右侧主题区 */
.login-right {
  flex: 1;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.floating-shapes {
  position: absolute;
  width: 100%;
  height: 100%;

  .shape {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.4;
    animation: pulse 6s ease-in-out infinite;
  }

  .shape-1 {
    width: 300px;
    height: 300px;
    background: #667eea;
    top: -50px;
    right: -50px;
    animation-delay: 0s;
  }

  .shape-2 {
    width: 200px;
    height: 200px;
    background: #764ba2;
    bottom: 50px;
    left: 50px;
    animation-delay: 2s;
  }

  .shape-3 {
    width: 150px;
    height: 150px;
    background: #f093fb;
    top: 50%;
    right: 20%;
    animation-delay: 4s;
  }

  .shape-4 {
    width: 250px;
    height: 250px;
    background: #4facfe;
    bottom: -80px;
    right: 30%;
    animation-delay: 1s;
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.6;
  }
}

.right-content {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 40px;
}

.right-text {
  h2 {
    color: #fff;
    font-size: 32px;
    font-weight: bold;
    margin-bottom: 16px;
    background: linear-gradient(90deg, #667eea 0%, #f093fb 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  p {
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    line-height: 1.8;
    margin-bottom: 30px;
    max-width: 400px;
  }
}

.feature-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;

  .tag {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    color: rgba(255, 255, 255, 0.9);
    font-size: 13px;
    transition: all 0.3s;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }
  }
}
</style>
