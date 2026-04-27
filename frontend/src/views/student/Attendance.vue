<template>
  <div class="attendance-page">
    <!-- 活跃签到卡 -->
    <el-card v-if="active" :class="['active-session-card', activeStatusClass]">
      <div class="active-row">
        <div class="active-info">
          <div class="active-title">
            <el-icon><Bell /></el-icon>
            <span>{{ active.session.course_name }} 签到</span>
            <el-tag :type="activeTagType" effect="dark" size="small">{{ activeStatusText }}</el-tag>
          </div>
          <div class="active-meta">
            <span><el-icon><Calendar /></el-icon>{{ active.session.date }}</span>
            <span><el-icon><User /></el-icon>{{ active.session.class_name }}</span>
            <span><el-icon><Clock /></el-icon>开始 {{ formatShort(active.session.start_at) }}</span>
          </div>
        </div>
        <div class="active-action">
          <div v-if="!myCompleted && remaining > 0" class="countdown">
            <div class="num">{{ remainingText }}</div>
            <div class="label">{{ lateRemaining > 0 ? '正常签到' : '逾期记迟到' }}</div>
          </div>
          <div v-else-if="myCompleted" class="completed">
            <el-icon size="32"><CircleCheck /></el-icon>
            <div>{{ statusMap[active.record.status] }}</div>
          </div>
          <div v-else class="ended">
            <el-icon size="32"><CircleClose /></el-icon>
            <div>已结束</div>
          </div>
          <el-button
            v-if="!myCompleted && remaining > 0"
            type="primary"
            size="large"
            :loading="checking"
            @click="onCheckIn"
            class="check-btn"
          >
            <el-icon><Edit /></el-icon>立即签到
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card>
      <template #header>
        <span class="card-title">考勤记录</span>
        <el-button text @click="refreshAll" style="float: right">
          <el-icon><Refresh /></el-icon>刷新
        </el-button>
      </template>

      <el-empty v-if="attendance.length === 0" description="暂无考勤记录" />
      <el-timeline v-else>
        <el-timeline-item
          v-for="item in attendance"
          :key="item.id"
          :type="getType(item.status)"
          :icon="getIcon(item.status)"
          :timestamp="item.date"
        >
          <el-card>
            <div class="attendance-item">
              <div class="attendance-info">
                <h4>{{ item.course_name }}</h4>
                <p>{{ statusMap[item.status] }}</p>
                <p v-if="item.check_in_at" class="check-in">
                  <el-icon><Clock /></el-icon>
                  签到时间: {{ formatShort(item.check_in_at) }}
                </p>
                <p v-if="item.remark" class="remark">备注：{{ item.remark }}</p>
              </div>
              <el-tag :type="getType(item.status)" effect="dark" size="large">
                {{ statusMap[item.status] }}
              </el-tag>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { getAttendance, getActiveAttendanceSession, checkInAttendanceSession } from '@/api/student'

const attendance = ref([])
const active = ref(null)
const checking = ref(false)
const now = ref(Date.now())
let nowTimer = null
let pollTimer = null

const statusMap = { present: '出勤', absent: '缺勤', late: '迟到', leave: '请假' }
const getType = (s) => ({ present: 'success', absent: 'danger', late: 'warning', leave: 'info' })[s]
const getIcon = (s) => ({ present: 'CircleCheck', absent: 'CircleClose', late: 'Warning', leave: 'InfoFilled' })[s]
const formatShort = (t) => t ? dayjs(t).format('MM-DD HH:mm:ss') : ''

const myCompleted = computed(() => {
  const st = active.value?.record?.status
  return st === 'present' || st === 'late'
})
const remaining = computed(() => {
  if (!active.value) return 0
  return Math.max(0, dayjs(active.value.session.end_at).valueOf() - now.value)
})
const lateRemaining = computed(() => {
  if (!active.value) return 0
  return Math.max(0, dayjs(active.value.session.late_at).valueOf() - now.value)
})
const remainingText = computed(() => {
  const ms = remaining.value
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})
const activeStatusText = computed(() => {
  if (myCompleted.value) return statusMap[active.value.record.status]
  if (remaining.value <= 0) return '已结束'
  return lateRemaining.value > 0 ? '正常签到' : '迟到时段'
})
const activeStatusClass = computed(() => {
  if (myCompleted.value) return active.value.record.status === 'present' ? 'state-present' : 'state-late'
  if (remaining.value <= 0) return 'state-ended'
  return lateRemaining.value > 0 ? 'state-active' : 'state-late-window'
})
const activeTagType = computed(() => {
  if (myCompleted.value) return active.value.record.status === 'present' ? 'success' : 'warning'
  if (remaining.value <= 0) return 'info'
  return lateRemaining.value > 0 ? 'success' : 'warning'
})

const loadAttendance = async () => {
  const { data } = await getAttendance()
  attendance.value = data || []
}

const loadActive = async () => {
  try {
    const { data } = await getActiveAttendanceSession()
    active.value = data
  } catch (e) {
    active.value = null
  }
}

const refreshAll = async () => {
  await Promise.all([loadAttendance(), loadActive()])
}

const onCheckIn = async () => {
  if (!active.value) return
  checking.value = true
  try {
    const res = await checkInAttendanceSession(active.value.session.id)
    ElMessage.success(res.message)
    await refreshAll()
  } finally {
    checking.value = false
  }
}

onMounted(() => {
  refreshAll()
  nowTimer = setInterval(() => { now.value = Date.now() }, 1000)
  // 当没有活跃会话时,每 15 秒拉一次活跃会话
  pollTimer = setInterval(() => {
    if (!active.value || remaining.value <= 0) {
      loadActive()
    }
  }, 15000)
})

onBeforeUnmount(() => {
  if (nowTimer) clearInterval(nowTimer)
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped lang="scss">
.attendance-page {
  .active-session-card {
    margin-bottom: 16px;
    border-radius: 12px;
    border: 2px solid transparent;
    transition: all 0.3s;
    &.state-active {
      border-color: #67c23a;
      background: linear-gradient(135deg, #f0f9eb 0%, #e1f3d8 100%);
    }
    &.state-late-window {
      border-color: #e6a23c;
      background: linear-gradient(135deg, #fdf6ec 0%, #faecd8 100%);
    }
    &.state-present {
      border-color: #67c23a;
      background: #f0f9eb;
    }
    &.state-late {
      border-color: #e6a23c;
      background: #fdf6ec;
    }
    &.state-ended {
      border-color: #c0c4cc;
      background: #f5f5f5;
    }
    .active-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    }
    .active-info {
      flex: 1;
      .active-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 18px;
        font-weight: 600;
        color: #303133;
        margin-bottom: 8px;
      }
      .active-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        color: #606266;
        font-size: 13px;
        span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
      }
    }
    .active-action {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      .countdown {
        text-align: center;
        .num {
          font-size: 36px;
          font-weight: bold;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .label {
          font-size: 12px;
          color: #909399;
        }
      }
      .completed, .ended {
        text-align: center;
        color: #67c23a;
        font-weight: 600;
      }
      .ended { color: #909399; }
      .check-btn {
        min-width: 130px;
      }
    }
  }
  .attendance-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .attendance-info {
      h4 {
        margin: 0 0 8px;
        color: #333;
      }
      p {
        margin: 0;
        color: #666;
        font-size: 13px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .check-in {
        margin-top: 4px;
        color: #909399;
      }
      .remark {
        color: #999;
        margin-top: 4px;
      }
    }
  }
  .card-title {
    font-weight: 600;
    font-size: 16px;
  }
}
</style>
