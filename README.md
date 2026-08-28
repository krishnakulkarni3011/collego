# Collego — AI-Powered College ERP

A monorepo containing three services for a cloud-based college ERP system.

## Architecture

| Service | Tech | Port |
|---------|------|------|
| **Backend** | Spring Boot 3.2 + PostgreSQL + Spring Security | 8080 |
| **Frontend** | React + Vite + Tailwind CSS v4 | 5173 |
| **AI Service** | FastAPI + Uvicorn | 8000 |

## Quick Start (Docker Compose)

### Prerequisites
- Docker & Docker Compose installed

### Run
```bash
docker-compose up --build
```

This starts:
- **PostgreSQL** on port 5432
- **Backend** on http://localhost:8080
- **Frontend** on http://localhost:5173
- **AI Service** on http://localhost:8000

### Health Checks
```bash
# Backend
curl http://localhost:8080/api/health

# AI Service
curl http://localhost:8000/health
```

### Default Admin Account
- **Email:** admin@collego.edu
- **Password:** Admin@123

This account is automatically created on first run.

## Local Development (Without Docker)

### Backend
```bash
cd backend

# Requires PostgreSQL running locally:
# DB: collego, User: collego, Password: collego123

mvn spring-boot:run
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### AI Service
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Project Structure
```
Collego/
├── frontend/          # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   └── services/      # API client & auth
│   └── Dockerfile
├── backend/           # Spring Boot
│   ├── src/main/java/com/collego/
│   │   ├── config/        # Security, CORS, data seeder
│   │   ├── controller/    # REST endpoints
│   │   ├── dto/           # Request/Response objects
│   │   ├── entity/        # JPA entities
│   │   ├── exception/     # Global error handling
│   │   ├── repository/    # Data access
│   │   ├── security/      # JWT, filters
│   │   └── service/       # Business logic
│   └── Dockerfile
├── ai-service/        # FastAPI
│   ├── main.py
│   └── Dockerfile
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## API Endpoints

### Public
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Backend health check |
| GET | `/health` | AI service health check |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh JWT |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |

### Admin Only (Requires ADMIN role)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/users` | Create student/faculty account |
| GET | `/api/admin/users` | List users (filter by role, active) |
| GET | `/api/admin/users/{id}` | Get user details |
| PUT | `/api/admin/users/{id}/deactivate` | Deactivate user |
| PUT | `/api/admin/users/{id}/activate` | Activate user |
| GET | `/api/admin/audit-logs` | View audit logs |
| POST | `/api/admin/departments` | Create department |

### Authenticated
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/departments` | List departments |

## Roles
- **ADMIN** — Full system access, manages users and departments
- **FACULTY** — Faculty portal access
- **STUDENT** — Student portal access
