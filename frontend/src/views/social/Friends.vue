<template>
  <div class="friends-page">
    <el-tabs v-model="activeTab" class="friends-tabs">
      <!-- 我的好友 -->
      <el-tab-pane label="我的好友" name="friends">
        <el-card>
          <template #header>
            <div class="card-header">
              <span class="card-title">查找好友</span>
              <el-input
                v-model="searchKeyword"
                placeholder="输入对方账号或姓名"
                clearable
                style="width: 280px"
                @keyup.enter="onSearch"
                @clear="searchResults = []"
              >
                <template #append>
                  <el-button @click="onSearch" :loading="searching">
                    <el-icon><Search /></el-icon>搜索
                  </el-button>
                </template>
              </el-input>
            </div>
          </template>
          <div v-if="searchResults.length" class="search-results">
            <el-divider content-position="left">搜索结果</el-divider>
            <el-row :gutter="12">
              <el-col :xs="24" :sm="12" :md="8" v-for="u in searchResults" :key="u.id">
                <el-card class="user-card" shadow="hover">
                  <div class="user-row">
                    <el-avatar :size="48" :src="u.avatar">{{ u.name?.charAt(0) }}</el-avatar>
                    <div class="user-info">
                      <div class="name-line">
                        <span class="name">{{ u.name }}</span>
                        <el-tag :type="roleTag(u.role)" size="small" effect="plain">{{ roleLabel(u.role) }}</el-tag>
                      </div>
                      <div class="username">@{{ u.username }}</div>
                      <div class="signature" v-if="u.signature">{{ u.signature }}</div>
                    </div>
                  </div>
                  <div class="user-actions">
                    <el-button size="small" @click="goProfile(u.id)">主页</el-button>
                    <el-button size="small" type="primary" @click="onAdd(u.id)">加好友</el-button>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>
          <el-divider content-position="left">已添加好友 ({{ friends.length }})</el-divider>
          <el-empty v-if="friends.length === 0" description="暂无好友,试试搜索添加吧" />
          <el-row v-else :gutter="12">
            <el-col :xs="24" :sm="12" :md="8" v-for="f in friends" :key="f.id">
              <el-card class="user-card" shadow="hover">
                <div class="user-row" @click="goProfile(f.id)" style="cursor: pointer">
                  <el-avatar :size="48" :src="f.avatar">{{ f.name?.charAt(0) }}</el-avatar>
                  <div class="user-info">
                    <div class="name-line">
                      <span class="name">{{ f.name }}</span>
                      <el-tag :type="roleTag(f.role)" size="small" effect="plain">{{ roleLabel(f.role) }}</el-tag>
                    </div>
                    <div class="username">@{{ f.username }}</div>
                    <div class="last-msg" v-if="f.last_message">{{ f.last_message }}</div>
                  </div>
                </div>
                <div class="user-actions">
                  <el-button size="small" type="primary" @click="goChat('user', f.id)">
                    <el-icon><ChatLineRound /></el-icon>发消息
                  </el-button>
                  <el-button size="small" type="danger" plain @click="onRemove(f)">删除</el-button>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </el-card>
      </el-tab-pane>

      <!-- 好友申请 -->
      <el-tab-pane name="requests">
        <template #label>
          <span>好友申请<el-badge v-if="requests.length" :value="requests.length" class="badge" /></span>
        </template>
        <el-card>
          <el-empty v-if="requests.length === 0" description="暂无待处理的申请" />
          <div v-else>
            <div v-for="r in requests" :key="r.id" class="request-row">
              <el-avatar :size="48" :src="r.avatar">{{ r.name?.charAt(0) }}</el-avatar>
              <div class="request-info">
                <div class="name-line">
                  <span class="name">{{ r.name }}</span>
                  <el-tag :type="roleTag(r.role)" size="small" effect="plain">{{ roleLabel(r.role) }}</el-tag>
                </div>
                <div class="username">@{{ r.username }}</div>
                <div class="signature" v-if="r.signature">"{{ r.signature }}"</div>
                <div class="time">{{ formatTime(r.created_at) }}</div>
              </div>
              <div class="request-actions">
                <el-button size="small" @click="goProfile(r.from_user_id)">查看主页</el-button>
                <el-button type="success" size="small" @click="onRespond(r.id, 1)">同意</el-button>
                <el-button type="danger" size="small" plain @click="onRespond(r.id, 2)">拒绝</el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 群聊 -->
      <el-tab-pane label="群聊" name="groups">
        <el-card>
          <template #header>
            <div class="card-header">
              <span class="card-title">我的群聊 ({{ groups.length }})</span>
              <el-button type="primary" @click="onCreateGroup" :disabled="friends.length === 0">
                <el-icon><Plus /></el-icon>创建群聊
              </el-button>
            </div>
          </template>
          <el-empty v-if="groups.length === 0" description="还没有群聊,创建一个吧" />
          <el-row v-else :gutter="12">
            <el-col :xs="24" :sm="12" :md="8" v-for="g in groups" :key="g.id">
              <el-card class="group-card" shadow="hover" @click="goChat('group', g.id)">
                <div class="group-row">
                  <div class="group-avatar">
                    <el-icon size="32"><ChatRound /></el-icon>
                  </div>
                  <div class="group-info">
                    <div class="name">{{ g.name }}</div>
                    <div class="meta">{{ g.member_count }} 位成员</div>
                    <div class="last-msg" v-if="g.last_message">{{ g.last_message }}</div>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 创建群聊对话框 -->
    <el-dialog v-model="groupDialogVisible" title="创建群聊" width="480px">
      <el-form :model="groupForm" label-width="80px">
        <el-form-item label="群名称">
          <el-input v-model="groupForm.name" placeholder="请输入群名称" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="选择成员">
          <el-select
            v-model="groupForm.memberIds"
            multiple
            filterable
            placeholder="从好友列表中选择"
            style="width: 100%"
          >
            <el-option v-for="f in friends" :key="f.id" :label="`${f.name} (@${f.username})`" :value="f.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="groupDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCreateGroup" :loading="creating">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import {
  getFriends,
  searchUsers,
  sendFriendRequest,
  getReceivedFriendRequests,
  respondFriendRequest,
  deleteFriendship,
  getMyGroups,
  createGroup
} from '@/api/social'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref('friends')
const friends = ref([])
const requests = ref([])
const groups = ref([])
const searchKeyword = ref('')
const searchResults = ref([])
const searching = ref(false)
const groupDialogVisible = ref(false)
const groupForm = ref({ name: '', memberIds: [] })
const creating = ref(false)

const role = userStore.userInfo?.role || 'student'

const roleLabel = (r) => ({ admin: '管理员', teacher: '教师', student: '学生' })[r] || r
const roleTag = (r) => ({ admin: 'danger', teacher: 'warning', student: 'primary' })[r] || 'info'
const formatTime = (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : ''

const loadAll = async () => {
  const [{ data: f }, { data: r }, { data: g }] = await Promise.all([
    getFriends(),
    getReceivedFriendRequests(),
    getMyGroups()
  ])
  friends.value = f || []
  requests.value = r || []
  groups.value = g || []
}

const onSearch = async () => {
  if (!searchKeyword.value.trim()) {
    searchResults.value = []
    return
  }
  searching.value = true
  try {
    const { data } = await searchUsers(searchKeyword.value.trim())
    searchResults.value = data || []
    if (searchResults.value.length === 0) {
      ElMessage.info('未找到匹配用户')
    }
  } finally {
    searching.value = false
  }
}

const onAdd = async (id) => {
  try {
    const res = await sendFriendRequest(id)
    ElMessage.success(res.message || '申请已发送')
    if (res.data?.auto_accepted) {
      await loadAll()
    }
  } catch (e) {
    // intercepted
  }
}

const onRespond = async (id, status) => {
  await respondFriendRequest(id, status)
  ElMessage.success(status === 1 ? '已同意' : '已拒绝')
  await loadAll()
}

const onRemove = async (f) => {
  await ElMessageBox.confirm(`确定删除好友 ${f.name}？`, '提示', { type: 'warning' })
  await deleteFriendship(f.id)
  ElMessage.success('已删除')
  await loadAll()
}

const onCreateGroup = () => {
  groupForm.value = { name: '', memberIds: [] }
  groupDialogVisible.value = true
}

const submitCreateGroup = async () => {
  if (!groupForm.value.name.trim()) {
    ElMessage.warning('请填写群名称')
    return
  }
  if (groupForm.value.memberIds.length === 0) {
    ElMessage.warning('请至少选择一位好友')
    return
  }
  creating.value = true
  try {
    await createGroup(groupForm.value.name.trim(), groupForm.value.memberIds)
    ElMessage.success('群聊创建成功')
    groupDialogVisible.value = false
    await loadAll()
    activeTab.value = 'groups'
  } finally {
    creating.value = false
  }
}

const goProfile = (id) => router.push(`/${role}/u/${id}`)
const goChat = (type, id) => router.push({ path: `/${role}/chat`, query: { type, id } })

onMounted(loadAll)
</script>

<style scoped lang="scss">
.friends-page {
  .friends-tabs {
    :deep(.el-tabs__item) {
      font-size: 15px;
    }
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .card-title { font-weight: 600; font-size: 16px; }
  }
  .badge {
    margin-left: 6px;
  }
  .search-results {
    margin-bottom: 12px;
  }
  .user-card {
    margin-bottom: 12px;
    .user-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .user-info {
      flex: 1;
      min-width: 0;
      .name-line {
        display: flex;
        align-items: center;
        gap: 6px;
        .name { font-weight: 600; font-size: 15px; color: #303133; }
      }
      .username {
        font-size: 12px;
        color: #909399;
        margin-top: 2px;
      }
      .signature {
        font-size: 12px;
        color: #667eea;
        font-style: italic;
        margin-top: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .last-msg {
        font-size: 12px;
        color: #606266;
        margin-top: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    .user-actions {
      margin-top: 10px;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  }
  .request-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;
    &:last-child { border-bottom: none; }
    .request-info {
      flex: 1;
      .name-line { display: flex; align-items: center; gap: 6px; }
      .name { font-weight: 600; }
      .username { color: #909399; font-size: 12px; margin-top: 2px; }
      .signature { color: #667eea; font-size: 12px; font-style: italic; margin-top: 4px; }
      .time { color: #c0c4cc; font-size: 12px; margin-top: 4px; }
    }
    .request-actions {
      display: flex;
      gap: 8px;
    }
  }
  .group-card {
    cursor: pointer;
    margin-bottom: 12px;
    transition: transform 0.2s;
    &:hover { transform: translateY(-2px); }
    .group-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .group-avatar {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .group-info {
      flex: 1;
      min-width: 0;
      .name {
        font-weight: 600;
        font-size: 15px;
        color: #303133;
      }
      .meta {
        color: #909399;
        font-size: 12px;
        margin-top: 2px;
      }
      .last-msg {
        font-size: 12px;
        color: #606266;
        margin-top: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}
</style>
