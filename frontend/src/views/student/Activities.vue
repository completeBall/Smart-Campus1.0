<template>
  <div class="activities-page">
    <el-tabs v-model="activeTab" type="border-card" @tab-change="handleTabChange">
      <!-- 活动广场 -->
      <el-tab-pane label="活动广场" name="square">
        <!-- 常驻活动 -->
        <div class="section-title">
          <el-icon size="18"><Star /></el-icon>
          <span>常驻活动</span>
        </div>
        <el-row :gutter="16" class="permanent-activities">
          <el-col :span="8">
            <el-card class="permanent-card word-card" shadow="hover" @click="goDailyWords">
              <div class="permanent-content">
                <div class="permanent-icon">
                  <el-icon size="32" color="#fff"><Reading /></el-icon>
                </div>
                <div class="permanent-info">
                  <h4>每日背单词</h4>
                  <p>50个四级单词，最高正确率达标+0.5智育分</p>
                  <div class="permanent-meta">
                    <el-tag size="small" type="warning">今日剩余 {{ wordRemaining }}/3 次</el-tag>
                  </div>
                </div>
                <el-button type="primary" round size="small">去挑战</el-button>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card class="permanent-card mine-card" shadow="hover" @click="goMinesweeper">
              <div class="permanent-content">
                <div class="permanent-icon">
                  <el-icon size="32" color="#fff"><Grid /></el-icon>
                </div>
                <div class="permanent-info">
                  <h4>扫雷挑战</h4>
                  <p>经典扫雷游戏，体验休闲乐趣</p>
                  <div class="permanent-meta">
                    <el-tag size="small" type="info">今日剩余 {{ mineRemaining }}/5 次</el-tag>
                  </div>
                </div>
                <el-button type="primary" round size="small">去挑战</el-button>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card class="permanent-card sudoku-card" shadow="hover" @click="goSudoku">
              <div class="permanent-content">
                <div class="permanent-icon">
                  <el-icon size="32" color="#fff"><Grid /></el-icon>
                </div>
                <div class="permanent-info">
                  <h4>数独挑战</h4>
                  <p>经典数独游戏，锻炼逻辑思维</p>
                  <div class="permanent-meta">
                    <el-tag size="small" type="info">今日剩余 {{ sudokuRemaining }}/5 次</el-tag>
                  </div>
                </div>
                <el-button type="primary" round size="small">去挑战</el-button>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card class="permanent-card chess-card" shadow="hover" @click="goChess">
              <div class="permanent-content">
                <div class="permanent-icon">
                  <el-icon size="32" color="#fff"><Trophy /></el-icon>
                </div>
                <div class="permanent-info">
                  <h4>中国象棋</h4>
                  <p>人机对战，可选难度，运筹帷幄</p>
                  <div class="permanent-meta">
                    <el-tag size="small" type="danger">今日剩余 {{ chessRemaining }}/5 次</el-tag>
                  </div>
                </div>
                <el-button type="primary" round size="small">去挑战</el-button>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card class="permanent-card gomoku-card" shadow="hover" @click="goGomoku">
              <div class="permanent-content">
                <div class="permanent-icon">
                  <el-icon size="32" color="#fff"><Connection /></el-icon>
                </div>
                <div class="permanent-info">
                  <h4>五子棋</h4>
                  <p>人机对战，可选难度，五子连珠</p>
                  <div class="permanent-meta">
                    <el-tag size="small" type="success">今日剩余 {{ gomokuRemaining }}/5 次</el-tag>
                  </div>
                </div>
                <el-button type="primary" round size="small">去挑战</el-button>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card class="permanent-card doudizhu-card" shadow="hover" @click="goDoudizhu">
              <div class="permanent-content">
                <div class="permanent-icon">
                  <span style="font-size: 28px">🃏</span>
                </div>
                <div class="permanent-info">
                  <h4>欢乐斗地主</h4>
                  <p>1v2 人机对战,3 倍底分,通关赢得乐趣</p>
                  <div class="permanent-meta">
                    <el-tag size="small" type="warning">今日剩余 {{ doudizhuRemaining }}/5 次</el-tag>
                  </div>
                </div>
                <el-button type="primary" round size="small">去挑战</el-button>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card class="permanent-card idiom-card" shadow="hover" @click="goIdiom">
              <div class="permanent-content">
                <div class="permanent-icon">
                  <span style="font-size: 28px">📚</span>
                </div>
                <div class="permanent-info">
                  <h4>成语接龙</h4>
                  <p>考验成语储备，接龙挑战无限关卡</p>
                  <div class="permanent-meta">
                    <el-tag size="small" type="info">今日剩余 {{ idiomRemaining }}/5 次</el-tag>
                  </div>
                </div>
                <el-button type="primary" round size="small">去挑战</el-button>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card class="permanent-card sokoban-card" shadow="hover" @click="goSokoban">
              <div class="permanent-content">
                <div class="permanent-icon">
                  <span style="font-size: 28px">📦</span>
                </div>
                <div class="permanent-info">
                  <h4>推箱子</h4>
                  <p>经典益智游戏，规划路线推箱子归位</p>
                  <div class="permanent-meta">
                    <el-tag size="small" type="success">今日剩余 {{ sokobanRemaining }}/5 次</el-tag>
                  </div>
                </div>
                <el-button type="primary" round size="small">去挑战</el-button>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card class="permanent-card snake-card" shadow="hover" @click="goSnake">
              <div class="permanent-content">
                <div class="permanent-icon">
                  <span style="font-size: 28px">🐍</span>
                </div>
                <div class="permanent-info">
                  <h4>贪吃蛇</h4>
                  <p>经典街机游戏，吃苹果变长，挑战最高分</p>
                  <div class="permanent-meta">
                    <el-tag size="small" type="success">今日剩余 {{ snakeRemaining }}/5 次</el-tag>
                  </div>
                </div>
                <el-button type="primary" round size="small">去挑战</el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 普通活动 -->
        <div class="section-title">
          <el-icon size="18"><Football /></el-icon>
          <span>校园活动</span>
        </div>
        <div class="filter-bar">
          <div class="filter-left">
            <el-input v-model="search.keyword" placeholder="搜索活动" clearable style="width: 200px;" @keyup.enter="loadActivities">
              <template #append>
                <el-button @click="loadActivities"><el-icon><Search /></el-icon></el-button>
              </template>
            </el-input>
            <el-select v-model="search.category" placeholder="活动类型" clearable style="width: 140px; margin-left: 12px;" @change="loadActivities">
              <el-option label="学术" value="academic" />
              <el-option label="体育" value="sports" />
              <el-option label="艺术" value="arts" />
              <el-option label="志愿" value="volunteer" />
              <el-option label="劳动" value="labor" />
              <el-option label="其他" value="other" />
            </el-select>
          </div>
          <el-button type="primary" @click="openCreateDialog">
            <el-icon><Plus /></el-icon>发起活动
          </el-button>
        </div>

        <el-empty v-if="activities.length === 0" description="暂无可报名的活动" />
        <el-row v-else :gutter="16" class="activity-grid">
          <el-col :span="8" v-for="item in activities" :key="item.id">
            <el-card class="activity-card" shadow="hover">
              <div class="activity-header">
                <h4 class="activity-title">{{ item.title }}</h4>
                <el-tag :type="categoryMap[item.category]?.type" size="small">{{ categoryMap[item.category]?.label }}</el-tag>
              </div>
              <p class="activity-desc">{{ item.description || '暂无描述' }}</p>
              <div class="activity-meta">
                <div class="meta-item">
                  <el-icon><Location /></el-icon>
                  <span>{{ item.location || '待定' }}</span>
                </div>
                <div class="meta-item">
                  <el-icon><Clock /></el-icon>
                  <span>{{ formatDate(item.start_time) }}</span>
                </div>
                <div class="meta-item">
                  <el-icon><User /></el-icon>
                  <span>{{ item.joined_count || 0 }}{{ item.max_participants > 0 ? ' / ' + item.max_participants : '' }} 人</span>
                </div>
              </div>
              <div class="activity-score">
                <el-tag effect="plain" type="warning" size="small">
                  +{{ item.score_value }} {{ scoreTypeMap[item.score_type] }}
                </el-tag>
              </div>
              <div class="activity-footer">
                <span class="organizer">组织者: {{ item.organizer_name }}</span>
                <el-button
                  type="primary"
                  size="small"
                  :disabled="item.my_status !== null"
                  @click="handleApply(item)"
                >
                  {{ item.my_status === 0 ? '待审核' : (item.my_status === 1 ? '已通过' : (item.my_status === 2 ? '已拒绝' : '立即报名')) }}
                </el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <el-pagination
          v-if="total > pageSize"
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          class="pagination"
          @current-change="loadActivities"
        />
      </el-tab-pane>

      <!-- 我的活动 -->
      <el-tab-pane label="我的活动" name="mine">
        <el-empty v-if="myActivities.length === 0" description="暂无参与活动" />
        <el-table v-else :data="myActivities" border stripe>
          <el-table-column prop="title" label="活动名称" min-width="150" />
          <el-table-column prop="category" label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="categoryMap[row.category]?.type" size="small">{{ categoryMap[row.category]?.label }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="location" label="地点" width="120" />
          <el-table-column prop="start_time" label="开始时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.start_time) }}
            </template>
          </el-table-column>
          <el-table-column prop="score_value" label="加分" width="100" align="center">
            <template #default="{ row }">
              <span class="score-highlight">+{{ row.score_value }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="审核状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="applyStatusMap[row.status]?.type" size="small">{{ applyStatusMap[row.status]?.label }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="applied_at" label="申请时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.applied_at) }}
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 我发起的 -->
      <el-tab-pane label="我发起的" name="organized">
        <el-empty v-if="organizedActivities.length === 0" description="暂无发起活动" />
        <el-table v-else :data="organizedActivities" border stripe>
          <el-table-column prop="title" label="活动名称" min-width="150" />
          <el-table-column prop="category" label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="categoryMap[row.category]?.type" size="small">{{ categoryMap[row.category]?.label }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="活动状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="activityStatusMap[row.status]?.type" size="small">{{ activityStatusMap[row.status]?.label }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="location" label="地点" width="120" />
          <el-table-column prop="start_time" label="开始时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.start_time) }}
            </template>
          </el-table-column>
          <el-table-column prop="joined_count" label="已报名" width="100" align="center">
            <template #default="{ row }">
              <span>{{ row.joined_count || 0 }}{{ row.max_participants > 0 ? ' / ' + row.max_participants : '' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="score_value" label="加分" width="100" align="center">
            <template #default="{ row }">
              <span class="score-highlight">+{{ row.score_value }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" align="center" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openParticipants(row)">审核报名</el-button>
              <el-button
                link
                type="success"
                :disabled="row.status !== 1"
                @click="openScoreSubmit(row)"
              >提交加分名单</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 排行榜 -->
      <el-tab-pane label="排行榜" name="leaderboard">
        <el-card>
          <template #header>
            <div class="leaderboard-header">
              <span class="card-title">游戏得分排行榜</span>
              <span class="my-score" v-if="myRankData">
                我的排名: <strong>{{ myRankData.rank || '-' }}</strong> |
                累计得分: <strong>{{ myRankData.totalScore }}</strong> |
                总场次: <strong>{{ myRankData.totalPlays }}</strong>
              </span>
            </div>
          </template>
          <el-empty v-if="leaderboard.length === 0" description="暂无游戏记录" />
          <el-table v-else :data="leaderboard" border stripe>
            <el-table-column label="排名" width="80" align="center">
              <template #default="{ row }">
                <el-avatar v-if="row.rank_num <= 3" :size="28" :style="{ background: rankColor(row.rank_num) }" style="color: #fff; font-weight: bold;">
                  {{ row.rank_num }}
                </el-avatar>
                <span v-else>{{ row.rank_num }}</span>
              </template>
            </el-table-column>
            <el-table-column label="玩家" min-width="150">
              <template #default="{ row }">
                <div class="player-cell">
                  <el-avatar :size="32" :src="row.avatar">{{ row.name?.charAt(0) }}</el-avatar>
                  <span>{{ row.name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="total_score" label="累计得分" width="120" align="center">
              <template #default="{ row }">
                <span class="score-highlight">{{ row.total_score }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="total_plays" label="总场次" width="100" align="center" />
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 发起活动对话框 -->
    <el-dialog v-model="createVisible" title="发起活动" width="560px">
      <el-form :model="createForm" :rules="createRules" ref="createRef" label-width="100px">
        <el-form-item label="活动名称" prop="title">
          <el-input v-model="createForm.title" placeholder="请输入活动名称" />
        </el-form-item>
        <el-form-item label="活动描述" prop="description">
          <el-input v-model="createForm.description" type="textarea" :rows="3" placeholder="请输入活动描述" />
        </el-form-item>
        <el-form-item label="活动类型" prop="category">
          <el-select v-model="createForm.category" placeholder="请选择活动类型" style="width: 100%">
            <el-option label="学术" value="academic" />
            <el-option label="体育" value="sports" />
            <el-option label="艺术" value="arts" />
            <el-option label="志愿" value="volunteer" />
            <el-option label="劳动" value="labor" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="加分类型" prop="score_type">
          <el-select v-model="createForm.score_type" placeholder="请选择加分类型" style="width: 100%">
            <el-option label="智育分" value="academic" />
            <el-option label="德育分" value="moral" />
            <el-option label="体育分" value="sports" />
            <el-option label="美育分" value="arts" />
            <el-option label="劳育分" value="labor" />
          </el-select>
        </el-form-item>
        <el-form-item label="加分分值" prop="score_value">
          <el-input-number v-model="createForm.score_value" :min="0" :max="20" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="人数限制" prop="max_participants">
          <el-input-number v-model="createForm.max_participants" :min="0" :max="500" :precision="0" style="width: 100%" />
          <span class="form-tip">0 表示不限人数</span>
        </el-form-item>
        <el-form-item label="活动地点" prop="location">
          <el-input v-model="createForm.location" placeholder="请输入活动地点" />
        </el-form-item>
        <el-form-item label="开始时间" prop="start_time">
          <el-date-picker v-model="createForm.start_time" type="datetime" placeholder="选择开始时间" style="width: 100%" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="结束时间" prop="end_time">
          <el-date-picker v-model="createForm.end_time" type="datetime" placeholder="选择结束时间" style="width: 100%" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCreate">确认</el-button>
      </template>
    </el-dialog>

    <!-- 参与者审核对话框 -->
    <el-dialog v-model="participantsVisible" title="审核报名" width="700px">
      <el-empty v-if="participants.length === 0" description="暂无人报名" />
      <el-table v-else :data="participants" border stripe>
        <el-table-column prop="student_name" label="姓名" width="120" />
        <el-table-column prop="class_name" label="班级" width="120" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="applyStatusMap[row.status]?.type" size="small">{{ applyStatusMap[row.status]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="applied_at" label="申请时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.applied_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 0" link type="success" @click="reviewParticipant(row, 1)">通过</el-button>
            <el-button v-if="row.status === 0" link type="danger" @click="reviewParticipant(row, 2)">拒绝</el-button>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 提交加分名单对话框 -->
    <el-dialog v-model="scoreSubmitVisible" :title="`提交加分名单 - ${currentScoreActivity?.title || ''}`" width="760px">
      <div class="score-submit-tip">
        <el-alert type="info" :closable="false">
          <template #title>
            勾选已通过报名的学生提交加分名单，提交后由教师审核通过才会加分到综测。
            本活动加分：<strong>+{{ currentScoreActivity?.score_value }} {{ scoreTypeMap[currentScoreActivity?.score_type] }}</strong>
          </template>
        </el-alert>
      </div>
      <el-empty v-if="scoreCandidates.length === 0" description="暂无可提交的已通过报名学生" />
      <el-table
        v-else
        ref="scoreTableRef"
        :data="scoreCandidates"
        border
        stripe
        @selection-change="handleScoreSelectionChange"
      >
        <el-table-column type="selection" width="50" :selectable="isSelectable" />
        <el-table-column prop="student_name" label="姓名" width="120" />
        <el-table-column prop="class_name" label="班级" width="140" />
        <el-table-column label="加分状态" width="160" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.score_status === undefined" type="info" size="small">未提交</el-tag>
            <el-tag v-else :type="scoreStatusMap[row.score_status]?.type" size="small">
              {{ scoreStatusMap[row.score_status]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审核教师" width="120">
          <template #default="{ row }">{{ row.reviewer_name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="approved_at" label="报名通过时间">
          <template #default="{ row }">{{ formatDate(row.approved_at) }}</template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="scoreSubmitVisible = false">取消</el-button>
        <el-button type="primary" :disabled="scoreSelected.length === 0" @click="submitScoreSubmission">
          提交（{{ scoreSelected.length }}人）
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getActivities, applyActivity, getMyActivities,
  createActivity, getOrganizedActivities, getOrganizedParticipants, reviewOrganizedParticipant,
  getActivityScoreRecords, submitScoreList,
  getTodayWordRecord, getTodayGames, getGameLeaderboard, getMyGameRank
} from '@/api/student'

const router = useRouter()
const activeTab = ref('square')
const activities = ref([])
const myActivities = ref([])
const organizedActivities = ref([])
const page = ref(1)
const pageSize = ref(9)
const total = ref(0)
const search = reactive({ keyword: '', category: '' })

const wordRemaining = ref(3)
const mineRemaining = ref(5)
const sudokuRemaining = ref(5)
const chessRemaining = ref(5)
const gomokuRemaining = ref(5)
const doudizhuRemaining = ref(5)
const idiomRemaining = ref(5)
const sokobanRemaining = ref(5)
const snakeRemaining = ref(5)

const leaderboard = ref([])
const myRankData = ref(null)

const categoryMap = {
  academic: { label: '学术', type: 'primary' },
  sports: { label: '体育', type: 'success' },
  arts: { label: '艺术', type: 'warning' },
  volunteer: { label: '志愿', type: 'danger' },
  labor: { label: '劳动', type: 'info' },
  other: { label: '其他', type: '' }
}

const scoreTypeMap = {
  academic: '智育分',
  moral: '德育分',
  sports: '体育分',
  arts: '美育分',
  labor: '劳育分'
}

const applyStatusMap = {
  0: { label: '待审核', type: 'warning' },
  1: { label: '已通过', type: 'success' },
  2: { label: '已拒绝', type: 'danger' }
}

const scoreStatusMap = {
  0: { label: '待教师审核', type: 'warning' },
  1: { label: '已通过', type: 'success' },
  2: { label: '已拒绝', type: 'danger' }
}

const activityStatusMap = {
  0: { label: '待审批', type: 'info' },
  1: { label: '已通过', type: 'success' },
  2: { label: '已拒绝', type: 'danger' },
  3: { label: '进行中', type: 'primary' },
  4: { label: '已结束', type: '' }
}

const rankColor = (rank) => {
  return rank === 1 ? '#f7ba2a' : rank === 2 ? '#c0c4cc' : '#d4a574'
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const loadActivities = async () => {
  try {
    const { data } = await getActivities({
      keyword: search.keyword,
      category: search.category,
      page: page.value,
      pageSize: pageSize.value
    })
    activities.value = data.list || []
    total.value = data.total || 0
  } catch (e) {}
}

const loadMyActivities = async () => {
  try {
    const { data } = await getMyActivities()
    myActivities.value = data || []
  } catch (e) {}
}

const loadOrganizedActivities = async () => {
  try {
    const { data } = await getOrganizedActivities()
    organizedActivities.value = data || []
  } catch (e) {}
}

const loadTodayStatus = async () => {
  try {
    const { data: wordData } = await getTodayWordRecord()
    wordRemaining.value = Math.max(0, 3 - (wordData?.length || 0))
  } catch (e) {}
  try {
    const { data: gameData } = await getTodayGames()
    mineRemaining.value = Math.max(0, 5 - (gameData?.minesweeper || 0))
    sudokuRemaining.value = Math.max(0, 5 - (gameData?.sudoku || 0))
    chessRemaining.value = Math.max(0, 5 - (gameData?.chess || 0))
    gomokuRemaining.value = Math.max(0, 5 - (gameData?.gomoku || 0))
    doudizhuRemaining.value = Math.max(0, 5 - (gameData?.doudizhu || 0))
    idiomRemaining.value = Math.max(0, 5 - (gameData?.idiom || 0))
    sokobanRemaining.value = Math.max(0, 5 - (gameData?.sokoban || 0))
    snakeRemaining.value = Math.max(0, 5 - (gameData?.snake || 0))
  } catch (e) {}
}

const loadLeaderboard = async () => {
  try {
    const { data } = await getGameLeaderboard()
    leaderboard.value = data || []
    const { data: myData } = await getMyGameRank()
    myRankData.value = myData
  } catch (e) {}
}

const handleTabChange = (tab) => {
  if (tab === 'leaderboard') {
    loadLeaderboard()
  }
}

const handleApply = async (item) => {
  try {
    await ElMessageBox.confirm(`确认报名参加活动「${item.title}」吗？`, '提示', { type: 'info' })
    await applyActivity(item.id)
    ElMessage.success('报名成功，等待审核')
    loadActivities()
    loadMyActivities()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e.response?.data?.message || '报名失败')
    }
  }
}

// 发起活动
const createVisible = ref(false)
const createRef = ref()
const createForm = reactive({
  title: '',
  description: '',
  category: '',
  score_type: 'moral',
  score_value: 1,
  max_participants: 0,
  location: '',
  start_time: '',
  end_time: ''
})

const createRules = {
  title: [{ required: true, message: '请输入活动名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择活动类型', trigger: 'change' }],
  score_type: [{ required: true, message: '请选择加分类型', trigger: 'change' }],
  score_value: [{ required: true, message: '请输入加分分值', trigger: 'blur' }],
  start_time: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  end_time: [{ required: true, message: '请选择结束时间', trigger: 'change' }]
}

const openCreateDialog = () => {
  Object.assign(createForm, {
    title: '',
    description: '',
    category: '',
    score_type: 'moral',
    score_value: 1,
    max_participants: 0,
    location: '',
    start_time: '',
    end_time: ''
  })
  createVisible.value = true
}

const submitCreate = async () => {
  await createRef.value.validate()
  await createActivity(createForm)
  ElMessage.success('活动创建成功，等待老师审批')
  createVisible.value = false
  loadOrganizedActivities()
}

// 审核参与者
const participantsVisible = ref(false)
const participants = ref([])
const currentActivityId = ref(null)

const openParticipants = async (row) => {
  currentActivityId.value = row.id
  try {
    const { data } = await getOrganizedParticipants(row.id)
    participants.value = data || []
    participantsVisible.value = true
  } catch (e) {}
}

const reviewParticipant = async (row, status) => {
  try {
    const msg = status === 1 ? '通过' : '拒绝'
    await ElMessageBox.confirm(`确认${msg} ${row.student_name} 的报名申请吗？`, '提示', { type: 'warning' })
    await reviewOrganizedParticipant(currentActivityId.value, row.id, { status })
    ElMessage.success(`已${msg}`)
    const { data } = await getOrganizedParticipants(currentActivityId.value)
    participants.value = data || []
    loadOrganizedActivities()
    loadActivities()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e.response?.data?.message || '操作失败')
    }
  }
}

// 提交加分名单
const scoreSubmitVisible = ref(false)
const currentScoreActivity = ref(null)
const scoreCandidates = ref([])
const scoreSelected = ref([])
const scoreTableRef = ref()

const isSelectable = (row) => row.score_status === undefined

const handleScoreSelectionChange = (rows) => {
  scoreSelected.value = rows
}

const openScoreSubmit = async (row) => {
  if (row.status !== 1) {
    ElMessage.warning('活动尚未通过审批，无法提交加分名单')
    return
  }
  currentScoreActivity.value = row
  scoreSelected.value = []
  try {
    const [{ data: parts }, { data: records }] = await Promise.all([
      getOrganizedParticipants(row.id),
      getActivityScoreRecords(row.id)
    ])
    const recordMap = {}
    ;(records || []).forEach(r => { recordMap[r.student_id] = r })
    // 只展示已通过报名的学生，并标记其加分状态
    scoreCandidates.value = (parts || [])
      .filter(p => p.status === 1)
      .map(p => {
        const rec = recordMap[p.student_id]
        return {
          ...p,
          score_status: rec ? rec.status : undefined,
          reviewer_name: rec ? rec.reviewer_name : null
        }
      })
    scoreSubmitVisible.value = true
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载失败')
  }
}

const submitScoreSubmission = async () => {
  if (scoreSelected.value.length === 0) {
    ElMessage.warning('请至少勾选一名学生')
    return
  }
  try {
    const ids = scoreSelected.value.map(r => r.id)
    const { message } = await submitScoreList(currentScoreActivity.value.id, { participant_ids: ids })
    ElMessage.success(message || '提交成功')
    scoreSubmitVisible.value = false
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '提交失败')
  }
}

const goDailyWords = () => router.push('/student/daily-words')
const goMinesweeper = () => router.push('/student/minesweeper')
const goSudoku = () => router.push('/student/sudoku')
const goChess = () => router.push('/student/chess')
const goGomoku = () => router.push('/student/gomoku')
const goDoudizhu = () => router.push('/student/doudizhu')
const goIdiom = () => router.push('/student/idiom')
const goSokoban = () => router.push('/student/sokoban')
const goSnake = () => router.push('/student/snake')

onMounted(() => {
  loadActivities()
  loadMyActivities()
  loadOrganizedActivities()
  loadTodayStatus()
})
</script>

<style scoped lang="scss">
.activities-page {
  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 12px;
    margin-top: 4px;
  }

  .permanent-activities {
    margin-bottom: 24px;
    .permanent-card {
      cursor: pointer;
      transition: transform 0.2s;
      &:hover {
        transform: translateY(-4px);
      }
      .permanent-content {
        display: flex;
        align-items: center;
        gap: 14px;
        .permanent-icon {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .permanent-info {
          flex: 1;
          h4 {
            margin: 0 0 4px 0;
            font-size: 15px;
            color: #333;
          }
          p {
            margin: 0 0 6px 0;
            font-size: 12px;
            color: #888;
          }
        }
      }
    }
    .word-card .permanent-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .mine-card .permanent-icon {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
    .sudoku-card .permanent-icon {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }
    .chess-card .permanent-icon {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
    }
    .gomoku-card .permanent-icon {
      background: linear-gradient(135deg, #30cfd0 0%, #330867 100%);
    }
    .doudizhu-card .permanent-icon {
      background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
    }
    .idiom-card .permanent-icon {
      background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
    }
    .sokoban-card .permanent-icon {
      background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
    }
    .snake-card .permanent-icon {
      background: linear-gradient(135deg, #42e695 0%, #3bb2b8 100%);
    }
  }

  .filter-bar {
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .activity-grid {
    .activity-card {
      margin-bottom: 16px;
      border-radius: 12px;
      transition: transform 0.2s;
      &:hover {
        transform: translateY(-4px);
      }

      .activity-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;
        .activity-title {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
          flex: 1;
          padding-right: 8px;
        }
      }

      .activity-desc {
        color: #666;
        font-size: 13px;
        line-height: 1.6;
        margin-bottom: 12px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        min-height: 40px;
      }

      .activity-meta {
        margin-bottom: 10px;
        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #999;
          margin-bottom: 4px;
          .el-icon {
            font-size: 14px;
          }
        }
      }

      .activity-score {
        margin-bottom: 12px;
      }

      .activity-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid #f0f0f0;
        padding-top: 10px;
        .organizer {
          font-size: 12px;
          color: #999;
        }
      }
    }
  }

  .pagination {
    margin-top: 16px;
    justify-content: center;
  }

  .score-highlight {
    color: #f56c6c;
    font-weight: bold;
  }

  .form-tip {
    color: #999;
    font-size: 12px;
    margin-left: 8px;
  }

  .leaderboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .card-title {
      font-weight: 600;
    }
    .my-score {
      font-size: 14px;
      color: #666;
      strong {
        color: #f56c6c;
      }
    }
  }

  .player-cell {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .score-submit-tip {
    margin-bottom: 12px;
  }
}
</style>
