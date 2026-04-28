<template>
  <div class="logs-page">
    <el-card class="main-card" :body-style="{ padding: '0' }">
      <template #header>
        <div class="header-actions">
          <div class="header-left">
            <el-icon size="20" color="#667eea"><Document /></el-icon>
            <span class="card-title">操作日志</span>
            <el-tag v-if="total" type="info" effect="plain" size="small" round>{{ total }} 条记录</el-tag>
          </div>
          <div class="search-bar">
            <el-input
              v-model="keyword"
              placeholder="搜索用户 / 操作 / 详情"
              clearable
              style="width: 280px"
              @keyup.enter="loadData"
            >
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-button type="primary" class="search-btn" @click="loadData">
              <el-icon><Search /></el-icon>搜索
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
          <el-table-column prop="user_name" label="用户" width="130">
            <template #default="{ row }">
              <div class="user-cell">
                <el-avatar :size="28" class="user-avatar">{{ row.user_name?.charAt(0) }}</el-avatar>
                <span class="user-name">{{ row.user_name }}</span>
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
          <el-table-column prop="action" label="操作" width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="actionTagMap[row.action] || 'info'" size="small" effect="plain" round class="action-tag">
                {{ row.action }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="detail" label="详情" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="detail-text">{{ row.detail }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作时间" width="160" align="right">
            <template #default="{ row }">
              <div class="time-cell">
                <el-icon><Clock /></el-icon>
                <span>{{ formatDateTime(row.created_at) }}</span>
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
          layout="total, prev, pager, next"
          @change="loadData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Search, Document, Clock } from '@element-plus/icons-vue'
import { getLogs } from '@/api/admin'

const loading = ref(false)
const tableData = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const keyword = ref('')
const roleMap = { admin: '管理员', teacher: '教师', student: '学生' }
const roleTagMap = { admin: 'danger', teacher: 'warning', student: 'success' }
const actionTagMap = { 登录: 'primary', 登出: 'info', 创建: 'success', 修改: 'warning', 删除: 'danger' }

const formatDateTime = (s) => {
  if (!s) return '-'
  const d = new Date(s)
  return d.toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

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
            box-shadow: 0 0 0 1px #409eff inset, 0 0 0 4px rgba(64,158,255,0.08);
          }
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

  .action-tag {
    padding: 0 12px;
    height: 26px;
    font-weight: 500;
  }

  .detail-text {
    color: #606266;
    font-size: 14px;
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

  .pagination-wrapper {
    padding: 16px 24px 20px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
