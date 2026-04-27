<template>
  <div class="grades-page">
    <el-card>
      <template #header>
        <span class="card-title">成绩查询</span>
      </template>

      <el-empty v-if="grades.length === 0" description="暂无成绩记录" />
      <div v-else class="grade-cards">
        <el-card v-for="grade in grades" :key="grade.id" class="grade-card" shadow="hover">
          <div class="grade-header">
            <h4>{{ grade.course_name }}</h4>
            <el-tag :type="grade.score >= 60 ? 'success' : 'danger'" effect="dark" size="large">
              {{ grade.score }} 分
            </el-tag>
          </div>
          <div class="grade-info">
            <p><el-icon><User /></el-icon> 教师：{{ grade.teacher_name }}</p>
            <p><el-icon><Document /></el-icon> 类型：{{ grade.exam_type }}</p>
            <p v-if="grade.remark"><el-icon><InfoFilled /></el-icon> 备注：{{ grade.remark }}</p>
          </div>
        </el-card>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getStudentGrades } from '@/api/student'

const grades = ref([])

const loadData = async () => {
  const { data } = await getStudentGrades()
  grades.value = data
}

loadData()
</script>

<style scoped lang="scss">
.grades-page {
  .grade-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  .grade-card {
    .grade-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      h4 {
        margin: 0;
        color: #333;
      }
    }
    .grade-info {
      p {
        margin: 6px 0;
        color: #666;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
    }
  }
}
</style>
