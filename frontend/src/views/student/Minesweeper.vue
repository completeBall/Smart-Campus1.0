<template>
  <div class="minesweeper-page">
    <el-page-header title="返回" @back="$router.back()">
      <template #content><span class="page-title">扫雷挑战</span></template>
    </el-page-header>

    <el-card class="info-card">
      <div class="game-info">
        <div class="info-block">
          <span class="label">剩余雷数</span>
          <span class="value">{{ minesLeft }}</span>
        </div>
        <div class="info-block">
          <span class="label">用时</span>
          <span class="value">{{ formatTime(timer) }}</span>
        </div>
        <div class="info-block">
          <span class="label">今日剩余次数</span>
          <span class="value">{{ remaining }}/5</span>
        </div>
        <el-radio-group v-model="level" size="small" :disabled="gameStarted" @change="initGame">
          <el-radio-button label="easy">简单 8x8</el-radio-button>
          <el-radio-button label="medium">中等 16x16</el-radio-button>
          <el-radio-button label="hard">困难 16x30</el-radio-button>
        </el-radio-group>
        <el-button type="primary" size="small" @click="initGame">{{ gameOver ? '再来一局' : '重新开始' }}</el-button>
      </div>
    </el-card>

    <el-card class="game-card">
      <div class="board" :style="boardStyle">
        <div
          v-for="(cell, index) in board"
          :key="index"
          class="cell"
          :class="getCellClass(cell)"
          @click="handleClick(cell)"
          @contextmenu.prevent="handleRightClick(cell)"
        >
          <template v-if="cell.revealed">
            <span v-if="cell.mine" class="mine">💣</span>
            <span v-else-if="cell.adjacent > 0" :class="'num-' + cell.adjacent">{{ cell.adjacent }}</span>
          </template>
          <span v-else-if="cell.flagged" class="flag">🚩</span>
        </div>
      </div>

      <div v-if="gameOver || win" class="game-result">
        <el-result
          :icon="win ? 'success' : 'error'"
          :title="win ? '恭喜通关！' : '游戏结束'"
          :sub-title="resultSubtitle"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { playGame, getTodayGames } from '@/api/student'

const level = ref('easy')
const board = ref([])
const gameStarted = ref(false)
const gameOver = ref(false)
const win = ref(false)
const timer = ref(0)
const timerInterval = ref(null)
const remaining = ref(5)
const todayScore = ref(0)

const config = {
  easy: { rows: 8, cols: 8, mines: 10, baseScore: 100 },
  medium: { rows: 16, cols: 16, mines: 40, baseScore: 300 },
  hard: { rows: 16, cols: 30, mines: 99, baseScore: 600 }
}

const boardStyle = computed(() => {
  const c = config[level.value]
  return {
    gridTemplateColumns: `repeat(${c.cols}, 28px)`,
    gridTemplateRows: `repeat(${c.rows}, 28px)`
  }
})

const minesLeft = computed(() => {
  const flagged = board.value.filter(c => c.flagged).length
  return config[level.value].mines - flagged
})

const resultSubtitle = computed(() => {
  if (!win.value) return ''
  const score = calculateScore()
  return `用时 ${formatTime(timer.value)}，得分 ${score}`
})

const formatTime = (s) => {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

const loadToday = async () => {
  try {
    const { data } = await getTodayGames()
    remaining.value = 5 - (data.minesweeper || 0)
  } catch (e) {}
}

const initGame = async () => {
  // 如果之前一局已经开始但还没结束(没赢、没死),计为一次放弃,扣一次次数
  if (gameStarted.value && !gameOver.value && !win.value) {
    await saveScore(0)
  }
  const c = config[level.value]
  board.value = Array.from({ length: c.rows * c.cols }, (_, i) => ({
    index: i,
    row: Math.floor(i / c.cols),
    col: i % c.cols,
    mine: false,
    revealed: false,
    flagged: false,
    adjacent: 0
  }))
  gameStarted.value = false
  gameOver.value = false
  win.value = false
  timer.value = 0
  clearInterval(timerInterval.value)
  loadToday()
}

const placeMines = (safeIndex) => {
  const c = config[level.value]
  const indices = board.value.map((_, i) => i).filter(i => i !== safeIndex)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]]
  }
  indices.slice(0, c.mines).forEach(i => { board.value[i].mine = true })
  // Calculate adjacent counts
  board.value.forEach(cell => {
    if (cell.mine) return
    let count = 0
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nr = cell.row + dr, nc = cell.col + dc
        if (nr >= 0 && nr < c.rows && nc >= 0 && nc < c.cols) {
          const ni = nr * c.cols + nc
          if (board.value[ni].mine) count++
        }
      }
    }
    cell.adjacent = count
  })
}

const revealCell = (cell) => {
  if (cell.revealed || cell.flagged || gameOver.value || win.value) return
  cell.revealed = true
  if (cell.adjacent === 0 && !cell.mine) {
    const c = config[level.value]
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nr = cell.row + dr, nc = cell.col + dc
        if (nr >= 0 && nr < c.rows && nc >= 0 && nc < c.cols) {
          revealCell(board.value[nr * c.cols + nc])
        }
      }
    }
  }
}

const handleClick = (cell) => {
  if (gameOver.value || win.value || cell.flagged) return
  if (!gameStarted.value) {
    gameStarted.value = true
    placeMines(cell.index)
    timerInterval.value = setInterval(() => timer.value++, 1000)
  }
  if (cell.mine) {
    cell.revealed = true
    gameOver.value = true
    clearInterval(timerInterval.value)
    board.value.filter(c => c.mine).forEach(c => c.revealed = true)
    saveScore(0)
    ElMessage.error('踩到地雷了！')
    return
  }
  revealCell(cell)
  checkWin()
}

const handleRightClick = (cell) => {
  if (gameOver.value || win.value || cell.revealed) return
  cell.flagged = !cell.flagged
}

const checkWin = () => {
  const unrevealedSafe = board.value.filter(c => !c.revealed && !c.mine).length
  if (unrevealedSafe === 0) {
    win.value = true
    gameOver.value = true
    clearInterval(timerInterval.value)
    board.value.filter(c => c.mine && !c.flagged).forEach(c => c.flagged = true)
    const score = calculateScore()
    saveScore(score)
    ElMessage.success(`恭喜通关！得分 ${score}`)
  }
}

const calculateScore = () => {
  const c = config[level.value]
  const timePenalty = level.value === 'easy' ? 2 : level.value === 'medium' ? 3 : 5
  const minScore = level.value === 'easy' ? 10 : level.value === 'medium' ? 30 : 50
  return Math.max(minScore, c.baseScore - timer.value * timePenalty)
}

const saveScore = async (score) => {
  try {
    await playGame({
      game_type: 'minesweeper',
      score,
      level: level.value,
      play_time: timer.value
    })
    remaining.value = Math.max(0, remaining.value - 1)
  } catch (e) {
    ElMessage.warning(e.response?.data?.message || '成绩保存失败')
  }
}

const getCellClass = (cell) => {
  const classes = []
  if (cell.revealed) {
    classes.push('revealed')
    if (cell.mine) classes.push('mine-cell')
  } else {
    classes.push('hidden')
    if ((cell.row + cell.col) % 2 === 0) classes.push('alt')
  }
  return classes
}

onUnmounted(() => clearInterval(timerInterval.value))
initGame()
</script>

<style scoped lang="scss">
.minesweeper-page {
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
      }
    }
  }

  .game-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    overflow-x: auto;
    .board {
      display: grid;
      gap: 1px;
      background: #999;
      padding: 1px;
      border-radius: 4px;
      overflow: auto;
      max-width: 100%;
      .cell {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        user-select: none;
        transition: all 0.1s;
        &.hidden {
          background: #c0c0c0;
          &:hover { background: #d0d0d0; }
          &.alt { background: #b8b8b8; }
        }
        &.revealed {
          background: #e0e0e0;
          cursor: default;
        }
        &.mine-cell {
          background: #ff6b6b !important;
        }
        .flag { font-size: 14px; }
        .mine { font-size: 14px; }
        .num-1 { color: #0000ff; }
        .num-2 { color: #008000; }
        .num-3 { color: #ff0000; }
        .num-4 { color: #000080; }
        .num-5 { color: #800000; }
        .num-6 { color: #008080; }
        .num-7 { color: #000000; }
        .num-8 { color: #808080; }
      }
    }
    .game-result {
      margin-top: 20px;
      width: 100%;
    }
  }
}
</style>
