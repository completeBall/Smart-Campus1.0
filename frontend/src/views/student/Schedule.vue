<template>
  <div class="schedule-page">
    <el-card>
      <template #header>
        <div class="header-row">
          <span class="card-title">我的课程表</span>
          <span class="class-tag" v-if="className">
            <el-icon><School /></el-icon>
            {{ className }}
          </span>
        </div>
      </template>

      <div class="schedule-grid">
        <div class="schedule-header">
          <div class="time-col">节次 / 时间</div>
          <div v-for="day in weekDays" :key="day.value" class="day-col" :class="{ today: day.value === today }">
            {{ day.label }}
            <span v-if="day.value === today" class="today-tag">今天</span>
          </div>
        </div>
        <div class="schedule-body">
          <div v-for="slot in timeSlots" :key="slot.hour" class="time-row" :class="{ evening: slot.evening }">
            <div class="time-col">
              <div class="slot-label">{{ slot.label }}</div>
              <div class="slot-range">{{ slot.range }}</div>
            </div>
            <div v-for="day in weekDays" :key="day.value" class="day-cell">
              <div
                v-for="course in getCourses(day.value, slot.hour)"
                :key="course.id"
                class="course-card"
                :class="{ adjusted: course.status === 'adjusted' }"
                :style="course.status === 'adjusted' ? null : { background: courseColor(course.course_name) }"
              >
                <div class="course-name">{{ course.course_name }}</div>
                <div class="course-info">{{ course.teacher_name }}</div>
                <div class="course-time">{{ formatRange(course.start_time, course.end_time) }}</div>
                <div class="course-room">{{ course.classroom }}</div>
                <div v-if="course.status === 'adjusted'" class="adjust-badge">已调课</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import { School } from '@element-plus/icons-vue'
import { getStudentSchedule } from '@/api/student'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const className = computed(() => userStore.userInfo?.class_name || '')

const weekDays = [
  { label: '周一', value: 1 }, { label: '周二', value: 2 }, { label: '周三', value: 3 },
  { label: '周四', value: 4 }, { label: '周五', value: 5 }, { label: '周六', value: 6 }, { label: '周日', value: 7 }
]
const timeSlots = [
  { hour: '08', label: '第1-2节', range: '08:00 - 09:40', evening: false },
  { hour: '10', label: '第3-4节', range: '10:00 - 11:40', evening: false },
  { hour: '14', label: '第5-6节', range: '14:00 - 15:40', evening: false },
  { hour: '16', label: '第7-8节', range: '16:00 - 17:40', evening: false },
  { hour: '19', label: '第9-10节', range: '19:00 - 20:40', evening: true }
]
const today = dayjs().day() || 7
const schedules = ref([])

const loadData = async () => {
  const { data } = await getStudentSchedule()
  schedules.value = data
}

const formatTime = (t) => {
  if (!t) return ''
  return t.length >= 5 ? t.substring(0, 5) : t
}
const formatRange = (s, e) => `${formatTime(s)} - ${formatTime(e)}`

const getCourses = (day, hour) => {
  return schedules.value.filter(s =>
    s.day_of_week === day && (s.start_time || '').startsWith(hour)
  )
}

const palettes = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #f6d365 0%, #fda085 100%)'
]
const courseColor = (name) => {
  let h = 0
  for (const c of (name || '')) h = (h + c.charCodeAt(0)) >>> 0
  return palettes[h % palettes.length]
}

onMounted(loadData)
</script>

<style scoped lang="scss">
.schedule-page {
  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    .card-title {
      font-weight: 600;
      font-size: 16px;
    }
    .class-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: #fff;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 4px 10px;
      border-radius: 14px;
    }
  }
  .schedule-grid {
    border: 1px solid #ebeef5;
    border-radius: 8px;
    overflow: hidden;
  }
  .schedule-header {
    display: grid;
    grid-template-columns: 110px repeat(7, 1fr);
    background: #f5f7fa;
    .time-col, .day-col {
      padding: 14px 8px;
      text-align: center;
      font-weight: 600;
      font-size: 14px;
      color: #333;
      border-right: 1px solid #ebeef5;
      &:last-child { border-right: none; }
    }
    .day-col {
      position: relative;
      &.today {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #fff;
      }
      .today-tag {
        position: absolute;
        top: 4px;
        right: 4px;
        font-size: 10px;
        background: #fff;
        color: #667eea;
        padding: 1px 6px;
        border-radius: 10px;
      }
    }
  }
  .schedule-body {
    .time-row {
      display: grid;
      grid-template-columns: 110px repeat(7, 1fr);
      border-bottom: 1px solid #ebeef5;
      &:last-child { border-bottom: none; }
      &.evening .time-col {
        background: linear-gradient(135deg, #fdf6ec 0%, #faecd8 100%);
      }
    }
    .time-col {
      padding: 12px 8px;
      text-align: center;
      font-size: 13px;
      color: #444;
      border-right: 1px solid #ebeef5;
      background: #fafafa;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      .slot-label {
        font-weight: 600;
        color: #333;
      }
      .slot-range {
        font-size: 11px;
        color: #909399;
      }
    }
    .day-cell {
      min-height: 110px;
      padding: 6px;
      border-right: 1px solid #ebeef5;
      &:last-child { border-right: none; }
    }
    .course-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      border-radius: 6px;
      padding: 8px;
      margin-bottom: 6px;
      position: relative;
      &.adjusted {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      }
      .course-name {
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .course-info, .course-room, .course-time {
        font-size: 11px;
        opacity: 0.92;
        line-height: 1.5;
      }
      .course-time {
        margin-top: 2px;
      }
      .adjust-badge {
        position: absolute;
        top: 2px;
        right: 2px;
        font-size: 9px;
        background: #fff;
        color: #f5576c;
        padding: 1px 4px;
        border-radius: 4px;
      }
    }
  }
}
</style>
