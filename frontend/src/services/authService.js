import api from './api'

const getRoleFromToken = (token) => {
  try {
    if (!token) return null
    const payloadBase64 = token.split('.')[1]
    if (!payloadBase64) return null
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadJson)
    const role = payload.role || (Array.isArray(payload.roles) ? payload.roles[0] : payload.roles) || payload.authorities?.[0]
    return role ? String(role).toUpperCase().replace(/^ROLE_/, '') : null
  } catch (e) {
    return null
  }
}

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password })
    const resData = response.data?.data || response.data
    const accessToken = resData?.accessToken || response.data?.accessToken
    const refreshToken = resData?.refreshToken || response.data?.refreshToken
    const userEmail = resData?.email || response.data?.email
    
    let role = resData?.role || resData?.userRole || resData?.user?.role || response.data?.role
    if (role) {
      role = String(role).toUpperCase().replace(/^ROLE_/, '')
    } else if (accessToken) {
      role = getRoleFromToken(accessToken)
    }

    if (accessToken) localStorage.setItem('accessToken', accessToken)
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
    if (role) localStorage.setItem('userRole', role)
    if (userEmail) localStorage.setItem('userEmail', userEmail)

    return {
      ...response.data,
      role: role || response.data?.role
    }
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
    let role = localStorage.getItem('userRole')
    if (!role) {
      const token = localStorage.getItem('accessToken')
      if (token) {
        role = getRoleFromToken(token)
        if (role) {
          localStorage.setItem('userRole', role)
        }
      }
    }
    return role ? String(role).toUpperCase().replace(/^ROLE_/, '') : null
  },

  getEmail: () => {
    return localStorage.getItem('userEmail')
  },
}

