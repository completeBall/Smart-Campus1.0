<template>
  <div class="job-detail">
    <el-button link @click="$router.back()" class="back-btn">
      <el-icon><ArrowLeft /></el-icon> 返回列表
    </el-button>

    <el-card v-if="job" class="detail-card">
      <div class="detail-header">
        <div class="company-info">
          <h2>{{ job.company }}</h2>
          <h1>{{ job.title }}</h1>
        </div>
        <div class="salary">{{ job.salary }}</div>
      </div>

      <div class="detail-tags">
        <el-tag size="large" type="info">{{ job.category }}</el-tag>
        <el-tag size="large" type="info">{{ job.location }}</el-tag>
      </div>

      <el-divider />

      <div class="detail-section">
        <h3>职位描述</h3>
        <p>{{ job.description }}</p>
      </div>

      <div class="detail-section">
        <h3>任职要求</h3>
        <p>{{ job.requirements }}</p>
      </div>

      <el-divider />

      <div class="detail-footer">
        <div class="contact-info">
          <el-icon><Message /></el-icon>
          <span>联系方式：{{ job.contact }}</span>
        </div>
        <el-button type="primary" size="large" @click="handleApply">投递简历</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getJobDetail } from '@/api/student'

const route = useRoute()
const job = ref(null)

const loadData = async () => {
  const { data } = await getJobDetail(route.params.id)
  job.value = data
}

const handleApply = () => {
  ElMessage.success('投递成功！请您耐心等待结果')
}

onMounted(loadData)
</script>

<style scoped lang="scss">
.job-detail {
  .back-btn {
    margin-bottom: 16px;
    color: #667eea;
  }
  .detail-card {
    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      h2 {
        font-size: 16px;
        color: #999;
        margin-bottom: 8px;
      }
      h1 {
        font-size: 24px;
        color: #333;
        margin: 0;
      }
      .salary {
        color: #f56c6c;
        font-size: 22px;
        font-weight: bold;
      }
    }
    .detail-tags {
      display: flex;
      gap: 12px;
    }
    .detail-section {
      margin: 20px 0;
      h3 {
        font-size: 16px;
        color: #333;
        margin-bottom: 12px;
      }
      p {
        color: #555;
        line-height: 1.8;
        white-space: pre-wrap;
      }
    }
    .detail-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .contact-info {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #666;
      }
    }
  }
}
</style>
