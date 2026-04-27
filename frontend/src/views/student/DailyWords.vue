<template>
  <div class="daily-words-page">
    <el-page-header title="返回" @back="$router.back()">
      <template #content><span class="page-title">每日背单词挑战</span></template>
    </el-page-header>

    <!-- 顶部规则说明 -->
    <el-card class="rule-card">
      <div class="rule-content">
        <el-icon size="20" color="#667eea"><InfoFilled /></el-icon>
        <div class="rule-text">
          <p>
            <strong>活动规则：</strong>
            每天 <span class="highlight">3 次</span> 挑战机会，每次 50 个四级单词，
            以 <span class="highlight">正确率最高</span> 的那次为准，达到 <span class="highlight">80%</span> 以上且完成 50 题即可为综测智育分 <span class="highlight">+0.5</span>！
          </p>
        </div>
      </div>
    </el-card>

    <!-- 尝试记录汇总 -->
    <el-card v-if="attempts.length > 0" class="attempts-card">
      <template #header>
        <div class="attempts-header">
          <span>今日挑战记录（{{ attempts.length }}/3）</span>
          <el-tag v-if="hasScoreAdded" type="success" effect="dark">已获智育分 +0.5</el-tag>
          <el-tag v-else-if="remaining === 0" type="info">今日机会已用完</el-tag>
        </div>
      </template>
      <el-table :data="attempts" border size="small">
        <el-table-column label="第几次" width="80" align="center">
          <template #default="{ $index }">第{{ $index + 1 }}次</template>
        </el-table-column>
        <el-table-column prop="correct_count" label="答对" width="80" align="center" />
        <el-table-column prop="total_words" label="总题数" width="90" align="center" />
        <el-table-column prop="accuracy" label="正确率" width="90" align="center">
          <template #default="{ row }">{{ row.accuracy }}%</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.score_added" type="success" size="small">已加分</el-tag>
            <el-tag v-else-if="row.accuracy >= 80 && row.total_words >= 50" type="warning" size="small">达标未加分</el-tag>
            <el-tag v-else type="info" size="small">未达标</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="remaining > 0" class="retry-actions">
        <el-button type="primary" @click="startNewAttempt"><el-icon><RefreshRight /></el-icon> 再挑战一次（剩余 {{ remaining }} 次）</el-button>
      </div>
    </el-card>

    <!-- 单词学习界面 -->
    <template v-if="inProgress">
      <div class="progress-bar">
        <div class="progress-info">
          <span>进度 {{ currentIndex + 1 }} / {{ words.length }}</span>
          <span>已答对 {{ correctCount }}</span>
        </div>
        <el-progress :percentage="progressPercent" :color="progressColors" :stroke-width="8" />
      </div>

      <el-card class="word-card" v-if="currentWord">
        <div class="word-meaning">{{ currentWord.meaning }}</div>
        <div class="word-hint">请选择对应的英文单词</div>
        <div class="options-grid">
          <el-button
            v-for="opt in currentWord.options"
            :key="opt"
            size="large"
            :type="getOptionType(opt)"
            :disabled="answered"
            class="option-btn"
            @click="selectOption(opt)"
          >
            {{ opt }}
          </el-button>
        </div>
        <div v-if="answered" class="answer-feedback">
          <el-alert
            :title="isCorrect ? '回答正确！' : `回答错误，正确答案是：${currentWord.word}`"
            :type="isCorrect ? 'success' : 'error'"
            :closable="false"
            show-icon
          />
        </div>
      </el-card>

      <div class="action-bar">
        <el-button v-if="answered && currentIndex < words.length - 1" type="primary" size="large" @click="nextWord">
          下一题 <el-icon><ArrowRight /></el-icon>
        </el-button>
        <el-button v-if="answered && currentIndex === words.length - 1" type="success" size="large" @click="submitAll">
          提交测试
        </el-button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getDailyWords, submitDailyWords } from '@/api/student'

const router = useRouter()
const loading = ref(false)
const inProgress = ref(false)
const attempts = ref([])
const bestRecord = ref(null)
const hasScoreAdded = ref(false)
const remaining = ref(3)
const words = ref([])
const currentIndex = ref(0)
const answers = ref({})
const answered = ref(false)
const selectedOption = ref('')
const correctCount = ref(0)

const currentWord = computed(() => words.value[currentIndex.value] || null)
const progressPercent = computed(() => Math.round(((currentIndex.value + (answered.value ? 1 : 0)) / words.value.length) * 100))
const isCorrect = computed(() => selectedOption.value === currentWord.value?.word)

const progressColors = [
  { color: '#f56c6c', percentage: 20 },
  { color: '#e6a23c', percentage: 40 },
  { color: '#5cb87a', percentage: 60 },
  { color: '#1989fa', percentage: 80 },
  { color: '#6f7ad3', percentage: 100 }
]

const loadData = async () => {
  loading.value = true
  try {
    const { data } = await getDailyWords()
    attempts.value = data.attempts || []
    bestRecord.value = data.bestRecord
    hasScoreAdded.value = data.hasScoreAdded
    remaining.value = data.remaining
    if (data.remaining > 0 && !data.studied) {
      words.value = data.words || []
      inProgress.value = true
    }
  } finally {
    loading.value = false
  }
}

const startNewAttempt = () => {
  currentIndex.value = 0
  answers.value = {}
  answered.value = false
  selectedOption.value = ''
  correctCount.value = 0
  inProgress.value = true
  loadData()
}

const selectOption = (opt) => {
  if (answered.value) return
  selectedOption.value = opt
  answered.value = true
  answers.value[currentWord.value.id] = opt
  if (opt === currentWord.value.word) {
    correctCount.value++
  }
}

const getOptionType = (opt) => {
  if (!answered.value) return 'default'
  if (opt === currentWord.value.word) return 'success'
  if (opt === selectedOption.value && opt !== currentWord.value.word) return 'danger'
  return 'default'
}

const nextWord = () => {
  currentIndex.value++
  answered.value = false
  selectedOption.value = ''
}

const submitAll = async () => {
  try {
    const { data } = await submitDailyWords({ answers: answers.value })
    ElMessage.success(data.message)
    inProgress.value = false
    attempts.value.push({
      total_words: data.totalWords,
      correct_count: data.correctCount,
      accuracy: data.accuracy,
      score_added: data.scoreAdded ? 1 : 0
    })
    if (data.scoreAdded) hasScoreAdded.value = true
    remaining.value = Math.max(0, remaining.value - 1)
    // Update best record
    const best = attempts.value.reduce((b, r) => r.accuracy > b.accuracy ? r : b, attempts.value[0])
    bestRecord.value = best
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '提交失败')
  }
}

onMounted(loadData)
</script>

<style scoped lang="scss">
.daily-words-page {
  .page-title {
    font-size: 18px;
    font-weight: 600;
  }

  .rule-card {
    margin: 20px 0;
    .rule-content {
      display: flex;
      align-items: center;
      gap: 12px;
      .rule-text {
        flex: 1;
        p {
          margin: 0;
          color: #555;
          line-height: 1.6;
        }
        .highlight {
          color: #f56c6c;
          font-weight: bold;
        }
      }
    }
  }

  .attempts-card {
    margin-bottom: 20px;
    .attempts-header {
      display: flex;
      align-items: center;
      gap: 12px;
      span {
        font-weight: 600;
      }
    }
    .retry-actions {
      margin-top: 16px;
      text-align: center;
    }
  }

  .progress-bar {
    margin: 20px 0;
    .progress-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      color: #666;
      font-size: 14px;
    }
  }

  .word-card {
    margin-bottom: 20px;
    .word-meaning {
      font-size: 24px;
      font-weight: 600;
      color: #333;
      text-align: center;
      padding: 30px 0;
    }
    .word-hint {
      text-align: center;
      color: #999;
      font-size: 13px;
      margin-bottom: 20px;
    }
    .options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      .option-btn {
        height: 48px;
        font-size: 15px;
        justify-content: center;
      }
    }
    .answer-feedback {
      margin-top: 20px;
    }
  }

  .action-bar {
    text-align: center;
    margin-top: 20px;
  }
}
</style>
