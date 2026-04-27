<template>
  <div class="gomoku-page">
    <el-page-header @back="$router.back()">
      <template #content>
        <span class="page-title">五子棋人机对战</span>
      </template>
    </el-page-header>

    <el-card class="info-card">
      <div class="game-info">
        <div class="info-left">
          <el-radio-group v-model="level" :disabled="gameStarted && !gameOver" @change="initGame">
            <el-radio-button label="easy">简单</el-radio-button>
            <el-radio-button label="medium">中等</el-radio-button>
            <el-radio-button label="hard">困难</el-radio-button>
          </el-radio-group>
          <el-tag size="large" type="warning">今日剩余 {{ remaining }}/5 次</el-tag>
          <el-tag size="large" type="info">回合：{{ moveCount }}</el-tag>
          <el-tag size="large" :type="turn === 'black' ? 'primary' : 'success'">
            {{ turn === 'black' ? '你的回合(黑棋)' : 'AI思考中...' }}
          </el-tag>
        </div>
        <div class="info-right">
          <el-button type="primary" size="small" @click="initGame">{{ gameOver ? '再来一局' : '重新开始' }}</el-button>
        </div>
      </div>
    </el-card>

    <el-card class="board-card">
      <div class="board" :class="{ 'ai-thinking': aiThinking }">
        <div class="board-bg">
          <div v-for="r in 15" :key="'row-'+r" class="board-row" :style="{ top: `${(r - 1) * 36}px` }"></div>
          <div v-for="c in 15" :key="'col-'+c" class="board-col" :style="{ left: `${(c - 1) * 36}px` }"></div>
          <div v-for="(s, i) in stars" :key="'star-'+i" class="board-star" :style="{ top: `${s.r * 36}px`, left: `${s.c * 36}px` }"></div>
        </div>
        <div
          v-for="(cell, i) in board"
          :key="'cell-'+i"
          class="cell-hit"
          :style="{ top: `${Math.floor(i/15) * 36}px`, left: `${(i%15) * 36}px` }"
          @click="placeStone(i)"
        >
          <div v-if="cell !== 0" :class="['stone', cell === 1 ? 'black' : 'white']" :data-last="i === lastMove ? '1' : '0'"></div>
        </div>
      </div>

      <div v-if="gameOver" class="game-result">
        <el-result :icon="resultIcon" :title="resultTitle" :sub-title="resultSubtitle">
          <template #extra>
            <el-button type="primary" @click="initGame">再来一局</el-button>
          </template>
        </el-result>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { playGame, getTodayGames } from '@/api/student'

const SIZE = 15
const level = ref('easy')
const board = ref(Array(SIZE * SIZE).fill(0)) // 0空 1黑(玩家) 2白(AI)
const turn = ref('black')
const gameStarted = ref(false)
const gameOver = ref(false)
const win = ref(false) // 玩家是否获胜
const lastMove = ref(-1)
const moveCount = ref(0)
const remaining = ref(5)
const aiThinking = ref(false)

const stars = [
  { r: 3, c: 3 }, { r: 3, c: 11 }, { r: 7, c: 7 }, { r: 11, c: 3 }, { r: 11, c: 11 }
]

const resultIcon = computed(() => win.value ? 'success' : 'error')
const resultTitle = computed(() => win.value ? '恭喜你赢了！' : '电脑赢了')
const resultSubtitle = computed(() => {
  if (!gameOver.value) return ''
  return `共 ${moveCount.value} 步 · 难度 ${levelLabel.value} · 得分 ${calculateScore()}`
})
const levelLabel = computed(() => ({ easy: '简单', medium: '中等', hard: '困难' }[level.value]))

const loadToday = async () => {
  try {
    const { data } = await getTodayGames()
    remaining.value = Math.max(0, 5 - (data.gomoku || 0))
  } catch (e) {}
}

const initGame = async () => {
  // 已开始未结束的对局算放弃
  if (gameStarted.value && !gameOver.value) {
    await saveScore(0)
  }
  board.value = Array(SIZE * SIZE).fill(0)
  turn.value = 'black'
  gameStarted.value = false
  gameOver.value = false
  win.value = false
  lastMove.value = -1
  moveCount.value = 0
  aiThinking.value = false
  loadToday()
}

const placeStone = (i) => {
  if (gameOver.value || aiThinking.value || turn.value !== 'black' || board.value[i] !== 0) return
  if (remaining.value === 0) {
    ElMessage.warning('今日次数已用完')
    return
  }
  gameStarted.value = true
  board.value[i] = 1
  lastMove.value = i
  moveCount.value++
  if (checkWinAt(i, 1)) {
    win.value = true
    gameOver.value = true
    saveScore(calculateScore())
    return
  }
  if (board.value.every(c => c !== 0)) {
    gameOver.value = true
    saveScore(Math.floor(calculateScore() / 2))
    return
  }
  turn.value = 'white'
  setTimeout(aiMove, 350)
}

const aiMove = () => {
  if (gameOver.value) return
  aiThinking.value = true
  const idx = chooseAiMove()
  board.value[idx] = 2
  lastMove.value = idx
  moveCount.value++
  if (checkWinAt(idx, 2)) {
    win.value = false
    gameOver.value = true
    saveScore(0)
  } else if (board.value.every(c => c !== 0)) {
    gameOver.value = true
    saveScore(Math.floor(calculateScore() / 2))
  } else {
    turn.value = 'black'
  }
  aiThinking.value = false
}

// AI 决策:打分模型 + 难度系数
const chooseAiMove = () => {
  const candidates = []
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (board.value[i] !== 0) continue
    if (!hasNeighbor(i, 2)) continue
    const attackScore = scoreAt(i, 2)
    const defendScore = scoreAt(i, 1)
    let total
    if (level.value === 'easy') {
      // 简单:大概率随机,小概率最优 + 必赢必堵
      total = attackScore + defendScore * 0.4 + Math.random() * 800
    } else if (level.value === 'medium') {
      total = attackScore * 1.0 + defendScore * 0.85 + Math.random() * 50
    } else {
      total = attackScore * 1.05 + defendScore * 1.0
    }
    candidates.push({ i, total, attackScore, defendScore })
  }
  if (candidates.length === 0) {
    // 第一手:落天元附近
    const center = Math.floor(SIZE / 2) * SIZE + Math.floor(SIZE / 2)
    return board.value[center] === 0 ? center : board.value.findIndex(c => c === 0)
  }
  candidates.sort((a, b) => b.total - a.total)
  // 简单模式从前N中随机选
  if (level.value === 'easy') {
    const top = candidates.slice(0, Math.min(5, candidates.length))
    return top[Math.floor(Math.random() * top.length)].i
  }
  return candidates[0].i
}

const hasNeighbor = (idx, _player) => {
  const r = Math.floor(idx / SIZE), c = idx % SIZE
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
        if (board.value[nr * SIZE + nc] !== 0) return true
      }
    }
  }
  return false
}

// 在(r,c)假设落 player 的子,计算价值分
const scoreAt = (idx, player) => {
  const r = Math.floor(idx / SIZE), c = idx % SIZE
  const dirs = [[0,1],[1,0],[1,1],[1,-1]]
  let total = 0
  for (const [dr, dc] of dirs) {
    total += lineScore(r, c, dr, dc, player)
  }
  return total
}

const lineScore = (r, c, dr, dc, player) => {
  // 从(r,c)沿(dr,dc)方向连子情况
  let cont = 1 // 包括将要落的子
  let leftBlocked = false, rightBlocked = false
  // 正向
  let nr = r + dr, nc = c + dc
  while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board.value[nr * SIZE + nc] === player) {
    cont++; nr += dr; nc += dc
  }
  if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || board.value[nr * SIZE + nc] !== 0) rightBlocked = true
  // 反向
  nr = r - dr; nc = c - dc
  while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board.value[nr * SIZE + nc] === player) {
    cont++; nr -= dr; nc -= dc
  }
  if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || board.value[nr * SIZE + nc] !== 0) leftBlocked = true
  // 评分
  if (cont >= 5) return 1000000
  const blocks = (leftBlocked ? 1 : 0) + (rightBlocked ? 1 : 0)
  if (cont === 4) return blocks === 0 ? 50000 : blocks === 1 ? 8000 : 0
  if (cont === 3) return blocks === 0 ? 4000 : blocks === 1 ? 600 : 0
  if (cont === 2) return blocks === 0 ? 300 : blocks === 1 ? 80 : 0
  if (cont === 1) return blocks === 0 ? 30 : blocks === 1 ? 8 : 0
  return 0
}

const checkWinAt = (idx, player) => {
  const r = Math.floor(idx / SIZE), c = idx % SIZE
  const dirs = [[0,1],[1,0],[1,1],[1,-1]]
  for (const [dr, dc] of dirs) {
    let cont = 1
    let nr = r + dr, nc = c + dc
    while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board.value[nr * SIZE + nc] === player) {
      cont++; nr += dr; nc += dc
    }
    nr = r - dr; nc = c - dc
    while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board.value[nr * SIZE + nc] === player) {
      cont++; nr -= dr; nc -= dc
    }
    if (cont >= 5) return true
  }
  return false
}

const calculateScore = () => {
  if (!win.value) return 0
  const base = level.value === 'easy' ? 80 : level.value === 'medium' ? 160 : 260
  // 步数越少分越高
  const bonus = Math.max(0, 80 - moveCount.value * 2)
  return base + bonus
}

const saveScore = async (s) => {
  try {
    await playGame({
      game_type: 'gomoku',
      score: s,
      level: level.value,
      play_time: 0
    })
    remaining.value = Math.max(0, remaining.value - 1)
  } catch (e) {
    ElMessage.warning(e.response?.data?.message || '成绩保存失败')
  }
}

onUnmounted(() => {})
loadToday()
</script>

<style scoped lang="scss">
.gomoku-page {
  .page-title { font-size: 18px; font-weight: 600; }
  .info-card { margin: 16px 0; }
  .game-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .info-left {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }
  }
  .board-card {
    .board {
      position: relative;
      width: 540px;
      height: 540px;
      margin: 30px auto;
      background: #ddb478;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      border-radius: 4px;
      &.ai-thinking { cursor: wait; }
    }
    .board-bg {
      position: absolute;
      top: 18px;
      left: 18px;
      width: 504px;
      height: 504px;
    }
    .board-row {
      position: absolute;
      left: 0;
      right: 0;
      height: 1px;
      background: #5a3825;
    }
    .board-col {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 1px;
      background: #5a3825;
    }
    .board-star {
      position: absolute;
      width: 8px;
      height: 8px;
      background: #5a3825;
      border-radius: 50%;
      transform: translate(-50%, -50%);
    }
    .cell-hit {
      position: absolute;
      width: 36px;
      height: 36px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      &:hover .stone { opacity: 0.7; }
    }
    .stone {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      pointer-events: none;
      &.black {
        background: radial-gradient(circle at 35% 35%, #555, #000 70%);
      }
      &.white {
        background: radial-gradient(circle at 35% 35%, #fff, #ccc 70%);
        border: 1px solid #888;
      }
      &[data-last="1"]::after {
        content: '';
        position: absolute;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #f56c6c;
        margin: 12px;
      }
    }
    .game-result {
      margin-top: 20px;
    }
  }
}
</style>
