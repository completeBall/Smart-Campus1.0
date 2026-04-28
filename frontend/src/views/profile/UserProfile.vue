<template>
  <div class="user-profile-page" v-loading="loading">
    <el-button @click="$router.back()" size="small" plain class="back-btn">
      <el-icon><ArrowLeft /></el-icon>返回
    </el-button>

    <!-- 主页背景图 -->
    <div v-if="displayBackground" class="profile-bg-wrapper">
      <img
        :src="displayBackground"
        class="profile-bg-scroll-img"
        alt="主页背景"
        @click="previewBackground"
      />
      <div class="profile-bg-hint">
        <el-icon><ZoomIn /></el-icon>
        <span>滚动或点击查看完整背景图</span>
      </div>
    </div>

    <el-card v-if="profile" class="header-card" :class="{ 'has-bg': displayBackground }">
      <div class="header-banner">
        <div class="avatar-area">
          <el-avatar :size="100" :src="profile.user.avatar" class="big-avatar">
            {{ profile.user.name?.charAt(0) }}
          </el-avatar>
          <span v-if="profile.status" class="avatar-emoji">{{ profile.status.emoji }}</span>
        </div>
        <div class="info-area">
          <div class="name-line">
            <h2 class="name">{{ profile.user.name }}</h2>
            <el-tag :type="roleTagType" effect="dark" round>{{ roleText }}</el-tag>
          </div>
          <p class="username">@{{ profile.user.username }}</p>
          <p class="signature" v-if="profile.user.signature">"{{ profile.user.signature }}"</p>
          <p class="signature placeholder" v-else>这位同学还没有写个性签名</p>
          <div class="tag-line">
            <el-tag v-if="profile.user.class_name" type="info" size="small">
              <el-icon><User /></el-icon>{{ profile.user.class_name }}
            </el-tag>
            <el-tag v-if="profile.user.college" type="primary" size="small">
              <el-icon><School /></el-icon>{{ profile.user.college }}
            </el-tag>
            <el-tag v-if="profile.user.major" type="success" size="small">
              <el-icon><Reading /></el-icon>{{ profile.user.major }}
            </el-tag>
          </div>
        </div>
        <div class="action-area" v-if="profile.relation !== 'self'">
          <el-button
            v-if="profile.relation === 'none'"
            type="primary"
            @click="onAddFriend"
            :loading="adding"
          >
            <el-icon><Plus /></el-icon>加好友
          </el-button>
          <el-button v-else-if="profile.relation === 'pending_out'" disabled>
            申请已发送
          </el-button>
          <el-button
            v-else-if="profile.relation === 'pending_in'"
            type="success"
            @click="onAcceptIncoming"
            :loading="adding"
          >
            同意对方申请
          </el-button>
          <template v-else-if="profile.relation === 'friends'">
            <el-button type="primary" @click="onSendMessage">
              <el-icon><ChatLineRound /></el-icon>发消息
            </el-button>
            <el-button type="danger" plain @click="onDeleteFriend">删除好友</el-button>
          </template>
        </div>
      </div>
    </el-card>

    <!-- 24小时状态 -->
    <el-card v-if="profile && profile.status" class="status-card" shadow="never">
      <div class="status-row">
        <div class="status-emoji">{{ profile.status.emoji }}</div>
        <div class="status-body">
          <div class="status-text">
            {{ profile.status.text || '想说点什么...' }}
          </div>
          <div class="status-meta">
            <el-icon><Clock /></el-icon>
            <span>设置于 {{ formatStatusTime(profile.status.created_at) }} · {{ remainingText }}</span>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 精选照片 -->
    <el-card v-if="profile && displayFeaturedPhotos.length" class="photos-card">
      <template #header>
        <div class="card-title-line">
          <span class="card-title">精选照片</span>
        </div>
      </template>
      <div class="photo-gallery">
        <div
          v-for="(url, idx) in displayFeaturedPhotos"
          :key="idx"
          class="gallery-item"
          @click="previewPhoto(url)"
        >
          <el-image :src="url" fit="cover" class="gallery-img" lazy />
        </div>
      </div>
    </el-card>

    <!-- 综测分数(学生) -->
    <el-card v-if="profile && profile.user.role === 'student'" class="score-card">
      <template #header>
        <div class="card-title-line">
          <span class="card-title">综测分数</span>
          <el-tag v-if="profile.score?.is_excellent" type="success" effect="dark">优秀学生</el-tag>
          <span class="semester" v-if="profile.score?.semester">学期: {{ profile.score.semester }}</span>
        </div>
      </template>
      <el-empty v-if="!profile.score" description="暂无综测记录" />
      <div v-else class="score-board">
        <div class="total-row">
          <div class="total-num">{{ profile.score.total_score }}</div>
          <div class="total-label">综合总分</div>
        </div>
        <el-divider />
        <el-row :gutter="20">
          <el-col :span="4" :offset="2">
            <div class="score-cell academic">
              <div class="cell-num">{{ profile.score.academic_score }}</div>
              <div class="cell-label">智育分</div>
              <div class="cell-percent">60%</div>
            </div>
          </el-col>
          <el-col :span="4">
            <div class="score-cell moral">
              <div class="cell-num">{{ profile.score.moral_score }}</div>
              <div class="cell-label">德育分</div>
              <div class="cell-percent">16%</div>
            </div>
          </el-col>
          <el-col :span="4">
            <div class="score-cell sports">
              <div class="cell-num">{{ profile.score.sports_score }}</div>
              <div class="cell-label">体育分</div>
              <div class="cell-percent">8%</div>
            </div>
          </el-col>
          <el-col :span="4">
            <div class="score-cell arts">
              <div class="cell-num">{{ profile.score.arts_score }}</div>
              <div class="cell-label">美育分</div>
              <div class="cell-percent">8%</div>
            </div>
          </el-col>
          <el-col :span="4">
            <div class="score-cell labor">
              <div class="cell-num">{{ profile.score.labor_score }}</div>
              <div class="cell-label">劳育分</div>
              <div class="cell-percent">8%</div>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { useUserStore } from '@/stores/user'
import {
  getUserProfile,
  sendFriendRequest,
  getReceivedFriendRequests,
  respondFriendRequest,
  deleteFriendship
} from '@/api/social'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const profile = ref(null)
const loading = ref(false)
const adding = ref(false)
const now = ref(Date.now())
let nowTimer = null

const roleText = computed(() => {
  const m = { admin: '管理员', teacher: '教师', student: '学生' }
  return m[profile.value?.user?.role] || profile.value?.user?.role
})
const roleTagType = computed(() => {
  const m = { admin: 'danger', teacher: 'warning', student: 'primary' }
  return m[profile.value?.user?.role] || 'info'
})

const DEFAULT_BG = '/uploads/defaults/default-bg.jpg'

const displayBackground = computed(() => {
  return profile.value?.user?.background_image || DEFAULT_BG
})

const featuredPhotos = computed(() => {
  if (!profile.value?.user?.featured_photos) return []
  const fp = profile.value.user.featured_photos
  if (Array.isArray(fp)) return fp
  try {
    const parsed = JSON.parse(fp)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
})

const displayFeaturedPhotos = computed(() => {
  const photos = featuredPhotos.value
  return photos.length > 0 ? photos : [DEFAULT_BG]
})

const previewPhoto = (url) => {
  window.open(url, '_blank')
}

const previewBackground = () => {
  // el-image 会自动处理 preview-src-list 的点击预览
}

const formatStatusTime = (ts) => {
  if (!ts) return ''
  return dayjs(ts).format('MM月DD日 HH:mm')
}

const remainingText = computed(() => {
  const expires = profile.value?.status?.expires_at
  if (!expires) return ''
  const ms = new Date(expires).getTime() - now.value
  if (ms <= 0) return '已过期'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n) => String(n).padStart(2, '0')
  return `还剩 ${pad(h)}:${pad(m)}:${pad(s)}`
})

const loadProfile = async () => {
  const id = Number(route.params.id)
  if (!id) return
  loading.value = true
  try {
    const res = await getUserProfile(id)
    profile.value = res.data
  } finally {
    loading.value = false
  }
}

const onAddFriend = async () => {
  adding.value = true
  try {
    await sendFriendRequest(profile.value.user.id)
    ElMessage.success('申请已发送')
    await loadProfile()
  } finally {
    adding.value = false
  }
}

const onAcceptIncoming = async () => {
  adding.value = true
  try {
    // 找到对方发来的待处理申请
    const list = await getReceivedFriendRequests()
    const target = (list.data || []).find(r => r.from_user_id === profile.value.user.id)
    if (!target) {
      ElMessage.warning('未找到该申请,可能已被处理')
      await loadProfile()
      return
    }
    await respondFriendRequest(target.id, 1)
    ElMessage.success('已添加为好友')
    await loadProfile()
  } finally {
    adding.value = false
  }
}

const onDeleteFriend = async () => {
  await ElMessageBox.confirm(`确定删除好友 ${profile.value.user.name}？`, '提示', { type: 'warning' })
  await deleteFriendship(profile.value.user.id)
  ElMessage.success('已删除')
  await loadProfile()
}

const onSendMessage = () => {
  const role = userStore.userInfo?.role || 'student'
  router.push({ path: `/${role}/chat`, query: { type: 'user', id: profile.value.user.id } })
}

watch(() => route.params.id, loadProfile)
onMounted(() => {
  loadProfile()
  nowTimer = setInterval(() => { now.value = Date.now() }, 1000)
})
onBeforeUnmount(() => {
  if (nowTimer) clearInterval(nowTimer)
})
</script>

<style scoped lang="scss">
.user-profile-page {
  max-width: 1100px;
  margin: 0 auto;
  padding-bottom: 24px;
  min-height: 100vh;

  .back-btn {
    margin-bottom: 12px;
  }

  .profile-bg-wrapper {
    width: 100%;
    height: 400px;
    border-radius: 12px;
    margin-bottom: -100px;
    position: relative;
    z-index: 0;
    overflow-y: auto;
    overflow-x: hidden;
    cursor: pointer;
    scrollbar-width: none;
    -ms-overflow-style: none;
    &::-webkit-scrollbar {
      display: none;
    }
    &:hover .profile-bg-hint {
      opacity: 1;
    }
  }
  .profile-bg-scroll-img {
    width: 100%;
    height: auto;
    display: block;
    transition: transform 0.3s ease;
    &:hover {
      transform: scale(1.01);
    }
  }
  .profile-bg-hint {
    position: sticky;
    bottom: 16px;
    left: 100%;
    float: right;
    margin-right: 16px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: rgba(0, 0, 0, 0.5);
    color: #fff;
    border-radius: 20px;
    font-size: 13px;
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
    backdrop-filter: blur(4px);
    z-index: 2;
  }

  .header-card {
    margin-bottom: 16px;
    position: relative;
    z-index: 1;
    overflow: hidden;
    &.has-bg {
      margin-top: 0;
      .header-banner {
        padding-top: 28px;
      }
    }
    .header-banner {
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 8px 4px;

      .avatar-area {
        position: relative;
        .big-avatar {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          font-size: 36px;
          font-weight: bold;
        }
        .avatar-emoji {
          position: absolute;
          right: -4px;
          bottom: -4px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          line-height: 1;
        }
      }

      .info-area {
        flex: 1;
        .name-line {
          display: flex;
          align-items: center;
          gap: 10px;
          .name {
            margin: 0;
            font-size: 22px;
            font-weight: 600;
            color: #303133;
          }
        }
        .username {
          margin: 4px 0 8px;
          color: #909399;
          font-size: 13px;
        }
        .signature {
          margin: 6px 0 12px;
          font-size: 14px;
          color: #667eea;
          font-style: italic;
          &.placeholder {
            color: #c0c4cc;
            font-style: normal;
          }
        }
        .tag-line {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          .el-tag {
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }
        }
      }

      .action-area {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
    }
  }

  .status-card {
    margin-bottom: 16px;
    background: linear-gradient(135deg, #fff8f0 0%, #fef0f6 100%);
    border: 1px solid #fde7d6;
    .status-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 4px 8px;
      .status-emoji {
        font-size: 44px;
        line-height: 1;
        flex-shrink: 0;
      }
      .status-body {
        flex: 1;
        .status-text {
          font-size: 16px;
          color: #303133;
          font-weight: 500;
          margin-bottom: 6px;
          word-break: break-all;
        }
        .status-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #909399;
        }
      }
    }
  }

  .photos-card {
    margin-bottom: 16px;
    .card-title-line {
      display: flex;
      align-items: center;
      gap: 10px;
      .card-title {
        font-weight: 600;
        font-size: 16px;
      }
    }
    .photo-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
      .gallery-item {
        aspect-ratio: 1;
        border-radius: 10px;
        overflow: hidden;
        cursor: pointer;
        transition: transform 0.3s, box-shadow 0.3s;
        &:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        .gallery-img {
          width: 100%;
          height: 100%;
        }
      }
    }
  }

  .score-card {
    .card-title-line {
      display: flex;
      align-items: center;
      gap: 10px;
      .card-title {
        font-weight: 600;
        font-size: 16px;
      }
      .semester {
        margin-left: auto;
        font-size: 12px;
        color: #909399;
      }
    }
    .score-board {
      .total-row {
        text-align: center;
        padding: 12px 0;
        .total-num {
          font-size: 48px;
          font-weight: bold;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .total-label {
          font-size: 14px;
          color: #606266;
          margin-top: 4px;
        }
      }
      .score-cell {
        text-align: center;
        padding: 14px 8px;
        border-radius: 10px;
        color: #fff;
        .cell-num {
          font-size: 24px;
          font-weight: bold;
        }
        .cell-label {
          margin-top: 4px;
          font-size: 13px;
        }
        .cell-percent {
          margin-top: 2px;
          font-size: 11px;
          opacity: 0.85;
        }
        &.academic { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        &.moral    { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
        &.sports   { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
        &.arts     { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
        &.labor    { background: linear-gradient(135deg, #f6d365 0%, #fda085 100%); }
      }
    }
  }
}
</style>
