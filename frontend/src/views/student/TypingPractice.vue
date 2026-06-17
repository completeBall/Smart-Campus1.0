<template>
  <div class="typing-page">
    <el-page-header title="返回" @back="$router.back()">
      <template #content><span class="page-title">盲打训练营</span></template>
    </el-page-header>

    <el-card class="status-card">
      <div class="status-grid">
        <div class="status-item">
          <span>当前关卡</span>
          <strong>{{ currentLevel.id }} / {{ levels.length }}</strong>
        </div>
        <div class="status-item">
          <span>难度</span>
          <strong>{{ currentLevel.label }}</strong>
        </div>
        <div class="status-item">
          <span>打字速度</span>
          <strong>{{ wpm }} WPM</strong>
        </div>
        <div class="status-item">
          <span>准确率</span>
          <strong>{{ accuracy }}%</strong>
        </div>
        <div class="status-item">
          <span>评分</span>
          <strong>{{ score }}</strong>
        </div>
        <div class="status-item">
          <span>今日剩余</span>
          <strong>{{ remaining }}/5</strong>
        </div>
      </div>
    </el-card>

    <div class="main-grid">
      <el-card class="typing-card">
        <div class="level-head">
          <div>
            <h3>{{ currentLevel.title }}</h3>
            <p>{{ currentLevel.goal }}</p>
          </div>
          <el-tag effect="dark" type="primary">目标 {{ currentLevel.targetWpm }} WPM</el-tag>
        </div>

        <div class="passage" @click="focusInput">
          <span
            v-for="(char, index) in passageChars"
            :key="index"
            class="passage-char"
            :class="charClass(index, char)"
          >{{ displayChar(char) }}</span>
        </div>

        <el-input
          ref="inputRef"
          v-model="typedText"
          type="textarea"
          :rows="7"
          resize="none"
          :disabled="completed || remaining <= 0"
          placeholder="点击这里开始输入。训练时尽量不要看键盘，保持节奏和准确率。"
          @input="handleTyping"
          @keydown.tab.prevent
        />

        <div class="progress-line">
          <el-progress :percentage="progress" :stroke-width="10" :color="progressColor" />
          <span>{{ typedText.length }} / {{ currentLevel.text.length }}</span>
        </div>

        <div class="actions">
          <el-button @click="resetLevel">
            <el-icon><RefreshRight /></el-icon>
            重练本关
          </el-button>
          <el-button :disabled="levelIndex === 0 || started" @click="prevLevel">上一关</el-button>
          <el-button :disabled="levelIndex === levels.length - 1 || started" @click="nextLevel">下一关</el-button>
          <el-button type="primary" :disabled="completed || remaining <= 0" @click="focusInput">开始训练</el-button>
        </div>
      </el-card>

      <aside class="side-panel">
        <el-card class="result-card">
          <template #header>
            <span>本关表现</span>
          </template>
          <div class="metric-list">
            <div>
              <span>用时</span>
              <strong>{{ elapsedSeconds }} 秒</strong>
            </div>
            <div>
              <span>击键</span>
              <strong>{{ typedText.length }}</strong>
            </div>
            <div>
              <span>错误</span>
              <strong class="danger">{{ errorCount }}</strong>
            </div>
            <div>
              <span>目标完成</span>
              <strong>{{ wpm >= currentLevel.targetWpm ? '达标' : '未达标' }}</strong>
            </div>
          </div>
          <el-alert
            v-if="completed"
            class="finish-alert"
            :type="score >= 85 ? 'success' : score >= 60 ? 'warning' : 'info'"
            :closable="false"
            show-icon
            :title="finishTitle"
            :description="finishDesc"
          />
        </el-card>

        <el-card class="level-card">
          <template #header>
            <span>20 关训练</span>
          </template>
          <div class="level-list">
            <button
              v-for="item in levels"
              :key="item.id"
              type="button"
              :class="{ active: item.id === currentLevel.id, locked: started && item.id !== currentLevel.id }"
              :disabled="started && item.id !== currentLevel.id"
              @click="selectLevel(item.id - 1)"
            >
              <span>{{ item.id }}</span>
              <strong>{{ item.label }}</strong>
            </button>
          </div>
        </el-card>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { RefreshRight } from '@element-plus/icons-vue'
import { getTodayGames, playGame } from '@/api/student'

const levels = [
  { id: 1, label: '入门', targetWpm: 18, title: 'Campus Morning', goal: '熟悉基础单词和短句节奏', text: 'Every morning, students walk across the campus with books, plans, and quiet hopes for a better day.' },
  { id: 2, label: '入门', targetWpm: 20, title: 'Library Time', goal: '练习常见学习场景表达', text: 'The library is calm after lunch. A careful reader can find ideas, questions, and answers on the same page.' },
  { id: 3, label: '基础', targetWpm: 22, title: 'Study Habit', goal: '保持空格和标点准确', text: 'A strong study habit begins with a clear desk, a simple goal, and twenty minutes of focused effort.' },
  { id: 4, label: '基础', targetWpm: 24, title: 'Team Project', goal: '练习较长句子连续输入', text: 'When a team project works well, every member listens, shares notes, checks details, and finishes tasks on time.' },
  { id: 5, label: '基础', targetWpm: 26, title: 'Healthy Routine', goal: '提升稳定速度', text: 'Healthy students do not only study hard; they sleep enough, drink water, exercise often, and keep their rooms clean.' },
  { id: 6, label: '进阶', targetWpm: 28, title: 'Class Discussion', goal: '适应分号和逗号', text: 'During class discussions, brave questions matter; they turn a normal lesson into a useful exchange of ideas.' },
  { id: 7, label: '进阶', targetWpm: 30, title: 'Digital Notes', goal: '练习技术类词汇', text: 'Digital notes are helpful when they are organized by topic, date, keyword, and the questions that remain unsolved.' },
  { id: 8, label: '进阶', targetWpm: 32, title: 'Exam Review', goal: '提升段落输入耐力', text: 'Before an exam, review the hardest chapter first, mark weak points, and explain each key idea in your own words.' },
  { id: 9, label: '进阶', targetWpm: 34, title: 'Volunteer Work', goal: '控制错误率', text: 'Volunteer work teaches patience because real service requires attention, respect, communication, and steady action.' },
  { id: 10, label: '熟练', targetWpm: 36, title: 'Public Speaking', goal: '练习更复杂的英语结构', text: 'A confident speech sounds natural when the speaker understands the audience and speaks with clear examples.' },
  { id: 11, label: '熟练', targetWpm: 38, title: 'Research Skills', goal: '练习学术表达', text: 'Good research starts with a narrow question, reliable sources, honest data, and a conclusion that can be checked.' },
  { id: 12, label: '熟练', targetWpm: 40, title: 'Time Management', goal: '速度和准确率同时达标', text: 'Time management is not about filling every minute; it is about protecting the minutes that matter most.' },
  { id: 13, label: '挑战', targetWpm: 42, title: 'Innovation Lab', goal: '练习长词和连续标点', text: 'In the innovation lab, students test prototypes, compare feedback, revise designs, and learn from small failures.' },
  { id: 14, label: '挑战', targetWpm: 44, title: 'Academic Integrity', goal: '保持英文大小写准确', text: 'Academic integrity means giving credit, avoiding shortcuts, checking sources, and building knowledge with honesty.' },
  { id: 15, label: '挑战', targetWpm: 46, title: 'Global Culture', goal: '适应抽象主题段落', text: 'Global culture becomes easier to understand when students compare food, language, history, and daily habits.' },
  { id: 16, label: '高阶', targetWpm: 48, title: 'Problem Solving', goal: '提升高压输入稳定性', text: 'Complex problems rarely disappear at once, but a calm mind can divide them into steps and solve each part.' },
  { id: 17, label: '高阶', targetWpm: 50, title: 'Career Planning', goal: '练习职业规划主题词汇', text: 'Career planning connects personal interests with practical skills, internship experience, and long-term responsibility.' },
  { id: 18, label: '高阶', targetWpm: 52, title: 'Smart Campus', goal: '适应智慧校园主题', text: 'A smart campus should help students find schedules, notices, activities, feedback, and learning support quickly.' },
  { id: 19, label: '冲刺', targetWpm: 55, title: 'Independent Learning', goal: '挑战高速度低错误', text: 'Independent learning asks students to set goals, monitor progress, adjust methods, and stay curious without reminders.' },
  { id: 20, label: '终章', targetWpm: 58, title: 'Future Builder', goal: '完成最终综合训练', text: 'The future belongs to students who practice patiently, type accurately, think clearly, and improve a little every day.' }
]

const levelIndex = ref(0)
const typedText = ref('')
const startedAt = ref(null)
const elapsedSeconds = ref(0)
const completed = ref(false)
const remaining = ref(5)
const inputRef = ref()
let ticker = null

const currentLevel = computed(() => levels[levelIndex.value])
const passageChars = computed(() => currentLevel.value.text.split(''))
const started = computed(() => !!startedAt.value && !completed.value)
const progress = computed(() => Math.min(100, Math.round((typedText.value.length / currentLevel.value.text.length) * 100)))
const correctCount = computed(() => {
  return typedText.value.split('').reduce((sum, char, index) => sum + (char === currentLevel.value.text[index] ? 1 : 0), 0)
})
const errorCount = computed(() => Math.max(0, typedText.value.length - correctCount.value))
const accuracy = computed(() => {
  if (!typedText.value.length) return 100
  return Math.max(0, Math.round((correctCount.value / typedText.value.length) * 100))
})
const wpm = computed(() => {
  const minutes = Math.max(elapsedSeconds.value / 60, 1 / 60)
  return Math.round((correctCount.value / 5) / minutes)
})
const score = computed(() => {
  const speedScore = Math.min(100, Math.round((wpm.value / currentLevel.value.targetWpm) * 70))
  const accuracyScore = Math.round(accuracy.value * 0.3)
  return Math.max(0, Math.min(100, speedScore + accuracyScore - errorCount.value))
})
const progressColor = computed(() => {
  if (accuracy.value < 85) return '#f56c6c'
  if (wpm.value < currentLevel.value.targetWpm) return '#e6a23c'
  return '#67c23a'
})
const finishTitle = computed(() => score.value >= 85 ? '本关表现优秀' : score.value >= 60 ? '本关已完成' : '本关完成，建议重练')
const finishDesc = computed(() => `速度 ${wpm.value} WPM，准确率 ${accuracy.value}%，综合评分 ${score.value}。`)

const loadToday = async () => {
  try {
    const { data } = await getTodayGames()
    remaining.value = Math.max(0, 5 - (data?.typing || 0))
  } catch (e) {}
}

const startTicker = () => {
  if (ticker) clearInterval(ticker)
  ticker = setInterval(() => {
    if (!startedAt.value || completed.value) return
    elapsedSeconds.value = Math.max(1, Math.floor((Date.now() - startedAt.value) / 1000))
  }, 250)
}

const focusInput = () => {
  nextTick(() => inputRef.value?.focus())
}

const handleTyping = async () => {
  if (completed.value || remaining.value <= 0) return
  if (!startedAt.value && typedText.value.length > 0) {
    startedAt.value = Date.now()
    elapsedSeconds.value = 1
    startTicker()
  }

  if (typedText.value.length >= currentLevel.value.text.length) {
    typedText.value = typedText.value.slice(0, currentLevel.value.text.length)
    await finishLevel()
  }
}

const finishLevel = async () => {
  if (completed.value) return
  completed.value = true
  if (ticker) clearInterval(ticker)

  if (remaining.value > 0) {
    remaining.value = Math.max(0, remaining.value - 1)
    try {
      const levelLabel = `L${currentLevel.value.id}-${wpm.value}wpm-${accuracy.value}%`
      await playGame({
        game_type: 'typing',
        score: score.value,
        level: levelLabel.slice(0, 20),
        play_time: elapsedSeconds.value
      })
      ElMessage.success('成绩已记录')
    } catch (e) {
      ElMessage.error(e.message || '成绩记录失败')
    }
  }
}

const resetLevel = () => {
  if (ticker) clearInterval(ticker)
  typedText.value = ''
  startedAt.value = null
  elapsedSeconds.value = 0
  completed.value = false
  focusInput()
}

const selectLevel = (index) => {
  levelIndex.value = index
  resetLevel()
}

const prevLevel = () => {
  if (levelIndex.value > 0) selectLevel(levelIndex.value - 1)
}

const nextLevel = () => {
  if (levelIndex.value < levels.length - 1) selectLevel(levelIndex.value + 1)
}

const isSymbol = (char) => /[^\w\s]/.test(char)

const displayChar = (char) => {
  if (char === ' ') return '·'
  if (char === '\n') return '↵'
  return char
}

const charClass = (index, char) => {
  const classes = []
  if (char === ' ') classes.push('space-char')
  if (isSymbol(char)) classes.push('symbol-char')
  if (index >= typedText.value.length) {
    classes.push('pending')
    return classes
  }
  classes.push(typedText.value[index] === currentLevel.value.text[index] ? 'correct' : 'wrong')
  return classes
}

onMounted(() => {
  loadToday()
})

onUnmounted(() => {
  if (ticker) clearInterval(ticker)
})
</script>

<style scoped lang="scss">
.typing-page {
  .page-title {
    font-size: 18px;
    font-weight: 600;
  }

  .status-card {
    margin: 16px 0;
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
  }

  .status-item {
    min-height: 70px;
    display: grid;
    align-content: center;
    gap: 6px;
    padding: 12px;
    border-radius: 8px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;

    span {
      color: #64748b;
      font-size: 12px;
    }

    strong {
      color: #111827;
      font-size: 22px;
      line-height: 1;
    }
  }

  .main-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 16px;
    align-items: start;
  }

  .typing-card {
    .level-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;

      h3 {
        margin: 0 0 6px;
        color: #111827;
        font-size: 20px;
      }

      p {
        margin: 0;
        color: #64748b;
        font-size: 13px;
      }
    }
  }

  .passage {
    min-height: 150px;
    padding: 18px;
    margin-bottom: 16px;
    border-radius: 8px;
    background: #0f172a;
    color: #dbeafe;
    font-family: Consolas, Monaco, 'Courier New', monospace;
    font-size: 20px;
    line-height: 1.9;
    cursor: text;
    user-select: none;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    word-break: break-word;
    overflow: hidden;

    .passage-char {
      display: inline-block;
      min-width: 0.62em;
      margin: 0 1px 4px 0;
      padding: 0 1px;
      border-radius: 3px;
      text-align: center;
      vertical-align: baseline;
    }

    .correct {
      color: #86efac;
    }

    .wrong {
      color: #fff;
      background: #ef4444;
    }

    .pending {
      color: #cbd5e1;
    }

    .space-char {
      color: #64748b;
      background: rgba(148, 163, 184, 0.12);
    }

    .space-char.correct {
      color: #22c55e;
      background: rgba(34, 197, 94, 0.18);
    }

    .space-char.wrong,
    .symbol-char.wrong {
      color: #fff;
      background: #ef4444;
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.18) inset;
    }

    .symbol-char.correct {
      color: #67e8f9;
      background: rgba(14, 165, 233, 0.16);
    }
  }

  :deep(.el-textarea__inner) {
    font-family: Consolas, Monaco, 'Courier New', monospace;
    font-size: 16px;
    line-height: 1.8;
    border-radius: 8px;
  }

  .progress-line {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    margin: 14px 0;
    color: #64748b;
    font-size: 13px;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }

  .side-panel {
    display: grid;
    gap: 16px;
  }

  .metric-list {
    display: grid;
    gap: 10px;

    div {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #f1f5f9;
    }

    span {
      color: #64748b;
      font-size: 13px;
    }

    strong {
      color: #111827;
    }

    .danger {
      color: #ef4444;
    }
  }

  .finish-alert {
    margin-top: 14px;
  }

  .level-list {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;

    button {
      height: 58px;
      display: grid;
      gap: 3px;
      place-items: center;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #fff;
      color: #475569;
      cursor: pointer;

      &.active {
        color: #fff;
        border-color: #1677ff;
        background: #1677ff;
      }

      &.locked {
        cursor: not-allowed;
        opacity: 0.6;
      }

      span {
        font-weight: 700;
      }

      strong {
        font-size: 11px;
        font-weight: 500;
      }
    }
  }
}

@media (max-width: 1100px) {
  .typing-page {
    .status-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .main-grid {
      grid-template-columns: 1fr;
    }
  }
}

@media (max-width: 700px) {
  .typing-page {
    .status-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .passage {
      font-size: 17px;
    }
  }
}
</style>
