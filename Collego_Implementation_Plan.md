# Collego — Phase-Wise Implementation Plan
### AI-Powered Cloud-Based College ERP

**Purpose of this document:** This is a build-order plan intended to be handed to an autonomous coding agent (Google Antigravity). Each phase is scoped to be independently buildable and testable, with clear entry/exit criteria. Backend, data, and core feature logic are prioritized first; UI/UX polish is deliberately deferred to the later phases so the agent can validate business logic against a minimal functional UI before investing in design.

---

## Tech Stack (reference for every phase)

| Layer | Choice |
|---|---|
| Frontend | React.js + Tailwind CSS + Chart.js / Recharts |
| Backend | Spring Boot (Java) |
| Database | PostgreSQL |
| AI Microservice | Python FastAPI (LLM API + scikit-learn models) |
| Auth | JWT + Role-Based Access Control (RBAC) |
| Cloud | AWS — EC2, RDS, S3, IAM, CloudWatch |
| DevOps | Docker, GitHub Actions, Nginx |

**Roles:** Student, Faculty, Admin (RBAC drives almost every module below — build it once, early, correctly.)

---

## Phase 0 — Foundation & Project Scaffolding
**Goal:** A running skeleton with no real features, but every layer wired together.

- Set up monorepo structure: `frontend/`, `backend/`, `ai-service/`, `infra/`
- Initialize Spring Boot project (Java, Maven/Gradle) with base packages: `controller`, `service`, `repository`, `entity`, `dto`, `config`, `security`
- Initialize PostgreSQL schema + connect via Spring Data JPA
- Initialize React app (Vite) with Tailwind CSS configured (no design work yet — just utility classes available)
- Initialize FastAPI skeleton for `ai-service/` with a single health-check endpoint
- Dockerize all three services (backend, frontend, ai-service) + `docker-compose.yml` for local dev with Postgres container
- Set up GitHub repo, branching strategy, and a basic GitHub Actions CI pipeline (build + lint on push)
- Define global error-handling structure (backend exception handler, consistent API error format)

**Exit criteria:** `docker-compose up` boots all services; a placeholder `/api/health` returns 200 from backend and from ai-service.

---

## Phase 1 — Authentication, Users & RBAC
**Goal:** Every subsequent module depends on this — build it once, solid.

- Database schema: `users`, `roles`, `departments`, `students`, `faculty`, `admins` (role-specific profile tables linked to a base `user` table)
- JWT-based authentication: signup (admin-provisioned, not public signup), login, token refresh, logout
- Password hashing (BCrypt), password reset flow
- RBAC middleware/interceptor in Spring Boot — route-level and method-level access control (`@PreAuthorize`)
- Admin capability: create/deactivate student & faculty accounts, assign department & role
- Basic session/audit logging table (who did what, when) — needed later for Admin audit logs
- Minimal unstyled React pages: Login, and 3 blank role-based dashboards (Student/Faculty/Admin) purely to prove routing + token-gated access works

**Exit criteria:** Admin can create a Faculty and Student account; each role logs in and lands on their own protected dashboard; unauthorized role access is correctly blocked.

---

## Phase 2 — Core Academic Data Model
**Goal:** The shared data backbone that Student, Faculty, and Admin portals all read/write.

- Entities: `Department`, `Course/Subject`, `Semester`, `Section`, `Enrollment`, `Timetable`, `Attendance`, `MarksInternal`, `MarksSemester`
- CRUD APIs (Admin-only for structural entities: departments, courses, semesters, timetable slots)
- Faculty-course mapping (which faculty teaches which subject to which section)
- Student-course enrollment linkage
- Seed script / sample data generator for realistic testing (multiple departments, students, subjects)

**Exit criteria:** Full academic structure exists in DB; an Admin can define a department → semester → subjects → assign faculty → enroll students, all via API (Postman-testable, no UI needed yet).

---

## Phase 3 — Student Portal (Feature Logic)
**Goal:** All Student-facing APIs functioning; UI stays minimal/unstyled.

- View attendance (subject-wise, overall %)
- View internal + semester marks
- CGPA/SGPA calculation logic (backend service, not just display)
- View timetable
- View fee status (basic fields — paid/pending/due date; payment gateway integration is out of scope unless specified)
- View placement updates/notices relevant to them
- Download academic documents (marksheet PDF generation, transcript)
- Notification feed (read-only list, backend-populated)

**Exit criteria:** A logged-in student can hit every endpoint above and get correct, real data back.

---

## Phase 4 — Faculty Portal (Feature Logic)
**Goal:** All Faculty-facing write operations that feed the Student Portal.

- Mark attendance (per session, per subject, per section) — bulk entry endpoint
- Upload/enter internal and semester marks
- Upload assignments (metadata + file to S3, or local storage placeholder until Phase 7)
- Course/content management (syllabus, materials)
- Upload previous-year question papers (feeds Phase 6 repository)
- Draft notices/emails (plain text for now — AI generation comes in Phase 8)
- View own course-wise student performance analytics (aggregate, non-AI: averages, pass %, attendance %)

**Exit criteria:** Faculty actions (attendance, marks) correctly reflect in the Student Portal APIs from Phase 3.

---

## Phase 5 — Admin Portal (Feature Logic)
**Goal:** Full administrative control surface.

- Student/faculty/department management (extends Phase 1 basics: bulk import via CSV, edit, deactivate)
- User role management
- System reports: department-wise results, subject-wise pass %, backlog analysis, attendance summaries (raw data + aggregation endpoints; charts come in Phase 9)
- Backup trigger endpoint (DB dump to S3 — stub until Phase 7 AWS wiring)
- Audit log viewer (built on Phase 1's logging table)
- Question paper approval workflow (approve/reject faculty-uploaded papers)

**Exit criteria:** Admin can manage the entire org structure and pull every report as raw JSON/CSV.

---

## Phase 6 — Previous Year Question Paper Repository
**Goal:** Standalone module, but depends on Faculty upload (Phase 4) and Admin approval (Phase 5).

- Search/filter API: by subject, semester, department, year
- Faculty upload endpoint → Admin approval queue → published repository
- File storage integration (S3 bucket, organized by dept/sem/subject)
- Download tracking (optional: popularity metrics, useful later for AI insights in Phase 8)

**Exit criteria:** End-to-end flow: Faculty uploads → Admin approves → Student searches and downloads.

---

## Phase 7 — Placement Management Module
**Goal:** Independent module reusing the user/role backbone.

- Company registration (Admin-managed): company profile, eligibility criteria, job description
- Student resume upload (S3) and application submission
- Eligibility auto-filtering (CGPA/backlog/department rules engine)
- Interview schedule management
- Placement statistics & recruitment history (feeds Admin reports and Student dashboard)

**Exit criteria:** A company can be posted, eligible students can see and apply, and Admin can track applicants and outcomes.

---

## Phase 8 — AWS Cloud Integration & DevOps Hardening
**Goal:** Move from local/dev storage to real cloud infrastructure; this phase can partially run in parallel with 3–7 but should be fully closed before Phase 9.

- EC2 deployment for backend + frontend + ai-service (or containerized on ECS if preferred)
- RDS PostgreSQL migration from local Docker Postgres
- S3 buckets finalized for: resumes, assignments, question papers, marksheets/transcripts, DB backups
- IAM roles/policies — least-privilege access per service
- CloudWatch — logging, basic alerting (error rate, downtime)
- Environment-based config (dev/staging/prod) via GitHub Actions secrets
- Automated backup job (cron/Lambda) writing to S3, tied to Phase 5's backup endpoint
- Nginx reverse proxy + HTTPS (Let's Encrypt or ACM)

**Exit criteria:** The full application is reachable via a public URL, backed entirely by AWS-managed services, with CI/CD auto-deploying on merge to main.

---

## Phase 9 — AI Feature Integration
**Goal:** Layer intelligence on top of a fully functional, cloud-deployed ERP. Each sub-feature below is its own mini-milestone inside the FastAPI `ai-service`, called by the Spring Boot backend.

1. **AI College Assistant (RAG chatbot)** — vector store over college data (attendance, timetable, marks, fees, placements, notices, question papers); retrieval + LLM response generation; exposed via a chat endpoint
2. **Smart AI Search** — same RAG pipeline, but intent-classified to redirect users to the correct module instead of returning a chat answer (e.g., "show my attendance" → route to `/student/attendance`)
3. **Student Performance Prediction** — ML model (scikit-learn) trained on historical marks + attendance to project future SGPA/CGPA and flag at-risk students
4. **Attendance Risk Prediction** — model/rule-engine hybrid that evaluates running attendance trend and triggers early-warning notifications
5. **AI Resume Analyzer** — parses uploaded resume (Phase 7), scores ATS compatibility, flags missing skills, gives a readiness score
6. **AI Placement Assistant** — combines student profile (skills/CGPA/interests) + company data (Phase 7) to recommend companies, identify skill gaps, and generate mock interview questions
7. **AI Notice Summarizer** — summarizes long notices into key dates/deadlines/actions
8. **AI Question Paper Insights** — analyzes the repository (Phase 6) for frequently-tested topics and chapter-wise weightage
9. **AI Email & Notification Generator** — turns a Faculty short prompt into a formatted notice/email (used in Phase 4's notice drafting)

**Exit criteria:** Each AI feature has a working endpoint, is called from its respective portal, and returns sensible output on real seeded data — even if the underlying model is a reasonable first-pass (accuracy tuning can continue post-launch).

---

## Phase 10 — UI/UX Design & Full Frontend Build
**Goal:** Now that every feature is functionally proven end-to-end, invest in real design.

- Define design system: typography, color palette, spacing, component library (buttons, cards, tables, modals, forms) in Tailwind
- Build out Student Portal UI: dashboard, attendance view, marks/CGPA view (with Chart.js/Recharts visualizations), timetable, fee status, document downloads, notifications, chatbot widget
- Build out Faculty Portal UI: attendance entry grid, marks entry, course/content management, question paper upload, AI notice generator UI
- Build out Admin Portal UI: management tables (students/faculty/departments), report dashboards with charts, audit log viewer, question paper approval queue
- Question paper repository UI: search/filter interface
- Placement portal UI: company listings, application tracker, resume upload with AI analyzer feedback shown inline
- Responsive design pass (mobile/tablet breakpoints)
- Accessibility pass (keyboard nav, contrast, ARIA labels)

**Exit criteria:** Every backend capability built in Phases 1–9 has a polished, responsive, on-brand UI surface.

---

## Phase 11 — Testing, Security & Launch Readiness
**Goal:** Production hardening before handing the system to the college.

- Unit + integration tests for backend services (JUnit)
- API contract tests / Postman collection as regression suite
- Frontend component tests (React Testing Library) for critical flows
- Security review: RBAC edge cases, SQL injection/XSS checks, JWT expiry/refresh correctness, S3 bucket permission audit, secrets not in source control
- Load testing on key endpoints (attendance marking, login, dashboard load)
- Data migration/import plan for the college's real existing student/faculty records
- Documentation: setup guide, API docs (Swagger/OpenAPI), admin runbook, architecture diagram
- Final UAT with a small pilot group (one department) before full rollout

**Exit criteria:** Collego is ready to be handed over to the college for production use.

---

## Suggested Parallelization Notes for Antigravity
- Phases 3, 4, 5 (Student/Faculty/Admin feature logic) can be developed largely in parallel once Phase 2's data model is locked, since they mostly read/write shared entities rather than depend on each other's code.
- Phase 8 (AWS/DevOps) can start as early as Phase 1 in a "just enough to deploy a skeleton" form, then be revisited fully before Phase 9.
- Phase 9 (AI) sub-features are independent of each other and can be parallelized once their respective data dependencies (marks/attendance for #3–4, resumes/companies for #5–6, question papers for #8) are in place.
- Phase 10 (UI/UX) is intentionally last so design effort isn't wasted on features whose data shape might still change during 1–9.
