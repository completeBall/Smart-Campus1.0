<template>
  <div class="sokoban-page">
    <el-page-header title="返回" @back="$router.back()">
      <template #content><span class="page-title">推箱子</span></template>
    </el-page-header>

    <el-card class="info-card">
      <div class="game-info">
        <div class="info-block">
          <span class="label">当前关卡</span>
          <span class="value">{{ currentLevel + 1 }}</span>
        </div>
        <div class="info-block">
          <span class="label">步数</span>
          <span class="value">{{ steps }}</span>
        </div>
        <div class="info-block">
          <span class="label">归位</span>
          <span class="value on-target">{{ boxesOnTarget }} / {{ totalBoxes }}</span>
        </div>
        <div class="info-block">
          <span class="label">今日剩余</span>
          <span class="value">{{ remaining }}/5</span>
        </div>
        <el-button type="primary" size="small" @click="initLevel">重置关卡</el-button>
        <el-button size="small" :disabled="!canUndo" @click="undo">撤销</el-button>
        <el-button size="small" @click="prevLevel" :disabled="currentLevel === 0">上一关</el-button>
        <el-button size="small" @click="nextLevel" :disabled="currentLevel === levels.length - 1">下一关</el-button>
      </div>
    </el-card>

    <el-card class="game-card">
      <div class="board" :style="boardStyle" tabindex="0" @keydown.prevent="handleKey" ref="boardRef">
        <div
          v-for="(cell, index) in flatBoard"
          :key="index"
          class="cell"
          :class="cell.cls"
        >
          <span v-if="cell.content === 'P'" class="entity">🧑</span>
          <span v-else-if="cell.content === 'B'" class="entity">📦</span>
        </div>
      </div>

      <div v-if="win" class="game-result">
        <el-result icon="success" title="恭喜通关！" :sub-title="`步数 ${steps}，耗时 ${elapsed}s`">
          <template #extra>
            <el-button v-if="currentLevel < levels.length - 1" type="primary" @click="nextLevel">下一关</el-button>
            <el-button v-else type="success" disabled>全部通关！</el-button>
          </template>
        </el-result>
      </div>

      <div class="controls">
        <p class="hint">使用键盘方向键 ↑↓←→ 或 WASD 控制移动，U 撤销</p>
        <div class="btn-group">
          <el-button @click="move(-1, 0)">⬆️ 上</el-button>
          <el-button @click="move(1, 0)">⬇️ 下</el-button>
          <el-button @click="move(0, -1)">⬅️ 左</el-button>
          <el-button @click="move(0, 1)">➡️ 右</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { getTodayGames, playGame } from '@/api/student'

// ===== 关卡数据 (标准 Sokoban 记号) =====
// #=墙 .=空地(可踩) $=箱子(在空地) *=箱子(在目标) @=玩家(在空地) +=玩家(在目标)
const RAW_LEVELS = [
  // Level 1 - 入门(单箱)
  [
    '#######',
    '#     #',
    '#  .  #',
    '#  $  #',
    '#  @  #',
    '#     #',
    '#######'
  ],
  // Level 2 - 双箱
  [
    '########',
    '#      #',
    '#  .   #',
    '#  $   #',
    '#  @ . #',
    '#    $ #',
    '#      #',
    '########'
  ],
  // Level 3 - 四箱(四角)
  [
    '#########',
    '#       #',
    '#  .#.  #',
    '#  $ $  #',
    '#   @   #',
    '#  $ $  #',
    '#  .#.  #',
    '#       #',
    '#########'
  ],
  // Level 4 - 走廊
  [
    '########',
    '#  .   #',
    '#  $   #',
    '#   .  #',
    '#   $  #',
    '#  @   #',
    '#   $  #',
    '#   .  #',
    '########'
  ],
  // Level 5 - 终极挑战
  [
    '##########',
    '#  .   . #',
    '#        #',
    '#  $  $  #',
    '#   @    #',
    '#  $  $  #',
    '#        #',
    '#  .   . #',
    '##########'
  ]
]

const currentLevel = ref(0)
const steps = ref(0)
const remaining = ref(5)
const win = ref(false)
const startTime = ref(0)

// 状态
const walls = ref(new Set())
const targets = ref(new Set())
const boxes = ref([])
const player = ref({ r: 0, c: 0 })
const rows = ref(0)
const cols = ref(0)
const boardRef = ref()

// 历史栈用于撤销: [{player, boxes}]
const history = ref([])

const levels = RAW_LEVELS

const totalBoxes = computed(() => boxes.value.length)
const boxesOnTarget = computed(() => boxes.value.filter(b => targets.value.has(`${b.r},${b.c}`)).length)
const canUndo = computed(() => history.value.length > 0)

const elapsed = computed(() => {
  if (!startTime.value) return 0
  return Math.floor((Date.now() - startTime.value) / 1000)
})

const isWall = (r, c) => walls.value.has(`${r},${c}`)
const isTarget = (r, c) => targets.value.has(`${r},${c}`)
const boxAt = (r, c) => boxes.value.find(b => b.r === r && b.c === c)

const flatBoard = computed(() => {
  const arr = []
  for (let r = 0; r < rows.value; r++) {
    for (let c = 0; c < cols.value; c++) {
      const key = `${r},${c}`
      const hasWall = walls.value.has(key)
      const hasTarget = targets.value.has(key)
      const box = boxAt(r, c)
      const hasPlayer = player.value.r === r && player.value.c === c

      if (hasWall) {
        arr.push({ cls: 'wall', content: '' })
      } else if (hasTarget && box) {
        arr.push({ cls: 'target box-on-target', content: 'B' })
      } else if (hasTarget && hasPlayer) {
        arr.push({ cls: 'target', content: 'P' })
      } else if (hasTarget) {
        arr.push({ cls: 'target', content: '' })
      } else if (box) {
        arr.push({ cls: 'box', content: 'B' })
      } else if (hasPlayer) {
        arr.push({ cls: 'floor', content: 'P' })
      } else {
        arr.push({ cls: 'floor', content: '' })
      }
    }
  }
  return arr
})

const boardStyle = computed(() => ({
  gridTemplateColumns: `repeat(${cols.value}, 40px)`,
  gridTemplateRows: `repeat(${rows.value}, 40px)`
}))

const loadToday = async () => {
  try {
    const { data } = await getTodayGames()
    remaining.value = 5 - (data.sokoban || 0)
  } catch (e) {}
}

const initLevel = () => {
  const level = levels[currentLevel.value]
  rows.value = level.length
  cols.value = Math.max(...level.map(row => row.length))

  walls.value = new Set()
  targets.value = new Set()
  boxes.value = []
  player.value = { r: 0, c: 0 }
  history.value = []

  level.forEach((rowStr, r) => {
    for (let c = 0; c < rowStr.length; c++) {
      const ch = rowStr[c]
      if (ch === '#') walls.value.add(`${r},${c}`)
      else if (ch === '.') targets.value.add(`${r},${c}`)
      else if (ch === '$') boxes.value.push({ r, c })
      else if (ch === '*') {
        targets.value.add(`${r},${c}`)
        boxes.value.push({ r, c })
      }
      else if (ch === '@') player.value = { r, c }
      else if (ch === '+') {
        targets.value.add(`${r},${c}`)
        player.value = { r, c }
      }
    }
  })

  steps.value = 0
  win.value = false
  startTime.value = Date.now()
  nextTick(() => boardRef.value?.focus())
}

const pushHistory = () => {
  history.value.push({
    player: { ...player.value },
    boxes: boxes.value.map(b => ({ ...b }))
  })
}

const undo = () => {
  if (history.value.length === 0 || win.value) return
  const last = history.value.pop()
  player.value = last.player
  boxes.value = last.boxes
  steps.value = Math.max(0, steps.value - 1)
}

const checkWin = async () => {
  if (win.value) return
  const allOnTarget = boxes.value.every(b => targets.value.has(`${b.r},${b.c}`))
  if (allOnTarget && boxes.value.length > 0) {
    win.value = true
    const elapsedSec = elapsed.value
    ElMessage.success(`恭喜通关！步数 ${steps.value}，耗时 ${elapsedSec}s`)
    if (remaining.value > 0) {
      remaining.value = Math.max(0, remaining.value - 1)
      try {
        await playGame({
          game_type: 'sokoban',
          score: steps.value,
          level: String(currentLevel.value + 1),
          play_time: elapsedSec
        })
      } catch (e) {}
    }
  }
}

const move = (dr, dc) => {
  if (win.value) return
  const nr = player.value.r + dr
  const nc = player.value.c + dc

  if (isWall(nr, nc)) return

  const targetBox = boxAt(nr, nc)
  if (targetBox) {
    const br = nr + dr
    const bc = nc + dc
    if (isWall(br, bc) || boxAt(br, bc)) return
    pushHistory()
    targetBox.r = br
    targetBox.c = bc
  } else {
    pushHistory()
  }

  player.value = { r: nr, c: nc }
  steps.value++
  checkWin()
}

const handleKey = (e) => {
  const keyMap = {
    ArrowUp: [-1, 0], w: [-1, 0], W: [-1, 0],
    ArrowDown: [1, 0], s: [1, 0], S: [1, 0],
    ArrowLeft: [0, -1], a: [0, -1], A: [0, -1],
    ArrowRight: [0, 1], d: [0, 1], D: [0, 1]
  }
  const d = keyMap[e.key]
  if (d) move(d[0], d[1])
  else if (e.key === 'u' || e.key === 'U') undo()
}

const prevLevel = () => {
  if (currentLevel.value > 0) {
    currentLevel.value--
    initLevel()
  }
}

const nextLevel = () => {
  if (currentLevel.value < levels.length - 1) {
    currentLevel.value++
    initLevel()
  }
}

onMounted(() => {
  loadToday()
  initLevel()
})
onUnmounted(() => {})
</script>

<style scoped lang="scss">
.sokoban-page {
  .page-title { font-size: 18px; font-weight: 600; }
  .on-target { color: #67c23a; }

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
    .board {
      display: grid;
      gap: 1px;
      background: #8b7355;
      padding: 8px;
      border-radius: 8px;
      outline: none;
      .cell {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        position: relative;
        transition: background 0.15s;
        &.wall {
          background: #5d4037;
          border-radius: 2px;
        }
        &.floor {
          background: #d7ccc8;
        }
        &.target {
          background: #d7ccc8;
          &::before {
            content: '';
            width: 12px;
            height: 12px;
            background: #81c784;
            border-radius: 50%;
            opacity: 0.55;
            position: absolute;
            box-shadow: inset 0 0 4px rgba(0,0,0,0.1);
          }
        }
        &.box {
          background: #ffcc80;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        &.box-on-target {
          background: #a5d6a7;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
      }
    }
    .game-result {
      margin-top: 20px;
      width: 100%;
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
