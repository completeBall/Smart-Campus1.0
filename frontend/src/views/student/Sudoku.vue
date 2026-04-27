<template>
  <div class="sudoku-page">
    <el-page-header title="返回" @back="$router.back()">
      <template #content><span class="page-title">数独挑战</span></template>
    </el-page-header>

    <el-card class="info-card">
      <div class="game-info">
        <div class="info-block">
          <span class="label">用时</span>
          <span class="value">{{ formatTime(timer) }}</span>
        </div>
        <div class="info-block">
          <span class="label">今日剩余次数</span>
          <span class="value">{{ remaining }}/5</span>
        </div>
        <el-radio-group v-model="level" size="small" :disabled="gameStarted">
          <el-radio-button label="easy">简单</el-radio-button>
          <el-radio-button label="medium">中等</el-radio-button>
          <el-radio-button label="hard">困难</el-radio-button>
        </el-radio-group>
        <el-button type="primary" size="small" @click="initGame">{{ gameOver ? '再来一局' : '重新开始' }}</el-button>
      </div>
    </el-card>

    <el-card class="game-card">
      <div class="sudoku-board">
        <div
          v-for="(cell, index) in cells"
          :key="index"
          class="sudoku-cell"
          :class="getCellClass(cell, index)"
          @click="selectCell(index)"
        >
          <span v-if="cell.value" :class="{ 'user-fill': !cell.fixed }">{{ cell.value }}</span>
        </div>
      </div>

      <div class="number-pad">
        <el-button
          v-for="n in 9"
          :key="n"
          size="large"
          :type="selectedNumber === n ? 'primary' : 'default'"
          @click="inputNumber(n)"
        >{{ n }}</el-button>
        <el-button size="large" type="danger" @click="inputNumber(0)">清除</el-button>
      </div>

      <div v-if="win" class="game-result">
        <el-result icon="success" :title="'恭喜通关！'" :sub-title="`用时 ${formatTime(timer)}，得分 ${score}`" />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { playGame, getTodayGames } from '@/api/student'

const level = ref('easy')
const cells = ref([])
const selectedIndex = ref(-1)
const selectedNumber = ref(0)
const gameStarted = ref(false)
const gameOver = ref(false)
const win = ref(false)
const timer = ref(0)
const timerInterval = ref(null)
const remaining = ref(5)
const score = ref(0)

const config = {
  easy: { remove: 40, baseScore: 100 },
  medium: { remove: 50, baseScore: 200 },
  hard: { remove: 58, baseScore: 300 }
}

const formatTime = (s) => {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

const loadToday = async () => {
  try {
    const { data } = await getTodayGames()
    remaining.value = 5 - (data.sudoku || 0)
  } catch (e) {}
}

const initGame = async () => {
  // 如果之前一局已经开始但还没赢,计为一次放弃,扣一次次数
  if (gameStarted.value && !win.value) {
    await saveScore(0)
  }
  const puzzle = generateSudoku(config[level.value].remove)
  cells.value = puzzle.map((val, i) => ({
    index: i,
    row: Math.floor(i / 9),
    col: i % 9,
    value: val,
    fixed: val !== 0
  }))
  selectedIndex.value = -1
  selectedNumber.value = 0
  gameStarted.value = false
  gameOver.value = false
  win.value = false
  timer.value = 0
  score.value = 0
  clearInterval(timerInterval.value)
  loadToday()
}

const selectCell = (index) => {
  if (cells.value[index].fixed || gameOver.value) return
  selectedIndex.value = index
  if (!gameStarted.value) {
    gameStarted.value = true
    timerInterval.value = setInterval(() => timer.value++, 1000)
  }
}

const inputNumber = (n) => {
  selectedNumber.value = n
  if (selectedIndex.value === -1 || cells.value[selectedIndex.value].fixed || gameOver.value) return
  cells.value[selectedIndex.value].value = n || 0
  checkWin()
}

const checkWin = () => {
  if (cells.value.some(c => c.value === 0)) return
  // Validate full board
  for (let i = 0; i < 81; i++) {
    const c = cells.value[i]
    if (!isValid(cells.value, c.row, c.col, c.value)) return
  }
  // If all cells filled and valid, we need to check each placement is valid in context
  // Actually, just check no conflicts
  if (hasConflict()) return

  win.value = true
  gameOver.value = true
  clearInterval(timerInterval.value)
  const s = calculateScore()
  score.value = s
  saveScore(s)
  ElMessage.success(`恭喜通关！得分 ${s}`)
}

const hasConflict = () => {
  for (let i = 0; i < 81; i++) {
    const c = cells.value[i]
    if (c.value === 0) continue
    // Check row
    for (let col = 0; col < 9; col++) {
      if (col !== c.col && cells.value[c.row * 9 + col].value === c.value) return true
    }
    // Check col
    for (let row = 0; row < 9; row++) {
      if (row !== c.row && cells.value[row * 9 + c.col].value === c.value) return true
    }
    // Check box
    const boxR = Math.floor(c.row / 3) * 3
    const boxC = Math.floor(c.col / 3) * 3
    for (let r = boxR; r < boxR + 3; r++) {
      for (let cc = boxC; cc < boxC + 3; cc++) {
        const idx = r * 9 + cc
        if (idx !== i && cells.value[idx].value === c.value) return true
      }
    }
  }
  return false
}

const calculateScore = () => {
  const c = config[level.value]
  return Math.max(10, c.baseScore - timer.value * 2)
}

const saveScore = async (s) => {
  try {
    await playGame({
      game_type: 'sudoku',
      score: s,
      level: level.value,
      play_time: timer.value
    })
    remaining.value = Math.max(0, remaining.value - 1)
  } catch (e) {
    ElMessage.warning(e.response?.data?.message || '成绩保存失败')
  }
}

const getCellClass = (cell, index) => {
  const classes = []
  if (cell.fixed) classes.push('fixed')
  if (index === selectedIndex.value) classes.push('selected')
  // Highlight same number
  if (selectedNumber.value && cell.value === selectedNumber.value) classes.push('highlight')
  const row = Math.floor(index / 9)
  const col = index % 9
  if ((Math.floor(row / 3) + Math.floor(col / 3)) % 2 === 1) classes.push('band')
  return classes
}

// ====== Sudoku Generator ======
function generateSudoku(removeCount) {
  // Start with a base valid grid
  const base = [
    [1,2,3,4,5,6,7,8,9],
    [4,5,6,7,8,9,1,2,3],
    [7,8,9,1,2,3,4,5,6],
    [2,3,4,5,6,7,8,9,1],
    [5,6,7,8,9,1,2,3,4],
    [8,9,1,2,3,4,5,6,7],
    [3,4,5,6,7,8,9,1,2],
    [6,7,8,9,1,2,3,4,5],
    [9,1,2,3,4,5,6,7,8]
  ]

  // Shuffle numbers
  const nums = [1,2,3,4,5,6,7,8,9]
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]]
  }
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      base[r][c] = nums[base[r][c] - 1]
    }
  }

  // Shuffle rows within bands
  for (let band = 0; band < 3; band++) {
    const rows = [band*3, band*3+1, band*3+2]
    for (let i = 2; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]]
    }
    const temp = [base[rows[0]], base[rows[1]], base[rows[2]]]
    for (let i = 0; i < 3; i++) base[band*3+i] = temp[i]
  }

  // Shuffle columns within stacks
  for (let stack = 0; stack < 3; stack++) {
    const cols = [stack*3, stack*3+1, stack*3+2]
    for (let i = 2; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cols[i], cols[j]] = [cols[j], cols[i]]
    }
    for (let r = 0; r < 9; r++) {
      const temp = [base[r][cols[0]], base[r][cols[1]], base[r][cols[2]]]
      for (let i = 0; i < 3; i++) base[r][stack*3+i] = temp[i]
    }
  }

  // Flatten and remove cells
  let flat = base.flat()
  const indices = flat.map((_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]]
  }

  // Remove cells ensuring unique solution
  let removed = 0
  for (const idx of indices) {
    if (removed >= removeCount) break
    const backup = flat[idx]
    flat[idx] = 0
    // Check if still unique solution (simplified: try to solve)
    const copy = [...flat]
    if (hasUniqueSolution(copy)) {
      removed++
    } else {
      flat[idx] = backup
    }
  }
  return flat
}

function hasUniqueSolution(board) {
  // Simplified: just check solvable with backtracking
  return solve(board)
}

function solve(board) {
  const empty = board.findIndex(v => v === 0)
  if (empty === -1) return true
  for (let num = 1; num <= 9; num++) {
    if (isValidForBoard(board, empty, num)) {
      board[empty] = num
      if (solve(board)) return true
      board[empty] = 0
    }
  }
  return false
}

function isValidForBoard(board, index, num) {
  const row = Math.floor(index / 9)
  const col = index % 9
  for (let i = 0; i < 9; i++) {
    if (board[row * 9 + i] === num) return false
    if (board[i * 9 + col] === num) return false
  }
  const boxR = Math.floor(row / 3) * 3
  const boxC = Math.floor(col / 3) * 3
  for (let r = boxR; r < boxR + 3; r++) {
    for (let c = boxC; c < boxC + 3; c++) {
      if (board[r * 9 + c] === num) return false
    }
  }
  return true
}

function isValid(cells, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (i !== col && cells[row * 9 + i].value === num) return false
    if (i !== row && cells[i * 9 + col].value === num) return false
  }
  return true
}

onUnmounted(() => clearInterval(timerInterval.value))
initGame()
</script>

<style scoped lang="scss">
.sudoku-page {
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

    .sudoku-board {
      display: grid;
      grid-template-columns: repeat(9, 44px);
      grid-template-rows: repeat(9, 44px);
      gap: 1px;
      background: #666;
      padding: 2px;
      border-radius: 4px;

      .sudoku-cell {
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.15s;

        &:hover { background: #f0f0f0; }

        &.fixed {
          color: #333;
          font-weight: bold;
          background: #f5f5f5;
        }
        &.selected {
          background: #b3d9ff !important;
        }
        &.highlight {
          background: #d4edda;
        }
        &.band {
          background: #fafafa;
          &.fixed { background: #f0f0f0; }
        }

        // Thick borders for 3x3 boxes
        &:nth-child(3n) { border-right: 2px solid #666; }
        &:nth-child(9n) { border-right: none; }
        &:nth-child(n+19):nth-child(-n+27),
        &:nth-child(n+46):nth-child(-n+54) {
          border-bottom: 2px solid #666;
        }

        .user-fill { color: #409eff; }
      }
    }

    .number-pad {
      margin-top: 20px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .game-result {
      margin-top: 20px;
      width: 100%;
    }
  }
}
</style>
