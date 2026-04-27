<template>
  <div class="schedule-page">
    <el-card>
      <template #header>
        <div class="header-actions">
          <span class="card-title">课程表管理</span>
          <div class="header-right">
            <el-select
              v-model="filterClass"
              placeholder="按班级筛选"
              clearable
              style="width: 180px; margin-right: 10px"
            >
              <el-option v-for="c in classes" :key="c" :label="c" :value="c" />
            </el-select>
            <el-button type="primary" @click="handleAdd">
              <el-icon><Plus /></el-icon>添加课程
            </el-button>
          </div>
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
                @click="handleEdit(course)"
              >
                <div class="course-name">{{ course.course_name }}</div>
                <div class="course-info">{{ course.class_name }}</div>
                <div class="course-time">{{ formatRange(course.start_time, course.end_time) }}</div>
                <div class="course-room">{{ course.classroom }}</div>
                <div v-if="course.status === 'adjusted'" class="adjust-badge">已调课</div>
                <button
                  class="quick-attend"
                  @click.stop="initiateAttendance(course)"
                  title="发起课堂签到"
                >📌 签到</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑课程' : '添加课程'" width="540px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">
        <el-form-item label="课程名称" prop="course_name">
          <el-input v-model="form.course_name" placeholder="请输入课程名称" />
        </el-form-item>
        <el-form-item label="班级" prop="class_name">
          <el-select
            v-model="form.class_name"
            placeholder="请选择班级"
            filterable
            allow-create
            default-first-option
            style="width: 100%"
          >
            <el-option v-for="c in classes" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="星期" prop="day_of_week">
          <el-select v-model="form.day_of_week" placeholder="请选择星期" style="width: 100%">
            <el-option v-for="d in weekDays" :key="d.value" :label="d.label" :value="d.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="节次" prop="period">
          <el-select v-model="form.period" placeholder="按节次选择" style="width: 100%" @change="onPeriodChange">
            <el-option
              v-for="p in periodPresets"
              :key="p.value"
              :label="`${p.label} (${p.start} - ${p.end})`"
              :value="p.value"
            />
          </el-select>
          <div class="form-tip">选择节次会自动填充上下课时间,也可在下方微调</div>
        </el-form-item>
        <el-form-item label="上课时间">
          <el-time-select v-model="form.start_time" start="07:00" step="00:05" end="22:00" placeholder="开始时间" style="width: 48%" />
          <span style="margin: 0 4%">至</span>
          <el-time-select v-model="form.end_time" start="07:00" step="00:05" end="22:00" placeholder="结束时间" style="width: 48%" />
        </el-form-item>
        <el-form-item label="教室">
          <el-input v-model="form.classroom" placeholder="请输入教室" />
        </el-form-item>
        <el-form-item label="状态" v-if="isEdit">
          <el-radio-group v-model="form.status">
            <el-radio-button label="normal">正常</el-radio-button>
            <el-radio-button label="adjusted">已调课</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="调课原因" v-if="form.status === 'adjusted'">
          <el-input v-model="form.adjust_reason" placeholder="请输入调课原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="danger" v-if="isEdit" @click="handleDelete">删除</el-button>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import dayjs from 'dayjs'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTeacherSchedule, addSchedule, updateSchedule, deleteSchedule, getClasses, createAttendanceSession } from '@/api/teacher'

const router = useRouter()

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
const periodPresets = [
  { value: '1-2', label: '第1-2节', start: '08:00', end: '09:40' },
  { value: '3-4', label: '第3-4节', start: '10:00', end: '11:40' },
  { value: '5-6', label: '第5-6节', start: '14:00', end: '15:40' },
  { value: '7-8', label: '第7-8节', start: '16:00', end: '17:40' },
  { value: '9-10', label: '第9-10节', start: '19:00', end: '20:40' }
]
const today = dayjs().day() || 7
const schedules = ref([])
const classes = ref([])
const filterClass = ref('')
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const initialForm = () => ({
  id: null,
  course_name: '',
  class_name: '',
  day_of_week: '',
  period: '',
  start_time: '',
  end_time: '',
  classroom: '',
  status: 'normal',
  adjust_reason: ''
})
const form = reactive(initialForm())

const rules = {
  course_name: [{ required: true, message: '请输入课程名称', trigger: 'blur' }],
  class_name: [{ required: true, message: '请选择班级', trigger: 'change' }],
  day_of_week: [{ required: true, message: '请选择星期', trigger: 'change' }]
}

const visibleSchedules = computed(() => {
  if (!filterClass.value) return schedules.value
  return schedules.value.filter(s => s.class_name === filterClass.value)
})

const loadData = async () => {
  const { data } = await getTeacherSchedule()
  schedules.value = data
  const { data: clsData } = await getClasses()
  classes.value = clsData
}

const formatTime = (t) => {
  if (!t) return ''
  return t.length >= 5 ? t.substring(0, 5) : t
}
const formatRange = (s, e) => `${formatTime(s)} - ${formatTime(e)}`

const getCourses = (day, hour) => {
  return visibleSchedules.value.filter(s =>
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

const onPeriodChange = (val) => {
  const preset = periodPresets.find(p => p.value === val)
  if (preset) {
    form.start_time = preset.start
    form.end_time = preset.end
  }
}

const matchPresetByTime = (start) => {
  if (!start) return ''
  const hh = start.substring(0, 2)
  const m = periodPresets.find(p => p.start.startsWith(hh))
  return m ? m.value : ''
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(form, initialForm())
  if (filterClass.value) form.class_name = filterClass.value
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(form, initialForm(), row)
  form.start_time = formatTime(row.start_time)
  form.end_time = formatTime(row.end_time)
  form.period = matchPresetByTime(form.start_time)
  dialogVisible.value = true
}

const submitForm = async () => {
  await formRef.value.validate()
  const payload = { ...form }
  delete payload.period
  if (isEdit.value) {
    await updateSchedule(form.id, payload)
    ElMessage.success('更新成功')
  } else {
    await addSchedule(payload)
    ElMessage.success('添加成功')
  }
  dialogVisible.value = false
  loadData()
}

const handleDelete = async () => {
  await ElMessageBox.confirm('确定删除该课程吗？', '提示', { type: 'warning' })
  await deleteSchedule(form.id)
  ElMessage.success('删除成功')
  dialogVisible.value = false
  loadData()
}

const initiateAttendance = async (course) => {
  try {
    await ElMessageBox.confirm(
      `确认对【${course.class_name}】发起【${course.course_name}】签到？\n3 分钟内未签视为迟到,5 分钟后未签视为缺勤。`,
      '发起课堂签到',
      { type: 'info', confirmButtonText: '立即发起', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  try {
    const { data } = await createAttendanceSession({
      schedule_id: course.id,
      course_name: course.course_name,
      class_name: course.class_name,
      date: dayjs().format('YYYY-MM-DD')
    })
    ElMessage.success(`签到已发起,共 ${data.expected} 位学生`)
    router.push(`/teacher/attendance-sessions/${data.id}`)
  } catch (err) {
    // intercepted
  }
}

loadData()
</script>

<style scoped lang="scss">
.schedule-page {
  .header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .card-title { font-weight: 600; font-size: 16px; }
    .header-right { display: flex; align-items: center; }
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
      cursor: pointer;
      transition: transform 0.2s;
      position: relative;
      &:hover { transform: scale(1.02); }
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
      .quick-attend {
        position: absolute;
        bottom: 4px;
        right: 4px;
        background: rgba(255,255,255,0.9);
        color: #303133;
        border: none;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s;
        &:hover {
          background: #fff;
          transform: scale(1.05);
        }
      }
    }
  }
  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }
}
</style>
