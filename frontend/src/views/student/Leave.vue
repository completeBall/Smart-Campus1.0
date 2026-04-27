<template>
  <div class="leave-page">
    <el-row :gutter="20">
      <el-col :span="10">
        <el-card>
          <template #header>
            <span class="card-title">申请请假</span>
          </template>
          <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">
            <el-form-item label="请假类型" prop="type">
              <el-radio-group v-model="form.type">
                <el-radio-button label="sick">病假</el-radio-button>
                <el-radio-button label="personal">事假</el-radio-button>
                <el-radio-button label="other">其他</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="开始日期" prop="start_date">
              <el-date-picker v-model="form.start_date" type="date" placeholder="选择开始日期" value-format="YYYY-MM-DD" style="width: 100%;" />
            </el-form-item>
            <el-form-item label="结束日期" prop="end_date">
              <el-date-picker v-model="form.end_date" type="date" placeholder="选择结束日期" value-format="YYYY-MM-DD" style="width: 100%;" />
            </el-form-item>
            <el-form-item label="请假原因" prop="reason">
              <el-input v-model="form.reason" type="textarea" rows="4" placeholder="请详细描述请假原因" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="submitLeave">提交申请</el-button>
              <el-button @click="resetForm">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
      <el-col :span="14">
        <el-card>
          <template #header>
            <span class="card-title">我的请假记录</span>
          </template>
          <el-empty v-if="leaveList.length === 0" description="暂无请假记录" />
          <el-table v-else :data="leaveList" border stripe>
            <el-table-column prop="type" label="类型" width="90">
              <template #default="{ row }">
                <el-tag :type="typeMap[row.type]?.type" size="small">{{ typeMap[row.type]?.label }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="start_date" label="开始日期" width="110" />
            <el-table-column prop="end_date" label="结束日期" width="110" />
            <el-table-column prop="reason" label="原因" show-overflow-tooltip />
            <el-table-column prop="status" label="审批状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusMap[row.status]?.type" size="small">{{ statusMap[row.status]?.label }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="reply" label="审批回复" show-overflow-tooltip />
            <el-table-column prop="created_at" label="申请时间" width="160">
              <template #default="{ row }">
                {{ formatDate(row.created_at) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { applyLeave, getMyLeave } from '@/api/student'

const formRef = ref()
const form = reactive({ type: 'personal', start_date: '', end_date: '', reason: '' })
const leaveList = ref([])

const typeMap = {
  sick: { label: '病假', type: 'danger' },
  personal: { label: '事假', type: 'warning' },
  other: { label: '其他', type: 'info' }
}

const statusMap = {
  0: { label: '待审批', type: 'warning' },
  1: { label: '已通过', type: 'success' },
  2: { label: '已拒绝', type: 'danger' }
}

const rules = {
  type: [{ required: true, message: '请选择请假类型', trigger: 'change' }],
  start_date: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  end_date: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
  reason: [{ required: true, message: '请输入请假原因', trigger: 'blur' }]
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const loadData = async () => {
  const { data } = await getMyLeave()
  leaveList.value = data || []
}

const submitLeave = async () => {
  await formRef.value.validate()
  if (form.start_date > form.end_date) {
    ElMessage.warning('开始日期不能晚于结束日期')
    return
  }
  await applyLeave(form)
  ElMessage.success('请假申请已提交')
  resetForm()
  loadData()
}

const resetForm = () => {
  form.type = 'personal'
  form.start_date = ''
  form.end_date = ''
  form.reason = ''
}

loadData()
</script>

<style scoped lang="scss">
.leave-page {
  .card-title {
    font-weight: 600;
    font-size: 16px;
  }
}
</style>
