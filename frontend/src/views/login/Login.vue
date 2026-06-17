<template>
  <main class="min-h-screen overflow-hidden bg-[#f9fafb] px-3 py-3 font-sans sm:px-6 sm:py-6 lg:px-8 lg:py-8">
    <section class="relative w-full max-w-[1400px] mx-auto rounded-[48px] bg-white border border-slate-200/50 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.03)] overflow-hidden h-[600px] flex flex-col">
      <div class="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
        <video
          autoplay
          loop
          muted
          playsinline
          class="w-full h-full object-cover scale-105 transition-transform duration-1000"
        >
          <source :src="heroVideo" type="video/mp4">
        </video>
      </div>

      <div ref="textLayer" class="relative z-20 flex-1 px-8 md:px-16 pt-12 md:pt-16 flex flex-col items-start opacity-0">
        <div class="max-w-[560px]">
          <div class="mb-5 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a1b33] shadow-sm backdrop-blur-xl">
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]"></span>
            Smart Campus 2.0
          </div>
          <h1 class="campus-title font-display text-[54px] md:text-[76px] font-semibold leading-[0.95] tracking-[-0.06em]">
            智慧校园
          </h1>
          <p class="mt-5 max-w-[620px] font-sans text-[14px] md:text-[15px] leading-7 text-[#64748b]">
            <span class="md:whitespace-nowrap">Designing products, powering ecosystems and laying the foundation</span><br class="hidden md:block">
            <span class="md:whitespace-nowrap">of a decentralized web for enterprises, builders and communities alike.</span>
          </p>
          <div class="mt-7 flex max-w-full flex-wrap items-center gap-3">
            <button
              ref="contactButton"
              type="button"
              :aria-expanded="contactOpen"
              class="shrink-0 rounded-full bg-[#0a152d] px-6 py-3 text-[13px] font-semibold text-white shadow-[0_10px_30px_rgba(10,21,45,0.18)]"
              @click="contactOpen = !contactOpen"
              @mouseenter="animateButton(true)"
              @mouseleave="animateButton(false)"
            >
              Contact Us
            </button>
            <Transition name="contact-detail">
              <button
                v-if="contactOpen"
                type="button"
                class="whitespace-nowrap rounded-full border border-white/80 bg-white/85 px-5 py-3 text-[13px] font-semibold text-[#0a1b33] shadow-sm backdrop-blur-xl"
                title="点击复制微信昵称"
                @click="copyWechatNickname"
              >
                WeChat nickname : taball
              </button>
            </Transition>
          </div>
        </div>
      </div>

      <Transition name="login-panel">
        <button
          v-if="!desktopLoginOpen"
          type="button"
          aria-label="展开登录卡片"
          class="absolute right-5 top-5 z-20 hidden h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-white/90 text-lg text-[#0a1b33] shadow-[0_12px_35px_rgba(15,23,42,0.12)] backdrop-blur-2xl transition-transform hover:scale-105 md:flex lg:right-10 lg:top-10"
          @click="openDesktopLogin"
        >
          ✦
        </button>
      </Transition>

      <Transition name="login-panel">
      <aside v-if="desktopLoginOpen" class="absolute right-5 top-5 z-20 hidden w-[380px] rounded-[34px] border border-white/70 bg-white/88 p-7 shadow-[0_28px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl md:block lg:right-10 lg:top-10">
        <div class="mb-6 flex items-start justify-between">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Welcome back</p>
            <h2 class="mt-2 font-display text-2xl font-medium tracking-[-0.03em] text-[#0a1b33]">登录智慧校园</h2>
          </div>
          <button
            type="button"
            aria-label="收起登录卡片"
            class="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/70 bg-white text-lg text-[#0a1b33] shadow-sm transition-transform hover:scale-105"
            @click="desktopLoginOpen = false"
          >
            ✦
          </button>
        </div>

        <div class="mb-5 grid grid-cols-3 gap-1 rounded-full bg-slate-100/80 p-1">
          <button
            v-for="role in roles"
            :key="role.value"
            type="button"
            class="rounded-full px-2 py-2 text-[12px] font-semibold transition-all"
            :class="activeRole === role.value ? 'bg-white text-[#0a1b33] shadow-sm' : 'text-slate-400 hover:text-slate-600'"
            @click="activeRole = role.value"
          >
            {{ role.label }}
          </button>
        </div>

        <form class="space-y-3" @submit.prevent="handleLogin">
          <label class="relative block">
            <UserRound :size="17" class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref="usernameInput"
              v-model.trim="form.username"
              type="text"
              autocomplete="username"
              placeholder="请输入账号"
              class="h-12 w-full rounded-full border border-slate-200/80 bg-white/90 pl-11 pr-4 text-[13px] text-[#0a1b33] outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            >
          </label>
          <label class="relative block">
            <LockKeyhole :size="17" class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              placeholder="请输入密码"
              class="h-12 w-full rounded-full border border-slate-200/80 bg-white/90 pl-11 pr-4 text-[13px] text-[#0a1b33] outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            >
          </label>
          <div class="flex items-center justify-between px-1 text-[11px] text-slate-400">
            <label class="flex cursor-pointer items-center gap-2">
              <input v-model="remember" type="checkbox" class="h-3.5 w-3.5 accent-[#0a152d]">
              记住账号
            </label>
            <span>默认密码 123456</span>
          </div>
          <button
            type="submit"
            :disabled="loading"
            class="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0a152d] text-[13px] font-semibold text-white shadow-[0_10px_25px_rgba(10,21,45,0.16)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(10,21,45,0.22)] disabled:cursor-wait disabled:opacity-70"
          >
            <span>{{ loading ? '正在登录...' : '进入校园' }}</span>
            <ArrowRight v-if="!loading" :size="15" class="transition-transform group-hover:translate-x-0.5" />
          </button>
        </form>

        <p class="mt-5 text-center text-[11px] leading-5 text-slate-400">智慧校园统一身份认证 · 安全连接</p>
      </aside>
      </Transition>

    </section>

    <section class="mx-auto mt-10 max-w-[1400px] pb-8">
      <div
        class="marquee-shell overflow-hidden"
        :style="{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }"
      >
        <div class="marquee-track flex w-max gap-4 py-2">
          <template v-for="copy in 2" :key="copy">
            <article
              v-for="logo in logos"
              :key="`${copy}-${logo.alt}`"
              class="group relative h-24 w-40 shrink-0 flex items-center justify-center rounded-full bg-white border border-slate-200/60 shadow-sm hover:border-slate-300 transition-all overflow-hidden"
            >
              <div
                class="absolute inset-0 scale-150 opacity-0 transition-all duration-500 group-hover:scale-100 group-hover:opacity-100"
                :style="{ background: `linear-gradient(135deg, ${logo.gradient.from}, ${logo.gradient.to})` }"
              ></div>
              <img
                :src="logo.src"
                :alt="logo.alt"
                loading="lazy"
                class="relative z-10 max-h-9 max-w-[86px] object-contain transition-all duration-300 group-hover:brightness-0 group-hover:invert"
              >
            </article>
          </template>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="mobileLoginOpen" class="fixed inset-0 z-50 flex items-end bg-slate-950/25 p-3 backdrop-blur-sm md:hidden" @click.self="mobileLoginOpen = false">
        <div class="w-full rounded-[32px] bg-white p-6 shadow-2xl">
          <div class="mb-5 flex items-center justify-between">
            <h2 class="font-display text-2xl font-medium text-[#0a1b33]">登录智慧校园</h2>
            <button type="button" class="h-9 rounded-full bg-slate-100 px-4 text-xs font-semibold text-slate-500" @click="mobileLoginOpen = false">关闭</button>
          </div>
          <div class="mb-4 grid grid-cols-3 gap-1 rounded-full bg-slate-100 p-1">
            <button v-for="role in roles" :key="role.value" type="button" class="rounded-full py-2 text-xs font-semibold" :class="activeRole === role.value ? 'bg-white text-[#0a1b33] shadow-sm' : 'text-slate-400'" @click="activeRole = role.value">{{ role.label }}</button>
          </div>
          <form class="space-y-3" @submit.prevent="handleLogin">
            <input v-model.trim="form.username" type="text" placeholder="请输入账号" class="h-12 w-full rounded-full border border-slate-200 px-5 text-sm outline-none focus:border-slate-400">
            <input v-model="form.password" type="password" placeholder="请输入密码" class="h-12 w-full rounded-full border border-slate-200 px-5 text-sm outline-none focus:border-slate-400">
            <button type="submit" :disabled="loading" class="h-12 w-full rounded-full bg-[#0a152d] text-sm font-semibold text-white">{{ loading ? '正在登录...' : '进入校园' }}</button>
          </form>
        </div>
      </div>
    </Teleport>
  </main>
</template>

<script setup>
import { nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { animate } from 'motion'
import { ArrowRight, LockKeyhole, UserRound } from '@lucide/vue'
import { useUserStore } from '@/stores/user'
import { login } from '@/api/auth'

const heroVideo = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260505_101331_74f9b798-3f00-4e86-8a01-377aa16ffeaa.mp4'

const roles = [
  { label: '学生', value: 'student' },
  { label: '教师', value: 'teacher' },
  { label: '管理员', value: 'admin' }
]

const logos = [
  { src: '/logos/campus-bird.png', alt: 'Smart Campus', gradient: { from: '#2563eb', to: '#93c5fd' } },
  { src: 'https://svgl.app/library/shopify.svg', alt: 'Shopify', gradient: { from: '#facc15', to: '#fef08a' } },
  { src: 'https://svgl.app/library/blender.svg', alt: 'Blender', gradient: { from: '#38bdf8', to: '#1d4ed8' } },
  { src: 'https://svgl.app/library/figma.svg', alt: 'Figma', gradient: { from: '#2563eb', to: '#dbeafe' } },
  { src: 'https://svgl.app/library/spotify.svg', alt: 'Spotify', gradient: { from: '#fb7185', to: '#f9a8d4' } },
  { src: 'https://svgl.app/library/lottielab.svg', alt: 'Lottielab', gradient: { from: '#fde047', to: '#86efac' } },
  { src: 'https://svgl.app/library/google-cloud.svg', alt: 'Google Cloud', gradient: { from: '#bae6fd', to: '#dbeafe' } },
  { src: 'https://svgl.app/library/bing.svg', alt: 'Bing', gradient: { from: '#22d3ee', to: '#2dd4bf' } }
]

const router = useRouter()
const userStore = useUserStore()
const textLayer = ref(null)
const contactButton = ref(null)
const usernameInput = ref(null)
const desktopLoginOpen = ref(false)
const mobileLoginOpen = ref(false)
const contactOpen = ref(false)
const loading = ref(false)
const activeRole = ref('student')
const remember = ref(false)
const form = reactive({ username: '', password: '' })

onMounted(() => {
  animate(textLayer.value, { opacity: [0, 1], transform: ['translateY(18px)', 'translateY(0px)'] }, { duration: 0.7, easing: [0.22, 1, 0.36, 1] })
})

const animateButton = (hovered) => {
  animate(contactButton.value, { transform: hovered ? 'scale(1.04)' : 'scale(1)' }, { duration: 0.2 })
}

const copyWechatNickname = async () => {
  try {
    await navigator.clipboard.writeText('taball')
    ElMessage.success('微信昵称已复制')
  } catch {
    ElMessage.info('WeChat nickname : taball')
  }
}

const openDesktopLogin = async () => {
  desktopLoginOpen.value = true
  await nextTick()
  window.setTimeout(() => usernameInput.value?.focus(), 220)
}

const focusLogin = async () => {
  if (window.matchMedia('(min-width: 768px)').matches) {
    await openDesktopLogin()
    return
  }
  mobileLoginOpen.value = true
}

const handleLogin = async () => {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入账号和密码')
    return
  }

  loading.value = true
  try {
    const res = await login({
      username: form.username,
      password: form.password,
      role: activeRole.value
    })
    userStore.setToken(res.data.token)
    userStore.setUserInfo(res.data.user)
    ElMessage.success('登录成功')
    router.push(`/${activeRole.value}/dashboard`)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.campus-title {
  width: fit-content;
  padding-right: 0.12em;
  color: transparent;
  background: linear-gradient(112deg, #07172f 5%, #123e81 48%, #1677e8 78%, #0a1b33 100%);
  background-size: 180% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 10px 20px rgba(29, 78, 216, 0.14));
  animation: title-shimmer 7s ease-in-out infinite alternate;
}

@keyframes title-shimmer {
  from {
    background-position: 0% 50%;
  }
  to {
    background-position: 100% 50%;
  }
}

.login-panel-enter-active,
.login-panel-leave-active {
  transform-origin: top right;
  transition: opacity 240ms ease, transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.login-panel-enter-from,
.login-panel-leave-to {
  opacity: 0;
  transform: scale(0.18);
}

.contact-detail-enter-active,
.contact-detail-leave-active {
  transition: opacity 220ms ease, transform 280ms cubic-bezier(0.22, 1, 0.36, 1), max-width 280ms ease;
  overflow: hidden;
}

.contact-detail-enter-from,
.contact-detail-leave-to {
  max-width: 0;
  opacity: 0;
  transform: translateX(-12px);
}

.contact-detail-enter-to,
.contact-detail-leave-from {
  max-width: 240px;
}
</style>
