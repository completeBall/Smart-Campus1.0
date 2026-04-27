import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

function safeGetItem(key) {
  try {
    return localStorage.getItem(key)
  } catch (e) {
    return null
  }
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch (e) {
    // ignore
  }
}

function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key)
  } catch (e) {
    // ignore
  }
}

function parseUserInfo() {
  try {
    return JSON.parse(safeGetItem('userInfo') || '{}')
  } catch (e) {
    return {}
  }
}

export const useUserStore = defineStore('user', () => {
  const token = ref(safeGetItem('token') || '')
  const userInfo = ref(parseUserInfo())

  const isLoggedIn = computed(() => !!token.value)

  const setToken = (newToken) => {
    token.value = newToken
    safeSetItem('token', newToken)
  }

  const setUserInfo = (info) => {
    userInfo.value = info
    safeSetItem('userInfo', JSON.stringify(info))
  }

  const logout = () => {
    token.value = ''
    userInfo.value = {}
    safeRemoveItem('token')
    safeRemoveItem('userInfo')
  }

  return { token, userInfo, isLoggedIn, setToken, setUserInfo, logout }
})
