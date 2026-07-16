# Automated Routine Creator - Project Specification

## 1. Project Overview
Automated Routine Creator is a full-stack AI-powered planner. It allows users to register, log in, create routines, generate optimized schedules from text or voice input, and track productivity through a responsive dashboard.

## 2. Architecture & Tech Stack

### Backend (`/backend`)
- **Framework**: FastAPI (Python)
- **Database**: Supabase PostgreSQL
- **ORM & Migrations**: SQLAlchemy & Alembic
- **AI Integrations**: Groq API (Llama 3.3 for chat, Whisper for voice transcription)
- **Authentication**: JWT-based (Register/Login) with email OTP for password resets

### Frontends
- **Web UI (`/landing-page`)**: Next.js application.
- **Mobile UI (`/mobile-app-ui`)**: Expo React Native application.

## 3. Core Features & APIs
1. **Authentication**: `/register`, `/login`.
2. **Routine Management**: CRUD operations for daily/weekly routines.
3. **AI Generation**: `/generate-routine` (Heuristic fallback if Groq API fails).
4. **Dashboard**: Productivity statistics and metrics.
5. **Project Management**: Workspaces, tasks (Table, Board, Calendar, Gantt views), and member invitations via email.

## 4. Agent Execution Rules (GSD Rules)
When an AI agent (Antigravity) works on this repository, it MUST adhere to the following rules:
1. **Always Check the Spec**: Read this `spec.md` before starting any new feature to ensure alignment.
2. **Follow Design Guidelines**: Read `design-guidelines.md` whenever writing frontend code to ensure "taste" and "motion" are implemented correctly.
3. **Atomic Changes**: Work on one feature from `tasks.md` at a time.
4. **Database Integrity**: NEVER modify SQLAlchemy models or Alembic migrations without explicit permission from the user. Breaking the Supabase schema is strictly prohibited.
5. **Environment Variables**: Never commit `.env` files. Ensure new variables are documented in `.env.example`.
6. **Cross-Platform Compatibility**: If an API endpoint is changed, consider the impact on both `landing-page` and `mobile-app-ui`.
