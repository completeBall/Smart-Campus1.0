<template>
  <div class="youth-page">
    <section class="hero-card">
      <div>
        <span class="hero-kicker">YOUTH CO-CREATION</span>
        <h2>青年共创 · 把青春故事点亮在地图上</h2>
        <p>从一座城市出发，分享旅途、家乡、美食和校园之外的新鲜见闻。</p>
      </div>
      <div class="hero-stats">
        <strong>{{ regionStats.reduce((sum, item) => sum + Number(item.post_count || 0), 0) }}</strong>
        <span>全国分享</span>
      </div>
    </section>

    <div class="creation-layout">
      <el-card class="map-card" shadow="never">
        <template #header>
          <div class="map-head">
            <div>
              <span class="map-title">{{ mapLevel === 'china' ? '中国青年共创地图' : `${selectedProvince.name} · 城市地图` }}</span>
              <small>{{ mapLevel === 'china' ? '点击省份，探索每一座城市' : '点击城市，查看当地同学的分享' }}</small>
            </div>
            <div class="map-actions">
              <button type="button" class="preview-toggle" :class="{ active: previewVisible }" @click="togglePreview">
                {{ previewVisible ? '隐藏预览' : '显示预览' }}
              </button>
              <el-button v-if="mapLevel === 'province'" class="back-button" @click="backToChina">
                <el-icon><Back /></el-icon>返回全国
              </el-button>
            </div>
          </div>
        </template>

        <div class="map-stage" :class="{ changing: mapChanging }">
          <div ref="mapRef" class="china-map"></div>
          <transition name="preview-cloud">
            <div v-if="previewVisible" class="map-preview">
              <div v-if="previewLoading" class="preview-empty">
                <span class="map-loader"></span>
                <span>正在生成图片预览</span>
              </div>
              <template v-else-if="previewItems.length">
                <svg class="preview-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  <line
                    v-for="(item, index) in previewItems"
                    :key="`line-${item.id}-${index}`"
                    class="preview-line"
                    :x1="item.pinX"
                    :y1="item.pinY"
                    :x2="item.lineEndX"
                    :y2="item.lineEndY"
                    :style="{ '--i': index }"
                    vector-effect="non-scaling-stroke"
                  />
                </svg>
                <span
                  v-for="(item, index) in previewItems"
                  :key="`pin-${item.id}-${index}`"
                  class="preview-pin"
                  :style="{ '--pin-x': `${item.pinX}%`, '--pin-y': `${item.pinY}%`, '--i': index }"
                >
                  <i>{{ index + 1 }}</i>
                </span>
                <article
                  v-for="(item, index) in previewItems"
                  :key="`${item.id}-${index}`"
                  class="preview-card"
                  :style="{
                    '--i': index,
                    '--card-x': `${item.cardX}%`,
                    '--card-y': `${item.cardY}%`
                  }"
                >
                  <img :src="item.previewImage" alt="地区分享预览" />
                  <div>
                    <strong>{{ item.city_name }}</strong>
                    <span>{{ formatShortDate(item.created_at) }}</span>
                  </div>
                </article>
              </template>
              <div v-else class="preview-empty">
                <el-icon><LocationInformation /></el-icon>
                <span>当前区域暂无图片预览</span>
              </div>
            </div>
          </transition>
          <div v-if="mapLoading" class="map-loading">
            <span class="map-loader"></span>
            <strong>正在绘制行政区轮廓</strong>
          </div>
          <div v-if="mapError" class="map-error">
            <el-icon><LocationInformation /></el-icon>
            <strong>地图数据暂时没有加载成功</strong>
            <span>可以点击重试，帖子功能仍然可用。</span>
            <el-button @click="loadMap(currentAdcode)">重新加载</el-button>
          </div>
        </div>

        <div class="map-foot">
          <span><i class="heat-dot low"></i>刚刚点亮</span>
          <span><i class="heat-dot medium"></i>持续共创</span>
          <span><i class="heat-dot high"></i>热门地区</span>
          <span class="map-tip">滚轮缩放 · 拖拽浏览 · 点击下钻</span>
        </div>
      </el-card>

      <el-card class="story-card" shadow="never">
        <template #header>
          <div class="story-head">
            <div>
              <span class="story-title">{{ selectedCity.name || '地区故事' }}</span>
              <small>{{ selectedCity.name ? `${selectedProvince.name} / ${selectedCity.name}` : '请先在地图上选择一座城市' }}</small>
            </div>
            <el-button type="primary" :disabled="!selectedCity.code" @click="openPublish">
              <el-icon><Plus /></el-icon>发布分享
            </el-button>
          </div>
        </template>

        <div v-if="!selectedCity.code" class="city-placeholder">
          <div class="compass"><span></span></div>
          <h3>选择一座城市开始探索</h3>
          <p>点击中国地图中的省份，再点击城市轮廓，就能看到这里发生的青春故事。</p>
        </div>

        <template v-else>
          <div class="city-summary">
            <span class="city-pin"><el-icon><LocationFilled /></el-icon></span>
            <div>
              <strong>{{ selectedCity.name }}</strong>
              <span>共 {{ total }} 条地区分享</span>
            </div>
          </div>

          <div v-loading="postsLoading" class="story-list">
            <div v-if="!posts.length && !postsLoading" class="empty-stories">
              <el-empty description="这里还没有故事，来成为第一个分享的人吧" :image-size="110" />
            </div>
            <article v-for="post in posts" :key="post.id" class="story-item">
              <header>
                <span><el-icon><Location /></el-icon>{{ post.province_name }} / {{ post.city_name }}</span>
                <time>{{ formatTime(post.created_at) }}</time>
              </header>
              <p v-if="post.content">{{ post.content }}</p>
              <div v-if="post.images?.length" class="story-images" :class="`count-${Math.min(post.images.length, 3)}`">
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
                <span class="story-source">来自：{{ post.author_name }}</span>
                <button type="button" :class="{ liked: post.is_liked }" @click="toggleLike(post)">
                  <el-icon><StarFilled /></el-icon>{{ post.like_count || 0 }} 个喜欢
                </button>
              </footer>
            </article>
          </div>
        </template>
      </el-card>
    </div>

    <el-dialog v-model="publishVisible" title="发布地区故事" width="620px" class="youth-dialog" destroy-on-close>
      <div class="publish-location">
        <span><el-icon><LocationFilled /></el-icon></span>
        <div>
          <strong>{{ selectedCity.name }}</strong>
          <small>{{ selectedProvince.name }} · 青年共创</small>
        </div>
      </div>
      <div class="author-field">
        <div class="author-label">
          <strong>发起者</strong>
          <span>可以使用真实姓名，也可以填写喜欢的网名</span>
        </div>
        <el-input
          v-model="form.author_name"
          maxlength="50"
          show-word-limit
          placeholder="请输入本次分享展示的名字"
        />
      </div>
      <el-input
        v-model="form.content"
        type="textarea"
        :rows="6"
        maxlength="2000"
        show-word-limit
        placeholder="分享这座城市的趣事、旅行见闻、家乡味道或一段难忘经历..."
      />
      <div class="upload-title">添加照片 <span>最多 9 张，单张不超过 30MB，大图会自动压缩</span></div>
      <el-upload
        v-model:file-list="imageList"
        :http-request="uploadImage"
        :before-upload="beforeImageUpload"
        :on-remove="removeImage"
        :on-exceed="handleImageExceed"
        list-type="picture-card"
        accept="image/*"
        multiple
        :limit="9"
      >
        <el-icon><Plus /></el-icon>
      </el-upload>
      <template #footer>
        <el-button @click="publishVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitPost">发布到地图</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import * as echarts from 'echarts'
import { feature as topojsonFeature } from 'topojson-client'
import taiwanTopology from 'taiwan-atlas/counties-10t.json'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { Back, Location, LocationFilled, LocationInformation, Plus, StarFilled } from '@element-plus/icons-vue'
import {
  createYouthPost,
  getYouthPosts,
  getYouthRegions,
  toggleYouthPostLike,
  uploadForumImages
} from '@/api/student'

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
const userStore = useUserStore()
const IMAGE_UPLOAD_LIMIT_MB = 30
const IMAGE_UPLOAD_LIMIT_SIZE = IMAGE_UPLOAD_LIMIT_MB * 1024 * 1024
const SERVER_SAFE_IMAGE_SIZE = 4.6 * 1024 * 1024
const IMAGE_MAX_DIMENSION = 2560
const mapRef = ref()
const mapLevel = ref('china')
const currentAdcode = ref('100000')
const mapLoading = ref(true)
const mapChanging = ref(false)
const mapError = ref(false)
const regionStats = ref([])
const selectedProvince = reactive({ code: '', name: '' })
const selectedCity = reactive({ code: '', name: '' })
const posts = ref([])
const total = ref(0)
const postsLoading = ref(false)
const previewVisible = ref(false)
const previewPosts = ref([])
const previewLoading = ref(false)
const previewSyncTick = ref(0)
const publishVisible = ref(false)
const submitting = ref(false)
const imageList = ref([])
const form = reactive({ author_name: '', content: '', images: [] })
let chart = null
let currentGeoJson = null
let themeObserver = null
let previewFrame = 0
const mapCache = new Map()

const isDark = () => document.documentElement.dataset.theme === 'dark'
const mapName = (adcode) => `youth-map-${adcode}`
const previewLayouts = [
  { cardX: 35, cardY: 20 },
  { cardX: 52, cardY: 18 },
  { cardX: 29, cardY: 44 },
  { cardX: 56, cardY: 46 },
  { cardX: 39, cardY: 33 }
]
const previewItems = computed(() => previewPosts.value
  .map((item, index) => {
    previewSyncTick.value
    const layout = previewLayouts[index % previewLayouts.length]
    const pin = resolvePreviewPin(item)
    return {
      ...item,
      previewImage: Array.isArray(item.images) ? item.images[0] : '',
      pinX: pin.x,
      pinY: pin.y,
      cardX: layout.cardX,
      cardY: layout.cardY,
      lineEndX: layout.cardX + 7,
      lineEndY: layout.cardY + 16
    }
  })
  .filter((item) => item.previewImage)
  .slice(0, 5))

const statValue = (code, level) => regionStats.value
  .filter((item) => String(level === 'china' ? item.province_code : item.city_code) === String(code))
  .reduce((sum, item) => sum + Number(item.post_count || 0), 0)

const walkCoords = (coords, points = []) => {
  if (!Array.isArray(coords)) return points
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    points.push(coords)
    return points
  }
  coords.forEach((item) => walkCoords(item, points))
  return points
}

const getFeatureCenter = (feature) => {
  const properties = feature?.properties || {}
  const center = properties.centroid || properties.center || properties.cp
  if (Array.isArray(center) && center.length >= 2) return center
  const points = walkCoords(feature?.geometry?.coordinates || [])
  if (!points.length) return null
  const [lngTotal, latTotal] = points.reduce(([lng, lat], item) => [lng + item[0], lat + item[1]], [0, 0])
  return [lngTotal / points.length, latTotal / points.length]
}

const findMapFeature = (post) => {
  const features = currentGeoJson?.features || []
  const code = String(mapLevel.value === 'china' ? post.province_code : post.city_code || post.province_code)
  return features.find((feature) => String(feature.properties?.adcode || '') === code)
}

const resolvePreviewPin = (post) => {
  const fallback = { x: 50, y: 55 }
  if (!chart || !mapRef.value || !currentGeoJson) return fallback
  const feature = findMapFeature(post)
  const center = getFeatureCenter(feature)
  if (!center) return fallback
  try {
    const pixel = chart.convertToPixel({ seriesIndex: 0 }, center)
    const rect = mapRef.value.getBoundingClientRect()
    if (!Array.isArray(pixel) || !rect.width || !rect.height) return fallback
    return {
      x: (pixel[0] / rect.width) * 100,
      y: (pixel[1] / rect.height) * 100
    }
  } catch (error) {
    return fallback
  }
}

const syncPreviewAnchors = () => {
  if (!previewVisible.value) return
  previewSyncTick.value += 1
}

const schedulePreviewSync = () => {
  if (previewFrame) cancelAnimationFrame(previewFrame)
  previewFrame = requestAnimationFrame(() => {
    previewFrame = 0
    syncPreviewAnchors()
  })
}

const renderMap = (geoJson, adcode) => {
  if (!chart) chart = echarts.init(mapRef.value)
  currentGeoJson = geoJson
  const dark = isDark()
  const data = (geoJson.features || []).map((feature) => ({
    name: feature.properties.name,
    value: statValue(feature.properties.adcode, mapLevel.value),
    adcode: String(feature.properties.adcode || '')
  }))
  const values = data.map((item) => item.value)
  echarts.registerMap(mapName(adcode), geoJson)
  chart.setOption({
    backgroundColor: 'transparent',
    animationDuration: 800,
    animationDurationUpdate: 720,
    animationEasingUpdate: 'cubicOut',
    tooltip: {
      trigger: 'item',
      formatter: ({ name, value }) => `${name}<br/>${Number(value || 0)} 条青春故事`,
      backgroundColor: dark ? '#111827' : '#ffffff',
      borderColor: dark ? '#33465f' : '#dbe5f2',
      textStyle: { color: dark ? '#eef4fc' : '#0a1b33' }
    },
    visualMap: {
      show: false,
      min: 0,
      max: Math.max(...values, 5),
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
      label: {
        show: true,
        color: dark ? '#cbd8e8' : '#29415f',
        fontSize: mapLevel.value === 'china' ? 10 : 11
      },
      itemStyle: {
        areaColor: dark ? '#17243a' : '#eaf1fb',
        borderColor: dark ? '#6682a6' : '#ffffff',
        borderWidth: 1
      },
      emphasis: {
        label: { color: '#ffffff', fontWeight: 700 },
        itemStyle: { areaColor: '#2563eb', borderColor: '#bfdbfe', borderWidth: 1.5, shadowBlur: 18, shadowColor: 'rgba(37, 99, 235, 0.42)' }
      },
      select: {
        label: { color: '#ffffff', fontWeight: 700 },
        itemStyle: { areaColor: '#123e81', borderColor: '#dbeafe', borderWidth: 2 }
      }
    }]
  }, true)
  chart.off('click')
  chart.off('georoam')
  chart.off('finished')
  chart.on('click', ({ data }) => {
    if (!data?.adcode) return
    if (mapLevel.value === 'china') drillProvince(data)
    else selectCity(data)
  })
  chart.on('georoam', schedulePreviewSync)
  chart.on('finished', schedulePreviewSync)
  nextTick(schedulePreviewSync)
}

const loadMap = async (adcode = '100000') => {
  mapLoading.value = true
  mapError.value = false
  mapChanging.value = true
  try {
    let geoJson
    if (String(adcode) === TAIWAN_ADCODE) {
      geoJson = taiwanGeoJson
    } else if (mapCache.has(adcode)) {
      geoJson = mapCache.get(adcode)
    } else {
      const response = await fetch(`${MAP_ROOT}/${adcode}_full.json`)
      if (!response.ok) throw new Error('地图请求失败')
      geoJson = await response.json()
      mapCache.set(adcode, geoJson)
    }
    await nextTick()
    renderMap(geoJson, adcode)
  } catch (error) {
    mapError.value = true
  } finally {
    mapLoading.value = false
    setTimeout(() => { mapChanging.value = false }, 380)
  }
}

const refreshMapTheme = () => {
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
  posts.value = []
  total.value = 0
  mapLevel.value = 'province'
  currentAdcode.value = region.adcode
  await loadMap(region.adcode)
  if (previewVisible.value) await loadPreviewPosts()
}

const selectCity = async (region) => {
  selectedCity.code = region.adcode
  selectedCity.name = region.name
  await loadPosts()
  if (previewVisible.value) await loadPreviewPosts()
}

const backToChina = async () => {
  mapLevel.value = 'china'
  currentAdcode.value = '100000'
  selectedProvince.code = ''
  selectedProvince.name = ''
  selectedCity.code = ''
  selectedCity.name = ''
  posts.value = []
  total.value = 0
  await loadMap('100000')
  if (previewVisible.value) await loadPreviewPosts()
}

const loadRegions = async () => {
  try {
    const { data } = await getYouthRegions()
    regionStats.value = data || []
  } catch (error) {
    regionStats.value = []
    console.warn('[青年共创] 地区统计加载失败，地图仍将继续显示', error)
  }
}

const loadPosts = async () => {
  if (!selectedCity.code) return
  postsLoading.value = true
  try {
    const { data } = await getYouthPosts({
      province_code: selectedProvince.code,
      city_code: selectedCity.code,
      pageSize: 30
    })
    posts.value = data.list || []
    total.value = data.total || 0
  } finally {
    postsLoading.value = false
  }
}

const loadPreviewPosts = async () => {
  previewLoading.value = true
  try {
    const params = { pageSize: 30 }
    if (selectedProvince.code) params.province_code = selectedProvince.code
    if (selectedCity.code) params.city_code = selectedCity.code
    const { data } = await getYouthPosts(params)
    previewPosts.value = data.list || []
    await nextTick()
    schedulePreviewSync()
  } catch (error) {
    previewPosts.value = []
    console.warn('[青年共创] 预览图片加载失败', error)
  } finally {
    previewLoading.value = false
  }
}

const togglePreview = async () => {
  previewVisible.value = !previewVisible.value
  if (previewVisible.value && !previewLoading.value) {
    await loadPreviewPosts()
  }
}

const openPublish = () => {
  if (!selectedCity.code) return ElMessage.warning('请先在地图上选择城市')
  form.author_name = userStore.userInfo.name || userStore.userInfo.username || ''
  form.content = ''
  form.images = []
  imageList.value = []
  publishVisible.value = true
}

const beforeImageUpload = (file) => {
  if (!file.type?.startsWith('image/')) {
    ElMessage.warning('只能上传图片文件')
    return false
  }
  if (file.size > IMAGE_UPLOAD_LIMIT_SIZE) {
    ElMessage.warning(`单张图片不能超过 ${IMAGE_UPLOAD_LIMIT_MB}MB`)
    return false
  }
  return true
}

const handleImageExceed = () => {
  ElMessage.warning('最多只能上传 9 张图片')
}

const readImageDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(file)
})

const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = reject
  image.src = src
})

const canvasToBlob = (canvas, type, quality) => new Promise((resolve) => {
  canvas.toBlob(resolve, type, quality)
})

const compressImageFile = async (file) => {
  if (file.size <= SERVER_SAFE_IMAGE_SIZE) return file
  if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type || '')) return file

  const dataUrl = await readImageDataUrl(file)
  const image = await loadImage(dataUrl)
  const ratio = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * ratio))
  canvas.height = Math.max(1, Math.round(image.height * ratio))
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

  const outputType = file.type === 'image/png' ? 'image/jpeg' : (file.type || 'image/jpeg')
  const qualities = [0.86, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38]
  let bestBlob = null
  for (const quality of qualities) {
    const blob = await canvasToBlob(canvas, outputType, quality)
    if (!blob) continue
    bestBlob = blob
    if (blob.size <= SERVER_SAFE_IMAGE_SIZE) break
  }
  if (!bestBlob || bestBlob.size >= file.size) return file

  const ext = outputType.includes('png') ? 'png' : outputType.includes('webp') ? 'webp' : 'jpg'
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image'
  return new File([bestBlob], `${baseName}.${ext}`, {
    type: outputType,
    lastModified: Date.now()
  })
}

const uploadImage = async ({ file, onSuccess, onError }) => {
  try {
    const uploadFile = await compressImageFile(file)
    const formData = new FormData()
    formData.append('images', uploadFile)
    const { data } = await uploadForumImages(formData)
    const url = data.urls?.[0]
    if (!url) throw new Error('图片上传失败，请重新选择图片')
    form.images.push(url)
    const listItem = imageList.value.find((item) => item.uid === file.uid)
    if (listItem) {
      listItem.youthUrl = url
      listItem.url = url
      listItem.status = 'success'
    }
    onSuccess?.({ url })
  } catch (error) {
    const message = error.response?.data?.message || error.message || '图片上传失败'
    imageList.value = imageList.value.filter((item) => item.uid !== file.uid)
    ElMessage.error(message)
    onError?.(error)
  }
}

const removeImage = (file) => {
  const url = file.youthUrl || file.url
  const index = form.images.indexOf(url)
  if (index >= 0) form.images.splice(index, 1)
}

const submitPost = async () => {
  if (!form.author_name.trim()) return ElMessage.warning('请填写发起者名称')
  if (!form.content.trim() && form.images.length === 0) return ElMessage.warning('请填写文案或上传至少一张图片')
  submitting.value = true
  try {
    await createYouthPost({
      province_code: selectedProvince.code,
      province_name: selectedProvince.name,
      city_code: selectedCity.code,
      city_name: selectedCity.name,
      author_name: form.author_name.trim(),
      content: form.content.trim(),
      images: form.images
    })
    publishVisible.value = false
    ElMessage.success('分享已提交，等待管理员审核后展示')
    await Promise.all([loadPosts(), loadRegions(), previewVisible.value ? loadPreviewPosts() : Promise.resolve()])
  } finally {
    submitting.value = false
  }
}

const toggleLike = async (post) => {
  const { data } = await toggleYouthPostLike(post.id)
  post.is_liked = data.liked
  post.like_count = data.like_count
}

const formatTime = (time) => dayjs(time).format('YYYY-MM-DD HH:mm')
const formatShortDate = (time) => dayjs(time).format('YYYY.MM.DD')
const resizeMap = () => {
  chart?.resize()
  schedulePreviewSync()
}

onMounted(async () => {
  await Promise.allSettled([loadRegions(), loadMap()])
  window.addEventListener('resize', resizeMap)
  themeObserver = new MutationObserver(refreshMapTheme)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeMap)
  themeObserver?.disconnect()
  if (previewFrame) cancelAnimationFrame(previewFrame)
  chart?.dispose()
})
</script>

<style scoped lang="scss">
.youth-page { display: grid; gap: 16px; overflow: hidden; }
.hero-card {
  min-height: 122px; padding: 22px 34px; display: flex; align-items: center; justify-content: space-between;
  color: #fff; border-radius: 22px; overflow: hidden; position: relative;
  background: radial-gradient(circle at 72% 20%, rgba(96,165,250,.3), transparent 28%), linear-gradient(125deg,#0a2349,#123e81 55%,#1d4f91);
  box-shadow: 0 18px 40px rgba(10,35,73,.2);
  &::after { content:""; position:absolute; inset:0; background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px); background-size:28px 28px; }
  > * { position:relative; z-index:1; }
  h2 { margin:7px 0 8px; font-size:25px; }
  p { margin:0; color:#cfddf0; }
}
.hero-kicker { font-size:10px; font-weight:800; letter-spacing:.2em; color:#93c5fd; }
.hero-stats { width:92px; height:92px; display:grid; place-content:center; text-align:center; border:1px solid rgba(255,255,255,.18); border-radius:50%; background:rgba(255,255,255,.08); backdrop-filter:blur(12px); strong{font-size:25px} span{font-size:11px;color:#bfdbfe} }
.creation-layout { display:grid; grid-template-columns:minmax(0,1.55fr) minmax(350px,.85fr); gap:20px; align-items:stretch; min-height:0; }
.map-card,.story-card { border-radius:20px; border:1px solid #e2e8f0; }
.map-card,.story-card { display:flex; flex-direction:column; min-height:0; }
:deep(.map-card > .el-card__body),
:deep(.story-card > .el-card__body) { flex:1; min-height:0; }
.map-head,.story-head { display:flex; align-items:center; justify-content:space-between; gap:16px; }
.map-head>div:not(.map-actions),.story-head>div { display:grid; gap:3px; }
.map-title,.story-title { color:#0a1b33; font-size:17px; font-weight:700; }
.map-head small,.story-head small { color:#8492a6; font-size:12px; }
.map-actions { display:flex !important; align-items:center; justify-content:flex-end; gap:10px; flex:0 0 auto; white-space:nowrap; }
.preview-toggle {
  height:36px; min-width:104px; padding:0 16px; border:1px solid #dbe5f2; border-radius:999px; background:#fff; color:#48617d;
  font-weight:700; cursor:pointer; box-shadow:0 8px 20px rgba(15,23,42,.06); transition:all .22s ease;
  &:hover { color:#2563eb; border-color:#bfdbfe; transform:translateY(-1px); }
  &.active { color:#fff; border-color:#2563eb; background:linear-gradient(135deg,#2563eb,#60a5fa); box-shadow:0 10px 24px rgba(37,99,235,.22); }
}
.map-stage { height:clamp(430px, calc(100vh - 430px), 540px); position:relative; overflow:hidden; border-radius:16px; background:radial-gradient(circle at 50% 45%,#f8fbff,#eef4fb); transition:opacity .26s ease,transform .26s ease,background-color .26s ease; }
.map-stage.changing { opacity:.84; transform:scale(.992); }
.china-map { width:100%; height:100%; }
.map-preview { position:absolute; inset:0; pointer-events:none; z-index:2; }
.preview-lines {
  position:absolute; inset:0; width:100%; height:100%; overflow:visible; filter:drop-shadow(0 6px 10px rgba(244,114,182,.16));
}
.preview-line {
  stroke:rgba(244,114,182,.72); stroke-width:2.6; stroke-linecap:round;
  animation:preview-line-show .38s ease forwards;
  animation-delay:calc(var(--i, 0) * .06s);
  opacity:0;
}
.preview-pin {
  position:absolute; left:var(--pin-x); top:var(--pin-y); width:22px; height:22px; display:grid; place-items:center;
  border:3px solid rgba(255,255,255,.92); border-radius:50%; background:linear-gradient(135deg,#fda4af,#f472b6);
  box-shadow:0 8px 18px rgba(244,114,182,.28); transform:translate(-50%,-50%) scale(.7); opacity:0;
  animation:preview-pin-pop .48s cubic-bezier(.22,1,.36,1) forwards;
  animation-delay:calc(.18s + var(--i) * .06s);
  i { width:8px; height:8px; border-radius:50%; background:#fff; color:transparent; box-shadow:0 0 0 3px rgba(255,255,255,.22); }
}
.preview-card {
  position:absolute; left:var(--card-x); top:var(--card-y); width:122px; padding:7px 7px 10px; border-radius:12px;
  background:rgba(255,255,255,.96); box-shadow:0 15px 30px rgba(15,23,42,.18); transform:rotate(calc((var(--i) - 2) * 5deg));
  animation:preview-float .7s cubic-bezier(.22,1,.36,1) both, preview-breathe 4s ease-in-out infinite;
  animation-delay:calc(var(--i) * .06s), calc(.7s + var(--i) * .18s);
  &::after {
    content:""; position:absolute; left:50%; bottom:-8px; width:14px; height:14px; border-radius:50%;
    background:#fff; transform:translateX(-50%); box-shadow:0 4px 12px rgba(15,23,42,.12);
  }
  img { width:100%; height:88px; object-fit:cover; border-radius:8px; display:block; }
  div { display:flex; align-items:center; justify-content:space-between; gap:8px; padding-top:7px; color:#334155; }
  strong { font-size:13px; max-width:66px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  span { color:#94a3b8; font-size:10px; white-space:nowrap; }
}
.preview-empty {
  position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); min-width:188px; padding:14px 18px; display:flex; align-items:center; justify-content:center; gap:9px;
  border:1px solid rgba(219,229,242,.9); border-radius:16px; background:rgba(255,255,255,.86); color:#718096; box-shadow:0 16px 36px rgba(15,23,42,.1); backdrop-filter:blur(10px);
  .el-icon { color:#2563eb; font-size:20px; }
}
.preview-cloud-enter-active,.preview-cloud-leave-active { transition:opacity .28s ease, transform .28s ease; }
.preview-cloud-enter-from,.preview-cloud-leave-to { opacity:0; transform:scale(.97); }
@keyframes preview-float { from{opacity:0; transform:translateY(18px) scale(.92) rotate(calc((var(--i) - 2) * 5deg));} to{opacity:1; transform:translateY(0) scale(1) rotate(calc((var(--i) - 2) * 5deg));} }
@keyframes preview-breathe { 50%{ margin-top:-6px; } }
@keyframes preview-line-show { to{ opacity:1; } }
@keyframes preview-pin-pop { to{ opacity:1; transform:translate(-50%,-50%) scale(1); } }
.map-loading,.map-error { position:absolute; inset:0; display:grid; place-content:center; justify-items:center; gap:10px; color:#61748d; background:rgba(248,251,255,.88); backdrop-filter:blur(6px); }
.map-error .el-icon { font-size:38px; color:#5b8fd6; }
.map-loader { width:40px;height:40px;border:3px solid #dbeafe;border-top-color:#2563eb;border-radius:50%;animation:map-spin .8s linear infinite; }
@keyframes map-spin { to{transform:rotate(360deg)} }
.map-foot { display:flex; align-items:center; gap:16px; padding-top:10px; color:#718096; font-size:11px; span{display:flex;align-items:center;gap:5px}.map-tip{margin-left:auto} }
.heat-dot { width:8px;height:8px;border-radius:50%;display:inline-block;&.low{background:#bcd7f5}&.medium{background:#67a8ef}&.high{background:#2563eb} }
.story-card { min-height:0; }
.city-placeholder { min-height:clamp(430px, calc(100vh - 430px), 540px); display:grid; place-content:center; justify-items:center; text-align:center; padding:30px; h3{margin:22px 0 8px;color:#1e293b} p{max-width:310px;margin:0;color:#8492a6;line-height:1.7} }
.compass { width:104px;height:104px;display:grid;place-items:center;border-radius:50%;background:linear-gradient(145deg,#eff6ff,#dbeafe);box-shadow:0 16px 40px rgba(37,99,235,.13); span{width:48px;height:48px;background:linear-gradient(135deg,#2563eb 50%,#f5576c 50%);clip-path:polygon(50% 0,64% 36%,100% 50%,64% 64%,50% 100%,36% 64%,0 50%,36% 36%);animation:compass-float 3s ease-in-out infinite} }
@keyframes compass-float { 50%{transform:rotate(14deg) scale(1.06)} }
.city-summary { display:flex;align-items:center;gap:12px;padding:12px 14px;margin-bottom:12px;border-radius:14px;background:#f5f8fc;.city-pin{width:38px;height:38px;display:grid;place-items:center;color:#2563eb;border-radius:12px;background:#e5effc}.city-summary div{display:grid}.city-summary strong{color:#0a1b33}.city-summary span{color:#8492a6;font-size:12px} }
.story-list { max-height:clamp(430px, calc(100vh - 430px), 540px); min-height:300px; overflow:auto; padding-right:4px; }
.story-item { padding:16px 4px 17px; border-bottom:1px solid #edf1f6; header{display:flex;align-items:center;justify-content:space-between;gap:12px;color:#8a9bb0;font-size:11px} header span,header time{display:flex;align-items:center;gap:4px} p{margin:13px 0;color:#3f4f63;font-size:13px;line-height:1.75;white-space:pre-wrap} footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:10px}.story-source{color:#5f7fa5;font-size:12px;font-weight:700} footer button{border:0;background:transparent;color:#8090a5;cursor:pointer;&.liked{color:#f5576c}} }
.story-images { display:grid;grid-template-columns:repeat(3,1fr);gap:6px;.el-image{width:100%;height:92px;border-radius:10px;overflow:hidden}.el-image:first-child:nth-last-child(1){grid-column:span 3;height:190px}.el-image:first-child:nth-last-child(2),.el-image:first-child:nth-last-child(2)~.el-image{height:140px} }
.empty-stories { padding:80px 0; }
.publish-location { display:flex;align-items:center;gap:12px;padding:12px 14px;margin-bottom:16px;border:1px solid #dce7f4;border-radius:14px;background:#f5f8fc;>span{width:38px;height:38px;display:grid;place-items:center;color:#2563eb;border-radius:12px;background:#e4effd}.publish-location div{display:grid}.publish-location strong{color:#0a1b33}.publish-location small{color:#8492a6} }
.author-field { display:grid; gap:9px; margin-bottom:14px; }
.author-label { display:flex; align-items:baseline; gap:9px; strong{color:#334155;font-size:13px} span{color:#94a3b8;font-size:11px} }
.upload-title { margin:18px 0 10px;color:#334155;font-weight:600;.upload-title span{font-weight:400}.upload-title>span{color:#94a3b8;font-size:11px;margin-left:7px} }
:global(:root[data-theme="dark"]) .map-stage { background:radial-gradient(circle at 50% 45%,#162237,#0f172a); }
:global(:root[data-theme="dark"]) .preview-toggle { color:#cbd8e8; border-color:#263b55; background:#101a2b; box-shadow:0 8px 20px rgba(0,0,0,.22); }
:global(:root[data-theme="dark"]) .preview-toggle.active { color:#fff; border-color:#3b82f6; background:linear-gradient(135deg,#1d4ed8,#3b82f6); }
:global(:root[data-theme="dark"]) .preview-line { stroke:rgba(251,113,133,.72); }
:global(:root[data-theme="dark"]) .preview-pin { border-color:rgba(15,23,42,.88); box-shadow:0 8px 18px rgba(0,0,0,.36); }
:global(:root[data-theme="dark"]) .preview-card { background:rgba(15,23,42,.94); box-shadow:0 18px 34px rgba(0,0,0,.34); }
:global(:root[data-theme="dark"]) .preview-card::after { background:#0f172a; box-shadow:0 4px 12px rgba(0,0,0,.3); }
:global(:root[data-theme="dark"]) .preview-card div { color:#e5edf7; }
:global(:root[data-theme="dark"]) .preview-card span { color:#8fa3bd; }
:global(:root[data-theme="dark"]) .preview-empty { color:#cbd8e8; border-color:#263b55; background:rgba(15,23,42,.84); }
:global(:root[data-theme="dark"]) .map-loading,
:global(:root[data-theme="dark"]) .map-error { color:#cbd8e8; background:rgba(15,23,42,.82); }
@media(max-width:1200px){.creation-layout{grid-template-columns:1fr}.story-card{min-height:auto}.map-stage{height:520px}}
</style>
