<template>
  <div class="doudizhu-page">
    <el-card>
      <template #header>
        <div class="header-bar">
          <div class="title">
            <span style="font-size: 20px">🃏</span>
            <span>欢乐斗地主</span>
            <el-tag type="warning" size="small">今日剩余 {{ remaining }}/5 次</el-tag>
            <el-tag type="success" size="small">底分 1 × 3 = 3</el-tag>
          </div>
          <div class="actions">
            <el-button size="small" @click="$router.back()">返回</el-button>
            <el-button type="primary" size="small" :disabled="!canStart" @click="startGame">
              <el-icon><Refresh /></el-icon>新一局
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="!started" class="empty-state">
        <el-icon size="48" color="#909399"><VideoPlay /></el-icon>
        <p>{{ remaining > 0 ? '点击右上角"新一局"开始游戏' : '今日次数已用完,明日再来' }}</p>
      </div>

      <div v-else class="table-area">
        <!-- AI 2 (left, 上家) -->
        <div class="ai-row ai-row-top">
          <div class="ai-info">
            <el-avatar :size="44" style="background: #e6a23c">下</el-avatar>
            <div>
              <div class="ai-name">下家 AI</div>
              <div class="ai-meta">剩 {{ ai2Hand.length }} 张</div>
            </div>
          </div>
          <div class="play-zone">
            <div v-if="lastPlay && lastPlay.by === 2" class="cards-row small">
              <div
                v-for="c in lastPlay.cards"
                :key="c.id"
                class="card"
                :class="suitClass(c)"
              >
                <div class="card-rank">{{ c.display }}</div>
                <div class="card-suit">{{ c.suit }}</div>
              </div>
            </div>
            <div v-else-if="lastPlay && lastPlay.by !== 2 && currentTurn === 2 && hasPassed.has(2)" class="pass-tag">
              不要
            </div>
          </div>
        </div>

        <!-- 中间提示 -->
        <div class="middle-hint">
          <el-tag v-if="currentTurn === 0 && !gameOver" type="success" size="large">
            轮到你出牌
          </el-tag>
          <el-tag v-else-if="!gameOver" type="info" size="large">
            等待 AI 出牌...
          </el-tag>
        </div>

        <!-- AI 1 (right, 下家) -->
        <div class="ai-row ai-row-bottom">
          <div class="play-zone">
            <div v-if="lastPlay && lastPlay.by === 1" class="cards-row small">
              <div
                v-for="c in lastPlay.cards"
                :key="c.id"
                class="card"
                :class="suitClass(c)"
              >
                <div class="card-rank">{{ c.display }}</div>
                <div class="card-suit">{{ c.suit }}</div>
              </div>
            </div>
            <div v-else-if="lastPlay && lastPlay.by !== 1 && hasPassed.has(1)" class="pass-tag">
              不要
            </div>
          </div>
          <div class="ai-info">
            <el-avatar :size="44" style="background: #409eff">上</el-avatar>
            <div>
              <div class="ai-name">上家 AI</div>
              <div class="ai-meta">剩 {{ ai1Hand.length }} 张</div>
            </div>
          </div>
        </div>

        <!-- 底牌 -->
        <div class="bottom-cards">
          <span class="label">底牌:</span>
          <div
            v-for="c in bottomCards"
            :key="c.id"
            class="card mini"
            :class="suitClass(c)"
          >
            <div class="card-rank">{{ c.display }}</div>
            <div class="card-suit">{{ c.suit }}</div>
          </div>
          <el-tag type="danger" size="small" effect="dark">地主</el-tag>
        </div>

        <!-- 我的手牌 -->
        <div class="my-area">
          <div class="cards-row my-hand">
            <div
              v-for="c in myHand"
              :key="c.id"
              class="card big"
              :class="[suitClass(c), { selected: selected.has(c.id), dim: currentTurn !== 0 || !!gameOver }]"
              @click="toggleSelect(c)"
            >
              <div class="card-rank">{{ c.display }}</div>
              <div class="card-suit">{{ c.suit }}</div>
            </div>
          </div>
          <div class="my-actions">
            <el-button
              type="primary"
              :disabled="currentTurn !== 0 || !!gameOver || selected.size === 0"
              @click="onPlay"
            >出牌</el-button>
            <el-button
              :disabled="currentTurn !== 0 || !!gameOver || !lastPlay || lastPlay.by === 0"
              @click="onPass"
            >不要</el-button>
            <el-button
              :disabled="currentTurn !== 0 || !!gameOver || selected.size === 0"
              @click="selected.clear()"
            >重选</el-button>
            <el-button
              :disabled="currentTurn !== 0 || !!gameOver"
              @click="autoSuggest"
            >提示</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <el-dialog v-model="overVisible" :title="gameOver?.winner === 0 ? '🎉 胜利!' : '💀 失败'" width="380px" :close-on-click-modal="false">
      <div class="result-body">
        <div class="result-icon">{{ gameOver?.winner === 0 ? '🏆' : '😢' }}</div>
        <div class="result-text">
          {{ gameOver?.winner === 0 ? '恭喜你赢得本局!' : `${gameOver?.winner === 1 ? '上家' : '下家'} AI 获胜` }}
        </div>
        <div class="result-score">本局得分: <strong>{{ gameOver?.winner === 0 ? '+1' : '0' }}</strong></div>
      </div>
      <template #footer>
        <el-button @click="$router.back()">返回</el-button>
        <el-button type="primary" :disabled="remaining <= 0" @click="restart">再来一局</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { playGame, getTodayGames } from '@/api/student'

// ====== 数据 ======
const remaining = ref(5)
const started = ref(false)
const myHand = ref([])
const ai1Hand = ref([])
const ai2Hand = ref([])
const bottomCards = ref([])
const selected = reactive(new Set())
const lastPlay = ref(null) // { cards, hand, by }
const currentTurn = ref(0) // 0 me, 1 ai1, 2 ai2
const gameOver = ref(null)
const overVisible = ref(false)
const hasPassed = reactive(new Set())
const scoreReported = ref(false)

const canStart = computed(() => remaining.value > 0 && (gameOver.value || !started.value))

// ====== 牌组 ======
function createDeck() {
  const cards = []
  let id = 0
  const suits = ['♠', '♥', '♦', '♣']
  const ranks = [
    { v: 3, d: '3' }, { v: 4, d: '4' }, { v: 5, d: '5' }, { v: 6, d: '6' },
    { v: 7, d: '7' }, { v: 8, d: '8' }, { v: 9, d: '9' }, { v: 10, d: '10' },
    { v: 11, d: 'J' }, { v: 12, d: 'Q' }, { v: 13, d: 'K' }, { v: 14, d: 'A' },
    { v: 15, d: '2' }
  ]
  for (const r of ranks) {
    for (const s of suits) {
      cards.push({ id: id++, value: r.v, display: r.d, suit: s })
    }
  }
  cards.push({ id: id++, value: 16, display: '小', suit: '王' })
  cards.push({ id: id++, value: 17, display: '大', suit: '王' })
  return cards
}
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}
const sortHand = (hand) => hand.sort((a, b) => a.value - b.value || a.id - b.id)

// ====== 牌型识别 ======
function isConsecutive(vals) {
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] - vals[i - 1] !== 1) return false
  }
  return true
}
function classify(cards) {
  if (!cards || cards.length === 0) return null
  const values = cards.map(c => c.value).sort((a, b) => a - b)
  const counts = {}
  for (const v of values) counts[v] = (counts[v] || 0) + 1
  const uniqVals = Object.keys(counts).map(Number).sort((a, b) => a - b)
  const countVals = Object.values(counts).sort((a, b) => b - a)

  // Rocket
  if (cards.length === 2 && values[0] === 16 && values[1] === 17) {
    return { type: 'rocket', length: 2, weight: 100 }
  }
  // Bomb
  if (cards.length === 4 && countVals[0] === 4) {
    return { type: 'bomb', length: 4, weight: uniqVals[0] }
  }
  if (cards.length === 1) {
    return { type: 'single', length: 1, weight: values[0] }
  }
  if (cards.length === 2 && countVals[0] === 2) {
    return { type: 'pair', length: 2, weight: values[0] }
  }
  if (cards.length === 3 && countVals[0] === 3) {
    return { type: 'triple', length: 3, weight: values[0] }
  }
  if (cards.length === 4 && countVals[0] === 3 && countVals[1] === 1) {
    const tripleVal = uniqVals.find(v => counts[v] === 3)
    return { type: 'triple_one', length: 4, weight: tripleVal }
  }
  if (cards.length === 5 && countVals[0] === 3 && countVals[1] === 2) {
    const tripleVal = uniqVals.find(v => counts[v] === 3)
    return { type: 'triple_two', length: 5, weight: tripleVal }
  }
  // Straight
  if (cards.length >= 5 && countVals.every(c => c === 1)) {
    if (uniqVals.every(v => v <= 14) && isConsecutive(uniqVals)) {
      return { type: 'straight', length: cards.length, weight: uniqVals[0] }
    }
  }
  // Connected pairs
  if (cards.length >= 6 && cards.length % 2 === 0 && countVals.every(c => c === 2)) {
    if (uniqVals.every(v => v <= 14) && isConsecutive(uniqVals)) {
      return { type: 'connected_pairs', length: cards.length, weight: uniqVals[0] }
    }
  }
  return null
}
function canBeat(A, B) {
  if (!A) return false
  if (!B) return true
  if (A.type === 'rocket') return true
  if (B.type === 'rocket') return false
  if (A.type === 'bomb' && B.type !== 'bomb') return true
  if (A.type !== 'bomb' && B.type === 'bomb') return false
  if (A.type !== B.type) return false
  if (A.length !== B.length) return false
  return A.weight > B.weight
}

// ====== AI ======
function groupByValue(hand) {
  const g = {}
  for (const c of hand) {
    if (!g[c.value]) g[c.value] = []
    g[c.value].push(c)
  }
  return g
}
function findBeating(hand, target) {
  const byVal = groupByValue(hand)
  const sortedVals = Object.keys(byVal).map(Number).sort((a, b) => a - b)

  if (target.type === 'single') {
    for (const v of sortedVals) {
      if (v > target.weight) return [byVal[v][0]]
    }
  }
  if (target.type === 'pair') {
    for (const v of sortedVals) {
      if (v > target.weight && byVal[v].length >= 2) return byVal[v].slice(0, 2)
    }
  }
  if (target.type === 'triple') {
    for (const v of sortedVals) {
      if (v > target.weight && byVal[v].length >= 3) return byVal[v].slice(0, 3)
    }
  }
  if (target.type === 'triple_one') {
    for (const v of sortedVals) {
      if (v > target.weight && byVal[v].length >= 3) {
        const remain = hand.filter(c => c.value !== v)
        if (remain.length > 0) {
          const single = [...remain].sort((a, b) => a.value - b.value)[0]
          return [...byVal[v].slice(0, 3), single]
        }
      }
    }
  }
  if (target.type === 'triple_two') {
    for (const v of sortedVals) {
      if (v > target.weight && byVal[v].length >= 3) {
        for (const v2 of sortedVals) {
          if (v2 !== v && byVal[v2].length >= 2 && v2 < 16) {
            return [...byVal[v].slice(0, 3), ...byVal[v2].slice(0, 2)]
          }
        }
      }
    }
  }
  if (target.type === 'straight') {
    const uniq = [...new Set(hand.filter(c => c.value <= 14).map(c => c.value))].sort((a, b) => a - b)
    for (let i = 0; i + target.length <= uniq.length; i++) {
      const slice = uniq.slice(i, i + target.length)
      if (isConsecutive(slice) && slice[0] > target.weight) {
        return slice.map(v => byVal[v][0])
      }
    }
  }
  if (target.type === 'connected_pairs') {
    const pairs = sortedVals.filter(v => v <= 14 && byVal[v].length >= 2)
    const need = target.length / 2
    for (let i = 0; i + need <= pairs.length; i++) {
      const slice = pairs.slice(i, i + need)
      if (isConsecutive(slice) && slice[0] > target.weight) {
        return slice.flatMap(v => byVal[v].slice(0, 2))
      }
    }
  }
  if (target.type === 'bomb') {
    for (const v of sortedVals) {
      if (v > target.weight && byVal[v].length === 4) return byVal[v].slice(0, 4)
    }
  }
  // Try bomb to beat anything (except rocket)
  if (target.type !== 'bomb' && target.type !== 'rocket') {
    for (const v of sortedVals) {
      if (byVal[v].length === 4) return byVal[v].slice(0, 4)
    }
  }
  // Try rocket to beat anything (except rocket)
  if (target.type !== 'rocket') {
    if (byVal[16] && byVal[17]) return [byVal[16][0], byVal[17][0]]
  }
  return null
}
function aiPickFresh(hand) {
  const byVal = groupByValue(hand)
  const sortedVals = Object.keys(byVal).map(Number).sort((a, b) => a - b)
  // Prefer playing smallest single (excluding bomb/rocket)
  for (const v of sortedVals) {
    if (v >= 16) continue
    if (byVal[v].length === 1) return [byVal[v][0]]
  }
  // Else smallest pair
  for (const v of sortedVals) {
    if (v >= 16) continue
    if (byVal[v].length === 2) return byVal[v].slice(0, 2)
  }
  // Else smallest triple (no kicker for simplicity)
  for (const v of sortedVals) {
    if (v >= 16) continue
    if (byVal[v].length === 3) return byVal[v].slice(0, 3)
  }
  // Last resort: any card
  return [hand[0]]
}

// ====== 游戏流程 ======
function startGame() {
  if (remaining.value <= 0) {
    ElMessage.warning('今日次数已用完')
    return
  }
  const deck = createDeck()
  shuffle(deck)
  myHand.value = sortHand(deck.slice(0, 17))
  ai1Hand.value = sortHand(deck.slice(17, 34))
  ai2Hand.value = sortHand(deck.slice(34, 51))
  bottomCards.value = deck.slice(51, 54)
  // Player is landlord, gets bottom 3
  myHand.value = sortHand([...myHand.value, ...bottomCards.value])
  selected.clear()
  hasPassed.clear()
  lastPlay.value = null
  currentTurn.value = 0
  gameOver.value = null
  overVisible.value = false
  scoreReported.value = false
  started.value = true
}

function restart() {
  overVisible.value = false
  startGame()
}

function toggleSelect(c) {
  if (currentTurn.value !== 0 || gameOver.value) return
  if (selected.has(c.id)) selected.delete(c.id)
  else selected.add(c.id)
}

function onPlay() {
  const cards = myHand.value.filter(c => selected.has(c.id))
  if (cards.length === 0) return
  const hand = classify(cards)
  if (!hand) {
    ElMessage.error('这不是合法的牌型')
    return
  }
  if (lastPlay.value && lastPlay.value.by !== 0 && !canBeat(hand, lastPlay.value.hand)) {
    ElMessage.error('无法压过上家的牌')
    return
  }
  // 出牌
  myHand.value = myHand.value.filter(c => !selected.has(c.id))
  lastPlay.value = { cards, hand, by: 0 }
  selected.clear()
  hasPassed.clear()
  if (myHand.value.length === 0) {
    finishGame(0)
    return
  }
  currentTurn.value = 1
  scheduleAi()
}

function onPass() {
  if (!lastPlay.value || lastPlay.value.by === 0) {
    ElMessage.warning('当前是新一轮,必须出牌')
    return
  }
  hasPassed.add(0)
  currentTurn.value = 1
  scheduleAi()
}

function scheduleAi() {
  setTimeout(aiTurn, 700)
}

function aiTurn() {
  if (gameOver.value) return
  const idx = currentTurn.value
  const hand = idx === 1 ? ai1Hand.value : ai2Hand.value
  // 是否需要响应
  const needResponse = lastPlay.value && lastPlay.value.by !== idx
  let play = null
  if (!needResponse || !lastPlay.value) {
    play = aiPickFresh(hand)
  } else {
    play = findBeating(hand, lastPlay.value.hand)
  }

  if (play && play.length > 0) {
    const handInfo = classify(play)
    if (handInfo) {
      const ids = new Set(play.map(c => c.id))
      const newHand = hand.filter(c => !ids.has(c.id))
      if (idx === 1) ai1Hand.value = newHand
      else ai2Hand.value = newHand
      lastPlay.value = { cards: play, hand: handInfo, by: idx }
      hasPassed.clear()
      if (newHand.length === 0) {
        finishGame(idx)
        return
      }
      // Next turn
      currentTurn.value = (idx + 1) % 3
      if (currentTurn.value !== 0) scheduleAi()
      return
    }
  }
  // Pass
  hasPassed.add(idx)
  currentTurn.value = (idx + 1) % 3
  // 如果两位 AI 都过了,玩家成为新一轮的领出者
  if (currentTurn.value === 0 && hasPassed.size >= 2) {
    lastPlay.value = null
    hasPassed.clear()
  }
  if (currentTurn.value !== 0) scheduleAi()
}

function finishGame(winner) {
  gameOver.value = { winner }
  overVisible.value = true
  if (!scoreReported.value) {
    scoreReported.value = true
    const score = winner === 0 ? 1 : 0
    playGame({ game_type: 'doudizhu', score }).then(() => {
      remaining.value = Math.max(0, remaining.value - 1)
    }).catch((e) => {
      ElMessage.error(e.response?.data?.message || '记录失败')
    })
  }
}

function autoSuggest() {
  selected.clear()
  let suggestion = null
  if (lastPlay.value && lastPlay.value.by !== 0) {
    suggestion = findBeating(myHand.value, lastPlay.value.hand)
  } else {
    suggestion = aiPickFresh(myHand.value)
  }
  if (!suggestion || suggestion.length === 0) {
    ElMessage.info('当前没有可压的牌型,只能选择"不要"')
    return
  }
  for (const c of suggestion) selected.add(c.id)
}

function suitClass(c) {
  if (c.value === 16) return 'joker-small'
  if (c.value === 17) return 'joker-big'
  return (c.suit === '♥' || c.suit === '♦') ? 'red' : 'black'
}

// ====== 加载 ======
async function loadRemaining() {
  try {
    const { data } = await getTodayGames()
    remaining.value = Math.max(0, 5 - (data?.doudizhu || 0))
  } catch (e) {}
}
onMounted(() => {
  loadRemaining()
})
</script>

<style scoped lang="scss">
.doudizhu-page {
  max-width: 1100px;
  margin: 0 auto;
  .header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 16px;
      font-weight: 600;
    }
  }
  .empty-state {
    text-align: center;
    padding: 60px 0;
    color: #909399;
    p { margin-top: 12px; }
  }
  .table-area {
    background: linear-gradient(135deg, #2d6a4f 0%, #1b4332 100%);
    border-radius: 12px;
    padding: 24px 16px 16px;
    color: #fff;
    .ai-row {
      display: flex;
      align-items: center;
      gap: 18px;
      margin-bottom: 12px;
      .ai-info {
        display: flex;
        align-items: center;
        gap: 10px;
        background: rgba(0,0,0,0.25);
        padding: 8px 14px;
        border-radius: 10px;
        .ai-name { font-weight: 600; }
        .ai-meta { font-size: 12px; opacity: 0.85; }
      }
      .play-zone {
        flex: 1;
        min-height: 70px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
    .ai-row-bottom {
      flex-direction: row-reverse;
    }
    .middle-hint {
      text-align: center;
      margin: 8px 0;
    }
    .bottom-cards {
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
      margin: 16px 0;
      .label { color: #fff; opacity: 0.8; font-size: 13px; }
    }
    .my-area {
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      padding: 14px;
      .my-actions {
        display: flex;
        gap: 10px;
        justify-content: center;
        margin-top: 14px;
      }
    }
  }
  .cards-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: center;
    &.small .card { transform: scale(0.85); }
    &.my-hand .card { cursor: pointer; }
  }
  .card {
    width: 42px;
    height: 60px;
    background: #fff;
    border-radius: 6px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 4px 6px;
    user-select: none;
    transition: transform 0.15s;
    &.big {
      width: 50px;
      height: 70px;
    }
    &.mini {
      transform: scale(0.7);
      margin: 0 -4px;
    }
    .card-rank {
      font-weight: 700;
      font-size: 16px;
      line-height: 1;
    }
    .card-suit {
      font-size: 18px;
      align-self: flex-end;
    }
    &.red { color: #d32f2f; }
    &.black { color: #1a1a1a; }
    &.joker-small { color: #1976d2; .card-suit { font-size: 14px; } }
    &.joker-big { color: #d32f2f; .card-suit { font-size: 14px; } }
    &.selected {
      transform: translateY(-12px);
      box-shadow: 0 6px 12px rgba(0,0,0,0.3);
      border: 2px solid #67c23a;
    }
    &.dim { opacity: 0.7; }
  }
  .pass-tag {
    background: rgba(255,255,255,0.2);
    padding: 4px 12px;
    border-radius: 6px;
    color: #fff;
    font-weight: 600;
  }
  .result-body {
    text-align: center;
    padding: 12px 0;
    .result-icon { font-size: 56px; }
    .result-text {
      font-size: 18px;
      margin: 12px 0;
      color: #303133;
    }
    .result-score {
      color: #606266;
      strong { color: #f56c6c; font-size: 20px; }
    }
  }
}
</style>
