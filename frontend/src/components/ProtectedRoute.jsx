import { Navigate } from 'react-router-dom'
import { authService } from '../services/authService'

function ProtectedRoute({ children, allowedRoles }) {
  const isAuthenticated = authService.isAuthenticated()
  const userRole = authService.getRole()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">403 - Access Denied</h1>
          <p className="text-gray-600 mb-4">You do not have permission to access this page.</p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return children
}

export default ProtectedRoute
