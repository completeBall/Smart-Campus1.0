<template>
  <div class="submissions-page">
    <el-card>
      <template #header>
        <div class="header-actions">
          <div class="filters">
            <el-select v-model="filterTask" placeholder="任务筛选" clearable style="width: 180px" @change="loadData">
              <el-option v-for="t in taskOptions" :key="t.id" :label="t.title" :value="t.id" />
            </el-select>
            <el-radio-group v-model="filterStatus" @change="loadData">
              <el-radio-button label="">全部</el-radio-button>
              <el-radio-button label="0">待批改</el-radio-button>
              <el-radio-button label="1">已批改</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>

      <el-table :data="submissions" v-loading="loading" stripe>
        <el-table-column prop="task_title" label="任务" show-overflow-tooltip />
        <el-table-column prop="student_name" label="学生" width="120" />
        <el-table-column prop="class_name" label="班级" width="120" />
        <el-table-column prop="content" label="提交内容" show-overflow-tooltip />
        <el-table-column label="附件" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.file_url" size="small" type="info">有</el-tag>
            <span v-else class="no-score">--</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 0 ? 'warning' : 'success'">{{ row.status === 0 ? '待批改' : '已批改' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="score" label="分数" width="100">
          <template #default="{ row }">
            <span v-if="row.score !== null" :class="row.score >= 60 ? 'pass' : 'fail'">{{ row.score }}</span>
            <span v-else class="no-score">--</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="提交时间" width="160" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleReview(row)">批改</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="批改作业" width="500px">
      <div v-if="currentRow" class="review-detail">
        <p><strong>学生：</strong>{{ currentRow.student_name }}（{{ currentRow.class_name }}）</p>
        <p><strong>任务：</strong>{{ currentRow.task_title }}</p>
        <p><strong>提交内容：</strong></p>
        <div class="content-box">{{ currentRow.content || '无文本内容' }}</div>
        <div v-if="currentRow.file_url" class="file-box">
          <p><strong>附件：</strong></p>
          <a :href="currentRow.file_url" target="_blank" class="file-link">
            <el-button link type="primary">
              <el-icon><Document /></el-icon>
              {{ currentRow.file_name || '查看附件' }}
            </el-button>
          </a>
        </div>
      </div>
      <el-form :model="reviewForm" label-width="80px">
        <el-form-item label="分数">
          <el-input-number v-model="reviewForm.score" :min="0" :max="100" style="width: 150px" />
        </el-form-item>
        <el-form-item label="评语">
          <el-input v-model="reviewForm.comment" type="textarea" rows="3" placeholder="请输入评语" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReview">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { getSubmissions, reviewSubmission, getTasks } from '@/api/teacher'

const loading = ref(false)
const submissions = ref([])
const taskOptions = ref([])
const filterTask = ref('')
const filterStatus = ref('')
const dialogVisible = ref(false)
const currentRow = ref(null)
const reviewForm = reactive({ score: 0, comment: '' })

const loadData = async () => {
  loading.value = true
  try {
    const { data } = await getSubmissions({ task_id: filterTask.value, status: filterStatus.value })
    submissions.value = data
  } finally {
    loading.value = false
  }
}

const loadTasks = async () => {
  const { data } = await getTasks()
  taskOptions.value = data
}

const handleReview = (row) => {
  currentRow.value = row
  reviewForm.score = row.score || 0
  reviewForm.comment = row.comment || ''
  dialogVisible.value = true
}

const submitReview = async () => {
  await reviewSubmission(currentRow.value.id, { score: reviewForm.score, comment: reviewForm.comment, status: 1 })
  ElMessage.success('批改成功')
  dialogVisible.value = false
  loadData()
}

loadTasks()
loadData()
</script>

<style scoped lang="scss">
.submissions-page {
  .header-actions {
    display: flex;
    gap: 10px;
    .filters {
      display: flex;
      gap: 10px;
    }
  }
  .pass { color: #67c23a; font-weight: bold; }
  .fail { color: #f56c6c; font-weight: bold; }
  .no-score { color: #999; }
  .review-detail {
    margin-bottom: 16px;
    p { margin: 8px 0; }
    .content-box {
      background: #f5f7fa;
      padding: 12px;
      border-radius: 6px;
      color: #666;
      line-height: 1.6;
      max-height: 150px;
      overflow-y: auto;
    }
    .file-box {
      margin-top: 12px;
      padding: 10px;
      background: #f0f9ff;
      border-radius: 6px;
      border: 1px solid #bae0ff;
    }
    .file-link {
      text-decoration: none;
    }
  }
}
</style>
