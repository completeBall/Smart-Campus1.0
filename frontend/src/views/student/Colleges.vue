<template>
  <div class="colleges-page">
    <el-card>
      <template #header>
        <div class="header-title">
          <el-icon size="20"><School /></el-icon>
          <span>学院与专业</span>
        </div>
      </template>

      <div class="college-list">
        <el-collapse v-model="activeNames">
          <el-collapse-item
            v-for="college in colleges"
            :key="college.id"
            :name="college.id"
            class="college-item"
          >
            <template #title>
              <div class="college-title">
                <div class="college-name">
                  <el-icon size="18"><Collection /></el-icon>
                  <span>{{ college.name }}</span>
                </div>
                <el-tag type="info" size="small">{{ college.majors?.length || 0 }} 个专业</el-tag>
              </div>
            </template>

            <div class="college-desc" v-if="college.description">
              {{ college.description }}
            </div>

            <div class="majors-grid">
              <el-card
                v-for="major in college.majors"
                :key="major.id"
                class="major-card"
                shadow="hover"
              >
                <template #header>
                  <div class="major-header">
                    <el-icon size="16"><Reading /></el-icon>
                    <span class="major-name">{{ major.name }}</span>
                  </div>
                </template>
                <p class="major-desc">{{ major.description }}</p>
              </el-card>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>

      <el-empty v-if="colleges.length === 0" description="暂无学院数据" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getColleges } from '@/api/student'

const colleges = ref([])
const activeNames = ref([1]) // Default expand first college

const loadData = async () => {
  try {
    const { data } = await getColleges()
    colleges.value = data || []
  } catch (e) {
    ElMessage.error('加载学院数据失败')
  }
}

onMounted(loadData)
</script>

<style scoped lang="scss">
.colleges-page {
  .header-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
    font-weight: 600;
  }

  .college-list {
    .college-item {
      margin-bottom: 12px;

      :deep(.el-collapse-item__header) {
        font-size: 15px;
        font-weight: 600;
        padding: 12px 16px;
        border-radius: 8px;
        background: #f8f9fa;
        transition: background 0.2s;

        &:hover {
          background: #eef1f6;
        }
      }

      :deep(.el-collapse-item__wrap) {
        border-radius: 0 0 8px 8px;
        background: #fff;
      }

      :deep(.el-collapse-item__content) {
        padding: 16px;
      }
    }

    .college-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding-right: 16px;

      .college-name {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #333;
      }
    }

    .college-desc {
      color: #666;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 16px;
      padding: 12px;
      background: #f0f7ff;
      border-radius: 8px;
      border-left: 4px solid #409eff;
    }

    .majors-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;

      .major-card {
        border-radius: 10px;
        transition: transform 0.2s, box-shadow 0.2s;

        &:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
        }

        :deep(.el-card__header) {
          padding: 12px 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 10px 10px 0 0;
        }

        .major-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #fff;
          font-weight: 600;
        }

        .major-name {
          font-size: 14px;
        }

        .major-desc {
          margin: 0;
          font-size: 13px;
          color: #666;
          line-height: 1.6;
        }
      }
    }
  }
}
</style>
