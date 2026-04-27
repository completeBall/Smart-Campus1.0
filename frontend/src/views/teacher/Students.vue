<template>
  <div class="students-page">
    <el-card>
      <template #header>
        <div class="header-actions">
          <div class="search-bar">
            <el-input v-model="searchForm.keyword" placeholder="搜索账号/姓名" clearable style="width: 220px" @keyup.enter="loadData">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-select v-model="searchForm.class_name" placeholder="班级筛选" clearable style="width: 160px" @change="loadData">
              <el-option v-for="cls in classList" :key="cls" :label="cls" :value="cls" />
            </el-select>
            <el-button type="primary" @click="loadData">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </div>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe border>
        <el-table-column type="index" width="60" align="center" />
        <el-table-column prop="username" label="账号" width="120" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="class_name" label="班级" width="140" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="email" label="邮箱" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170" />
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
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { getStudents, getClasses } from '@/api/teacher'

const loading = ref(false)
const tableData = ref([])
const classList = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const searchForm = reactive({ keyword: '', class_name: '' })

const loadData = async () => {
  loading.value = true
  try {
    const { data } = await getStudents({ ...searchForm, page: page.value, pageSize: pageSize.value })
    tableData.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

const loadClasses = async () => {
  try {
    const { data } = await getClasses()
    classList.value = data || []
  } catch (e) {
    // 错误已在拦截器中提示
  }
}

const resetSearch = () => {
  searchForm.keyword = ''
  searchForm.class_name = ''
  page.value = 1
  loadData()
}

loadData()
loadClasses()
</script>

<style scoped lang="scss">
.students-page {
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
}
</style>
