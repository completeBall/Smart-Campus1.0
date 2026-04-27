<template>
  <div class="forum-detail">
    <el-button link @click="$router.back()" class="back-btn">
      <el-icon><ArrowLeft /></el-icon> 返回列表
    </el-button>

    <el-card v-if="post" class="post-card" shadow="hover">
      <div class="post-header">
        <el-avatar :size="50" :src="post.avatar">{{ post.author_name?.charAt(0) }}</el-avatar>
        <div class="post-info">
          <div class="author-name">{{ post.author_name }}</div>
          <div class="post-time">
            <el-icon><Clock /></el-icon>
            {{ formatFullTime(post.created_at) }}
          </div>
        </div>
        <el-tag :type="categoryStyles[post.category]?.type || ''" effect="plain">
          {{ categoryMap[post.category] || post.category }}
        </el-tag>
      </div>

      <h2 class="post-title">
        <el-tag v-if="post.is_pinned" size="small" type="danger" effect="dark">置顶</el-tag>
        {{ post.title }}
      </h2>

      <div class="post-body">{{ post.content }}</div>

      <!-- 图片 -->
      <div v-if="post.images && post.images.length" class="post-images">
        <el-image
          v-for="(img, i) in post.images"
          :key="i"
          :src="img"
          :preview-src-list="post.images"
          :preview-teleported="true"
          :initial-index="i"
          fit="cover"
          class="post-image"
        />
      </div>

      <!-- 附件 -->
      <div v-if="post.attachments && post.attachments.length" class="post-attachments">
        <div class="attach-title">
          <el-icon><Paperclip /></el-icon>
          <span>附件({{ post.attachments.length }})</span>
        </div>
        <div v-for="(a, i) in post.attachments" :key="i" class="attach-item">
          <el-icon class="file-icon"><Document /></el-icon>
          <span class="att-name">{{ a.name }}</span>
          <span class="att-size">{{ formatSize(a.size) }}</span>
          <el-button type="primary" size="small" link @click="downloadFile(a)">
            <el-icon><Download /></el-icon>下载
          </el-button>
        </div>
      </div>

      <div class="post-bottom">
        <div class="post-stats-row">
          <span><el-icon><View /></el-icon> {{ post.view_count }} 浏览</span>
          <span><el-icon><ChatDotRound /></el-icon> {{ replies.length }} 回复</span>
        </div>
        <el-button
          :type="post.is_liked ? 'danger' : 'default'"
          round
          @click="toggleLike"
        >
          <el-icon><CaretTop /></el-icon>
          {{ post.is_liked ? '已点赞' : '点赞' }} · {{ post.like_count || 0 }}
        </el-button>
      </div>
    </el-card>

    <el-card class="reply-card" shadow="hover">
      <template #header>
        <div class="card-title">
          <el-icon><ChatLineRound /></el-icon>
          <span>回复 ({{ replies.length }})</span>
        </div>
      </template>

      <div v-if="replies.length === 0" class="empty-text">
        <el-empty description="暂无回复，来抢沙发吧" :image-size="100" />
      </div>
      <div v-else class="reply-list">
        <div v-for="reply in replies" :key="reply.id" class="reply-item">
          <el-avatar :size="38" :src="reply.avatar">{{ reply.author_name?.charAt(0) }}</el-avatar>
          <div class="reply-content">
            <div class="reply-header">
              <span class="reply-author">{{ reply.author_name }}</span>
              <span class="reply-time">{{ formatFullTime(reply.created_at) }}</span>
            </div>
            <div v-if="reply.parent_id && reply.parent_author_name" class="reply-quote">
              <span class="quote-label">回复 @{{ reply.parent_author_name }}：</span>
            </div>
            <div class="reply-body">{{ reply.content }}</div>
            <div class="reply-actions">
              <el-button link type="primary" size="small" @click="startReplyTo(reply)">
                <el-icon><ChatDotRound /></el-icon> 回复
              </el-button>
            </div>

            <div v-if="activeReplyId === reply.id" class="inline-reply-form">
              <el-input
                v-model="inlineReplyContent"
                type="textarea"
                :rows="2"
                :placeholder="`回复 @${reply.author_name}...`"
              />
              <div class="inline-reply-actions">
                <el-button size="small" @click="cancelInlineReply">取消</el-button>
                <el-button size="small" type="primary" @click="submitInlineReply">确认回复</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="reply-form">
        <el-input v-model="replyContent" type="textarea" rows="3" placeholder="写下你的回复..." maxlength="500" show-word-limit />
        <el-button type="primary" round @click="submitReply">
          <el-icon><Promotion /></el-icon>
          回复
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getPostDetail, replyPost, togglePostLike } from '@/api/student'

const route = useRoute()
const post = ref(null)
const replies = ref([])
const replyContent = ref('')
const activeReplyId = ref(null)
const inlineReplyContent = ref('')
const categoryMap = { general: '综合', study: '学习', life: '生活', job: '就业' }
const categoryStyles = {
  general: { type: '' },
  study: { type: 'primary' },
  life: { type: 'success' },
  job: { type: 'warning' }
}

const formatFullTime = (s) => {
  if (!s) return ''
  return new Date(s).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}

const formatSize = (b) => {
  if (!b) return ''
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1024 / 1024).toFixed(1) + ' MB'
}

const loadData = async () => {
  try {
    const { data } = await getPostDetail(route.params.id)
    post.value = data.post
    replies.value = data.replies
  } catch (e) {}
}

const toggleLike = async () => {
  try {
    const { data } = await togglePostLike(post.value.id)
    post.value.is_liked = data.liked
    post.value.like_count = data.like_count
    ElMessage.success(data.liked ? '点赞成功' : '已取消点赞')
  } catch (e) {}
}

const downloadFile = (att) => {
  const a = document.createElement('a')
  a.href = att.url
  a.download = att.name
  a.target = '_blank'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

const submitReply = async () => {
  if (!replyContent.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  await replyPost(route.params.id, { content: replyContent.value })
  ElMessage.success('回复成功')
  replyContent.value = ''
  loadData()
}

const startReplyTo = (reply) => {
  activeReplyId.value = reply.id
  inlineReplyContent.value = ''
}

const cancelInlineReply = () => {
  activeReplyId.value = null
  inlineReplyContent.value = ''
}

const submitInlineReply = async () => {
  if (!inlineReplyContent.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  await replyPost(route.params.id, {
    content: inlineReplyContent.value,
    parent_id: activeReplyId.value
  })
  ElMessage.success('回复成功')
  activeReplyId.value = null
  inlineReplyContent.value = ''
  loadData()
}

onMounted(loadData)
</script>

<style scoped lang="scss">
.forum-detail {
  .back-btn {
    margin-bottom: 16px;
    color: #667eea;
  }
  .post-card {
    margin-bottom: 20px;
    border-radius: 12px;
    .post-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 14px;
      border-bottom: 1px solid #f0f0f0;
      .post-info {
        flex: 1;
        .author-name {
          font-weight: 600;
          color: #303133;
          font-size: 15px;
        }
        .post-time {
          font-size: 12px;
          color: #909399;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
      }
    }
    .post-title {
      font-size: 22px;
      color: #303133;
      margin: 0 0 18px 0;
      line-height: 1.4;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .post-body {
      color: #4a4a4a;
      line-height: 1.85;
      font-size: 15px;
      margin-bottom: 18px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .post-images {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 10px;
      margin-bottom: 18px;
      .post-image {
        width: 100%;
        height: 180px;
        border-radius: 8px;
        background: #f5f7fa;
      }
    }
    .post-attachments {
      margin-bottom: 18px;
      padding: 12px 14px;
      background: #f8f9fb;
      border-radius: 8px;
      .attach-title {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #606266;
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 8px;
      }
      .attach-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        background: #fff;
        border-radius: 6px;
        margin-top: 6px;
        font-size: 13px;
        .file-icon {
          color: #409eff;
          font-size: 18px;
        }
        .att-name {
          flex: 1;
          color: #303133;
          word-break: break-all;
        }
        .att-size {
          color: #909399;
          font-size: 12px;
        }
      }
    }
    .post-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 14px;
      border-top: 1px solid #f0f0f0;
      .post-stats-row {
        display: flex;
        gap: 18px;
        color: #909399;
        font-size: 13px;
        span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
      }
    }
  }
  .reply-card {
    border-radius: 12px;
    .card-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
    }
    .empty-text {
      padding: 20px 0;
    }
    .reply-list {
      margin-bottom: 20px;
      .reply-item {
        display: flex;
        gap: 12px;
        padding: 16px 0;
        border-bottom: 1px solid #f0f0f0;
        &:last-child { border-bottom: none; }
        .reply-content {
          flex: 1;
          .reply-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            .reply-author {
              font-weight: 600;
              color: #667eea;
              font-size: 14px;
            }
            .reply-time {
              font-size: 12px;
              color: #909399;
            }
          }
          .reply-quote {
            margin-bottom: 6px;
            padding: 6px 10px;
            background: #f5f7fa;
            border-radius: 6px;
            font-size: 13px;
            border-left: 3px solid #c0c4cc;
            .quote-label {
              color: #909399;
            }
          }
          .reply-body {
            color: #4a4a4a;
            line-height: 1.7;
            font-size: 14px;
            white-space: pre-wrap;
            word-break: break-word;
          }
          .reply-actions {
            margin-top: 8px;
          }
          .inline-reply-form {
            margin-top: 10px;
            padding: 12px;
            background: #f8f9fb;
            border-radius: 8px;
            .inline-reply-actions {
              margin-top: 8px;
              display: flex;
              justify-content: flex-end;
              gap: 8px;
            }
          }
        }
      }
    }
    .reply-form {
      display: flex;
      gap: 12px;
      align-items: flex-end;
      padding-top: 16px;
      border-top: 1px solid #f0f0f0;
      .el-textarea {
        flex: 1;
      }
    }
  }
}
</style>
