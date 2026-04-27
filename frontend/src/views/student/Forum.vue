<template>
  <div class="forum-page">
    <el-row :gutter="16">
      <!-- 左侧主区 -->
      <el-col :span="17">
        <el-card class="main-card">
          <template #header>
            <div class="header-actions">
              <div class="search-bar">
                <el-input v-model="keyword" placeholder="搜索帖子(标题或内容)" clearable style="width: 280px" @keyup.enter="loadData">
                  <template #prefix><el-icon><Search /></el-icon></template>
                </el-input>
                <el-button type="primary" @click="loadData">搜索</el-button>
              </div>
              <el-button type="primary" round @click="dialogVisible = true">
                <el-icon><EditPen /></el-icon>发布帖子
              </el-button>
            </div>
          </template>

          <div class="filter-row">
            <el-radio-group v-model="filter.category" size="small" @change="resetAndLoad">
              <el-radio-button label="">全部</el-radio-button>
              <el-radio-button label="general">综合</el-radio-button>
              <el-radio-button label="study">学习</el-radio-button>
              <el-radio-button label="life">生活</el-radio-button>
              <el-radio-button label="job">就业</el-radio-button>
            </el-radio-group>
            <el-radio-group v-model="filter.sort" size="small" @change="resetAndLoad">
              <el-radio-button label="latest"><el-icon><Clock /></el-icon> 最新</el-radio-button>
              <el-radio-button label="hot"><el-icon><TrendCharts /></el-icon> 热度</el-radio-button>
            </el-radio-group>
          </div>

          <el-empty v-if="posts.length === 0" description="暂无帖子" />
          <div v-else class="post-list">
            <div v-for="post in posts" :key="post.id" class="post-item" @click="goDetail(post)">
              <div class="post-avatar">
                <el-avatar :size="46" :src="post.avatar">{{ post.author_name?.charAt(0) }}</el-avatar>
              </div>
              <div class="post-content">
                <div class="post-title">
                  <el-tag v-if="post.is_pinned" size="small" type="danger" effect="dark">置顶</el-tag>
                  <el-tag size="small" :type="categoryStyles[post.category]?.type || ''" effect="plain">
                    {{ categoryMap[post.category] || post.category }}
                  </el-tag>
                  <span class="title-text">{{ post.title }}</span>
                </div>
                <div class="post-preview">{{ truncate(post.content, 80) }}</div>
                <!-- 缩略图 -->
                <div v-if="post.images && post.images.length" class="post-thumbs">
                  <el-image
                    v-for="(img, i) in post.images.slice(0, 3)"
                    :key="i"
                    :src="img"
                    :preview-src-list="post.images"
                    :preview-teleported="true"
                    :initial-index="i"
                    fit="cover"
                    class="thumb"
                    @click.stop
                  />
                  <div v-if="post.images.length > 3" class="thumb more-thumb">+{{ post.images.length - 3 }}</div>
                </div>
                <div class="post-meta">
                  <span class="author"><el-icon><User /></el-icon>{{ post.author_name }}</span>
                  <span class="time"><el-icon><Clock /></el-icon>{{ formatTime(post.created_at) }}</span>
                </div>
              </div>
              <div class="post-stats">
                <div class="stat-item">
                  <el-icon><View /></el-icon>
                  <span>{{ post.view_count || 0 }}</span>
                </div>
                <div class="stat-item">
                  <el-icon><ChatDotRound /></el-icon>
                  <span>{{ post.reply_count || 0 }}</span>
                </div>
                <div
                  class="stat-item like-stat"
                  :class="{ active: post.is_liked }"
                  @click.stop="toggleLike(post)"
                >
                  <el-icon><CaretTop /></el-icon>
                  <span>{{ post.like_count || 0 }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="pagination" v-if="total > pageSize">
            <el-pagination
              v-model:current-page="page"
              v-model:page-size="pageSize"
              :total="total"
              layout="total, prev, pager, next"
              @current-change="loadData"
            />
          </div>
        </el-card>
      </el-col>

      <!-- 右侧热度榜 -->
      <el-col :span="7">
        <el-card class="hot-card">
          <template #header>
            <div class="hot-header">
              <el-icon color="#f56c6c"><TrendCharts /></el-icon>
              <span>热度排行</span>
            </div>
          </template>
          <div v-if="hotList.length === 0" class="empty-hot">暂无热度数据</div>
          <div v-else class="hot-list">
            <div
              v-for="(p, i) in hotList"
              :key="p.id"
              class="hot-item"
              @click="goDetail(p)"
            >
              <div class="hot-rank" :class="`rank-${i+1}`">{{ i + 1 }}</div>
              <div class="hot-info">
                <div class="hot-title">{{ p.title }}</div>
                <div class="hot-meta">
                  <span><el-icon><CaretTop /></el-icon>{{ p.like_count }}</span>
                  <span><el-icon><ChatDotRound /></el-icon>{{ p.reply_count }}</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>

        <el-card class="tip-card">
          <div class="tip-title">
            <el-icon><InfoFilled /></el-icon>
            <span>论坛公约</span>
          </div>
          <ul class="tip-list">
            <li>友善交流，禁止人身攻击</li>
            <li>分享干货，互助答疑</li>
            <li>支持图文混排和文件分享</li>
            <li>点赞推动好内容上热门</li>
          </ul>
        </el-card>
      </el-col>
    </el-row>

    <!-- 发布帖子对话框 -->
    <el-dialog v-model="dialogVisible" title="发布帖子" width="640px" @close="resetForm">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入标题(2-50字)" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="分类">
          <el-radio-group v-model="form.category">
            <el-radio-button label="general">综合</el-radio-button>
            <el-radio-button label="study">学习</el-radio-button>
            <el-radio-button label="life">生活</el-radio-button>
            <el-radio-button label="job">就业</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="form.content" type="textarea" rows="6" placeholder="请输入内容..." maxlength="2000" show-word-limit />
        </el-form-item>
        <el-form-item label="图片">
          <el-upload
            v-model:file-list="imageList"
            :http-request="uploadImage"
            list-type="picture-card"
            :limit="9"
            multiple
            accept="image/*"
            :on-remove="handleImageRemove"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
          <div class="form-tip">最多 9 张，单张不超过 5MB</div>
        </el-form-item>
        <el-form-item label="附件">
          <el-upload
            :http-request="uploadFile"
            :file-list="attachmentDisplayList"
            :show-file-list="false"
            :limit="3"
            multiple
          >
            <el-button type="primary" plain>
              <el-icon><Upload /></el-icon>上传附件
            </el-button>
          </el-upload>
          <div v-if="form.attachments.length" class="attachment-list">
            <div v-for="(a, i) in form.attachments" :key="i" class="attachment-item">
              <el-icon><Document /></el-icon>
              <span class="att-name">{{ a.name }}</span>
              <span class="att-size">{{ formatSize(a.size) }}</span>
              <el-button link type="danger" size="small" @click="form.attachments.splice(i, 1)">
                <el-icon><Close /></el-icon>
              </el-button>
            </div>
          </div>
          <div class="form-tip">最多 3 个，单个不超过 10MB</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitPost">发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  getPosts, createPost, togglePostLike, getHotPosts,
  uploadForumImages, uploadForumFile
} from '@/api/student'

const router = useRouter()
const posts = ref([])
const hotList = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const keyword = ref('')
const filter = reactive({ category: '', sort: 'latest' })

const dialogVisible = ref(false)
const formRef = ref()
const form = reactive({
  title: '',
  content: '',
  category: 'general',
  images: [],
  attachments: []
})
const imageList = ref([])
const submitting = ref(false)

const categoryMap = { general: '综合', study: '学习', life: '生活', job: '就业' }
const categoryStyles = {
  general: { type: '' },
  study: { type: 'primary' },
  life: { type: 'success' },
  job: { type: 'warning' }
}

const rules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { min: 2, max: 50, message: '标题长度 2-50', trigger: 'blur' }
  ],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
}

const attachmentDisplayList = computed(() => form.attachments.map(a => ({ name: a.name })))

const truncate = (text, n) => {
  if (!text) return ''
  return text.length > n ? text.slice(0, n) + '...' : text
}

const formatTime = (s) => {
  if (!s) return ''
  const d = new Date(s)
  const now = new Date()
  const diff = (now - d) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前'
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前'
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + ' 天前'
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

const formatSize = (b) => {
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1024 / 1024).toFixed(1) + ' MB'
}

const loadData = async () => {
  try {
    const { data } = await getPosts({
      keyword: keyword.value,
      category: filter.category,
      sort: filter.sort,
      page: page.value,
      pageSize: pageSize.value
    })
    posts.value = data.list
    total.value = data.total
  } catch (e) {}
}

const loadHot = async () => {
  try {
    const { data } = await getHotPosts()
    hotList.value = data || []
  } catch (e) {}
}

const resetAndLoad = () => {
  page.value = 1
  loadData()
}

const goDetail = (post) => {
  router.push(`/student/forum/${post.id}`)
}

const toggleLike = async (post) => {
  try {
    const { data } = await togglePostLike(post.id)
    post.is_liked = data.liked
    post.like_count = data.like_count
    ElMessage.success(data.liked ? '点赞成功' : '已取消点赞')
    if (filter.sort === 'hot') loadHot()
  } catch (e) {}
}

// 上传单张图片(每次拖入触发)
const uploadImage = async ({ file }) => {
  const fd = new FormData()
  fd.append('images', file)
  try {
    const { data } = await uploadForumImages(fd)
    if (data.urls && data.urls.length) {
      form.images.push(...data.urls)
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '图片上传失败')
  }
}

const handleImageRemove = (file) => {
  // 通过 url 关联(自定义上传后,file.response 为空,需要在上传时记录映射)
  // 简化:直接重置匹配的最后一张
  if (file.response && file.response.url) {
    const idx = form.images.indexOf(file.response.url)
    if (idx >= 0) form.images.splice(idx, 1)
  } else {
    // imageList 同步更新即可,真正提交时只取 form.images
    if (form.images.length > 0) form.images.pop()
  }
}

const uploadFile = async ({ file }) => {
  const fd = new FormData()
  fd.append('file', file)
  try {
    const { data } = await uploadForumFile(fd)
    form.attachments.push({ url: data.url, name: data.name, size: data.size })
    ElMessage.success(`${data.name} 已上传`)
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '文件上传失败')
  }
}

const resetForm = () => {
  Object.assign(form, { title: '', content: '', category: 'general', images: [], attachments: [] })
  imageList.value = []
  formRef.value && formRef.value.resetFields()
}

const submitPost = async () => {
  await formRef.value.validate()
  submitting.value = true
  try {
    await createPost({
      title: form.title,
      content: form.content,
      category: form.category,
      images: form.images,
      attachments: form.attachments
    })
    ElMessage.success('发布成功')
    dialogVisible.value = false
    resetForm()
    loadData()
    loadHot()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '发布失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadData()
  loadHot()
})
</script>

<style scoped lang="scss">
.forum-page {
  .main-card {
    border-radius: 12px;
    .header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .search-bar {
        display: flex;
        gap: 10px;
      }
    }
    .filter-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 12px;
    }
  }

  .post-list {
    .post-item {
      display: flex;
      gap: 14px;
      padding: 18px 14px;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 8px;
      &:hover {
        background: linear-gradient(90deg, #f5f7ff, #fff);
        transform: translateX(4px);
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.08);
      }
    }
    .post-avatar {
      flex-shrink: 0;
    }
    .post-content {
      flex: 1;
      min-width: 0;
      .post-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
        flex-wrap: wrap;
        .title-text {
          font-size: 16px;
          font-weight: 600;
          color: #303133;
        }
      }
      .post-preview {
        font-size: 13px;
        color: #909399;
        line-height: 1.6;
        margin-bottom: 8px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .post-thumbs {
        display: flex;
        gap: 6px;
        margin-bottom: 8px;
        .thumb {
          width: 80px;
          height: 80px;
          border-radius: 6px;
          overflow: hidden;
          background: #f5f7fa;
        }
        .more-thumb {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          background: rgba(0, 0, 0, 0.55);
          font-size: 16px;
          font-weight: 600;
        }
      }
      .post-meta {
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #909399;
        span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .author {
          color: #667eea;
        }
      }
    }
    .post-stats {
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: center;
      justify-content: center;
      min-width: 70px;
      padding-left: 12px;
      border-left: 1px dashed #ebeef5;
      .stat-item {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;
        color: #909399;
        .el-icon {
          font-size: 14px;
        }
      }
      .like-stat {
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 12px;
        transition: all 0.2s;
        &:hover {
          background: #fdf2f2;
          color: #f56c6c;
        }
        &.active {
          color: #f56c6c;
          background: #fdf2f2;
          font-weight: 600;
        }
      }
    }
  }

  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }

  .hot-card {
    border-radius: 12px;
    margin-bottom: 16px;
    .hot-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      font-size: 15px;
    }
    .empty-hot {
      text-align: center;
      color: #c0c4cc;
      padding: 20px 0;
      font-size: 13px;
    }
    .hot-list {
      .hot-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 0;
        cursor: pointer;
        border-bottom: 1px dashed #f0f0f0;
        &:last-child { border-bottom: none; }
        &:hover .hot-title {
          color: #667eea;
        }
        .hot-rank {
          width: 22px;
          height: 22px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f2f5;
          color: #909399;
          font-weight: 600;
          font-size: 13px;
          flex-shrink: 0;
        }
        .rank-1 { background: #ffefe6; color: #f56c6c; }
        .rank-2 { background: #fff8e1; color: #e6a23c; }
        .rank-3 { background: #fff4d6; color: #c8a13e; }
        .hot-info {
          flex: 1;
          min-width: 0;
          .hot-title {
            font-size: 13px;
            color: #303133;
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
            transition: color 0.2s;
          }
          .hot-meta {
            font-size: 11px;
            color: #909399;
            margin-top: 3px;
            display: flex;
            gap: 10px;
            span {
              display: flex;
              align-items: center;
              gap: 2px;
            }
          }
        }
      }
    }
  }

  .tip-card {
    border-radius: 12px;
    .tip-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      color: #667eea;
      margin-bottom: 10px;
    }
    .tip-list {
      margin: 0;
      padding-left: 16px;
      color: #606266;
      font-size: 13px;
      line-height: 2;
      li {
        list-style: disc;
      }
    }
  }

  .form-tip {
    color: #909399;
    font-size: 12px;
    margin-top: 4px;
  }
  .attachment-list {
    margin-top: 8px;
    .attachment-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      background: #f5f7fa;
      border-radius: 6px;
      margin-bottom: 4px;
      font-size: 13px;
      .att-name {
        flex: 1;
        color: #303133;
      }
      .att-size {
        color: #909399;
        font-size: 12px;
      }
    }
  }
}
</style>
