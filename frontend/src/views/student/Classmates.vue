<template>
  <div class="classmates-page">
    <el-card>
      <template #header>
        <div class="header-title">
          <span>我的同学</span>
          <div class="header-tags">
            <el-tag type="primary" size="small" v-if="userStore.userInfo.college">
              <el-icon><School /></el-icon>
              {{ userStore.userInfo.college }}
            </el-tag>
            <el-tag type="success" size="small" v-if="userStore.userInfo.major">
              <el-icon><Reading /></el-icon>
              {{ userStore.userInfo.major }}
            </el-tag>
            <el-tag type="info" size="small">
              <el-icon><User /></el-icon>
              {{ userStore.userInfo.class_name || '未分班' }}
            </el-tag>
          </div>
        </div>
      </template>

      <!-- 统计信息 -->
      <div class="stats-bar" v-if="classmates.length > 0">
        <el-statistic title="同班同学" :value="classmates.length" />
        <el-statistic title="我的学院" :value="userStore.userInfo.college || '--'" />
        <el-statistic title="我的专业" :value="userStore.userInfo.major || '--'" />
      </div>

      <el-empty v-if="classmates.length === 0" :description="emptyText" />
      <el-row v-else :gutter="16">
        <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="item in classmates" :key="item.id">
          <el-card class="classmate-card" shadow="hover" @click="goProfile(item.id)">
            <div class="classmate-avatar">
              <el-avatar :size="64" :src="item.avatar">
                {{ item.name?.charAt(0) }}
              </el-avatar>
            </div>
            <div class="classmate-info">
              <h4 class="name">{{ item.name }}</h4>
              <p class="meta">账号: {{ item.username }}</p>
              <p class="signature" v-if="item.signature">"{{ item.signature }}"</p>
              <div class="tags">
                <el-tag v-if="item.class_name" type="info" size="small">{{ item.class_name }}</el-tag>
                <el-tag v-if="item.college" type="primary" size="small">{{ item.college }}</el-tag>
                <el-tag v-if="item.major" type="success" size="small">{{ item.major }}</el-tag>
              </div>
              <p class="meta" v-if="item.phone">手机: {{ item.phone }}</p>
              <p class="meta" v-if="item.email">邮箱: {{ item.email }}</p>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getClassmates } from '@/api/student'
import { getProfile } from '@/api/profile'

const router = useRouter()
const userStore = useUserStore()
const classmates = ref([])

const emptyText = computed(() => {
  if (!userStore.userInfo.class_name && !userStore.userInfo.college) {
    return '您尚未分配班级和学院，系统已为您展示全校同学'
  }
  return '暂无同学信息'
})

const loadData = async () => {
  try {
    // 先刷新用户信息，避免 localStorage 缓存过期
    const { data: profile } = await getProfile()
    if (profile) {
      userStore.setUserInfo({
        ...userStore.userInfo,
        class_name: profile.class_name,
        college: profile.college,
        major: profile.major,
        college_id: profile.college_id,
        major_id: profile.major_id
      })
    }
    const { data } = await getClassmates()
    classmates.value = data || []
  } catch (e) {
    // 错误已在拦截器中提示
  }
}

const goProfile = (id) => {
  router.push(`/student/u/${id}`)
}

loadData()
</script>

<style scoped lang="scss">
.classmates-page {
  .header-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-size: 16px;
    font-weight: 600;

    .header-tags {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;

      .el-tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
    }
  }

  .stats-bar {
    display: flex;
    gap: 40px;
    margin-bottom: 20px;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .classmate-card {
    margin-bottom: 16px;
    text-align: center;
    border-radius: 12px;
    transition: transform 0.2s;
    cursor: pointer;

    &:hover {
      transform: translateY(-4px);
    }

    .classmate-avatar {
      margin-bottom: 12px;

      .el-avatar {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #fff;
        font-size: 24px;
        font-weight: bold;
      }
    }

    .classmate-info {
      .name {
        margin: 0 0 8px;
        font-size: 16px;
        font-weight: 600;
        color: #333;
      }

      .signature {
        margin: 4px 0 8px;
        font-size: 12px;
        color: #667eea;
        font-style: italic;
        line-height: 1.4;
        max-height: 32px;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .tags {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 6px;
        margin-bottom: 8px;
      }

      .meta {
        margin: 4px 0;
        font-size: 12px;
        color: #999;
      }
    }
  }
}
</style>
