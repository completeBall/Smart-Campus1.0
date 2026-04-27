<template>
  <div class="assessment-page">
    <!-- 我的综测 -->
    <el-row :gutter="20" class="section">
      <el-col :span="24">
        <el-card>
          <template #header>
            <span class="card-title">我的综测分数</span>
            <el-tag v-if="myAssessment?.is_excellent" type="success" effect="dark" class="ml-2">优秀学生</el-tag>
          </template>
          <el-empty v-if="!myAssessment" description="暂无综测记录" />
          <div v-else class="score-board">
            <div class="score-main">
              <div class="total-score">
                <div class="score-value">{{ myAssessment.total_score }}</div>
                <div class="score-label">综合总分</div>
              </div>
            </div>
            <el-divider />
            <el-row :gutter="20" class="score-details">
              <el-col :span="4" :offset="2">
                <div class="score-item academic">
                  <div class="item-value">{{ myAssessment.academic_score }}</div>
                  <div class="item-label">智育分</div>
                  <div class="item-percent">占比 60%</div>
                </div>
              </el-col>
              <el-col :span="4">
                <div class="score-item moral">
                  <div class="item-value">{{ myAssessment.moral_score }}</div>
                  <div class="item-label">德育分</div>
                  <div class="item-percent">占比 16%</div>
                </div>
              </el-col>
              <el-col :span="4">
                <div class="score-item sports">
                  <div class="item-value">{{ myAssessment.sports_score }}</div>
                  <div class="item-label">体育分</div>
                  <div class="item-percent">占比 8%</div>
                </div>
              </el-col>
              <el-col :span="4">
                <div class="score-item arts">
                  <div class="item-value">{{ myAssessment.arts_score }}</div>
                  <div class="item-label">美育分</div>
                  <div class="item-percent">占比 8%</div>
                </div>
              </el-col>
              <el-col :span="4">
                <div class="score-item labor">
                  <div class="item-value">{{ myAssessment.labor_score }}</div>
                  <div class="item-label">劳育分</div>
                  <div class="item-percent">占比 8%</div>
                </div>
              </el-col>
            </el-row>
            <el-divider />
            <div class="score-formula">
              <el-alert type="info" :closable="false">
                <template #title>
                  <div class="formula-text">
                    综测总分 = 智育分 x 60% + 德育分 x 16% + 体育分 x 8% + 美育分 x 8% + 劳育分 x 8%
                  </div>
                </template>
              </el-alert>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 排行榜 -->
    <el-row :gutter="20" class="section">
      <el-col :span="16">
        <el-card>
          <template #header>
            <span class="card-title">综测排行榜</span>
            <el-select v-model="semester" size="small" style="width: 140px; margin-left: 12px;" @change="loadRank">
              <el-option label="2024-2025-2" value="2024-2025-2" />
              <el-option label="2024-2025-1" value="2024-2025-1" />
            </el-select>
          </template>
          <el-table :data="rankList" border stripe v-loading="loading">
            <el-table-column type="index" label="排名" width="70" align="center">
              <template #default="{ $index }">
                <div class="rank-cell">
                  <el-avatar v-if="$index === 0" :size="28" style="background: #f7ba2a; color: #fff; font-size: 14px;">1</el-avatar>
                  <el-avatar v-else-if="$index === 1" :size="28" style="background: #c0c4cc; color: #fff; font-size: 14px;">2</el-avatar>
                  <el-avatar v-else-if="$index === 2" :size="28" style="background: #d48c3e; color: #fff; font-size: 14px;">3</el-avatar>
                  <span v-else class="rank-num">{{ $index + 1 }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="姓名" width="100" />
            <el-table-column prop="class_name" label="班级" width="120" />
            <el-table-column prop="total_score" label="综测总分" width="100" sortable align="center">
              <template #default="{ row }">
                <span class="total-highlight">{{ row.total_score }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="academic_score" label="智育" width="80" align="center" />
            <el-table-column prop="moral_score" label="德育" width="80" align="center" />
            <el-table-column prop="sports_score" label="体育" width="80" align="center" />
            <el-table-column prop="arts_score" label="美育" width="80" align="center" />
            <el-table-column prop="labor_score" label="劳育" width="80" align="center" />
            <el-table-column label="标签" width="100" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.is_excellent" type="success" size="small" effect="dark">优秀</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <span class="card-title">优秀学生榜</span>
          </template>
          <el-empty v-if="excellentList.length === 0" description="暂无优秀学生" />
          <div v-else class="excellent-list">
            <div v-for="(item, index) in excellentList" :key="item.id" class="excellent-item">
              <div class="excellent-rank">{{ index + 1 }}</div>
              <el-avatar :size="40" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff;">
                {{ item.name?.charAt(0) }}
              </el-avatar>
              <div class="excellent-info">
                <div class="excellent-name">{{ item.name }}</div>
                <div class="excellent-class">{{ item.class_name }}</div>
              </div>
              <div class="excellent-score">{{ item.total_score }}分</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 加分明细 -->
    <el-row :gutter="20" class="section">
      <el-col :span="24">
        <el-card>
          <template #header>
            <span class="card-title">加分明细</span>
            <el-radio-group v-model="scoreFilter" size="small" style="margin-left: 16px;">
              <el-radio-button label="">全部</el-radio-button>
              <el-radio-button label="0">待审核</el-radio-button>
              <el-radio-button label="1">已通过</el-radio-button>
              <el-radio-button label="2">已拒绝</el-radio-button>
            </el-radio-group>
          </template>
          <el-empty v-if="filteredScoreRecords.length === 0" description="暂无加分记录" />
          <el-table v-else :data="filteredScoreRecords" border stripe>
            <el-table-column label="活动名称" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.activity_title || (row.source_type === 'system' ? '每日背单词' : '系统活动') }}
              </template>
            </el-table-column>
            <el-table-column label="加分类型" width="110" align="center">
              <template #default="{ row }">
                <el-tag :type="scoreTypeTagMap[row.score_type]" size="small" effect="plain">
                  {{ scoreTypeMap[row.score_type] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="加分分值" width="110" align="center">
              <template #default="{ row }">
                <span class="score-plus">+{{ row.score_value }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="120" align="center">
              <template #default="{ row }">
                <el-tag :type="recordStatusMap[row.status]?.type" size="small" effect="dark">
                  {{ recordStatusMap[row.status]?.label }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="submitter_name" label="提交者" width="100" />
            <el-table-column prop="reviewer_name" label="审核教师" width="100">
              <template #default="{ row }">{{ row.reviewer_name || '-' }}</template>
            </el-table-column>
            <el-table-column label="提交时间" width="160">
              <template #default="{ row }">{{ formatDate(row.submitted_at) }}</template>
            </el-table-column>
            <el-table-column label="审核时间" width="160">
              <template #default="{ row }">{{ formatDate(row.reviewed_at) }}</template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip>
              <template #default="{ row }">{{ row.remark || '-' }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getMyAssessment, getAssessmentRank, getMyScoreRecords } from '@/api/student'

const myAssessment = ref(null)
const rankList = ref([])
const excellentList = ref([])
const semester = ref('2024-2025-2')
const loading = ref(false)

const scoreRecords = ref([])
const scoreFilter = ref('')

const scoreTypeMap = {
  academic: '智育分',
  moral: '德育分',
  sports: '体育分',
  arts: '美育分',
  labor: '劳育分'
}

const scoreTypeTagMap = {
  academic: 'primary',
  moral: 'success',
  sports: 'warning',
  arts: 'danger',
  labor: 'info'
}

const recordStatusMap = {
  0: { label: '待教师审核', type: 'warning' },
  1: { label: '已通过', type: 'success' },
  2: { label: '已拒绝', type: 'danger' }
}

const filteredScoreRecords = computed(() => {
  if (scoreFilter.value === '') return scoreRecords.value
  const s = +scoreFilter.value
  return scoreRecords.value.filter(r => r.status === s)
})

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const loadData = async () => {
  const { data } = await getMyAssessment()
  myAssessment.value = data
}

const loadRank = async () => {
  loading.value = true
  try {
    const { data } = await getAssessmentRank({ semester: semester.value })
    rankList.value = data.list || []
    excellentList.value = data.excellent || []
  } finally {
    loading.value = false
  }
}

const loadScoreRecords = async () => {
  try {
    const { data } = await getMyScoreRecords()
    scoreRecords.value = data || []
  } catch (e) {}
}

loadData()
loadRank()
loadScoreRecords()
</script>

<style scoped lang="scss">
.assessment-page {
  .section {
    margin-bottom: 20px;
  }

  .card-title {
    font-weight: 600;
    font-size: 16px;
  }

  .score-board {
    .score-main {
      display: flex;
      justify-content: center;
      padding: 20px 0;

      .total-score {
        text-align: center;
        .score-value {
          font-size: 56px;
          font-weight: bold;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .score-label {
          font-size: 16px;
          color: #666;
          margin-top: 8px;
        }
      }
    }

    .score-details {
      .score-item {
        text-align: center;
        padding: 16px 8px;
        border-radius: 12px;
        transition: transform 0.2s;
        &:hover {
          transform: translateY(-4px);
        }

        .item-value {
          font-size: 28px;
          font-weight: bold;
        }
        .item-label {
          font-size: 14px;
          margin-top: 4px;
          color: #333;
        }
        .item-percent {
          font-size: 12px;
          color: #999;
          margin-top: 4px;
        }

        &.academic { background: #e6f7ff; color: #1890ff; }
        &.moral { background: #f6ffed; color: #52c41a; }
        &.sports { background: #fff7e6; color: #fa8c16; }
        &.arts { background: #f9f0ff; color: #722ed1; }
        &.labor { background: #fff2e8; color: #eb2f96; }
      }
    }

    .score-formula {
      .formula-text {
        font-size: 14px;
        font-weight: 500;
      }
    }
  }

  .rank-cell {
    display: flex;
    justify-content: center;
    align-items: center;
    .rank-num {
      font-size: 14px;
      color: #666;
      font-weight: 500;
    }
  }

  .total-highlight {
    font-weight: bold;
    color: #667eea;
    font-size: 15px;
  }

  .score-plus {
    color: #f56c6c;
    font-weight: bold;
  }

  .excellent-list {
    .excellent-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-bottom: 1px solid #f0f0f0;
      &:last-child { border-bottom: none; }

      .excellent-rank {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #f0f0f0;
        color: #666;
        font-size: 12px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .excellent-info {
        flex: 1;
        .excellent-name {
          font-weight: 500;
          color: #333;
        }
        .excellent-class {
          font-size: 12px;
          color: #999;
        }
      }

      .excellent-score {
        font-weight: bold;
        color: #667eea;
        font-size: 16px;
      }
    }
  }
}
</style>
