<template>
  <div class="admin-youth-page">
    <section class="review-hero">
      <div>
        <span>YOUTH REVIEW</span>
        <h2>青年共创审核</h2>
        <p>在地图上查看地区分享，审核通过后才会展示给学生。</p>
      </div>
      <strong>{{ pendingCount }}<small>待审核</small></strong>
    </section>

    <div class="review-layout">
      <el-card class="map-card" shadow="never">
        <template #header>
          <div class="map-head">
            <div>
              <b>{{ mapLevel === 'china' ? '中国青年共创地图' : `${selectedProvince.name} · 城市地图` }}</b>
              <small>{{ mapLevel === 'china' ? '点击省份查看城市' : '点击城市筛选地区分享' }}</small>
            </div>
            <el-button v-if="mapLevel === 'province'" class="soft-button" @click="backToChina">返回全国</el-button>
          </div>
        </template>
        <div class="map-stage" :class="{ changing: mapChanging }">
          <div ref="mapRef" class="china-map"></div>
          <div v-if="mapLoading" class="map-loading">
            <span class="map-loader"></span>
            <strong>正在绘制行政区轮廓</strong>
          </div>
          <div v-if="mapError" class="map-error">
            <strong>地图暂时加载失败</strong>
            <el-button @click="loadMap(currentAdcode)">重试</el-button>
          </div>
        </div>
      </el-card>

      <el-card class="review-card" shadow="never">
        <template #header>
          <div class="review-head">
            <div>
              <b>{{ selectedCity.name || '全部地区分享' }}</b>
              <small>{{ selectedCity.name ? `${selectedProvince.name} / ${selectedCity.name}` : '点击地图可按地区筛选' }}</small>
            </div>
            <el-segmented v-model="queryStatus" :options="statusOptions" @change="loadPosts" />
          </div>
        </template>

        <el-alert
          v-if="backendUnavailable"
          class="backend-alert"
          type="warning"
          show-icon
          :closable="false"
          title="青年共创审核接口还没有生效"
          description="当前后端仍在运行旧代码，请重启后端服务后再刷新本页，待审核和已发布分享就会正常显示。"
        />

        <div v-loading="postsLoading" class="review-list">
          <el-empty
            v-if="!posts.length && !postsLoading"
            :description="backendUnavailable ? '等待后端重启后加载分享' : '暂无需要处理的分享'"
          />
          <article v-for="post in posts" :key="post.id" class="review-item">
            <header>
              <el-avatar :size="38" :src="post.avatar">{{ post.publisher_name?.charAt(0) || post.author_name?.charAt(0) }}</el-avatar>
              <div>
                <strong>{{ post.publisher_name || post.author_name }}</strong>
                <span>
                  {{ post.publisher_class || post.publisher_username || '学生账号' }}
                  · 发起者：{{ post.author_name }}
                </span>
                <small>{{ post.province_name }} / {{ post.city_name }} · {{ formatTime(post.created_at) }}</small>
              </div>
              <el-tag :type="tagType(post.status)" round>{{ statusText(post.status) }}</el-tag>
            </header>
            <p>{{ post.content }}</p>
            <div v-if="post.images?.length" class="review-images">
              <el-image
                v-for="(image, index) in post.images.slice(0, 6)"
                :key="image"
                :src="image"
                :preview-src-list="post.images"
                :initial-index="index"
                preview-teleported
                fit="cover"
              />
            </div>
            <footer>
              <el-button v-if="post.status === 'pending'" type="primary" @click="approvePost(post)">审核通过</el-button>
              <el-button type="danger" plain @click="removePost(post)">删除</el-button>
            </footer>
          </article>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import * as echarts from 'echarts'
import { feature as topojsonFeature } from 'topojson-client'
import taiwanTopology from 'taiwan-atlas/counties-10t.json'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { approveYouthPost, deleteYouthPost, getAdminYouthPosts, getAdminYouthRegions } from '@/api/admin'

const MAP_ROOT = 'https://geo.datav.aliyun.com/areas_v3/bound'
const TAIWAN_ADCODE = '710000'
const TAIWAN_NAME_MAP = {
  '臺北市': '台北市', '新北市': '新北市', '桃園市': '桃园市', '臺中市': '台中市',
  '臺南市': '台南市', '高雄市': '高雄市', '基隆市': '基隆市', '新竹市': '新竹市',
  '嘉義市': '嘉义市', '新竹縣': '新竹县', '苗栗縣': '苗栗县', '彰化縣': '彰化县',
  '南投縣': '南投县', '雲林縣': '云林县', '嘉義縣': '嘉义县', '屏東縣': '屏东县',
  '宜蘭縣': '宜兰县', '花蓮縣': '花莲县', '臺東縣': '台东县', '澎湖縣': '澎湖县',
  '金門縣': '金门县', '連江縣': '连江县'
}
const taiwanGeoJson = (() => {
  const geoJson = topojsonFeature(taiwanTopology, taiwanTopology.objects.counties)
  geoJson.features.forEach((item) => {
    const properties = item.properties || {}
    properties.name = TAIWAN_NAME_MAP[properties.COUNTYNAME] || properties.COUNTYNAME
    properties.adcode = `71${String(properties.COUNTYCODE || '').padStart(5, '0')}`
    item.properties = properties
  })
  return geoJson
})()

const mapRef = ref()
const mapLevel = ref('china')
const currentAdcode = ref('100000')
const mapLoading = ref(true)
const mapChanging = ref(false)
const mapError = ref(false)
const regionStats = ref([])
const posts = ref([])
const postsLoading = ref(false)
const queryStatus = ref('all')
const pendingCount = ref(0)
const backendUnavailable = ref(false)
const selectedProvince = reactive({ code: '', name: '' })
const selectedCity = reactive({ code: '', name: '' })
const statusOptions = [
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '全部', value: 'all' }
]
let chart = null
let currentGeoJson = null
let themeObserver = null
const mapCache = new Map()

const isDark = () => document.documentElement.dataset.theme === 'dark'
const mapName = (adcode) => `admin-youth-map-${adcode}`
const statValue = (code, level) => regionStats.value
  .filter((item) => String(level === 'china' ? item.province_code : item.city_code) === String(code))
  .reduce((sum, item) => sum + Number(item.post_count || 0) + Number(item.pending_count || 0), 0)

const renderMap = (geoJson, adcode) => {
  if (!chart) chart = echarts.init(mapRef.value)
  currentGeoJson = geoJson
  const dark = isDark()
  const data = (geoJson.features || []).map((feature) => ({
    name: feature.properties.name,
    value: statValue(feature.properties.adcode, mapLevel.value),
    adcode: String(feature.properties.adcode || '')
  }))
  echarts.registerMap(mapName(adcode), geoJson)
  chart.setOption({
    backgroundColor: 'transparent',
    animationDuration: 850,
    animationDurationUpdate: 700,
    animationEasingUpdate: 'cubicOut',
    tooltip: {
      trigger: 'item',
      formatter: ({ name, value }) => `${name}<br/>${Number(value || 0)} 条分享`,
      backgroundColor: dark ? '#111827' : '#fff',
      borderColor: dark ? '#33465f' : '#dbe5f2',
      textStyle: { color: dark ? '#eef4fc' : '#0a1b33' }
    },
    visualMap: {
      show: false,
      min: 0,
      max: Math.max(...data.map((item) => item.value), 5),
      inRange: { color: dark ? ['#17243a', '#1e4c78', '#3b82f6'] : ['#eaf1fb', '#8dc3ff', '#2563eb'] }
    },
    series: [{
      type: 'map',
      map: mapName(adcode),
      roam: true,
      scaleLimit: { min: 0.85, max: 5 },
      selectedMode: 'single',
      universalTransition: true,
      data,
      label: { show: true, color: dark ? '#d7e4f5' : '#29415f', fontSize: mapLevel.value === 'china' ? 10 : 11 },
      itemStyle: { areaColor: dark ? '#17243a' : '#eaf1fb', borderColor: dark ? '#6682a6' : '#fff', borderWidth: 1 },
      emphasis: {
        label: { color: '#fff', fontWeight: 700 },
        itemStyle: { areaColor: '#2563eb', borderColor: '#bfdbfe', borderWidth: 1.5, shadowBlur: 18, shadowColor: 'rgba(37,99,235,.42)' }
      }
    }]
  }, true)
  chart.off('click')
  chart.on('click', ({ data }) => {
    if (!data?.adcode) return
    if (mapLevel.value === 'china') drillProvince(data)
    else selectCity(data)
  })
}

const fetchMap = async (adcode) => {
  if (String(adcode) === TAIWAN_ADCODE) return taiwanGeoJson
  if (mapCache.has(adcode)) return mapCache.get(adcode)
  const response = await fetch(`${MAP_ROOT}/${adcode}_full.json`)
  if (!response.ok) throw new Error('地图请求失败')
  const geoJson = await response.json()
  mapCache.set(adcode, geoJson)
  return geoJson
}

const loadMap = async (adcode = '100000') => {
  mapLoading.value = true
  mapError.value = false
  mapChanging.value = true
  try {
    const geoJson = await fetchMap(adcode)
    await nextTick()
    renderMap(geoJson, adcode)
  } catch (error) {
    mapError.value = true
  } finally {
    mapLoading.value = false
    setTimeout(() => { mapChanging.value = false }, 360)
  }
}

const refreshTheme = () => {
  if (!currentGeoJson) return
  mapChanging.value = true
  renderMap(currentGeoJson, currentAdcode.value)
  setTimeout(() => { mapChanging.value = false }, 260)
}

const drillProvince = async (region) => {
  selectedProvince.code = region.adcode
  selectedProvince.name = region.name
  selectedCity.code = ''
  selectedCity.name = ''
  mapLevel.value = 'province'
  currentAdcode.value = region.adcode
  await loadMap(region.adcode)
  await loadPosts()
}

const selectCity = async (region) => {
  selectedCity.code = region.adcode
  selectedCity.name = region.name
  await loadPosts()
}

const backToChina = async () => {
  mapLevel.value = 'china'
  currentAdcode.value = '100000'
  selectedProvince.code = ''
  selectedProvince.name = ''
  selectedCity.code = ''
  selectedCity.name = ''
  await loadMap('100000')
  await loadPosts()
}

const loadRegions = async () => {
  try {
    const { data } = await getAdminYouthRegions()
    backendUnavailable.value = false
    regionStats.value = data || []
    pendingCount.value = regionStats.value.reduce((sum, item) => sum + Number(item.pending_count || 0), 0)
  } catch (error) {
    if (isYouthApiMissing(error)) {
      backendUnavailable.value = true
      regionStats.value = []
      pendingCount.value = 0
      return
    }
    throw error
  }
}

const loadPosts = async () => {
  postsLoading.value = true
  try {
    const { data } = await getAdminYouthPosts({
      status: queryStatus.value,
      province_code: selectedProvince.code || undefined,
      city_code: selectedCity.code || undefined,
      pageSize: 50
    })
    backendUnavailable.value = false
    posts.value = data.list || []
  } catch (error) {
    if (isYouthApiMissing(error)) {
      backendUnavailable.value = true
      posts.value = []
      return
    }
    throw error
  } finally {
    postsLoading.value = false
  }
}

const approvePost = async (post) => {
  try {
    await approveYouthPost(post.id)
  } catch (error) {
    if (isYouthApiMissing(error)) {
      backendUnavailable.value = true
      ElMessage.warning('后端审核接口还未生效，请重启后端服务后再试')
      return
    }
    throw error
  }
  ElMessage.success('已审核通过')
  await Promise.all([loadRegions(), loadPosts()])
  if (currentGeoJson) renderMap(currentGeoJson, currentAdcode.value)
}

const removePost = async (post) => {
  await ElMessageBox.confirm('确定删除这条青年共创分享吗？删除后不可恢复。', '删除确认', { type: 'warning' })
  try {
    await deleteYouthPost(post.id)
  } catch (error) {
    if (isYouthApiMissing(error)) {
      backendUnavailable.value = true
      ElMessage.warning('后端删除接口还未生效，请重启后端服务后再试')
      return
    }
    throw error
  }
  ElMessage.success('已删除')
  await Promise.all([loadRegions(), loadPosts()])
  if (currentGeoJson) renderMap(currentGeoJson, currentAdcode.value)
}

const isYouthApiMissing = (error) => error?.response?.status === 404
const statusText = (status) => ({ pending: '待审核', approved: '已通过', rejected: '已拒绝' }[status] || status)
const tagType = (status) => ({ pending: 'warning', approved: 'success', rejected: 'info' }[status] || 'info')
const formatTime = (time) => dayjs(time).format('YYYY-MM-DD HH:mm')
const resizeMap = () => chart?.resize()

onMounted(async () => {
  await Promise.allSettled([loadRegions(), loadMap(), loadPosts()])
  window.addEventListener('resize', resizeMap)
  themeObserver = new MutationObserver(refreshTheme)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeMap)
  themeObserver?.disconnect()
  chart?.dispose()
})
</script>

<style scoped lang="scss">
.admin-youth-page { display:grid; gap:20px; }
.review-hero { min-height:120px; padding:26px 32px; display:flex; align-items:center; justify-content:space-between; color:#fff; border-radius:22px; background:radial-gradient(circle at 75% 20%,rgba(96,165,250,.3),transparent 28%),linear-gradient(125deg,#0a2349,#123e81 55%,#1d4f91); box-shadow:0 18px 40px rgba(10,35,73,.18); span{font-size:10px;font-weight:800;letter-spacing:.2em;color:#93c5fd} h2{margin:7px 0 8px} p{margin:0;color:#cfddf0} > strong{width:86px;height:86px;display:grid;place-content:center;text-align:center;border-radius:50%;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);font-size:25px} small{display:block;font-size:11px;color:#bfdbfe} }
.review-layout { display:grid; grid-template-columns:minmax(0,1.35fr) minmax(420px,.95fr); gap:20px; align-items:start; }
.map-card,.review-card { border-radius:20px; border:1px solid var(--campus-border); }
.map-head,.review-head { display:flex; align-items:center; justify-content:space-between; gap:16px; b{display:block;color:var(--campus-ink);font-size:17px} small{color:#8492a6;font-size:12px} }
.soft-button { min-width:auto; }
.map-stage { height:620px; position:relative; overflow:hidden; border-radius:16px; background:radial-gradient(circle at 50% 45%,#f8fbff,#eef4fb); transition:opacity .26s ease, transform .26s ease, background-color .26s ease; }
.map-stage.changing { opacity:.82; transform:scale(.992); }
.china-map { width:100%; height:100%; }
.map-loading,.map-error { position:absolute; inset:0; display:grid; place-content:center; justify-items:center; gap:10px; color:#61748d; background:rgba(248,251,255,.84); backdrop-filter:blur(8px); }
.map-loader { width:40px;height:40px;border:3px solid #dbeafe;border-top-color:#2563eb;border-radius:50%;animation:map-spin .8s linear infinite; }
@keyframes map-spin { to{transform:rotate(360deg)} }
.backend-alert { margin-bottom:14px; border-radius:12px; }
.review-list { max-height:620px; overflow:auto; padding-right:4px; }
.review-item { padding:16px 4px 18px; border-bottom:1px solid var(--campus-border); header{display:flex;align-items:center;gap:10px} header>div{display:grid;gap:2px;min-width:0} header strong{color:var(--campus-ink);font-size:14px} header span,header small{color:#8492a6;font-size:11px} .el-tag{margin-left:auto} p{margin:13px 0;color:var(--campus-text);font-size:13px;line-height:1.75;white-space:pre-wrap} footer{display:flex;justify-content:flex-end;gap:10px;padding-top:10px} }
.review-images { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; .el-image{height:90px;border-radius:10px;overflow:hidden} }
:global(:root[data-theme="dark"]) .map-stage { background:radial-gradient(circle at 50% 45%,#162237,#0f172a); }
:global(:root[data-theme="dark"]) .map-loading,
:global(:root[data-theme="dark"]) .map-error { color:#cbd8e8; background:rgba(15,23,42,.82); }
:global(:root[data-theme="dark"]) .admin-youth-page .map-card,
:global(:root[data-theme="dark"]) .admin-youth-page .review-card {
  color: var(--campus-text) !important;
  border-color: var(--campus-border) !important;
  background: var(--campus-surface) !important;
}
:global(:root[data-theme="dark"]) .admin-youth-page .map-head b,
:global(:root[data-theme="dark"]) .admin-youth-page .review-head b,
:global(:root[data-theme="dark"]) .admin-youth-page .review-item header strong {
  color: #eef4fc !important;
}
:global(:root[data-theme="dark"]) .admin-youth-page .map-head small,
:global(:root[data-theme="dark"]) .admin-youth-page .review-head small,
:global(:root[data-theme="dark"]) .admin-youth-page .review-item header span,
:global(:root[data-theme="dark"]) .admin-youth-page .review-item header small {
  color: #9fb0c5 !important;
}
:global(:root[data-theme="dark"]) .admin-youth-page .backend-alert {
  border-color: rgba(245, 158, 11, 0.26) !important;
  background: rgba(146, 88, 20, 0.16) !important;
}
:global(:root[data-theme="dark"]) .admin-youth-page .el-empty {
  color: #a9b7ca !important;
}
@media(max-width:1200px){.review-layout{grid-template-columns:1fr}.map-stage{height:540px}.review-list{max-height:none}}
</style>
