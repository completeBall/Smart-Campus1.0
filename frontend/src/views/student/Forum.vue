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
  /* ========== 主卡片 ========== */
  .main-card {
    border-radius: 20px;
    border: none;
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.04);
    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
    overflow: hidden;

    .header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;

      .search-bar {
        display: flex;
        gap: 10px;
        align-items: center;

        .el-input {
          :deep(.el-input__wrapper) {
            border-radius: 14px;
            box-shadow: 0 0 0 1px #e4e7ed inset;
            transition: all 0.3s ease;
            padding: 0 14px;
            &:focus-within {
              box-shadow: 0 0 0 1px #409eff inset, 0 0 0 4px rgba(64,158,255,0.08);
            }
          }
        }

        .el-button {
          border-radius: 12px;
          padding: 0 20px;
          height: 36px;
          background: linear-gradient(135deg, #409eff 0%, #1677ff 100%);
          border: none;
          box-shadow: 0 4px 12px rgba(64, 158, 255, 0.25);
          transition: all 0.3s ease;
          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 18px rgba(64, 158, 255, 0.35);
          }
        }
      }

      .el-button[round] {
        border-radius: 20px;
        padding: 10px 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        font-weight: 500;
        box-shadow: 0 4px 14px rgba(102, 126, 234, 0.3);
        transition: all 0.3s ease;
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
        }
      }
    }

    .filter-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin: 16px 0 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f0f0f0;

      :deep(.el-radio-button__inner) {
        border-radius: 10px !important;
        border-left: 1px solid #dcdfe6;
        padding: 6px 16px;
        font-size: 13px;
      }
    }
  }

  /* ========== 帖子列表 ========== */
  .post-list {
    .post-item {
      display: flex;
      gap: 14px;
      padding: 20px 16px;
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      margin-bottom: 10px;
      background: #fff;
      border: 1px solid transparent;
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px 0 0 16px;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      &:hover {
        border-color: #e8ecf4;
        box-shadow: 0 8px 32px rgba(102, 126, 234, 0.1);
        transform: translateY(-2px);

        &::before { opacity: 1; }
        .title-text { color: #409eff; }
      }

      &:nth-child(even) {
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fc 100%);
      }
    }

    .post-avatar {
      flex-shrink: 0;
      .el-avatar {
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        border: 2px solid #fff;
      }
    }

    .post-content {
      flex: 1;
      min-width: 0;
      padding-left: 4px;

      .post-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        flex-wrap: wrap;

        .title-text {
          font-size: 16px;
          font-weight: 600;
          color: #1a1a2e;
          transition: color 0.3s ease;
          letter-spacing: 0.2px;
        }

        .el-tag {
          border-radius: 8px;
          padding: 0 10px;
          height: 24px;
          font-weight: 500;
        }
      }

      .post-preview {
        font-size: 13px;
        color: #606266;
        line-height: 1.7;
        margin-bottom: 10px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .post-thumbs {
        display: flex;
        gap: 8px;
        margin-bottom: 10px;
        .thumb {
          width: 88px;
          height: 88px;
          border-radius: 10px;
          overflow: hidden;
          background: #f5f7fa;
          border: 1px solid #f0f0f0;
          transition: transform 0.3s ease;
          &:hover { transform: scale(1.03); }
        }
        .more-thumb {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          background: linear-gradient(135deg, rgba(0,0,0,0.5), rgba(0,0,0,0.7));
          font-size: 15px;
          font-weight: 600;
          backdrop-filter: blur(4px);
        }
      }

      .post-meta {
        display: flex;
        gap: 18px;
        font-size: 12px;
        color: #a8abb2;
        span {
          display: flex;
          align-items: center;
          gap: 4px;
          .el-icon { font-size: 13px; }
        }
        .author {
          color: #667eea;
          font-weight: 500;
          background: rgba(102, 126, 234, 0.06);
          padding: 2px 8px;
          border-radius: 10px;
        }
        .time {
          color: #c0c4cc;
        }
      }
    }

    .post-stats {
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: center;
      justify-content: center;
      min-width: 76px;
      padding-left: 14px;
      border-left: 1px dashed #e4e7ed;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 13px;
        color: #a8abb2;
        transition: color 0.2s;
        .el-icon { font-size: 14px; }
      }

      .like-stat {
        cursor: pointer;
        padding: 6px 12px;
        border-radius: 20px;
        transition: all 0.3s ease;
        font-weight: 500;

        &:hover {
          background: linear-gradient(135deg, #fdf2f2, #fff0f0);
          color: #f56c6c;
          transform: scale(1.05);
        }
        &.active {
          color: #fff;
          background: linear-gradient(135deg, #f56c6c 0%, #ff7875 100%);
          box-shadow: 0 4px 12px rgba(245, 108, 108, 0.25);
          .el-icon { color: #fff; }
          span { color: #fff; }
        }
      }
    }
  }

  .pagination {
    margin-top: 24px;
    display: flex;
    justify-content: flex-end;
  }

  /* ========== 热度排行 ========== */
  .hot-card {
    border-radius: 20px;
    border: none;
    margin-bottom: 20px;
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.04);
    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
    overflow: hidden;

    :deep(.el-card__header) {
      background: linear-gradient(135deg, #fff5f5 0%, #fff0f0 100%);
      border-bottom: 1px solid #ffe8e8;
      padding: 14px 20px;
    }

    .hot-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 15px;
      color: #f56c6c;
      .el-icon { font-size: 18px; }
    }

    .empty-hot {
      text-align: center;
      color: #c0c4cc;
      padding: 24px 0;
      font-size: 13px;
    }

    .hot-list {
      padding: 4px 0;
      .hot-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 4px;
        cursor: pointer;
        border-bottom: 1px solid #f5f7fa;
        transition: all 0.25s ease;
        &:last-child { border-bottom: none; }
        &:hover {
          background: #f8f9fc;
          border-radius: 10px;
          padding-left: 8px;
          padding-right: 8px;
          .hot-title { color: #409eff; }
        }

        .hot-rank {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
          flex-shrink: 0;
          background: #f0f2f5;
          color: #909399;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .rank-1 {
          background: linear-gradient(135deg, #ffd700, #ffaa00);
          color: #fff;
          box-shadow: 0 2px 8px rgba(255, 170, 0, 0.3);
        }
        .rank-2 {
          background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
          color: #fff;
          box-shadow: 0 2px 8px rgba(160, 160, 160, 0.3);
        }
        .rank-3 {
          background: linear-gradient(135deg, #cd7f32, #b87333);
          color: #fff;
          box-shadow: 0 2px 8px rgba(184, 115, 51, 0.3);
        }

        .hot-info {
          flex: 1;
          min-width: 0;
          .hot-title {
            font-size: 13px;
            color: #303133;
            line-height: 1.5;
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
            transition: color 0.2s;
            font-weight: 500;
          }
          .hot-meta {
            font-size: 11px;
            color: #c0c4cc;
            margin-top: 4px;
            display: flex;
            gap: 12px;
            span {
              display: flex;
              align-items: center;
              gap: 3px;
            }
          }
        }
      }
    }
  }

  /* ========== 论坛公约 ========== */
  .tip-card {
    border-radius: 20px;
    border: none;
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.04);
    background: linear-gradient(135deg, #f0f5ff 0%, #f5f0ff 100%);
    overflow: hidden;

    :deep(.el-card__body) {
      padding: 20px;
    }

    .tip-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 15px;
      color: #5b8ff9;
      margin-bottom: 14px;
      .el-icon { font-size: 18px; }
    }

    .tip-list {
      margin: 0;
      padding: 0;
      color: #606266;
      font-size: 13px;
      line-height: 1.8;
      li {
        list-style: none;
        padding: 6px 0 6px 24px;
        position: relative;
        transition: all 0.2s;
        &:hover {
          color: #409eff;
          padding-left: 28px;
        }
        &::before {
          content: '';
          position: absolute;
          left: 8px;
          top: 13px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea, #764ba2);
        }
      }
    }
  }

  .form-tip {
    color: #a8abb2;
    font-size: 12px;
    margin-top: 6px;
  }

  .attachment-list {
    margin-top: 8px;
    .attachment-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #f8f9fc;
      border-radius: 10px;
      margin-bottom: 6px;
      font-size: 13px;
      border: 1px solid #eef0f5;
      .att-name {
        flex: 1;
        color: #303133;
      }
      .att-size {
        color: #a8abb2;
        font-size: 12px;
      }
    }
  }
}
</style>
