<template>
  <div class="dashboard">
    <div class="stats-row">
      <el-card class="stat-card" v-for="item in stats" :key="item.title" :body-style="{ padding: '20px' }">
        <div class="stat-content">
          <div class="stat-icon" :style="{ background: item.gradient }">
            <el-icon size="28" color="#fff"><component :is="item.icon" /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ item.value }}</div>
            <div class="stat-title">{{ item.title }}</div>
          </div>
        </div>
      </el-card>
    </div>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="16">
        <el-card>
          <template #header>
            <span class="card-title">用户分布统计</span>
          </template>
          <div ref="userChart" style="height: 350px"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <span class="card-title">角色占比</span>
          </template>
          <div ref="roleChart" style="height: 350px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="recent-card">
      <template #header>
        <span class="card-title">最近操作日志</span>
        <el-button text type="primary" @click="$router.push('/admin/logs')">查看全部</el-button>
      </template>
      <el-table :data="recentLogs" stripe>
        <el-table-column prop="user_name" label="用户" width="120" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : row.role === 'teacher' ? 'warning' : 'success'" size="small">
              {{ roleMap[row.role] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" width="120" />
        <el-table-column prop="detail" label="详情" show-overflow-tooltip />
        <el-table-column prop="created_at" label="时间" width="180" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { getStatistics, getLogs } from '@/api/admin'

const router = useRouter()
const stats = ref([
  { title: '学生总数', value: 0, icon: 'User', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { title: '教师总数', value: 0, icon: 'UserFilled', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { title: '任务总数', value: 0, icon: 'Document', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { title: '待处理反馈', value: 0, icon: 'ChatDotRound', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }
])
const recentLogs = ref([])
const userChart = ref()
const roleChart = ref()
const roleMap = { admin: '管理员', teacher: '教师', student: '学生' }

const loadData = async () => {
  const { data } = await getStatistics()
  stats.value[0].value = data.studentCount
  stats.value[1].value = data.teacherCount
  stats.value[2].value = data.taskCount
  stats.value[3].value = data.feedbackCount

  const { data: logData } = await getLogs({ pageSize: 5 })
  recentLogs.value = logData.list
}

const initCharts = () => {
  const uc = echarts.init(userChart.value)
  uc.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] },
    yAxis: { type: 'value' },
    series: [
      { name: '登录次数', type: 'bar', data: [120, 132, 101, 134, 90, 230, 210], itemStyle: { color: '#667eea', borderRadius: [4, 4, 0, 0] } },
      { name: '新增用户', type: 'line', data: [22, 18, 19, 23, 29, 33, 31], smooth: true, itemStyle: { color: '#f5576c' } }
    ]
  })

  const rc = echarts.init(roleChart.value)
  rc.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: '5%' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: [
        { value: stats.value[0].value || 50, name: '学生', itemStyle: { color: '#667eea' } },
        { value: stats.value[1].value || 10, name: '教师', itemStyle: { color: '#f5576c' } },
        { value: 1, name: '管理员', itemStyle: { color: '#43e97b' } }
      ]
    }]
  })
}

onMounted(() => {
  loadData().then(() => initCharts())
})
</script>

<style scoped lang="scss">
.dashboard {
  .stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 20px;
  }

  .stat-card {
    border-radius: 12px;
    transition: transform 0.3s;

    &:hover {
      transform: translateY(-4px);
    }
  }

  .stat-content {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-info {
    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: #333;
    }
    .stat-title {
      font-size: 14px;
      color: #999;
      margin-top: 4px;
    }
  }

  .chart-row {
    margin-bottom: 20px;
  }

  .recent-card {
    :deep(.el-card__header) {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }
}
</style>
