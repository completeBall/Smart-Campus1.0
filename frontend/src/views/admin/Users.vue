<template>
  <div class="users-page">
    <el-card>
      <template #header>
        <div class="header-actions">
          <div class="search-bar">
            <el-input v-model="searchForm.keyword" placeholder="搜索账号/姓名" clearable style="width: 220px" @keyup.enter="loadData">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-select v-model="searchForm.role" placeholder="角色筛选" clearable style="width: 140px">
              <el-option label="管理员" value="admin" />
              <el-option label="教师" value="teacher" />
              <el-option label="学生" value="student" />
            </el-select>
            <el-button type="primary" @click="loadData">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </div>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>新增用户
          </el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe border>
        <el-table-column type="index" width="60" align="center" />
        <el-table-column prop="username" label="账号" width="120" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="role" label="角色" width="90">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : row.role === 'teacher' ? 'warning' : 'success'" effect="dark">
              {{ roleMap[row.role] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="学院/专业" width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.role === 'student'">
              <span v-if="row.college_name">{{ row.college_name }}</span>
              <span v-else class="text-muted">未设置</span>
              <span v-if="row.major_name"> · {{ row.major_name }}</span>
            </span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="class_name" label="班级" width="130" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="email" label="邮箱" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.status" :active-value="1" :inactive-value="0" @change="(val) => handleStatusChange(row, val)" />
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="warning" @click="handleReset(row)">重置密码</el-button>
            <el-popconfirm title="确定删除该用户吗？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
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
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑用户' : '新增用户'" width="520px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">
        <el-form-item label="账号" prop="username">
          <el-input v-model="form.username" :disabled="isEdit" placeholder="请输入账号" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" placeholder="请选择角色" style="width: 100%" :disabled="isEdit">
            <el-option label="管理员" value="admin" />
            <el-option label="教师" value="teacher" />
            <el-option label="学生" value="student" />
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
          <el-input v-model="form.class_name" placeholder="如:软件技术一班" />
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
          title="新建账号的初始密码统一为 123456,登录后请提示用户修改。"
        />
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUsers, createUser, updateUser, deleteUser, resetPassword, getCollegesMajors } from '@/api/admin'

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

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
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
    ElMessage.success('创建成功,初始密码 123456')
  }
  dialogVisible.value = false
  loadData()
}

const handleStatusChange = async (row, val) => {
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
}

const handleReset = async (row) => {
  await ElMessageBox.confirm(`确定重置 ${row.name} 的密码为 123456 吗？`, '提示', { type: 'warning' })
  await resetPassword(row.id)
  ElMessage.success('密码已重置')
}

const handleDelete = async (row) => {
  await deleteUser(row.id)
  ElMessage.success('删除成功')
  loadData()
}

onMounted(() => {
  loadCascadeOptions()
  loadData()
})
</script>

<style scoped lang="scss">
.users-page {
  .header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .search-bar {
    display: flex;
    gap: 10px;
  }
  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
  .text-muted {
    color: #909399;
    font-size: 12px;
  }
  .el-alert {
    margin-top: 4px;
  }
}
</style>
