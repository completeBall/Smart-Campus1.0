<template>
  <div class="attendance-session-page" v-loading="loading">
    <el-button @click="$router.back()" size="small" plain class="back-btn">
      <el-icon><ArrowLeft /></el-icon>返回
    </el-button>

    <el-card v-if="session" class="header-card">
      <div class="header-row">
        <div class="header-info">
          <div class="header-title">
            <el-icon><Bell /></el-icon>
            <span class="course-name">{{ session.course_name }}</span>
            <el-tag :type="statusTagType" effect="dark">{{ statusText }}</el-tag>
          </div>
          <div class="header-meta">
            <span><el-icon><User /></el-icon>班级: {{ session.class_name }}</span>
            <span><el-icon><Calendar /></el-icon>日期: {{ session.date }}</span>
            <span><el-icon><Clock /></el-icon>{{ formatTime(session.start_at) }} 起</span>
          </div>
        </div>
        <div class="header-countdown">
          <div v-if="session.status === 1 && remaining > 0" class="countdown active">
            <div class="big-num">{{ remainingText }}</div>
            <div class="hint">{{ remaining > lateRemaining ? '正常签到' : '迟到时段' }}</div>
          </div>
          <div v-else class="countdown ended">
            <div class="big-num">已结束</div>
            <div class="hint">签到已关闭</div>
          </div>
          <el-button
            v-if="session.status === 1"
            type="danger"
            plain
            size="small"
            @click="onClose"
            style="margin-top: 8px"
          >提前关闭</el-button>
        </div>
      </div>
    </el-card>

    <!-- 统计 -->
    <el-card v-if="session" class="stat-card">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-statistic title="应到" :value="totalCount" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="已到" :value="presentCount" value-style="{ color: '#67c23a' }" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="迟到" :value="lateCount" value-style="{ color: '#e6a23c' }" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="缺勤" :value="absentCount" value-style="{ color: '#f56c6c' }" />
        </el-col>
      </el-row>
    </el-card>

    <!-- 学生记录 -->
    <el-card class="record-card">
      <template #header>
        <span class="card-title">学生签到详情</span>
        <el-button text @click="loadData" style="float: right">
          <el-icon><Refresh /></el-icon>刷新
        </el-button>
      </template>
      <el-table :data="records" stripe>
        <el-table-column type="index" label="#" width="60" align="center" />
        <el-table-column label="头像" width="70" align="center">
          <template #default="{ row }">
            <el-avatar :size="36" :src="row.avatar">{{ row.name?.charAt(0) }}</el-avatar>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="账号" width="120" />
        <el-table-column prop="name" label="姓名" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" effect="light">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="签到时间" width="180">
          <template #default="{ row }">
            <span v-if="row.check_in_at">{{ formatTime(row.check_in_at) }}</span>
            <span v-else style="color: #c0c4cc">--</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getSessionRecords, closeAttendanceSession } from '@/api/teacher'

const route = useRoute()
const sessionId = Number(route.params.id)

const session = ref(null)
const records = ref([])
const loading = ref(false)
const now = ref(Date.now())
let nowTimer = null
let pollTimer = null

const totalCount = computed(() => records.value.length)
const presentCount = computed(() => records.value.filter(r => r.status === 'present').length)
const lateCount = computed(() => records.value.filter(r => r.status === 'late').length)
const absentCount = computed(() => records.value.filter(r => r.status === 'absent').length)

const remaining = computed(() => {
  if (!session.value || session.value.status !== 1) return 0
  return Math.max(0, dayjs(session.value.end_at).valueOf() - now.value)
})
const lateRemaining = computed(() => {
  if (!session.value || session.value.status !== 1) return 0
  return Math.max(0, dayjs(session.value.late_at).valueOf() - now.value)
})
const remainingText = computed(() => {
  const ms = remaining.value
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})
const statusText = computed(() => session.value?.status === 1 && remaining.value > 0 ? '进行中' : '已结束')
const statusTagType = computed(() => session.value?.status === 1 && remaining.value > 0 ? 'success' : 'info')

const statusLabel = (s) => ({ present: '出勤', late: '迟到', absent: '缺勤', leave: '请假' })[s] || s
const statusTag = (s) => ({ present: 'success', late: 'warning', absent: 'danger', leave: 'info' })[s] || ''
const formatTime = (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : ''

const loadData = async () => {
  loading.value = true
  try {
    const { data } = await getSessionRecords(sessionId)
    session.value = data.session
    records.value = data.records || []
  } finally {
    loading.value = false
  }
}

const onClose = async () => {
  await ElMessageBox.confirm('确定提前关闭这次签到吗？', '提示', { type: 'warning' })
  await closeAttendanceSession(sessionId)
  ElMessage.success('签到已关闭')
  await loadData()
}

onMounted(() => {
  loadData()
  nowTimer = setInterval(() => { now.value = Date.now() }, 1000)
  // 每 5 秒刷新签到状态
  pollTimer = setInterval(() => {
    if (session.value && session.value.status === 1 && remaining.value > 0) {
      loadData()
    }
  }, 5000)
})

onBeforeUnmount(() => {
  if (nowTimer) clearInterval(nowTimer)
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped lang="scss">
.attendance-session-page {
  max-width: 1100px;
  margin: 0 auto;
  .back-btn { margin-bottom: 12px; }
  .header-card {
    margin-bottom: 16px;
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    }
    .header-info {
      flex: 1;
      .header-title {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
        .course-name {
          font-size: 22px;
          font-weight: 600;
          color: #303133;
        }
      }
      .header-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 18px;
        color: #606266;
        font-size: 14px;
        span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
      }
    }
    .header-countdown {
      text-align: center;
      padding: 14px 24px;
      border-radius: 12px;
      background: linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%);
      .countdown {
        .big-num {
          font-size: 32px;
          font-weight: bold;
          color: #303133;
        }
        .hint {
          font-size: 12px;
          color: #606266;
        }
      }
      .countdown.active .big-num {
        background: linear-gradient(135deg, #667eea, #764ba2);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .countdown.ended .big-num {
        color: #909399;
      }
    }
  }
  .stat-card {
    margin-bottom: 16px;
  }
  .record-card {
    .card-title {
      font-weight: 600;
      font-size: 16px;
    }
  }
}
</style>
