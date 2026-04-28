<template>
  <div class="leave-page">
    <el-row :gutter="24">
      <!-- 申请表单 -->
      <el-col :span="10">
        <el-card class="apply-card" :body-style="{ padding: '28px' }">
          <template #header>
            <div class="card-header">
              <el-icon size="18" color="#409eff"><Document /></el-icon>
              <span class="card-title">提交申请</span>
            </div>
          </template>

          <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" class="leave-form">
            <!-- 申请类型 -->
            <el-form-item label="申请类型" prop="type">
              <el-radio-group v-model="form.type" @change="onTypeChange">
                <el-radio-button label="sick">病假</el-radio-button>
                <el-radio-button label="personal">事假</el-radio-button>
                <el-radio-button label="late_return">晚归</el-radio-button>
                <el-radio-button label="absence">不归</el-radio-button>
                <el-radio-button label="other">其他</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <!-- 日期选择：普通请假/不归 -->
            <template v-if="form.type !== 'late_return'">
              <el-form-item label="开始日期" prop="start_date">
                <el-date-picker
                  v-model="form.start_date"
                  type="date"
                  placeholder="选择开始日期"
                  value-format="YYYY-MM-DD"
                  style="width: 100%;"
                  :shortcuts="dateShortcuts"
                />
              </el-form-item>
              <el-form-item label="结束日期" prop="end_date">
                <el-date-picker
                  v-model="form.end_date"
                  type="date"
                  placeholder="选择结束日期"
                  value-format="YYYY-MM-DD"
                  style="width: 100%;"
                />
              </el-form-item>
            </template>

            <!-- 日期选择：晚归 -->
            <template v-if="form.type === 'late_return'">
              <el-form-item label="晚归日期" prop="start_date">
                <el-date-picker
                  v-model="form.start_date"
                  type="date"
                  placeholder="选择晚归日期"
                  value-format="YYYY-MM-DD"
                  style="width: 100%;"
                  :shortcuts="dateShortcuts"
                />
              </el-form-item>
              <el-form-item label="预计返校" prop="late_time">
                <el-time-picker
                  v-model="form.late_time"
                  placeholder="选择预计返校时间"
                  format="HH:mm"
                  value-format="HH:mm:ss"
                  style="width: 100%;"
                />
              </el-form-item>
            </template>

            <!-- 原因 -->
            <el-form-item label="申请原因" prop="reason">
              <el-input
                v-model="form.reason"
                type="textarea"
                :rows="4"
                :placeholder="reasonPlaceholder"
                maxlength="500"
                show-word-limit
              />
            </el-form-item>

            <!-- 家长知情书（晚归/不归必填） -->
            <el-form-item
              v-if="form.type === 'late_return' || form.type === 'absence'"
              label="家长知情书"
              prop="parent_consent_url"
              :rules="[{ required: true, message: '请上传家长知情书', trigger: 'change' }]"
            >
              <div class="consent-section">
                <el-upload
                  action="/api/upload/file"
                  :auto-upload="true"
                  :show-file-list="true"
                  :limit="1"
                  :on-success="handleConsentSuccess"
                  :on-remove="handleConsentRemove"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  class="consent-uploader"
                >
                  <el-button type="primary" size="small" plain>
                    <el-icon><Upload /></el-icon> 上传家长知情书
                  </el-button>
                  <template #tip>
                    <div class="upload-tip">支持 PDF、Word、图片格式，最大 10MB</div>
                  </template>
                </el-upload>

                <el-button
                  type="info"
                  size="small"
                  plain
                  class="template-btn"
                  @click="downloadTemplate"
                >
                  <el-icon><Download /></el-icon> 下载知情书模板
                </el-button>
              </div>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" size="large" @click="submitLeave" :loading="submitting">
                <el-icon><Check /></el-icon> 提交申请
              </el-button>
              <el-button size="large" @click="resetForm">
                <el-icon><RefreshLeft /></el-icon> 重置
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 请假记录 -->
      <el-col :span="14">
        <el-card class="record-card" :body-style="{ padding: '0' }">
          <template #header>
            <div class="card-header">
              <el-icon size="18" color="#67c23a"><List /></el-icon>
              <span class="card-title">我的申请记录</span>
              <el-radio-group v-model="recordFilter" size="small" @change="filterRecords">
                <el-radio-button label="">全部</el-radio-button>
                <el-radio-button label="0">待审批</el-radio-button>
                <el-radio-button label="1">已通过</el-radio-button>
                <el-radio-button label="2">已拒绝</el-radio-button>
              </el-radio-group>
            </div>
          </template>

          <div class="record-body">
            <el-empty v-if="filteredList.length === 0" description="暂无申请记录" />
            <div v-else class="record-list">
              <div
                v-for="item in filteredList"
                :key="item.id"
                class="record-item"
                :class="`status-${item.status}`"
              >
                <div class="record-main">
                  <div class="record-top">
                    <div class="record-type">
                      <el-tag :type="typeMap[item.type]?.type" size="small" effect="dark">
                        {{ typeMap[item.type]?.label }}
                      </el-tag>
                      <el-tag :type="statusMap[item.status]?.type" size="small" effect="plain" class="status-tag">
                        {{ statusMap[item.status]?.label }}
                      </el-tag>
                    </div>
                    <div class="record-date">{{ formatDate(item.created_at) }}</div>
                  </div>
                  <div class="record-info">
                    <div v-if="item.type === 'late_return'" class="info-row">
                      <el-icon><Clock /></el-icon>
                      <span>晚归日期：{{ item.start_date }}</span>
                      <span v-if="item.late_time" class="late-time">预计返校：{{ item.late_time.slice(0,5) }}</span>
                    </div>
                    <div v-else class="info-row">
                      <el-icon><Calendar /></el-icon>
                      <span>{{ item.start_date }} 至 {{ item.end_date }}</span>
                    </div>
                    <div class="info-row reason-row">
                      <el-icon><ChatDotRound /></el-icon>
                      <span class="reason-text" :title="item.reason">{{ item.reason }}</span>
                    </div>
                    <div v-if="item.parent_consent_url" class="info-row consent-row">
                      <el-icon><DocumentChecked /></el-icon>
                      <el-link type="primary" :href="item.parent_consent_url" target="_blank" :underline="false">
                        查看家长知情书
                      </el-link>
                    </div>
                    <div v-if="item.reply" class="info-row reply-row">
                      <el-icon><User /></el-icon>
                      <span class="reply-label">审批回复：</span>
                      <span class="reply-text">{{ item.reply }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { applyLeave, getMyLeave } from '@/api/student'
import { Document, Upload, Download, Check, RefreshLeft, List, Clock, Calendar, ChatDotRound, DocumentChecked, User } from '@element-plus/icons-vue'

const formRef = ref()
const submitting = ref(false)
const form = reactive({
  type: 'personal',
  start_date: '',
  end_date: '',
  reason: '',
  parent_consent_url: '',
  late_time: ''
})
const leaveList = ref([])
const recordFilter = ref('')

const typeMap = {
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

const rules = {
  type: [{ required: true, message: '请选择申请类型', trigger: 'change' }],
  start_date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  end_date: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
  late_time: [{ required: true, message: '请选择预计返校时间', trigger: 'change' }],
  reason: [{ required: true, message: '请输入申请原因', trigger: 'blur' }]
}

const dateShortcuts = [
  { text: '今天', value: new Date() },
  { text: '明天', value: () => { const d = new Date(); d.setDate(d.getDate() + 1); return d } }
]

const reasonPlaceholder = computed(() => {
  const map = {
    sick: '请详细描述病情、就诊情况...',
    personal: '请详细描述事假原因...',
    late_return: '请详细描述晚归原因...',
    absence: '请详细描述不归原因、去向...',
    other: '请详细描述原因...'
  }
  return map[form.type] || '请详细描述原因'
})

const filteredList = computed(() => {
  if (recordFilter.value === '') return leaveList.value
  return leaveList.value.filter(item => String(item.status) === recordFilter.value)
})

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const onTypeChange = () => {
  form.start_date = ''
  form.end_date = ''
  form.late_time = ''
  form.parent_consent_url = ''
  form.reason = ''
}

const handleConsentSuccess = (res) => {
  if (res.code === 200) {
    form.parent_consent_url = res.data.url
    ElMessage.success('上传成功')
  }
}

const handleConsentRemove = () => {
  form.parent_consent_url = ''
}

const downloadTemplate = () => {
  const content = `家长知情书

本人是_________（学生姓名）的监护人，身份证号：____________________，
联系电话：____________________。

本人已知晓并同意_________（学生姓名）于____年____月____日
因________________________________原因需要________________（晚归/不归），
预计返校时间为____年____月____日 ____时____分。

本人已与学生充分沟通，了解具体情况，并同意学生上述安排。
如有任何问题，本人愿意承担相应责任。

监护人签名：________________
日期：____年____月____日
`
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '家长知情书模板.txt'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ElMessage.success('模板下载成功')
}

const loadData = async () => {
  const { data } = await getMyLeave()
  leaveList.value = data || []
}

const filterRecords = () => {
  // filter handled by computed
}

const submitLeave = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  if (form.type !== 'late_return' && form.start_date > form.end_date) {
    ElMessage.warning('开始日期不能晚于结束日期')
    return
  }

  // 晚归/不归必须上传家长知情书
  if ((form.type === 'late_return' || form.type === 'absence') && !form.parent_consent_url) {
    ElMessage.warning('请上传家长知情书')
    return
  }

  submitting.value = true
  try {
    await applyLeave({
      type: form.type,
      start_date: form.start_date,
      end_date: form.type === 'late_return' ? form.start_date : form.end_date,
      reason: form.reason,
      parent_consent_url: form.parent_consent_url || undefined,
      late_time: form.type === 'late_return' ? form.late_time : undefined
    })
    ElMessage.success('申请已提交，等待审批')
    resetForm()
    loadData()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  form.type = 'personal'
  form.start_date = ''
  form.end_date = ''
  form.reason = ''
  form.parent_consent_url = ''
  form.late_time = ''
  formRef.value?.resetFields?.()
}

loadData()
</script>

<style scoped lang="scss">
.leave-page {
  .apply-card {
    border-radius: 16px;
    border: none;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    transition: box-shadow 0.3s ease;
    &:hover {
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
    }
  }

  .record-card {
    border-radius: 16px;
    border: none;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    overflow: hidden;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    .card-title {
      font-weight: 600;
      font-size: 16px;
      flex: 1;
      color: #303133;
    }
  }

  .leave-form {
    :deep(.el-form-item__label) {
      font-weight: 500;
      color: #606266;
    }
    :deep(.el-radio-group) {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    :deep(.el-radio-button__inner) {
      border-radius: 8px !important;
      border-left: 1px solid #dcdfe6;
      padding: 8px 18px;
    }
  }

  .consent-section {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
    .upload-tip {
      font-size: 12px;
      color: #a8abb2;
      margin-top: 4px;
    }
    .template-btn {
      margin-top: 0;
    }
  }

  .record-body {
    padding: 16px;
    max-height: 680px;
    overflow-y: auto;
  }

  .record-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .record-item {
    border-radius: 14px;
    border: 1px solid #ebeef5;
    background: #fff;
    padding: 16px 18px;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      border-radius: 14px 0 0 14px;
    }

    &.status-0::before { background: linear-gradient(180deg, #e6a23c, #d48a1a); }
    &.status-1::before { background: linear-gradient(180deg, #67c23a, #529b22); }
    &.status-2::before { background: linear-gradient(180deg, #f56c6c, #d9363e); }

    &:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
      transform: translateY(-1px);
    }

    .record-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;

      .record-type {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .status-tag {
        margin-left: 4px;
      }
      .record-date {
        font-size: 12px;
        color: #a8abb2;
      }
    }

    .record-info {
      display: flex;
      flex-direction: column;
      gap: 6px;

      .info-row {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: #606266;

        .el-icon {
          color: #c0c4cc;
          font-size: 14px;
          flex-shrink: 0;
        }

        .late-time {
          margin-left: 12px;
          color: #409eff;
          font-weight: 500;
          background: rgba(64, 158, 255, 0.08);
          padding: 1px 8px;
          border-radius: 10px;
        }
      }

      .reason-row {
        .reason-text {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.5;
        }
      }

      .consent-row {
        .el-link {
          font-size: 13px;
        }
      }

      .reply-row {
        background: #f7f8fa;
        border-radius: 8px;
        padding: 8px 10px;
        margin-top: 4px;

        .reply-label {
          color: #909399;
          flex-shrink: 0;
        }
        .reply-text {
          color: #606266;
          word-break: break-all;
        }
      }
    }
  }
}
</style>
