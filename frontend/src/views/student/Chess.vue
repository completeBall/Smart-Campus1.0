<template>
  <div class="chess-page">
    <el-page-header @back="$router.back()">
      <template #content>
        <span class="page-title">中国象棋人机对战</span>
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
          <el-tag size="large" :type="turn === 'red' ? 'danger' : 'info'">
            {{ turn === 'red' ? '你的回合(红方)' : 'AI思考中...' }}
          </el-tag>
        </div>
        <div class="info-right">
          <el-button type="primary" size="small" @click="initGame">{{ gameOver ? '再来一局' : '重新开始' }}</el-button>
        </div>
      </div>
    </el-card>

    <el-card class="board-card">
      <div class="board" :class="{ 'ai-thinking': aiThinking }">
        <!-- 棋盘背景 (横9 * 纵10),每格52px -->
        <div class="board-bg">
          <!-- 横线 -->
          <div v-for="r in 10" :key="'row-'+r" class="grid-row" :style="{ top: `${(r - 1) * 52}px` }"></div>
          <!-- 竖线(分上下两段,中间为楚河汉界) -->
          <template v-for="c in 9" :key="'col-'+c">
            <div class="grid-col-top" :style="{ left: `${(c - 1) * 52}px` }"></div>
            <div class="grid-col-bot" :style="{ left: `${(c - 1) * 52}px` }"></div>
          </template>
          <!-- 九宫格斜线 -->
          <div class="palace-line palace-top-1"></div>
          <div class="palace-line palace-top-2"></div>
          <div class="palace-line palace-bot-1"></div>
          <div class="palace-line palace-bot-2"></div>
          <!-- 楚河汉界 -->
          <div class="river">
            <span class="river-text-l">楚 河</span>
            <span class="river-text-r">汉 界</span>
          </div>
        </div>

        <!-- 棋子(每格52,棋子直径44,中心偏移26-22=4) -->
        <div
          v-for="(p, i) in board"
          :key="'cell-'+i"
          class="cell-hit"
          :style="{ top: `${Math.floor(i/9) * 52}px`, left: `${(i%9) * 52}px` }"
          @click="onCellClick(i)"
        >
          <div
            v-if="p"
            :class="['piece', p.color, { selected: selectedIdx === i, 'last-move': i === lastMove }]"
          >
            {{ pieceLabel(p) }}
          </div>
          <div v-if="validMoves.includes(i)" class="hint" :class="{ capture: !!p }"></div>
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

const COLS = 9
const ROWS = 10

const level = ref('easy')
const board = ref(Array(COLS * ROWS).fill(null)) // {type, color}
const turn = ref('red')
const selectedIdx = ref(-1)
const validMoves = ref([])
const gameStarted = ref(false)
const gameOver = ref(false)
const winColor = ref('') // 'red' 或 'black'
const lastMove = ref(-1)
const moveCount = ref(0)
const remaining = ref(5)
const aiThinking = ref(false)

// 棋子类型(英文标识 + 中文显示)
const PIECE = { JU: 'ju', MA: 'ma', PAO: 'pao', XIANG: 'xiang', SHI: 'shi', JIANG: 'jiang', BING: 'bing' }

const PIECE_LABELS = {
  red: { ju: '车', ma: '马', pao: '炮', xiang: '相', shi: '仕', jiang: '帅', bing: '兵' },
  black: { ju: '車', ma: '馬', pao: '砲', xiang: '象', shi: '士', jiang: '将', bing: '卒' }
}

const PIECE_VALUE = {
  ju: 9, ma: 4, pao: 4.5, xiang: 2, shi: 2, jiang: 10000, bing: 1
}

const pieceLabel = (p) => PIECE_LABELS[p.color][p.type]

const resultIcon = computed(() => winColor.value === 'red' ? 'success' : 'error')
const resultTitle = computed(() => {
  if (winColor.value === 'red') return '恭喜你赢了!'
  if (winColor.value === 'black') return '电脑赢了'
  return '平局'
})
const resultSubtitle = computed(() => {
  if (!gameOver.value) return ''
  return `共 ${moveCount.value} 步 · 难度 ${levelLabel.value} · 得分 ${calculateScore()}`
})
const levelLabel = computed(() => ({ easy: '简单', medium: '中等', hard: '困难' }[level.value]))

const idx = (r, c) => r * COLS + c
const rcOf = (i) => ({ r: Math.floor(i / COLS), c: i % COLS })

const initBoard = () => {
  const b = Array(COLS * ROWS).fill(null)
  // 黑方(顶部,row 0-4)
  const blackBack = ['ju','ma','xiang','shi','jiang','shi','xiang','ma','ju']
  blackBack.forEach((t, c) => { b[idx(0, c)] = { type: t, color: 'black' } })
  b[idx(2, 1)] = { type: 'pao', color: 'black' }
  b[idx(2, 7)] = { type: 'pao', color: 'black' }
  for (let c = 0; c < COLS; c += 2) b[idx(3, c)] = { type: 'bing', color: 'black' }
  // 红方(底部,row 5-9)
  const redBack = ['ju','ma','xiang','shi','jiang','shi','xiang','ma','ju']
  redBack.forEach((t, c) => { b[idx(9, c)] = { type: t, color: 'red' } })
  b[idx(7, 1)] = { type: 'pao', color: 'red' }
  b[idx(7, 7)] = { type: 'pao', color: 'red' }
  for (let c = 0; c < COLS; c += 2) b[idx(6, c)] = { type: 'bing', color: 'red' }
  return b
}

const loadToday = async () => {
  try {
    const { data } = await getTodayGames()
    remaining.value = Math.max(0, 5 - (data.chess || 0))
  } catch (e) {}
}

const initGame = async () => {
  if (gameStarted.value && !gameOver.value) {
    await saveScore(0)
  }
  board.value = initBoard()
  turn.value = 'red'
  selectedIdx.value = -1
  validMoves.value = []
  gameStarted.value = false
  gameOver.value = false
  winColor.value = ''
  lastMove.value = -1
  moveCount.value = 0
  aiThinking.value = false
  loadToday()
}

const onCellClick = (i) => {
  if (gameOver.value || aiThinking.value || turn.value !== 'red') return
  if (remaining.value === 0 && !gameStarted.value) {
    ElMessage.warning('今日次数已用完')
    return
  }
  const p = board.value[i]
  // 已选中棋子,点击合法位置→落子
  if (selectedIdx.value !== -1 && validMoves.value.includes(i)) {
    movePiece(selectedIdx.value, i)
    selectedIdx.value = -1
    validMoves.value = []
    return
  }
  // 选中己方棋子
  if (p && p.color === 'red') {
    selectedIdx.value = i
    validMoves.value = generateMovesFor(board.value, i)
  } else {
    selectedIdx.value = -1
    validMoves.value = []
  }
}

const movePiece = (from, to) => {
  gameStarted.value = true
  const captured = board.value[to]
  board.value[to] = board.value[from]
  board.value[from] = null
  lastMove.value = to
  moveCount.value++
  // 是否吃掉对方将/帅
  if (captured && captured.type === 'jiang') {
    winColor.value = board.value[to].color
    gameOver.value = true
    saveScore(winColor.value === 'red' ? calculateScore() : 0)
    return
  }
  turn.value = turn.value === 'red' ? 'black' : 'red'
  if (turn.value === 'black') {
    setTimeout(aiMove, 400)
  }
}

const aiMove = () => {
  if (gameOver.value) return
  aiThinking.value = true
  const move = chooseAiMove()
  if (!move) {
    gameOver.value = true
    winColor.value = 'red'
    saveScore(calculateScore())
    aiThinking.value = false
    return
  }
  movePiece(move.from, move.to)
  aiThinking.value = false
}

// ============ AI 决策 ============
const chooseAiMove = () => {
  const moves = generateAllMoves(board.value, 'black')
  if (moves.length === 0) return null
  // 优先级:能吃将必吃,否则按难度
  for (const m of moves) {
    const target = board.value[m.to]
    if (target && target.type === 'jiang') return m
  }
  if (level.value === 'easy') {
    // 50% 随机最优,50% 全随机
    if (Math.random() < 0.5) {
      return moves[Math.floor(Math.random() * moves.length)]
    }
    return greedyBestMove(board.value, 'black', moves)
  } else if (level.value === 'medium') {
    return greedyBestMove(board.value, 'black', moves)
  } else {
    // 困难:简易 minimax 深度2
    return minimaxRoot(board.value, 'black', 2)
  }
}

const greedyBestMove = (b, color, moves) => {
  let best = null
  let bestScore = -Infinity
  for (const m of moves) {
    const captured = b[m.to]
    let score = captured ? PIECE_VALUE[captured.type] * 100 : 0
    score += positionalBonus(m, b[m.from], color)
    score += Math.random() * 5 // 防止僵局,稍微扰动
    if (score > bestScore) { bestScore = score; best = m }
  }
  return best
}

const positionalBonus = (m, piece, color) => {
  const { r: tr, c: tc } = rcOf(m.to)
  let s = 0
  // 兵过河给奖励
  if (piece.type === 'bing') {
    if (color === 'black' && tr >= 5) s += 2
    if (color === 'red' && tr <= 4) s += 2
  }
  // 中路靠近对方一些
  s += (4 - Math.abs(tc - 4)) * 0.3
  return s
}

const minimaxRoot = (b, color, depth) => {
  const moves = generateAllMoves(b, color)
  if (moves.length === 0) return null
  let best = null
  let bestScore = -Infinity
  for (const m of moves) {
    const undo = applyMove(b, m)
    const score = -minimax(b, opp(color), depth - 1, -Infinity, Infinity)
    revertMove(b, m, undo)
    if (score > bestScore) { bestScore = score; best = m }
  }
  return best
}

const minimax = (b, color, depth, alpha, beta) => {
  if (depth <= 0) return evalBoard(b, opp(color))
  const moves = generateAllMoves(b, color)
  if (moves.length === 0) return -100000
  let best = -Infinity
  for (const m of moves) {
    const target = b[m.to]
    // 吃将立即返回最大
    if (target && target.type === 'jiang') return 100000
    const undo = applyMove(b, m)
    const score = -minimax(b, opp(color), depth - 1, -beta, -alpha)
    revertMove(b, m, undo)
    if (score > best) best = score
    if (best > alpha) alpha = best
    if (alpha >= beta) break
  }
  return best
}

const opp = (c) => c === 'red' ? 'black' : 'red'

const applyMove = (b, m) => {
  const capt = b[m.to]
  b[m.to] = b[m.from]
  b[m.from] = null
  return capt
}
const revertMove = (b, m, capt) => {
  b[m.from] = b[m.to]
  b[m.to] = capt
}

// 从一方视角评估局面:正值表示对该方有利
const evalBoard = (b, color) => {
  let score = 0
  for (let i = 0; i < b.length; i++) {
    const p = b[i]
    if (!p) continue
    const v = PIECE_VALUE[p.type] * 100
    score += p.color === color ? v : -v
  }
  return score
}

const generateAllMoves = (b, color) => {
  const moves = []
  for (let i = 0; i < b.length; i++) {
    const p = b[i]
    if (!p || p.color !== color) continue
    const dests = generateMovesFor(b, i)
    for (const d of dests) moves.push({ from: i, to: d })
  }
  return moves
}

// ============ 走法生成 ============
const generateMovesFor = (b, from) => {
  const piece = b[from]
  if (!piece) return []
  const { r, c } = rcOf(from)
  const dests = []
  const inBoard = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS
  const friend = (r, c) => {
    const t = b[idx(r, c)]
    return t && t.color === piece.color
  }
  const enemy = (r, c) => {
    const t = b[idx(r, c)]
    return t && t.color !== piece.color
  }
  const empty = (r, c) => b[idx(r, c)] === null

  switch (piece.type) {
    case 'ju': {
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]]
      for (const [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc
        while (inBoard(nr, nc)) {
          if (empty(nr, nc)) dests.push(idx(nr, nc))
          else { if (enemy(nr, nc)) dests.push(idx(nr, nc)); break }
          nr += dr; nc += dc
        }
      }
      break
    }
    case 'pao': {
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]]
      for (const [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc
        // 第一阶段:无障碍前可以走空格
        while (inBoard(nr, nc) && empty(nr, nc)) {
          dests.push(idx(nr, nc))
          nr += dr; nc += dc
        }
        // 越过一个炮架后,只能吃下一个非空(且为敌方)
        if (inBoard(nr, nc)) {
          nr += dr; nc += dc
          while (inBoard(nr, nc)) {
            if (empty(nr, nc)) { nr += dr; nc += dc; continue }
            if (enemy(nr, nc)) dests.push(idx(nr, nc))
            break
          }
        }
      }
      break
    }
    case 'ma': {
      const moves = [
        { dr:-2, dc:-1, leg:[-1,0] }, { dr:-2, dc:1, leg:[-1,0] },
        { dr:2, dc:-1, leg:[1,0] }, { dr:2, dc:1, leg:[1,0] },
        { dr:-1, dc:-2, leg:[0,-1] }, { dr:1, dc:-2, leg:[0,-1] },
        { dr:-1, dc:2, leg:[0,1] }, { dr:1, dc:2, leg:[0,1] }
      ]
      for (const mv of moves) {
        const nr = r + mv.dr, nc = c + mv.dc
        const lr = r + mv.leg[0], lc = c + mv.leg[1]
        if (!inBoard(nr, nc)) continue
        if (!empty(lr, lc)) continue
        if (friend(nr, nc)) continue
        dests.push(idx(nr, nc))
      }
      break
    }
    case 'xiang': {
      // 象/相走田字,不能过河,中点不能有子
      const moves = [[-2,-2],[-2,2],[2,-2],[2,2]]
      for (const [dr, dc] of moves) {
        const nr = r + dr, nc = c + dc
        if (!inBoard(nr, nc)) continue
        // 不能过河
        if (piece.color === 'red' && nr < 5) continue
        if (piece.color === 'black' && nr > 4) continue
        // 中点
        if (!empty(r + dr/2, c + dc/2)) continue
        if (friend(nr, nc)) continue
        dests.push(idx(nr, nc))
      }
      break
    }
    case 'shi': {
      // 士走斜线一格,且只能在九宫
      const moves = [[-1,-1],[-1,1],[1,-1],[1,1]]
      for (const [dr, dc] of moves) {
        const nr = r + dr, nc = c + dc
        if (!inBoard(nr, nc)) continue
        if (!inPalace(nr, nc, piece.color)) continue
        if (friend(nr, nc)) continue
        dests.push(idx(nr, nc))
      }
      break
    }
    case 'jiang': {
      // 将/帅走直线一格,只能在九宫
      const moves = [[-1,0],[1,0],[0,-1],[0,1]]
      for (const [dr, dc] of moves) {
        const nr = r + dr, nc = c + dc
        if (!inBoard(nr, nc)) continue
        if (!inPalace(nr, nc, piece.color)) continue
        if (friend(nr, nc)) continue
        dests.push(idx(nr, nc))
      }
      // 飞将:同一列且中间无子,可直接吃对方将
      const dr = piece.color === 'red' ? -1 : 1
      let nr = r + dr
      while (inBoard(nr, c) && empty(nr, c)) nr += dr
      if (inBoard(nr, c)) {
        const t = b[idx(nr, c)]
        if (t && t.type === 'jiang' && t.color !== piece.color) dests.push(idx(nr, c))
      }
      break
    }
    case 'bing': {
      const forward = piece.color === 'red' ? -1 : 1
      const movesDir = [[forward, 0]]
      // 过河后可以左右
      const crossed = piece.color === 'red' ? r <= 4 : r >= 5
      if (crossed) { movesDir.push([0, -1]); movesDir.push([0, 1]) }
      for (const [dr, dc] of movesDir) {
        const nr = r + dr, nc = c + dc
        if (!inBoard(nr, nc)) continue
        if (friend(nr, nc)) continue
        dests.push(idx(nr, nc))
      }
      break
    }
  }
  return dests
}

const inPalace = (r, c, color) => {
  if (c < 3 || c > 5) return false
  if (color === 'red') return r >= 7 && r <= 9
  return r >= 0 && r <= 2
}

const calculateScore = () => {
  if (winColor.value !== 'red') return 0
  const base = level.value === 'easy' ? 100 : level.value === 'medium' ? 200 : 320
  const bonus = Math.max(0, 100 - moveCount.value * 2)
  return base + bonus
}

const saveScore = async (s) => {
  try {
    await playGame({
      game_type: 'chess',
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
initGame()
</script>

<style scoped lang="scss">
.chess-page {
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
      // 9列 x 10行,格距52px,边距26px
      width: calc(8 * 52px + 52px);  // = 468 + 52 = 520
      height: calc(9 * 52px + 52px); // = 468 + 52 = 520
      width: 520px;
      height: 520px;
      margin: 30px auto;
      background: #f5d589;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      border-radius: 4px;
      &.ai-thinking { cursor: wait; }
    }
    .board-bg {
      position: absolute;
      top: 26px;
      left: 26px;
      width: 416px;  // 8 * 52
      height: 468px; // 9 * 52
    }
    .grid-row {
      position: absolute;
      left: 0;
      right: 0;
      height: 1px;
      background: #5a3825;
    }
    .grid-col-top {
      position: absolute;
      top: 0;
      width: 1px;
      height: 208px; // 4 * 52
      background: #5a3825;
    }
    .grid-col-bot {
      position: absolute;
      top: 260px; // 5 * 52
      width: 1px;
      height: 208px;
      background: #5a3825;
    }
    .palace-line {
      position: absolute;
      width: 147px; // sqrt(2 * 104^2) ≈ 147
      height: 1px;
      background: #5a3825;
      transform-origin: 0 0;
    }
    // 上方九宫(行0-2,列3-5),格点(0,3)-(2,5)
    .palace-top-1 {
      top: 0;
      left: 156px; // 3 * 52
      transform: rotate(45deg);
    }
    .palace-top-2 {
      top: 0;
      left: 260px; // 5 * 52
      transform: rotate(135deg);
    }
    // 下方九宫(行7-9,列3-5)
    .palace-bot-1 {
      top: 364px; // 7 * 52
      left: 156px;
      transform: rotate(45deg);
    }
    .palace-bot-2 {
      top: 364px;
      left: 260px;
      transform: rotate(135deg);
    }
    .river {
      position: absolute;
      top: 209px; // 4 * 52 + 1
      left: 0;
      right: 0;
      height: 50px;
      display: flex;
      justify-content: space-around;
      align-items: center;
      .river-text-l, .river-text-r {
        font-size: 22px;
        color: #5a3825;
        font-weight: 600;
        letter-spacing: 8px;
      }
    }
    .cell-hit {
      position: absolute;
      width: 52px;
      height: 52px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .piece {
      position: relative;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: bold;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      cursor: pointer;
      transition: transform 0.1s;
      user-select: none;
      &.red {
        background: radial-gradient(circle at 35% 35%, #fff5e6, #f0d5a0 70%);
        color: #d2261d;
        border: 2px solid #d2261d;
      }
      &.black {
        background: radial-gradient(circle at 35% 35%, #fff5e6, #f0d5a0 70%);
        color: #1a1a1a;
        border: 2px solid #1a1a1a;
      }
      &.selected {
        transform: scale(1.08);
        box-shadow: 0 0 0 3px #409eff, 0 2px 6px rgba(0,0,0,0.3);
      }
      &.last-move::before {
        content: '';
        position: absolute;
        top: -3px;
        left: -3px;
        right: -3px;
        bottom: -3px;
        border: 2px dashed #f56c6c;
        border-radius: 50%;
      }
    }
    .hint {
      position: absolute;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: rgba(64, 158, 255, 0.5);
      pointer-events: none;
      &.capture {
        width: 44px;
        height: 44px;
        background: transparent;
        border: 2px dashed #f56c6c;
      }
    }
    .game-result {
      margin-top: 20px;
    }
  }
}
</style>
