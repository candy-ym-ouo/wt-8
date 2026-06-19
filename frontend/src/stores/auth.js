import { defineStore } from 'pinia'
import api from '@/utils/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null,
    user: null
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'ADMIN'
  },
  actions: {
    initFromStorage() {
      const token = localStorage.getItem('zine_token')
      const userStr = localStorage.getItem('zine_user')
      if (token) this.token = token
      if (userStr) {
        try {
          this.user = JSON.parse(userStr)
        } catch (e) {}
      }
    },
    async login(identifier, password) {
      const res = await api.post('/auth/login', { identifier, password })
      this.token = res.token
      this.user = res.user
      localStorage.setItem('zine_token', res.token)
      localStorage.setItem('zine_user', JSON.stringify(res.user))
      return res
    },
    async register(data) {
      const res = await api.post('/auth/register', data)
      this.token = res.token
      this.user = res.user
      localStorage.setItem('zine_token', res.token)
      localStorage.setItem('zine_user', JSON.stringify(res.user))
      return res
    },
    async fetchProfile() {
      const res = await api.get('/auth/me')
      this.user = res.user
      localStorage.setItem('zine_user', JSON.stringify(res.user))
      return res
    },
    async updateProfile(data) {
      const res = await api.put('/auth/profile', data)
      this.user = res.user
      localStorage.setItem('zine_user', JSON.stringify(res.user))
      return res
    },
    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem('zine_token')
      localStorage.removeItem('zine_user')
    }
  }
})
