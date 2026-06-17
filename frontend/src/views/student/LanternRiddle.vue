<template>
  <div class="riddle-page">
    <el-page-header title="返回" @back="$router.back()">
      <template #content><span class="page-title">猜灯谜</span></template>
    </el-page-header>

    <el-card class="info-card">
      <div class="game-info">
        <div class="info-block"><span>题目</span><strong>{{ index + 1 }} / {{ riddles.length }}</strong></div>
        <div class="info-block"><span>得分</span><strong>{{ score }}</strong></div>
        <div class="info-block"><span>连对</span><strong>{{ streak }}</strong></div>
        <div class="info-block"><span>剩余</span><strong>{{ remaining }}/5</strong></div>
        <el-button type="primary" @click="startGame">{{ started ? '重新开局' : '开始挑战' }}</el-button>
      </div>
    </el-card>

    <el-card class="riddle-card">
      <div class="lantern-strip">
        <span v-for="n in 8" :key="n" class="lantern">谜</span>
      </div>
      <div v-if="!started" class="intro">
        <h3>高难灯谜十连问</h3>
        <p>答案多为中文词语、成语或地名。可看提示，但会扣分；答错会断连击。</p>
      </div>
      <div v-else-if="finished" class="intro">
        <h3>挑战完成</h3>
        <p>最终得分 {{ score }}，答对 {{ correctCount }} 题。</p>
      </div>
      <div v-else class="question-box">
        <el-tag type="warning" effect="light">{{ current.category }}</el-tag>
        <h2>{{ current.question }}</h2>
        <p v-if="showHint" class="hint">提示：{{ current.hint }}</p>
        <el-input
          v-model.trim="answer"
          size="large"
          placeholder="输入答案，回车提交"
          @keyup.enter="submitAnswer"
        />
        <div class="actions">
          <el-button :disabled="showHint" @click="useHint">查看提示（-8分）</el-button>
          <el-button type="primary" @click="submitAnswer">提交答案</el-button>
          <el-button @click="skip">跳过</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getTodayGames, playGame } from '@/api/student'

const sourceRiddles = [
  { category: '字谜', question: '一月一日非今天。打一字', answer: '明', hint: '日与月组合。' },
  { category: '成语', question: '船到桥头自然直。打一成语', answer: '顺水推舟', hint: '借势而行。' },
  { category: '地名', question: '双喜临门。打一中国城市', answer: '重庆', hint: '两个“庆”。' },
  { category: '字谜', question: '山上还有山。打一字', answer: '出', hint: '两个山叠在一起。' },
  { category: '成语', question: '最遥远的地方。打一成语', answer: '天涯海角', hint: '天边与海角。' },
  { category: '字谜', question: '四面都是山，山山都相连。打一字', answer: '田', hint: '像被围起来的方格。' },
  { category: '成语', question: '无底洞。打一成语', answer: '深不可测', hint: '深到无法丈量。' },
  { category: '字谜', question: '一点一横长，一撇到南洋。打一字', answer: '广', hint: '前三笔形状。' },
  { category: '地名', question: '久雨初晴。打一中国城市', answer: '贵阳', hint: '阳光显得珍贵。' },
  { category: '成语', question: '逆水划船。打一成语', answer: '力争上游', hint: '不进则退。' },
  { category: '字谜', question: '十八乘六。打一字', answer: '校', hint: '木旁加交。' },
  { category: '成语', question: '零存整取。打一成语', answer: '积少成多', hint: '一点点积累。' }
]

const riddles = ref([])
const index = ref(0)
const answer = ref('')
const score = ref(0)
const streak = ref(0)
const correctCount = ref(0)
const remaining = ref(5)
const started = ref(false)
const finished = ref(false)
const showHint = ref(false)

const current = computed(() => riddles.value[index.value] || sourceRiddles[0])

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5)

const loadToday = async () => {
  try {
    const { data } = await getTodayGames()
    remaining.value = Math.max(0, 5 - (data?.lantern_riddle || 0))
  } catch (e) {}
}

const startGame = () => {
  if (remaining.value <= 0) {
    ElMessage.warning('今天猜灯谜次数已用完')
    return
  }
  riddles.value = shuffle(sourceRiddles).slice(0, 10)
  index.value = 0
  answer.value = ''
  score.value = 0
  streak.value = 0
  correctCount.value = 0
  started.value = true
  finished.value = false
  showHint.value = false
}

const normalize = (text) => String(text || '').replace(/\s+/g, '').replace(/[，。、“”‘’！!？?]/g, '').toLowerCase()

const nextQuestion = async () => {
  answer.value = ''
  showHint.value = false
  if (index.value >= riddles.value.length - 1) {
    finished.value = true
    remaining.value = Math.max(0, remaining.value - 1)
    try {
      await playGame({ game_type: 'lantern_riddle', score: score.value, level: 'hard', play_time: correctCount.value })
      ElMessage.success('灯谜成绩已记录')
    } catch (e) {
      ElMessage.warning(e.response?.data?.message || '成绩保存失败')
    }
  } else {
    index.value++
  }
}

const useHint = () => {
  showHint.value = true
  score.value = Math.max(0, score.value - 8)
}

const submitAnswer = async () => {
  if (!answer.value) return ElMessage.warning('先写一个答案吧')
  if (normalize(answer.value) === normalize(current.value.answer)) {
    streak.value++
    correctCount.value++
    score.value += 20 + Math.min(20, streak.value * 4) + (showHint.value ? 0 : 6)
    ElMessage.success('答对了')
  } else {
    streak.value = 0
    score.value = Math.max(0, score.value - 6)
    ElMessage.error(`答错了，答案是：${current.value.answer}`)
  }
  await nextQuestion()
}

const skip = async () => {
  streak.value = 0
  ElMessage.info(`已跳过，答案是：${current.value.answer}`)
  await nextQuestion()
}

onMounted(loadToday)
</script>

<style scoped lang="scss">
.riddle-page {
  .page-title { font-size: 18px; font-weight: 600; }
  .info-card { margin: 16px 0; }
  .game-info { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .info-block {
    min-width: 130px; padding: 12px 16px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff7ed;
    span { display: block; color: #b45309; font-size: 12px; }
    strong { color: #0f172a; font-size: 22px; }
  }
  .riddle-card { min-height: 430px; overflow: hidden; }
  .lantern-strip { display: flex; justify-content: space-around; margin-bottom: 28px; }
  .lantern {
    width: 44px; height: 54px; display: grid; place-items: center; color: #fff; font-weight: 800;
    border-radius: 22px 22px 18px 18px; background: linear-gradient(180deg, #ef4444, #b91c1c);
    box-shadow: 0 12px 22px rgba(239, 68, 68, .25);
  }
  .intro, .question-box { max-width: 760px; margin: 0 auto; text-align: center; }
  .intro h3 { font-size: 28px; margin: 20px 0 10px; }
  .intro p, .hint { color: #64748b; line-height: 1.8; }
  .question-box h2 { margin: 22px 0; font-size: 28px; line-height: 1.5; }
  .actions { margin-top: 16px; display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; }
}
:root[data-theme="dark"] .riddle-page .info-block { background: #2a1d16; border-color: #54331d; }
:root[data-theme="dark"] .riddle-page .info-block strong,
:root[data-theme="dark"] .riddle-page .intro h3,
:root[data-theme="dark"] .riddle-page .question-box h2 { color: #eef4fc; }
</style>
