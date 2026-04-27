<template>
  <div class="dashboard">
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
            <div class="empty-title">嗨，{{ userStore.userInfo.name || '老师' }}！分享一下你今天的心情吧</div>
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
      <el-card v-for="item in stats" :key="item.title" :body-style="{ padding: '20px' }">
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
      <el-col :span="12">
        <el-card>
          <template #header><span class="card-title">待批改作业</span></template>
          <el-table :data="pendingList" stripe size="small">
            <el-table-column prop="task_title" label="任务" show-overflow-tooltip />
            <el-table-column prop="student_name" label="学生" width="100" />
            <el-table-column prop="created_at" label="提交时间" width="150" />
            <el-table-column width="80">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="goReview(row)">批改</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><span class="card-title">今日课程</span></template>
          <div v-if="todaySchedule.length === 0" class="empty-schedule">今日无课程安排</div>
          <div v-else class="schedule-list">
            <div v-for="item in todaySchedule" :key="item.id" class="schedule-item">
              <div class="time">{{ item.start_time }} - {{ item.end_time }}</div>
              <div class="info">
                <span class="course">{{ item.course_name }}</span>
                <span class="class">{{ item.class_name }}</span>
                <span class="room">{{ item.classroom }}</span>
              </div>
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
          placeholder="分享一下你的近况、教学心得或今日感受..."
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getTeacherStatistics, getSubmissions, getTeacherSchedule } from '@/api/teacher'
import { getMyStatus, setMyStatus, clearMyStatus } from '@/api/social'

const router = useRouter()
const userStore = useUserStore()
const stats = ref([
  { title: '发布任务', value: 0, icon: 'Document', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { title: '参与学生', value: 0, icon: 'User', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { title: '待批改', value: 0, icon: 'EditPen', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }
])
const pendingList = ref([])
const todaySchedule = ref([])

const loadData = async () => {
  const { data } = await getTeacherStatistics()
  stats.value[0].value = data.taskCount
  stats.value[1].value = data.studentCount
  stats.value[2].value = data.pendingCount

  const { data: subData } = await getSubmissions({ status: 0, pageSize: 5 })
  pendingList.value = subData.list

  const { data: schData } = await getTeacherSchedule()
  const today = dayjs().day() || 7
  todaySchedule.value = schData.filter(s => s.day_of_week === today)
}

const goReview = (row) => {
  router.push('/teacher/submissions')
}

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

onMounted(() => {
  loadData()
  loadStatus()
  nowTimer = setInterval(() => { now.value = Date.now() }, 1000)
})

onBeforeUnmount(() => {
  if (nowTimer) clearInterval(nowTimer)
})
</script>

<style scoped lang="scss">
.dashboard {
  .status-card {
    margin-bottom: 20px;
    .status-content {
      display: flex;
      align-items: center;
      gap: 20px;
      .status-avatar {
        position: relative;
        .avatar-emoji {
          position: absolute;
          right: -4px;
          bottom: -4px;
          font-size: 22px;
          background: #fff;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        }
      }
      .status-text {
        flex: 1;
        .status-line {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
          .status-msg {
            font-size: 15px;
            color: #303133;
            font-weight: 500;
          }
        }
        .status-meta {
          font-size: 12px;
          color: #909399;
        }
        .empty-title {
          font-size: 15px;
          color: #303133;
          font-weight: 500;
          margin-bottom: 2px;
        }
        .empty-tip {
          font-size: 12px;
          color: #909399;
        }
      }
      .status-actions {
        display: flex;
        gap: 8px;
      }
    }
  }

  .stats-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-bottom: 20px;
  }
  .stat-content {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .stat-value {
    font-size: 24px;
    font-weight: bold;
    color: #333;
  }
  .stat-title {
    font-size: 13px;
    color: #999;
    margin-top: 2px;
  }
  .card-title {
    font-weight: 600;
  }
  .empty-schedule {
    text-align: center;
    color: #999;
    padding: 40px;
  }
  .schedule-list {
    .schedule-item {
      padding: 14px 16px;
      border-bottom: 1px solid #f0f0f0;
      &:last-child { border-bottom: none; }
      .time {
        font-size: 13px;
        color: #667eea;
        font-weight: 500;
        margin-bottom: 6px;
      }
      .info {
        display: flex;
        gap: 12px;
        font-size: 14px;
        .course { font-weight: 500; color: #333; }
        .class { color: #666; }
        .room { color: #999; font-size: 12px; }
      }
    }
  }
}

.dialog-section {
  margin-bottom: 20px;
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
  gap: 10px;
  .emoji-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 4px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid transparent;
    &.active {
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.08);
    }
    &:hover {
      background: rgba(102, 126, 234, 0.05);
    }
    .emoji-icon {
      font-size: 28px;
      line-height: 1;
      margin-bottom: 4px;
    }
    .emoji-label {
      font-size: 12px;
      color: #606266;
    }
  }
}
.dialog-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #909399;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 8px;
}
</style>
