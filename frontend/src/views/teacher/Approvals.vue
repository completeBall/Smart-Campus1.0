<template>
  <div class="approvals-page">
    <el-tabs v-model="activeTab" type="border-card" @tab-change="handleTabChange">
      <!-- 请假审批 -->
      <el-tab-pane label="请假审批" name="leave">
        <el-card>
          <template #header>
            <div class="header-actions">
              <span class="card-title">学生请假申请</span>
              <el-radio-group v-model="leaveFilter.status" size="small" @change="loadLeave">
                <el-radio-button label="">全部</el-radio-button>
                <el-radio-button label="0">待审批</el-radio-button>
                <el-radio-button label="1">已通过</el-radio-button>
                <el-radio-button label="2">已拒绝</el-radio-button>
              </el-radio-group>
            </div>
          </template>

          <el-table :data="leaveList" border stripe v-loading="leaveLoading">
            <el-table-column prop="student_name" label="学生姓名" width="100" />
            <el-table-column prop="class_name" label="班级" width="120" />
            <el-table-column prop="type" label="类型" width="80">
              <template #default="{ row }">
                <el-tag :type="leaveTypeMap[row.type]?.type" size="small" effect="dark">{{ leaveTypeMap[row.type]?.label }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="start_date" label="开始/晚归日期" width="120" />
            <el-table-column prop="end_date" label="结束日期" width="110">
              <template #default="{ row }">
                {{ row.type === 'late_return' ? '-' : row.end_date }}
              </template>
            </el-table-column>
            <el-table-column prop="late_time" label="预计时间" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.late_time" type="primary" size="small" effect="plain">{{ row.late_time.slice(0,5) }}</el-tag>
                <span v-else class="empty-text">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="reason" label="原因" min-width="140" show-overflow-tooltip />
            <el-table-column label="家长知情书" width="110" align="center">
              <template #default="{ row }">
                <el-link v-if="row.parent_consent_url" type="primary" :href="row.parent_consent_url" target="_blank" :underline="false">
                  <el-button link type="primary" size="small"><el-icon><View /></el-icon>查看</el-button>
                </el-link>
                <span v-else class="empty-text">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="statusMap[row.status]?.type" size="small" effect="dark">{{ statusMap[row.status]?.label }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="reply" label="审批回复" min-width="150" show-overflow-tooltip />
            <el-table-column prop="created_at" label="申请时间" width="160">
              <template #default="{ row }">
                {{ formatDate(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="140" align="center" fixed="right">
              <template #default="{ row }">
                <template v-if="row.status === 0">
                  <el-button link type="success" @click="handleLeaveApprove(row, 1)">通过</el-button>
                  <el-button link type="danger" @click="handleLeaveApprove(row, 2)">拒绝</el-button>
                </template>
                <span v-else class="handled-text">已处理</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 活动审批 -->
      <el-tab-pane label="活动审批" name="activity">
        <el-card>
          <template #header>
            <div class="header-actions">
              <span class="card-title">活动审批管理</span>
              <el-radio-group v-model="activityFilter.status" size="small" @change="loadActivities">
                <el-radio-button label="">全部</el-radio-button>
                <el-radio-button label="0">待审批</el-radio-button>
                <el-radio-button label="1">已通过</el-radio-button>
                <el-radio-button label="2">已拒绝</el-radio-button>
              </el-radio-group>
            </div>
          </template>

          <el-empty v-if="activities.length === 0" description="暂无活动记录" />
          <el-table v-else :data="activities" border stripe v-loading="activityLoading">
            <el-table-column prop="title" label="活动名称" min-width="150" />
            <el-table-column prop="category" label="类型" width="90">
              <template #default="{ row }">
                <el-tag :type="categoryMap[row.category]?.type" size="small">{{ categoryMap[row.category]?.label }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip />
            <el-table-column prop="location" label="地点" width="120" />
            <el-table-column prop="start_time" label="开始时间" width="150">
              <template #default="{ row }">
                {{ formatDate(row.start_time) }}
              </template>
            </el-table-column>
            <el-table-column prop="end_time" label="结束时间" width="150">
              <template #default="{ row }">
                {{ formatDate(row.end_time) }}
              </template>
            </el-table-column>
            <el-table-column label="加分" width="120" align="center">
              <template #default="{ row }">
                <el-tag effect="plain" type="warning" size="small">+{{ row.score_value }} {{ scoreTypeMap[row.score_type] }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="joined_count" label="报名人数" width="90" align="center">
              <template #default="{ row }">
                {{ row.joined_count || 0 }}{{ row.max_participants > 0 ? ' / ' + row.max_participants : '' }}
              </template>
            </el-table-column>
            <el-table-column prop="organizer_name" label="组织者" width="100" />
            <el-table-column prop="status" label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="activityStatusMap[row.status]?.type" size="small" effect="dark">{{ activityStatusMap[row.status]?.label }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="140" align="center" fixed="right">
              <template #default="{ row }">
                <template v-if="row.status === 0">
                  <el-button link type="success" @click="handleActivityApprove(row, 1)">通过</el-button>
                  <el-button link type="danger" @click="handleActivityApprove(row, 2)">拒绝</el-button>
                </template>
                <span v-if="row.status !== 0" class="handled-text">已处理</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
      <!-- 加分名单审核 -->
      <el-tab-pane label="加分名单审核" name="score">
        <el-card>
          <template #header>
            <div class="header-actions">
              <span class="card-title">加分申请审核</span>
              <el-radio-group v-model="scoreFilter.status" size="small" @change="loadScoreRecords">
                <el-radio-button label="">全部</el-radio-button>
                <el-radio-button label="0">待审核</el-radio-button>
                <el-radio-button label="1">已通过</el-radio-button>
                <el-radio-button label="2">已拒绝</el-radio-button>
              </el-radio-group>
            </div>
          </template>

          <el-empty v-if="scoreRecords.length === 0" description="暂无加分申请" />
          <el-table v-else :data="scoreRecords" border stripe v-loading="scoreLoading">
            <el-table-column prop="activity_title" label="活动名称" min-width="160" show-overflow-tooltip />
            <el-table-column prop="student_name" label="学生姓名" width="100" />
            <el-table-column prop="class_name" label="班级" width="120" />
            <el-table-column label="加分类型" width="100" align="center">
              <template #default="{ row }">
                <el-tag size="small" effect="plain">{{ scoreTypeMap[row.score_type] }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="加分分值" width="100" align="center">
              <template #default="{ row }">
                <span class="score-plus">+{{ row.score_value }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="submitter_name" label="提交者" width="100" />
            <el-table-column label="提交时间" width="160">
              <template #default="{ row }">{{ formatDate(row.submitted_at) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="recordStatusMap[row.status]?.type" size="small" effect="dark">
                  {{ recordStatusMap[row.status]?.label }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
            <el-table-column label="操作" width="140" align="center" fixed="right">
              <template #default="{ row }">
                <template v-if="row.status === 0">
                  <el-button link type="success" @click="handleScoreReview(row, 1)">通过</el-button>
                  <el-button link type="danger" @click="handleScoreReview(row, 2)">拒绝</el-button>
                </template>
                <span v-else class="handled-text">已处理</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 加分审核弹窗 -->
    <el-dialog v-model="scoreDialogVisible" :title="scoreForm.status === 1 ? '通过加分申请' : '拒绝加分申请'" width="460px">
      <el-form :model="scoreForm" label-width="90px">
        <el-form-item label="活动">
          <span>{{ scoreForm.activity_title }}</span>
        </el-form-item>
        <el-form-item label="学生">
          <span>{{ scoreForm.student_name }}（{{ scoreForm.class_name }}）</span>
        </el-form-item>
        <el-form-item label="加分">
          <el-tag size="small" effect="plain">+{{ scoreForm.score_value }} {{ scoreTypeMap[scoreForm.score_type] }}</el-tag>
        </el-form-item>
        <el-form-item :label="scoreForm.status === 2 ? '拒绝原因' : '备注'">
          <el-input v-model="scoreForm.remark" type="textarea" rows="2" :placeholder="scoreForm.status === 2 ? '建议填写拒绝原因' : '可选填'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="scoreDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitScoreReview">确认</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="leaveDialogVisible" title="审批请假" width="480px">
      <el-form :model="leaveForm" label-width="100px">
        <el-form-item label="学生">
          <span>{{ leaveForm.student_name }}（{{ leaveForm.class_name }}）</span>
        </el-form-item>
        <el-form-item label="申请类型">
          <el-tag :type="leaveTypeMap[leaveForm.type]?.type" size="small" effect="dark">{{ leaveTypeMap[leaveForm.type]?.label }}</el-tag>
        </el-form-item>
        <el-form-item v-if="leaveForm.type === 'late_return'" label="晚归日期">
          <span>{{ leaveForm.start_date }}</span>
        </el-form-item>
        <el-form-item v-if="leaveForm.type === 'late_return'" label="预计返校">
          <el-tag type="primary" size="small" effect="plain">{{ leaveForm.late_time?.slice(0,5) || '-' }}</el-tag>
        </el-form-item>
        <el-form-item v-if="leaveForm.type !== 'late_return'" label="时间范围">
          <span>{{ leaveForm.start_date }} 至 {{ leaveForm.end_date }}</span>
        </el-form-item>
        <el-form-item label="申请原因">
          <el-input v-model="leaveForm.reason" type="textarea" :rows="2" readonly />
        </el-form-item>
        <el-form-item v-if="leaveForm.parent_consent_url" label="家长知情书">
          <el-link type="primary" :href="leaveForm.parent_consent_url" target="_blank" :underline="false">
            <el-button type="primary" size="small" plain><el-icon><View /></el-icon> 查看家长知情书</el-button>
          </el-link>
        </el-form-item>
        <el-form-item label="审批结果" prop="status">
          <el-radio-group v-model="leaveForm.status">
            <el-radio :label="1">通过</el-radio>
            <el-radio :label="2">拒绝</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审批回复">
          <el-input v-model="leaveForm.reply" type="textarea" rows="3" placeholder="请输入审批回复（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="leaveDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitLeaveReview">确认</el-button>
      </template>
    </el-dialog>

    <!-- 活动审批弹窗 -->
    <el-dialog v-model="activityDialogVisible" title="审批活动" width="400px">
      <p>确认<strong>{{ activityForm.status === 1 ? '通过' : '拒绝' }}</strong>活动「{{ activityForm.title }}」吗？</p>
      <template #footer>
        <el-button @click="activityDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitActivityReview">确认</el-button>
      </template>
    </el-dialog>

    <!-- 报名审核弹窗 -->
    <el-dialog v-model="participantDialogVisible" title="报名查看" width="700px">
      <p class="dialog-subtitle">活动：{{ currentActivity?.title }}</p>
      <el-table :data="participants" border stripe max-height="400">
        <el-table-column prop="student_name" label="学生姓名" width="100" />
        <el-table-column prop="class_name" label="班级" width="120" />
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="applyStatusMap[row.status]?.type" size="small">{{ applyStatusMap[row.status]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="applied_at" label="申请时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.applied_at) }}
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { View } from '@element-plus/icons-vue'
import {
  getLeaveRequests,
  reviewLeave,
  getPendingActivities,
  reviewActivity,
  getActivityParticipants,
  reviewParticipant,
  getScoreRecords,
  reviewScoreRecord
} from '@/api/teacher'

const activeTab = ref('leave')
const leaveList = ref([])
const activities = ref([])
const participants = ref([])
const currentActivity = ref(null)
const leaveLoading = ref(false)
const activityLoading = ref(false)
const scoreRecords = ref([])
const scoreLoading = ref(false)

const leaveFilter = reactive({ status: '' })
const activityFilter = reactive({ status: '' })
const scoreFilter = reactive({ status: '' })

const leaveDialogVisible = ref(false)
const activityDialogVisible = ref(false)
const participantDialogVisible = ref(false)
const scoreDialogVisible = ref(false)

const leaveForm = reactive({ id: null, student_name: '', class_name: '', start_date: '', end_date: '', reason: '', status: 1, reply: '', type: '', late_time: '', parent_consent_url: '' })
const activityForm = reactive({ id: null, title: '', status: 1 })
const scoreForm = reactive({
  id: null,
  activity_title: '',
  student_name: '',
  class_name: '',
  score_type: '',
  score_value: 0,
  status: 1,
  remark: ''
})

const leaveTypeMap = {
  sick: { label: '病假', type: 'danger' },
  personal: { label: '事假', type: 'warning' },
  late_return: { label: '晚归', type: 'primary' },
  absence: { label: '不归', type: 'info' },
  other: { label: '其他', type: '' }
}

const statusMap = {
  0: { label: '待审批', type: 'warning' },
  1: { label: '已通过', type: 'success' },
  2: { label: '已拒绝', type: 'danger' }
}

const categoryMap = {
  academic: { label: '学术', type: 'primary' },
  sports: { label: '体育', type: 'success' },
  arts: { label: '艺术', type: 'warning' },
  volunteer: { label: '志愿', type: 'danger' },
  labor: { label: '劳动', type: 'info' },
  other: { label: '其他', type: '' }
}

const scoreTypeMap = {
  academic: '智育分',
  moral: '德育分',
  sports: '体育分',
  arts: '美育分',
  labor: '劳育分'
}

const activityStatusMap = {
  0: { label: '待审批', type: 'warning' },
  1: { label: '已通过', type: 'success' },
  2: { label: '已拒绝', type: 'danger' },
  3: { label: '进行中', type: 'primary' },
  4: { label: '已结束', type: 'info' }
}

const applyStatusMap = {
  0: { label: '待审核', type: 'warning' },
  1: { label: '已通过', type: 'success' },
  2: { label: '已拒绝', type: 'danger' }
}

const recordStatusMap = {
  0: { label: '待审核', type: 'warning' },
  1: { label: '已通过', type: 'success' },
  2: { label: '已拒绝', type: 'danger' }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const loadLeave = async () => {
  leaveLoading.value = true
  try {
    const { data } = await getLeaveRequests({ status: leaveFilter.status })
    leaveList.value = data || []
  } finally {
    leaveLoading.value = false
  }
}

const loadActivities = async () => {
  activityLoading.value = true
  try {
    const { data } = await getPendingActivities({ status: activityFilter.status })
    activities.value = data || []
  } finally {
    activityLoading.value = false
  }
}

const loadScoreRecords = async () => {
  scoreLoading.value = true
  try {
    const { data } = await getScoreRecords({ status: scoreFilter.status })
    scoreRecords.value = data || []
  } finally {
    scoreLoading.value = false
  }
}

const handleScoreReview = (row, status) => {
  Object.assign(scoreForm, {
    id: row.id,
    activity_title: row.activity_title,
    student_name: row.student_name,
    class_name: row.class_name,
    score_type: row.score_type,
    score_value: row.score_value,
    status,
    remark: ''
  })
  scoreDialogVisible.value = true
}

const submitScoreReview = async () => {
  await reviewScoreRecord(scoreForm.id, { status: scoreForm.status, remark: scoreForm.remark })
  ElMessage.success('审核完成')
  scoreDialogVisible.value = false
  loadScoreRecords()
}

const handleLeaveApprove = (row, status) => {
  Object.assign(leaveForm, {
    id: row.id,
    student_name: row.student_name,
    class_name: row.class_name,
    start_date: row.start_date,
    end_date: row.end_date,
    reason: row.reason,
    status,
    reply: '',
    type: row.type,
    late_time: row.late_time,
    parent_consent_url: row.parent_consent_url
  })
  leaveDialogVisible.value = true
}

const submitLeaveReview = async () => {
  await reviewLeave(leaveForm.id, { status: leaveForm.status, reply: leaveForm.reply })
  ElMessage.success('审批完成')
  leaveDialogVisible.value = false
  loadLeave()
}

const handleActivityApprove = (row, status) => {
  Object.assign(activityForm, { id: row.id, title: row.title, status })
  activityDialogVisible.value = true
}

const submitActivityReview = async () => {
  await reviewActivity(activityForm.id, { status: activityForm.status })
  ElMessage.success('审批完成')
  activityDialogVisible.value = false
  loadActivities()
}

const showParticipants = async (row) => {
  currentActivity.value = row
  const { data } = await getActivityParticipants(row.id)
  participants.value = data || []
  participantDialogVisible.value = true
}

const handleParticipantReview = async (row, status) => {
  await reviewParticipant(currentActivity.value.id, row.id, { status })
  ElMessage.success('审核完成')
  showParticipants(currentActivity.value)
  loadActivities()
}

const handleTabChange = () => {
  if (activeTab.value === 'leave') loadLeave()
  else if (activeTab.value === 'activity') loadActivities()
  else if (activeTab.value === 'score') loadScoreRecords()
}

loadLeave()
</script>

<style scoped lang="scss">
.approvals-page {
  .header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .card-title {
      font-weight: 600;
      font-size: 16px;
    }
  }

  .handled-text {
    color: #999;
    font-size: 13px;
  }

  .score-plus {
    color: #f56c6c;
    font-weight: bold;
  }

  .empty-text {
    color: #c0c4cc;
    font-size: 13px;
  }

  .dialog-subtitle {
    color: #666;
    margin-bottom: 12px;
    font-size: 14px;
  }
}
</style>
