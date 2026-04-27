<template>
  <div class="logs-page">
    <el-card>
      <template #header>
        <div class="header-actions">
          <el-input v-model="keyword" placeholder="搜索用户/操作/详情" clearable style="width: 300px" @keyup.enter="loadData">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-button type="primary" @click="loadData">搜索</el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column type="index" width="60" align="center" />
        <el-table-column prop="user_name" label="用户" width="120" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : row.role === 'teacher' ? 'warning' : 'success'" size="small">
              {{ roleMap[row.role] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" width="120">
          <template #default="{ row }">
            <el-tag effect="plain" size="small">{{ row.action }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="detail" label="详情" show-overflow-tooltip />
        <el-table-column prop="created_at" label="操作时间" width="170" />
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @change="loadData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getLogs } from '@/api/admin'

const loading = ref(false)
const tableData = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const keyword = ref('')
const roleMap = { admin: '管理员', teacher: '教师', student: '学生' }

const loadData = async () => {
  loading.value = true
  try {
    const { data } = await getLogs({ keyword: keyword.value, page: page.value, pageSize: pageSize.value })
    tableData.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

loadData()
</script>

<style scoped lang="scss">
.logs-page {
  .header-actions {
    display: flex;
    gap: 10px;
  }
  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
