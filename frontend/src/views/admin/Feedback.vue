<template>
  <div class="feedback-page">
    <el-card>
      <template #header>
        <div class="header-actions">
          <el-radio-group v-model="filterStatus" @change="loadData">
            <el-radio-button label="">全部</el-radio-button>
            <el-radio-button label="0">待处理</el-radio-button>
            <el-radio-button label="1">已处理</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column type="index" width="60" align="center" />
        <el-table-column prop="user_name" label="反馈人" width="120" />
        <el-table-column prop="user_role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.user_role === 'admin' ? 'danger' : row.user_role === 'teacher' ? 'warning' : 'success'" size="small">
              {{ roleMap[row.user_role] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" width="200" show-overflow-tooltip />
        <el-table-column prop="content" label="内容" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ typeMap[row.type] || row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 0 ? 'warning' : 'success'" size="small">
              {{ row.status === 0 ? '待处理' : '已处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="提交时间" width="170" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleReply(row)">回复</el-button>
          </template>
        </el-table-column>
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

    <!-- 回复对话框 -->
    <el-dialog v-model="dialogVisible" title="回复反馈" width="500px">
      <div class="feedback-detail" v-if="currentRow">
        <p><strong>反馈人：</strong>{{ currentRow.user_name }}</p>
        <p><strong>标题：</strong>{{ currentRow.title }}</p>
        <p><strong>内容：</strong>{{ currentRow.content }}</p>
      </div>
      <el-form :model="replyForm" label-width="80px">
        <el-form-item label="回复内容">
          <el-input v-model="replyForm.reply" type="textarea" rows="4" placeholder="请输入回复内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReply">确认回复</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { getFeedbacks, replyFeedback } from '@/api/admin'

const loading = ref(false)
const tableData = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const filterStatus = ref('')
const dialogVisible = ref(false)
const currentRow = ref(null)
const replyForm = reactive({ reply: '' })
const roleMap = { admin: '管理员', teacher: '教师', student: '学生' }
const typeMap = { suggestion: '建议', complaint: '投诉', bug: 'Bug', other: '其他' }

const loadData = async () => {
  loading.value = true
  try {
    const { data } = await getFeedbacks({ status: filterStatus.value, page: page.value, pageSize: pageSize.value })
    tableData.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

const handleReply = (row) => {
  currentRow.value = row
  replyForm.reply = row.reply || ''
  dialogVisible.value = true
}

const submitReply = async () => {
  await replyFeedback(currentRow.value.id, { reply: replyForm.reply, status: 1 })
  ElMessage.success('回复成功')
  dialogVisible.value = false
  loadData()
}

loadData()
</script>

<style scoped lang="scss">
.feedback-page {
  .header-actions {
    display: flex;
    gap: 10px;
  }
  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
  .feedback-detail {
    margin-bottom: 20px;
    padding: 16px;
    background: #f5f7fa;
    border-radius: 8px;
    p {
      margin: 8px 0;
      color: #666;
    }
  }
}
</style>
