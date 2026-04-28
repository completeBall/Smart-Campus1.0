<template>
  <div class="users-page">
    <el-card class="main-card" :body-style="{ padding: '0' }">
      <template #header>
        <div class="header-actions">
          <div class="header-left">
            <el-icon size="20" color="#667eea"><UserFilled /></el-icon>
            <span class="card-title">用户管理</span>
            <el-tag v-if="total" type="info" effect="plain" size="small" round>{{ total }} 位用户</el-tag>
          </div>
          <div class="search-bar">
            <el-input
              v-model="searchForm.keyword"
              placeholder="搜索账号 / 姓名"
              clearable
              style="width: 220px"
              @keyup.enter="loadData"
            >
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-select v-model="searchForm.role" placeholder="角色筛选" clearable style="width: 140px">
              <el-option label="管理员" value="admin" />
              <el-option label="教师" value="teacher" />
              <el-option label="学生" value="student" />
            </el-select>
            <el-button type="primary" class="search-btn" @click="loadData">
              <el-icon><Search /></el-icon>搜索
            </el-button>
            <el-button class="reset-btn" @click="resetSearch">
              <el-icon><RefreshRight /></el-icon>重置
            </el-button>
            <el-button type="primary" class="add-btn" @click="handleAdd">
              <el-icon><Plus /></el-icon>新增用户
            </el-button>
            <el-button type="primary" class="import-btn" @click="importDialogVisible = true">
              <el-icon><Upload /></el-icon>批量导入
            </el-button>
          </div>
        </div>
      </template>

      <div class="table-wrapper">
        <el-table :data="tableData" v-loading="loading" stripe class="custom-table">
          <el-table-column type="index" width="60" align="center">
            <template #default="{ $index }">
              <span class="row-index">{{ (page - 1) * pageSize + $index + 1 }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="username" label="账号" width="130">
            <template #default="{ row }">
              <span class="username-text">{{ row.username }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="姓名" width="120">
            <template #default="{ row }">
              <div class="user-cell">
                <el-avatar :size="28" class="user-avatar">{{ row.name?.charAt(0) }}</el-avatar>
                <span class="user-name">{{ row.name }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="role" label="角色" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="roleTagMap[row.role]" size="small" effect="dark" round class="role-tag">
                {{ roleMap[row.role] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="学院 / 专业" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-if="row.role === 'student' && (row.college_name || row.major_name)" class="college-text">
                <span v-if="row.college_name">{{ row.college_name }}</span>
                <span v-if="row.major_name" class="major-dot">·</span>
                <span v-if="row.major_name">{{ row.major_name }}</span>
              </span>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column prop="class_name" label="班级" width="130">
            <template #default="{ row }">
              <span v-if="row.class_name" class="class-text">{{ row.class_name }}</span>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column prop="phone" label="手机号" width="130">
            <template #default="{ row }">
              <span v-if="row.phone" class="contact-text">{{ row.phone }}</span>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-if="row.email" class="contact-text">{{ row.email }}</span>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-switch
                v-model="row.status"
                :active-value="1"
                :inactive-value="0"
                inline-prompt
                active-text="启"
                inactive-text="禁"
                @change="(val) => handleStatusChange(row, val)"
              />
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="160" align="right">
            <template #default="{ row }">
              <div class="time-cell">
                <el-icon><Clock /></el-icon>
                <span>{{ formatDateTime(row.created_at) }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right" align="center">
            <template #default="{ row }">
              <div class="action-btns">
                <el-tooltip content="编辑" placement="top">
                  <el-button circle size="small" type="primary" plain @click="handleEdit(row)">
                    <el-icon><Edit /></el-icon>
                  </el-button>
                </el-tooltip>
                <el-tooltip content="重置密码" placement="top">
                  <el-button circle size="small" type="warning" plain @click="handleReset(row)">
                    <el-icon><RefreshRight /></el-icon>
                  </el-button>
                </el-tooltip>
                <el-tooltip content="删除" placement="top">
                  <el-button circle size="small" type="danger" plain @click="handleDelete(row)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </el-tooltip>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @change="loadData"
        />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑用户' : '新增用户'" width="540px" class="user-dialog">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">
        <el-form-item label="账号" prop="username">
          <el-input v-model="form.username" :disabled="isEdit" placeholder="请输入账号" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" placeholder="请选择角色" style="width: 100%" :disabled="isEdit">
            <el-option label="管理员" value="admin">
              <el-tag type="danger" size="small" effect="dark" round style="margin-right: 6px">管</el-tag>管理员
            </el-option>
            <el-option label="教师" value="teacher">
              <el-tag type="warning" size="small" effect="dark" round style="margin-right: 6px">教</el-tag>教师
            </el-option>
            <el-option label="学生" value="student">
              <el-tag type="success" size="small" effect="dark" round style="margin-right: 6px">学</el-tag>学生
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="学院/专业" v-if="form.role === 'student'">
          <el-cascader
            v-model="cascadeValue"
            :options="collegeOptions"
            :props="{ checkStrictly: false, emitPath: true }"
            placeholder="请选择学院和专业"
            clearable
            style="width: 100%"
            @change="onCascadeChange"
          />
        </el-form-item>
        <el-form-item label="班级" prop="class_name" v-if="form.role === 'student'">
          <el-input v-model="form.class_name" placeholder="如：软件技术一班" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-alert
          v-if="!isEdit"
          type="info"
          :closable="false"
          show-icon
          title="新建账号的初始密码统一为 123456，登录后请提示用户修改。"
          class="info-alert"
        />
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">
          <el-icon><Check /></el-icon> 确认
        </el-button>
      </template>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog v-model="importDialogVisible" title="批量导入用户" width="480px" class="user-dialog">
      <div class="import-body">
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="请先下载模板，按模板格式填写后上传。支持 .xlsx 格式，初始密码统一为 123456。"
          class="info-alert"
          style="margin-bottom: 20px"
        />

        <div class="import-actions">
          <el-button type="primary" plain class="template-btn" @click="handleDownloadTemplate">
            <el-icon><Download /></el-icon> 下载导入模板
          </el-button>
          <el-upload
            action="#"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleImportChange"
            accept=".xlsx,.xls"
            class="import-uploader"
          >
            <el-button type="primary" class="upload-btn" :loading="importing">
              <el-icon><Upload /></el-icon> 上传Excel
            </el-button>
          </el-upload>
        </div>

        <div v-if="importResult" class="import-result">
          <el-divider />
          <div class="result-summary">
            <el-result
              :icon="importResult.failedCount > 0 ? 'warning' : 'success'"
              :title="`成功 ${importResult.successCount} 条，失败 ${importResult.failedCount} 条`"
              :sub-title="importResult.failedCount > 0 ? '失败明细见下方列表' : '所有用户已导入成功'"
            />
          </div>
          <div v-if="importResult.failed.length" class="failed-list">
            <el-table :data="importResult.failed" size="small" max-height="200">
              <el-table-column prop="row" label="行号" width="70" />
              <el-table-column prop="reason" label="失败原因" />
            </el-table>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="importDialogVisible = false; importResult = null">关闭</el-button>
        <el-button v-if="importResult && importResult.successCount > 0" type="primary" @click="handleImportDone">
          <el-icon><Check /></el-icon> 完成
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Plus, RefreshRight, UserFilled, Clock,
  Edit, Delete, Check, Upload, Download
} from '@element-plus/icons-vue'
import {
  getUsers, createUser, updateUser, deleteUser, resetPassword, getCollegesMajors,
  downloadUserTemplate, importUsers
} from '@/api/admin'

const loading = ref(false)
const tableData = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const searchForm = reactive({ keyword: '', role: '' })
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const collegeOptions = ref([])
const cascadeValue = ref([])
const submitting = ref(false)
const importDialogVisible = ref(false)
const importing = ref(false)
const importResult = ref(null)

const initialForm = () => ({
  id: null,
  username: '',
  name: '',
  role: '',
  class_name: '',
  phone: '',
  email: '',
  college_id: null,
  major_id: null,
  status: 1
})
const form = reactive(initialForm())
const roleMap = { admin: '管理员', teacher: '教师', student: '学生' }
const roleTagMap = { admin: 'danger', teacher: 'warning', student: 'success' }

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const formatDateTime = (s) => {
  if (!s) return '-'
  const d = new Date(s)
  return d.toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

const loadCascadeOptions = async () => {
  try {
    const { data } = await getCollegesMajors()
    collegeOptions.value = data || []
  } catch (e) {}
}

const onCascadeChange = (val) => {
  if (val && val.length === 2) {
    form.college_id = val[0]
    form.major_id = val[1]
  } else if (val && val.length === 1) {
    form.college_id = val[0]
    form.major_id = null
  } else {
    form.college_id = null
    form.major_id = null
  }
}

const loadData = async () => {
  loading.value = true
  try {
    const { data } = await getUsers({ ...searchForm, page: page.value, pageSize: pageSize.value })
    tableData.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

const resetSearch = () => {
  searchForm.keyword = ''
  searchForm.role = ''
  page.value = 1
  loadData()
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(form, initialForm())
  cascadeValue.value = []
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(form, initialForm(), row)
  cascadeValue.value = row.college_id && row.major_id
    ? [row.college_id, row.major_id]
    : (row.college_id ? [row.college_id] : [])
  dialogVisible.value = true
}

const submitForm = async () => {
  await formRef.value.validate()
  submitting.value = true
  try {
    const payload = {
      username: form.username,
      name: form.name,
      role: form.role,
      class_name: form.class_name || null,
      phone: form.phone || null,
      email: form.email || null,
      college_id: form.college_id || null,
      major_id: form.major_id || null,
      status: form.status ?? 1
    }
    if (isEdit.value) {
      await updateUser(form.id, payload)
      ElMessage.success('更新成功')
    } else {
      await createUser(payload)
      ElMessage.success('创建成功，初始密码 123456')
    }
    dialogVisible.value = false
    loadData()
  } finally {
    submitting.value = false
  }
}

const handleStatusChange = async (row, val) => {
  try {
    await updateUser(row.id, {
      name: row.name,
      class_name: row.class_name,
      phone: row.phone,
      email: row.email,
      status: val,
      college_id: row.college_id,
      major_id: row.major_id
    })
    ElMessage.success('状态更新成功')
  } catch (e) {
    row.status = val === 1 ? 0 : 1
    throw e
  }
}

const handleReset = async (row) => {
  await ElMessageBox.confirm(`确定重置 ${row.name} 的密码为 123456 吗？`, '提示', { type: 'warning' })
  await resetPassword(row.id)
  ElMessage.success('密码已重置')
}

const handleDelete = async (row) => {
  await ElMessageBox.confirm('确定删除该用户吗？', '提示', { type: 'warning' })
  await deleteUser(row.id)
  ElMessage.success('删除成功')
  loadData()
}

const handleDownloadTemplate = () => {
  const a = document.createElement('a')
  a.href = '/uploads/defaults/用户导入模板.xlsx'
  a.download = '用户导入模板.xlsx'
  a.click()
  ElMessage.success('模板下载成功')
}

const handleImportChange = async (uploadFile) => {
  const file = uploadFile.raw
  if (!file) return
  const ext = file.name.split('.').pop().toLowerCase()
  if (!['xlsx', 'xls'].includes(ext)) {
    ElMessage.error('请上传 .xlsx 或 .xls 格式的Excel文件')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 5MB')
    return
  }
  importing.value = true
  try {
    const res = await importUsers(file)
    importResult.value = res.data
    if (res.data.failedCount === 0) {
      ElMessage.success(`成功导入 ${res.data.successCount} 位用户`)
    } else if (res.data.successCount > 0) {
      ElMessage.warning(`导入完成，成功 ${res.data.successCount} 条，失败 ${res.data.failedCount} 条`)
    } else {
      ElMessage.error(`导入失败，共 ${res.data.failedCount} 条数据未通过校验`)
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '导入失败')
  } finally {
    importing.value = false
  }
}

const handleImportDone = () => {
  importDialogVisible.value = false
  importResult.value = null
  loadData()
}

onMounted(() => {
  loadCascadeOptions()
  loadData()
})
</script>

<style scoped lang="scss">
.users-page {
  .main-card {
    border-radius: 20px;
    border: none;
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.04);
    overflow: hidden;

    :deep(.el-card__header) {
      padding: 18px 24px;
      border-bottom: 1px solid #f0f0f0;
    }
  }

  .header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;

      .card-title {
        font-size: 18px;
        font-weight: 700;
        color: #1a1a2e;
      }
    }

    .search-bar {
      display: flex;
      gap: 10px;
      align-items: center;

      .el-input {
        :deep(.el-input__wrapper) {
          border-radius: 12px;
          box-shadow: 0 0 0 1px #e4e7ed inset;
          transition: all 0.3s ease;
          padding: 0 12px;

          &:focus-within {
            box-shadow: 0 0 0 1px #409eff inset, 0 0 0 4px rgba(64, 158, 255, 0.08);
          }
        }
      }

      .el-select {
        :deep(.el-input__wrapper) {
          border-radius: 12px;
          box-shadow: 0 0 0 1px #e4e7ed inset;
          transition: all 0.3s ease;
        }
      }

      .search-btn {
        border-radius: 12px;
        padding: 0 18px;
        background: linear-gradient(135deg, #409eff 0%, #1677ff 100%);
        border: none;
        box-shadow: 0 4px 12px rgba(64, 158, 255, 0.25);
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(64, 158, 255, 0.35);
        }
      }

      .reset-btn {
        border-radius: 12px;
        padding: 0 18px;
        transition: all 0.3s ease;

        &:hover {
          background: #f5f7ff;
        }
      }

      .add-btn {
        border-radius: 12px;
        padding: 0 18px;
        background: linear-gradient(135deg, #67c23a 0%, #529b22 100%);
        border: none;
        box-shadow: 0 4px 12px rgba(103, 194, 58, 0.25);
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(103, 194, 58, 0.35);
        }
      }

      .import-btn {
        border-radius: 12px;
        padding: 0 18px;
        background: linear-gradient(135deg, #e6a23c 0%, #d48a1a 100%);
        border: none;
        box-shadow: 0 4px 12px rgba(230, 162, 60, 0.25);
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(230, 162, 60, 0.35);
        }
      }
    }
  }

  .table-wrapper {
    padding: 16px 24px 8px;
  }

  .custom-table {
    :deep(.el-table__header-wrapper th) {
      background: #f8f9fc;
      color: #606266;
      font-weight: 600;
      font-size: 13px;
      padding: 14px 0;
    }

    :deep(.el-table__row) {
      transition: all 0.2s ease;

      &:hover td {
        background: #f5f7ff !important;
      }
    }

    :deep(.el-table__cell) {
      padding: 14px 0;
    }
  }

  .row-index {
    color: #a8abb2;
    font-size: 13px;
    font-weight: 500;
  }

  .username-text {
    font-family: monospace;
    font-size: 13px;
    color: #303133;
    font-weight: 500;
  }

  .user-cell {
    display: flex;
    align-items: center;
    gap: 8px;

    .user-avatar {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      font-size: 12px;
      font-weight: bold;
    }

    .user-name {
      color: #303133;
      font-weight: 500;
      font-size: 14px;
    }
  }

  .role-tag {
    padding: 0 12px;
    height: 26px;
    font-weight: 500;
  }

  .college-text {
    color: #606266;
    font-size: 13px;

    .major-dot {
      margin: 0 6px;
      color: #c0c4cc;
    }
  }

  .class-text {
    color: #606266;
    font-size: 13px;
  }

  .contact-text {
    color: #606266;
    font-size: 13px;
    font-family: monospace;
  }

  .text-muted {
    color: #c0c4cc;
    font-size: 13px;
  }

  .time-cell {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #a8abb2;
    font-size: 13px;
    font-family: monospace;
    background: #f8f9fc;
    padding: 4px 10px;
    border-radius: 8px;
  }

  .action-btns {
    display: flex;
    gap: 6px;
    justify-content: center;

    .el-button {
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-1px);
      }
    }
  }

  .pagination-wrapper {
    padding: 16px 24px 20px;
    display: flex;
    justify-content: flex-end;
  }

  .info-alert {
    margin-top: 4px;
    border-radius: 10px;
  }
}

.user-dialog {
  :deep(.el-dialog) {
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.12);
  }

  :deep(.el-dialog__header) {
    background: linear-gradient(135deg, #f0f5ff 0%, #e6f0ff 100%);
    padding: 20px 24px;
    margin: 0;
    border-bottom: 1px solid #e4e7ed;

    .el-dialog__title {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a2e;
    }
  }

  :deep(.el-dialog__body) {
    padding: 24px;
  }

  :deep(.el-dialog__footer) {
    padding: 16px 24px 24px;
    border-top: 1px solid #f0f0f0;

    .el-button {
      border-radius: 10px;
      padding: 10px 24px;
      font-weight: 500;
    }

    .el-button--primary {
      background: linear-gradient(135deg, #409eff 0%, #1677ff 100%);
      border: none;
      box-shadow: 0 4px 14px rgba(64, 158, 255, 0.35);
    }
  }

  :deep(.el-input__wrapper) {
    border-radius: 10px;
    box-shadow: 0 0 0 1px #e4e7ed inset;
    transition: all 0.3s ease;

    &:focus-within {
      box-shadow: 0 0 0 1px #409eff inset, 0 0 0 4px rgba(64, 158, 255, 0.08);
    }
  }

  :deep(.el-select .el-input__wrapper) {
    border-radius: 10px;
  }

  :deep(.el-cascader .el-input__wrapper) {
    border-radius: 10px;
  }
}

.import-body {
  .import-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    align-items: center;

    .template-btn {
      border-radius: 10px;
      padding: 10px 20px;
      font-weight: 500;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-1px);
      }
    }

    .upload-btn {
      border-radius: 10px;
      padding: 10px 20px;
      background: linear-gradient(135deg, #409eff 0%, #1677ff 100%);
      border: none;
      box-shadow: 0 4px 14px rgba(64, 158, 255, 0.35);
      font-weight: 500;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(64, 158, 255, 0.45);
      }
    }
  }

  .import-result {
    margin-top: 8px;

    .result-summary {
      :deep(.el-result) {
        padding: 16px 0;
      }

      :deep(.el-result__icon svg) {
        width: 48px;
        height: 48px;
      }
    }

    .failed-list {
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #f0f0f0;
    }
  }
}
</style>
