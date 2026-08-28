import api from './api'

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password })
    const { accessToken, refreshToken, role, email: userEmail } = response.data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('userRole', role)
    localStorage.setItem('userEmail', userEmail)
    return response.data
  },

  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      await api.post('/api/auth/logout', { refreshToken })
    } catch (error) {
      // Ignore errors on logout
    } finally {
      localStorage.clear()
    }
  },

  forgotPassword: async (email) => {
    const response = await api.post('/api/auth/forgot-password', { email })
    return response.data
  },

  resetPassword: async (token, newPassword) => {
    const response = await api.post('/api/auth/reset-password', { token, newPassword })
    return response.data
  },

  // Clears tokens locally without calling the logout API (used for role-mismatch rejections)
  clearTokens: () => {
    localStorage.clear()
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('accessToken')
  },

  getRole: () => {
    return localStorage.getItem('userRole')
  },

  getEmail: () => {
    return localStorage.getItem('userEmail')
  },
}
