<template>
  <div class="idiom-page">
    <el-page-header title="返回" @back="$router.back()">
      <template #content><span class="page-title">成语接龙</span></template>
    </el-page-header>

    <el-card class="info-card">
      <div class="game-info">
        <div class="info-block">
          <span class="label">当前关卡</span>
          <span class="value">{{ level }}</span>
        </div>
        <div class="info-block">
          <span class="label">连胜</span>
          <span class="value">{{ streak }}</span>
        </div>
        <div class="info-block">
          <span class="label">今日剩余次数</span>
          <span class="value">{{ remaining }}/5</span>
        </div>
        <div class="info-block">
          <span class="label">剩余提示</span>
          <span class="value hint-value">{{ hintRemaining }}/3</span>
        </div>
        <el-button type="primary" size="small" @click="resetGame">重新开始</el-button>
      </div>
    </el-card>

    <el-card class="game-card">
      <div class="game-board">
        <div class="current-idiom">
          <span class="label">当前成语</span>
          <div class="idiom-display">
            <span v-for="(char, i) in currentIdiom" :key="i" class="char">{{ char }}</span>
          </div>
        </div>

        <div class="input-area">
          <el-input
            v-model="userInput"
            :placeholder="`请输入以「${currentIdiom.slice(-1)}」开头的成语`"
            size="large"
            maxlength="4"
            show-word-limit
            @keyup.enter="submitAnswer"
          />
          <el-button type="warning" size="large" :disabled="hintRemaining <= 0" @click="useHint">
            提示 ({{ hintRemaining }})
          </el-button>
          <el-button type="primary" size="large" @click="submitAnswer" :disabled="!userInput.trim()">接龙</el-button>
        </div>

        <div class="history">
          <h4>接龙记录</h4>
          <div class="history-list">
            <div v-for="(item, idx) in history" :key="idx" class="history-item">
              <el-tag :type="idx % 2 === 0 ? 'primary' : 'success'" size="small">{{ idx % 2 === 0 ? '系统' : '玩家' }}</el-tag>
              <span class="idiom-text">{{ item }}</span>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getTodayGames, playGame } from '@/api/student'

const level = ref(1)
const streak = ref(0)
const remaining = ref(5)
const hintRemaining = ref(3)
const currentIdiom = ref('一心一意')
const userInput = ref('')
const history = ref(['一心一意'])

// 内置成语库
const idiomDB = [
  '一心一意', '意气风发', '发扬光大', '大显身手', '手到擒来',
  '来日方长', '长年累月', '月下老人', '人山人海', '海阔天空',
  '空前绝后', '后来居上', '上行下效', '效犬马力', '力不从心',
  '心直口快', '快马加鞭', '鞭长莫及', '及时行乐', '乐不思蜀',
  '蜀犬吠日', '日新月异', '异想天开', '开门见山', '山清水秀',
  '秀外慧中', '中流砥柱', '柱石之臣', '臣心如水', '水落石出',
  '出口成章', '章台杨柳', '柳暗花明', '明辨是非', '非同小可',
  '可歌可泣', '泣不成声', '声东击西', '西窗剪烛', '烛照数计',
  '计上心来', '来者不拒', '拒人千里', '里应外合', '合情合理',
  '理直气壮', '壮志凌云', '云开见日', '日理万机', '机不可失',
  '失之交臂', '臂有四肘', '肘腋之患', '患得患失', '失道寡助',
  '助人为乐', '乐善好施', '施仁布德', '德高望重', '重见天日'
]

const loadToday = async () => {
  try {
    const { data } = await getTodayGames()
    remaining.value = 5 - (data.idiom || 0)
  } catch (e) {}
}

const resetGame = () => {
  level.value = 1
  streak.value = 0
  hintRemaining.value = 3
  currentIdiom.value = '一心一意'
  history.value = ['一心一意']
  userInput.value = ''
}

const useHint = () => {
  if (hintRemaining.value <= 0) {
    ElMessage.warning('提示次数已用完')
    return
  }
  const lastChar = currentIdiom.value.slice(-1)
  const candidates = idiomDB.filter(idiom => idiom[0] === lastChar && !history.value.includes(idiom))
  if (candidates.length === 0) {
    ElMessage.info(`暂无以「${lastChar}」开头的可用成语`)
    return
  }
  const hint = candidates[Math.floor(Math.random() * candidates.length)]
  userInput.value = hint
  hintRemaining.value--
  ElMessage.success(`提示：${hint}（已自动填入,剩余 ${hintRemaining.value} 次提示）`)
}

const submitAnswer = async () => {
  const input = userInput.value.trim()
  if (!input) return
  if (input.length !== 4) {
    ElMessage.warning('请输入四字成语')
    return
  }
  const lastChar = currentIdiom.value.slice(-1)
  if (input[0] !== lastChar) {
    ElMessage.error(`成语必须以「${lastChar}」开头`)
    return
  }
  if (!idiomDB.includes(input)) {
    ElMessage.warning('暂未收录该成语，请换一个')
    return
  }
  if (history.value.includes(input)) {
    ElMessage.warning('该成语已经使用过了')
    return
  }

  // 玩家接龙成功
  history.value.push(input)
  streak.value++
  level.value++
  userInput.value = ''

  // 系统接龙
  const sysLast = input.slice(-1)
  const candidates = idiomDB.filter(idiom => idiom[0] === sysLast && !history.value.includes(idiom))
  if (candidates.length > 0) {
    const sysAnswer = candidates[Math.floor(Math.random() * candidates.length)]
    setTimeout(() => {
      history.value.push(sysAnswer)
      currentIdiom.value = sysAnswer
      ElMessage.info(`系统接龙：${sysAnswer}`)
    }, 600)
  } else {
    ElMessage.success('恭喜！系统无成语可接，你赢了！')
    remaining.value = Math.max(0, remaining.value - 1)
    try {
      await playGame({ game_type: 'idiom', score: streak.value, level: String(level.value) })
    } catch (e) {}
  }
}

onMounted(loadToday)
</script>

<style scoped lang="scss">
.idiom-page {
  .page-title { font-size: 18px; font-weight: 600; }

  .info-card {
    margin: 16px 0;
    .game-info {
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
      .info-block {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 60px;
        .label { font-size: 12px; color: #999; }
        .value { font-size: 20px; font-weight: bold; color: #333; }
        .hint-value { color: #e6a23c; }
      }
    }
  }

  .game-card {
    .game-board {
      max-width: 600px;
      margin: 0 auto;
      .current-idiom {
        text-align: center;
        margin-bottom: 24px;
        .label { font-size: 14px; color: #999; }
        .idiom-display {
          margin-top: 12px;
          display: flex;
          justify-content: center;
          gap: 12px;
          .char {
            width: 56px;
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: bold;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          }
        }
      }
      .input-area {
        display: flex;
        gap: 12px;
        margin-bottom: 24px;
      }
      .history {
        h4 { font-size: 16px; margin-bottom: 12px; color: #333; }
        .history-list {
          max-height: 300px;
          overflow-y: auto;
          .history-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #f0f0f0;
            .idiom-text {
              font-size: 16px;
              color: #333;
              font-weight: 500;
              letter-spacing: 4px;
            }
          }
        }
      }
    }
  }
}
</style>
