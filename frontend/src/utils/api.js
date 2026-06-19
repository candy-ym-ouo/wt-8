import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('zine_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('zine_token')
      localStorage.removeItem('zine_user')
      if (!window.location.hash.includes('#/login') && !window.location.hash.includes('#/register')) {
        window.location.hash = '#/login'
      }
    }
    return Promise.reject(error.response?.data || error)
  }
)

export default api
