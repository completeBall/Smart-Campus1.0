<template>
  <div class="tetris-page">
    <el-page-header title="返回" @back="$router.back()">
      <template #content><span class="page-title">俄罗斯方块</span></template>
    </el-page-header>

    <el-card class="info-card">
      <div class="game-info">
        <div class="info-block"><span class="label">得分</span><span class="value">{{ score }}</span></div>
        <div class="info-block"><span class="label">等级</span><span class="value">{{ level }}</span></div>
        <div class="info-block"><span class="label">消行</span><span class="value">{{ lines }}</span></div>
        <div class="info-block"><span class="label">今日剩余</span><span class="value">{{ remaining }}/5</span></div>
        <el-button type="primary" size="small" @click="startGame">{{ playing ? '重新开始' : '开始游戏' }}</el-button>
        <el-button size="small" :disabled="!playing || gameOver" @click="togglePause">{{ paused ? '继续' : '暂停' }}</el-button>
      </div>
    </el-card>

    <el-card class="game-card">
      <div class="play-layout">
        <div class="board-shell" tabindex="0" ref="boardRef" @keydown.prevent="handleKey">
          <div class="tetris-board">
            <div v-for="(cell, i) in visibleBoard" :key="i" class="cell" :class="cell"></div>
          </div>
          <div v-if="!playing" class="overlay">
            <strong>高压训练版</strong>
            <span>方向键移动，↑ 旋转，空格硬降，P 暂停</span>
          </div>
          <div v-else-if="paused" class="overlay"><strong>已暂停</strong><span>按 P 或点击继续</span></div>
          <div v-else-if="gameOver" class="overlay"><strong>游戏结束</strong><span>最终得分 {{ score }}</span></div>
        </div>

        <aside class="side-box">
          <div class="panel">
            <h4>下一个</h4>
            <div class="mini-board">
              <div v-for="(cell, i) in nextPreview" :key="i" class="mini-cell" :class="cell"></div>
            </div>
          </div>
          <div class="panel">
            <h4>规则加压</h4>
            <p>等级越高下落越快，硬降加分，连续消行有倍率奖励。</p>
          </div>
          <div class="mobile-controls">
            <el-button @click="move(-1)">左</el-button>
            <el-button @click="rotatePiece">旋转</el-button>
            <el-button @click="move(1)">右</el-button>
            <el-button type="primary" @click="hardDrop">硬降</el-button>
          </div>
        </aside>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getTodayGames, playGame } from '@/api/student'

const ROWS = 20
const COLS = 10
const SHAPES = {
  I: [[1, 1, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  T: [[0, 1, 0], [1, 1, 1]],
  Z: [[1, 1, 0], [0, 1, 1]]
}
const TYPES = Object.keys(SHAPES)

const board = ref(createBoard())
const current = ref(null)
const next = ref(randomPiece())
const score = ref(0)
const lines = ref(0)
const remaining = ref(5)
const playing = ref(false)
const paused = ref(false)
const gameOver = ref(false)
const boardRef = ref()
let timer = null

const level = computed(() => Math.max(1, Math.floor(lines.value / 4) + 1))
const speed = computed(() => Math.max(130, 720 - level.value * 70))

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(''))
}
function randomPiece() {
  const type = TYPES[Math.floor(Math.random() * TYPES.length)]
  return { type, shape: SHAPES[type].map(row => [...row]), r: 0, c: Math.floor(COLS / 2) - 2 }
}

const visibleBoard = computed(() => {
  const copy = board.value.map(row => [...row])
  if (current.value) {
    current.value.shape.forEach((row, r) => row.forEach((v, c) => {
      const br = current.value.r + r
      const bc = current.value.c + c
      if (v && br >= 0 && br < ROWS && bc >= 0 && bc < COLS) copy[br][bc] = current.value.type
    }))
  }
  return copy.flat()
})

const nextPreview = computed(() => {
  const cells = Array(16).fill('')
  next.value.shape.forEach((row, r) => row.forEach((v, c) => {
    if (v) cells[(r + 1) * 4 + c] = next.value.type
  }))
  return cells
})

const loadToday = async () => {
  try {
    const { data } = await getTodayGames()
    remaining.value = Math.max(0, 5 - (data?.tetris || 0))
  } catch (e) {}
}

const collides = (piece, dr = 0, dc = 0, shape = piece.shape) => {
  return shape.some((row, r) => row.some((v, c) => {
    if (!v) return false
    const nr = piece.r + r + dr
    const nc = piece.c + c + dc
    return nc < 0 || nc >= COLS || nr >= ROWS || (nr >= 0 && board.value[nr][nc])
  }))
}

const spawn = () => {
  current.value = next.value
  current.value.r = 0
  current.value.c = Math.floor(COLS / 2) - 2
  next.value = randomPiece()
  if (collides(current.value)) endGame()
}

const lockPiece = () => {
  current.value.shape.forEach((row, r) => row.forEach((v, c) => {
    const br = current.value.r + r
    const bc = current.value.c + c
    if (v && br >= 0) board.value[br][bc] = current.value.type
  }))
  clearLines()
  spawn()
}

const clearLines = () => {
  const kept = board.value.filter(row => row.some(cell => !cell))
  const cleared = ROWS - kept.length
  if (!cleared) return
  board.value = [...Array.from({ length: cleared }, () => Array(COLS).fill('')), ...kept]
  lines.value += cleared
  score.value += [0, 100, 260, 460, 760][cleared] * level.value
}

const tick = () => {
  if (!playing.value || paused.value || gameOver.value) return
  if (!collides(current.value, 1, 0)) current.value.r++
  else lockPiece()
}

const resetTimer = () => {
  clearInterval(timer)
  timer = setInterval(tick, speed.value)
}

const startGame = async () => {
  board.value = createBoard()
  score.value = 0
  lines.value = 0
  next.value = randomPiece()
  playing.value = true
  paused.value = false
  gameOver.value = false
  spawn()
  resetTimer()
  await nextTick()
  boardRef.value?.focus()
}

const togglePause = () => { paused.value = !paused.value; boardRef.value?.focus() }
const move = (dc) => { if (current.value && !collides(current.value, 0, dc)) current.value.c += dc; boardRef.value?.focus() }
const softDrop = () => { if (current.value && !collides(current.value, 1, 0)) { current.value.r++; score.value += 1 } }
const hardDrop = () => {
  if (!current.value || gameOver.value || paused.value) return
  let steps = 0
  while (!collides(current.value, 1, 0)) { current.value.r++; steps++ }
  score.value += steps * 3
  lockPiece()
  boardRef.value?.focus()
}
const rotatePiece = () => {
  if (!current.value || current.value.type === 'O') return
  const rotated = current.value.shape[0].map((_, i) => current.value.shape.map(row => row[i]).reverse())
  if (!collides(current.value, 0, 0, rotated)) current.value.shape = rotated
  boardRef.value?.focus()
}

const handleKey = (e) => {
  if (e.key.toLowerCase() === 'p') return togglePause()
  if (!playing.value || paused.value || gameOver.value) return
  if (e.key === 'ArrowLeft') move(-1)
  else if (e.key === 'ArrowRight') move(1)
  else if (e.key === 'ArrowDown') softDrop()
  else if (e.key === 'ArrowUp') rotatePiece()
  else if (e.key === ' ') hardDrop()
}

const endGame = async () => {
  gameOver.value = true
  playing.value = false
  clearInterval(timer)
  if (remaining.value > 0) {
    remaining.value = Math.max(0, remaining.value - 1)
    try {
      await playGame({ game_type: 'tetris', score: score.value, level: `L${level.value}`, play_time: lines.value })
    } catch (e) {
      ElMessage.warning(e.response?.data?.message || '成绩保存失败')
    }
  }
}

onMounted(loadToday)
onUnmounted(() => clearInterval(timer))
</script>

<style scoped lang="scss">
.tetris-page {
  .page-title { font-size: 18px; font-weight: 600; }
  .info-card { margin: 16px 0; }
  .game-info { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .info-block {
    min-width: 120px; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 10px; background: #f8fafc;
    .label { display: block; color: #64748b; font-size: 12px; }
    .value { color: #0f172a; font-size: 22px; font-weight: 800; }
  }
  .play-layout { display: grid; grid-template-columns: max-content 260px; gap: 22px; justify-content: center; align-items: start; }
  .board-shell { position: relative; outline: none; }
  .tetris-board {
    display: grid; grid-template-columns: repeat(10, 28px); grid-template-rows: repeat(20, 28px);
    padding: 10px; border-radius: 18px; background: #0f172a; box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
  }
  .cell, .mini-cell { border: 1px solid rgba(255,255,255,.08); background: rgba(148,163,184,.08); }
  .cell.I, .mini-cell.I { background: #22d3ee; }
  .cell.J, .mini-cell.J { background: #2563eb; }
  .cell.L, .mini-cell.L { background: #f97316; }
  .cell.O, .mini-cell.O { background: #facc15; }
  .cell.S, .mini-cell.S { background: #22c55e; }
  .cell.T, .mini-cell.T { background: #a855f7; }
  .cell.Z, .mini-cell.Z { background: #ef4444; }
  .overlay {
    position: absolute; inset: 10px; display: grid; place-content: center; gap: 8px; text-align: center;
    color: #eaf2ff; background: rgba(15,23,42,.76); border-radius: 12px;
    strong { font-size: 24px; }
    span { color: #cbd5e1; }
  }
  .side-box { display: grid; gap: 14px; }
  .panel { padding: 16px; border-radius: 16px; border: 1px solid #e5e7eb; background: #fff; }
  .panel h4 { margin: 0 0 12px; }
  .panel p { color: #64748b; line-height: 1.7; margin: 0; }
  .mini-board { display: grid; grid-template-columns: repeat(4, 24px); grid-template-rows: repeat(4, 24px); gap: 2px; }
  .mobile-controls { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
}
:root[data-theme="dark"] .tetris-page .info-block,
:root[data-theme="dark"] .tetris-page .panel { background: #111b2b; border-color: #243750; }
:root[data-theme="dark"] .tetris-page .info-block .value,
:root[data-theme="dark"] .tetris-page .panel h4 { color: #eef4fc; }
@media (max-width: 900px) {
  .tetris-page .play-layout { grid-template-columns: 1fr; justify-items: center; }
}
</style>
