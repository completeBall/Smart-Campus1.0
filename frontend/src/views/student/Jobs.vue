<template>
  <div class="jobs-page">
    <el-card>
      <template #header>
        <div class="header-actions">
          <div class="search-bar">
            <el-input v-model="keyword" placeholder="搜索公司/职位" clearable style="width: 280px" @keyup.enter="loadData">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-select v-model="category" placeholder="分类筛选" clearable style="width: 140px" @change="loadData">
              <el-option label="技术" value="技术" />
              <el-option label="产品" value="产品" />
              <el-option label="设计" value="设计" />
              <el-option label="运营" value="运营" />
            </el-select>
            <el-button type="primary" @click="loadData">搜索</el-button>
          </div>
        </div>
      </template>

      <el-empty v-if="jobs.length === 0" description="暂无招聘信息" />
      <div v-else class="job-cards">
        <el-card v-for="job in jobs" :key="job.id" class="job-card" shadow="hover" @click="goDetail(job)">
          <div class="job-header">
            <div class="company-info">
              <div class="company-name">{{ job.company }}</div>
              <div class="job-title">{{ job.title }}</div>
            </div>
            <div class="salary">{{ job.salary }}</div>
          </div>
          <div class="job-tags">
            <el-tag size="small" type="info">{{ job.category }}</el-tag>
            <el-tag size="small" type="info">{{ job.location }}</el-tag>
          </div>
          <div class="job-desc">{{ job.description }}</div>
          <div class="job-footer">
            <span class="contact">联系方式：{{ job.contact }}</span>
            <el-button type="primary" size="small">查看详情</el-button>
          </div>
        </el-card>
      </div>

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
import { useRouter } from 'vue-router'
import { getJobs } from '@/api/student'

const router = useRouter()
const jobs = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const keyword = ref('')
const category = ref('')

const loadData = async () => {
  const { data } = await getJobs({ keyword: keyword.value, category: category.value, page: page.value, pageSize: pageSize.value })
  jobs.value = data.list
  total.value = data.total
}

const goDetail = (job) => {
  router.push(`/student/jobs/${job.id}`)
}

loadData()
</script>

<style scoped lang="scss">
.jobs-page {
  .header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .search-bar {
      display: flex;
      gap: 10px;
    }
  }
  .job-cards {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  .job-card {
    cursor: pointer;
    transition: all 0.3s;
    &:hover {
      transform: translateY(-4px);
    }
    .job-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
      .company-name {
        font-size: 13px;
        color: #999;
      }
      .job-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin-top: 4px;
      }
      .salary {
        color: #f56c6c;
        font-weight: bold;
        font-size: 16px;
      }
    }
    .job-tags {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    .job-desc {
      color: #666;
      font-size: 13px;
      line-height: 1.6;
      margin-bottom: 16px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .job-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .contact {
        font-size: 13px;
        color: #999;
      }
    }
  }
  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
