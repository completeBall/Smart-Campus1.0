<template>
  <div class="snake-page">
    <el-page-header title="返回" @back="$router.back()">
      <template #content><span class="page-title">贪吃蛇</span></template>
    </el-page-header>

    <el-card class="info-card">
      <div class="game-info">
        <div class="info-block">
          <span class="label">得分</span>
          <span class="value">{{ score }}</span>
        </div>
        <div class="info-block">
          <span class="label">最高分</span>
          <span class="value">{{ highScore }}</span>
        </div>
        <div class="info-block">
          <span class="label">长度</span>
          <span class="value">{{ snake.length }}</span>
        </div>
        <div class="info-block">
          <span class="label">今日剩余</span>
          <span class="value">{{ remaining }}/5</span>
        </div>
        <el-button type="primary" size="small" @click="startGame" :disabled="isPlaying && !isPaused && !gameOver">{{ isPlaying && !gameOver ? '重新开始' : '开始游戏' }}</el-button>
        <el-button size="small" @click="togglePause" :disabled="!isPlaying || gameOver">{{ isPaused ? '继续' : '暂停' }}</el-button>
      </div>
    </el-card>

    <el-card class="game-card">
      <div class="board-wrapper">
        <div class="snake-board" :style="boardStyle" tabindex="0" @keydown.prevent="handleKey" ref="boardRef">
          <div
            v-for="(cell, index) in flatBoard"
            :key="index"
            class="snake-cell"
            :class="cell.cls"
          >
            <span v-if="cell.type === 'food'">🍎</span>
          <span v-else-if="cell.type === 'head'">🐍</span>
          <span v-else-if="cell.type === 'body'">🟩</span>
          </div>
        </div>
        <div v-if="gameOver" class="game-overlay">
          <el-result icon="error" title="游戏结束" :sub-title="`最终得分: ${score}`">
            <template #extra>
              <el-button type="primary" @click="startGame">再来一局</el-button>
            </template>
          </el-result>
        </div>
        <div v-if="isPaused && !gameOver" class="game-overlay transparent">
          <el-result icon="info" title="已暂停" sub-title="按空格或点击继续按钮">
            <template #extra>
              <el-button type="primary" @click="togglePause">继续</el-button>
            </template>
          </el-result>
        </div>
      </div>

      <div class="controls">
        <p class="hint">使用键盘方向键 ↑↓←→ 或 WASD 控制方向，空格键暂停</p>
        <div class="btn-group">
          <el-button @click="setDir('up')">⬆️ 上</el-button>
          <el-button @click="setDir('down')">⬇️ 下</el-button>
          <el-button @click="setDir('left')">⬅️ 左</el-button>
          <el-button @click="setDir('right')">➡️ 右</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { getTodayGames, playGame } from '@/api/student'

const ROWS = 18
const COLS = 24
const INITIAL_SPEED = 180

const snake = ref([{ r: Math.floor(ROWS / 2), c: Math.floor(COLS / 2) }])
const food = ref({ r: 0, c: 0 })
const dir = ref('right')
const nextDir = ref('right')
const isPlaying = ref(false)
const isPaused = ref(false)
const gameOver = ref(false)
const score = ref(0)
const highScore = ref(parseInt(localStorage.getItem('snake_high_score') || '0'))
const remaining = ref(5)
const timer = ref(null)
const boardRef = ref()

const boardStyle = computed(() => ({
  gridTemplateColumns: `repeat(${COLS}, 24px)`,
  gridTemplateRows: `repeat(${ROWS}, 24px)`
}))

const flatBoard = computed(() => {
  const cells = []
  const head = snake.value[0]
  const bodySet = new Set(snake.value.slice(1).map(s => `${s.r},${s.c}`))
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const isHead = head && head.r === r && head.c === c
      const isBody = bodySet.has(`${r},${c}`)
      const isFood = food.value.r === r && food.value.c === c
      let type = 'empty'
      let cls = 'empty'
      if (isHead) { type = 'head'; cls = 'snake-head'; }
      else if (isBody) { type = 'body'; cls = 'snake-body'; }
      else if (isFood) { type = 'food'; cls = 'food'; }
      cells.push({ type, cls })
    }
  }
  return cells
})

const currentSpeed = computed(() => Math.max(60, INITIAL_SPEED - score.value * 5))

const loadToday = async () => {
  try {
    const { data } = await getTodayGames()
    remaining.value = 5 - (data.snake || 0)
  } catch (e) {}
}

const placeFood = () => {
  const emptyCells = []
  const snakeSet = new Set(snake.value.map(s => `${s.r},${s.c}`))
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!snakeSet.has(`${r},${c}`)) {
        emptyCells.push({ r, c })
      }
    }
  }
  if (emptyCells.length === 0) {
    endGame(true)
    return
  }
  const idx = Math.floor(Math.random() * emptyCells.length)
  food.value = emptyCells[idx]
}

const startGame = async () => {
  clearInterval(timer.value)
  snake.value = [{ r: Math.floor(ROWS / 2), c: Math.floor(COLS / 2) }]
  dir.value = 'right'
  nextDir.value = 'right'
  score.value = 0
  gameOver.value = false
  isPaused.value = false
  isPlaying.value = true
  placeFood()
  timer.value = setInterval(gameTick, currentSpeed.value)
  await nextTick()
  boardRef.value?.focus()
}

const togglePause = () => {
  if (!isPlaying.value || gameOver.value) return
  if (isPaused.value) {
    isPaused.value = false
    timer.value = setInterval(gameTick, currentSpeed.value)
  } else {
    isPaused.value = true
    clearInterval(timer.value)
  }
}

const endGame = async (boardFull = false) => {
  isPlaying.value = false
  gameOver.value = true
  clearInterval(timer.value)
  if (score.value > highScore.value) {
    highScore.value = score.value
    localStorage.setItem('snake_high_score', String(score.value))
  }
  if (boardFull) {
    ElMessage.success('太厉害了！你填满了整个地图！')
  }
  if (remaining.value > 0) {
    remaining.value = Math.max(0, remaining.value - 1)
    try {
      await playGame({ game_type: 'snake', score: score.value, play_time: score.value })
    } catch (e) {}
  }
}

const gameTick = () => {
  dir.value = nextDir.value
  const head = snake.value[0]
  let nr = head.r, nc = head.c
  if (dir.value === 'up') nr--
  else if (dir.value === 'down') nr++
  else if (dir.value === 'left') nc--
  else if (dir.value === 'right') nc++

  // Wall collision
  if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) {
    endGame()
    return
  }

  // Self collision
  if (snake.value.some(s => s.r === nr && s.c === nc)) {
    endGame()
    return
  }

  const newHead = { r: nr, c: nc }
  snake.value = [newHead, ...snake.value]

  // Check food
  if (nr === food.value.r && nc === food.value.c) {
    score.value++
    clearInterval(timer.value)
    timer.value = setInterval(gameTick, currentSpeed.value)
    placeFood()
  } else {
    snake.value = snake.value.slice(0, -1)
  }
}

const handleKey = (e) => {
  const keyDir = {
    ArrowUp: 'up', w: 'up', W: 'up',
    ArrowDown: 'down', s: 'down', S: 'down',
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
    ' ': 'pause'
  }
  const mapped = keyDir[e.key]
  if (!mapped) return
  if (mapped === 'pause') {
    togglePause()
    return
  }
  const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' }
  if (opposites[mapped] !== dir.value) {
    nextDir.value = mapped
  }
}

const setDir = (d) => {
  if (!isPlaying.value || gameOver.value) return
  const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' }
  if (opposites[d] !== dir.value) {
    nextDir.value = d
  }
  boardRef.value?.focus()
}

onMounted(() => {
  loadToday()
  placeFood()
})
onUnmounted(() => {
  clearInterval(timer.value)
})
</script>

<style scoped lang="scss">
.snake-page {
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
    .board-wrapper {
      position: relative;
      .snake-board {
        display: grid;
        gap: 1px;
        background: #2d3a4e;
        padding: 4px;
        border-radius: 8px;
        outline: none;
        .snake-cell {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          background: #1a1a2e;
          border-radius: 2px;
          &.snake-head {
            background: #4ade80;
            border-radius: 6px;
          }
          &.snake-body {
            background: #22c55e;
            border-radius: 4px;
          }
          &.food {
            background: #1a1a2e;
          }
        }
      }
      .game-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.7);
        border-radius: 8px;
        :deep(.el-result__title) { color: #fff; }
        :deep(.el-result__subtitle) { color: #ccc; }
        &.transparent {
          background: rgba(0,0,0,0.55);
        }
      }
    }
    .controls {
      margin-top: 20px;
      text-align: center;
      .hint {
        color: #999;
        font-size: 13px;
        margin-bottom: 12px;
      }
      .btn-group {
        display: flex;
        gap: 8px;
        justify-content: center;
      }
    }
  }
}
</style>
