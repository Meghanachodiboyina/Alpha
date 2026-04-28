# Automated Routine Creator

Automated Routine Creator is a full-stack AI-powered planner that lets users register, log in, create routines, generate optimized schedules from text or voice input, and track productivity through a responsive dashboard.

## Project Structure

```text
AutomatedRoutineCreator/
|-- backend/
|   |-- app/
|   |   |-- main.py
|   |   |-- database.py
|   |   |-- models.py
|   |   |-- schemas.py
|   |   |-- auth.py
|   |   |-- crud.py
|   |   |-- ai_engine.py
|   |   |-- routes/
|   |       |-- auth_routes.py
|   |       |-- routine_routes.py
|   |       |-- dashboard_routes.py
|   |       |-- project_routes.py
|   |-- sql/
|   |   |-- project_management_tables.sql
|   |-- requirements.txt
|   |-- .env.example
|-- frontend/
|   |-- index.html
|   |-- login.html
|   |-- register.html
|   |-- dashboard.html
|   |-- project_management.html
|   |-- css/
|   |   |-- style.css
|   |-- js/
|       |-- script.js
|       |-- auth.js
|       |-- voice.js
|       |-- project_management.js
|-- README.md
```

## Features

- JWT-based authentication with register and login APIs
- Routine CRUD operations with completion tracking
- AI routine generation from text or voice input
- Daily planner, weekly planner, and today's schedule views
- Productivity dashboard statistics
- Project management workspace with table, board, calendar, and gantt-style timeline views
- Workspace invitations by email, pending invite actions, and live member lists
- PostgreSQL/Supabase-ready SQLAlchemy models
- Responsive SaaS-inspired UI with glassmorphism styling

## Supabase PostgreSQL Setup Guide

1. Create a Supabase project.
2. Open Supabase project settings and copy the PostgreSQL connection string.
3. Update [backend/.env](/c:/Users/Dell/OneDrive/Desktop/Project/AutomatedRoutineCreator/backend/.env) with your Supabase values:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=postgresql+psycopg2://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
SECRET_KEY=replace-this-with-a-secure-random-string
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
FRONTEND_ORIGIN=*
```

4. Tables are created automatically by SQLAlchemy when the backend starts.
5. Optional SQL helper scripts in [backend/sql](/c:/Users/Dell/OneDrive/Desktop/Project/AutomatedRoutineCreator/backend/sql) use PostgreSQL syntax.

## Run Instructions

### Backend

1. Open a terminal in `AutomatedRoutineCreator/backend`.
2. Create a virtual environment:

```powershell
python -m venv venv
```

3. Activate it:

```powershell
venv\Scripts\activate
```

4. Install dependencies:

```powershell
pip install -r requirements.txt
```

5. Start the API server:

```powershell
uvicorn app.main:app --reload
```

6. Open Swagger docs at `http://127.0.0.1:8000/docs`.

### Frontend

1. Open a second terminal in `AutomatedRoutineCreator/frontend`.
2. Serve the frontend with a static server. Example:

```powershell
python -m http.server 5500
```

3. Open `http://127.0.0.1:5500/index.html`.
4. After login, open `http://127.0.0.1:5500/project_management.html` or use the new `Workspace` link in the dashboard sidebar.

## AI Logic Integration

- The backend uses a built-in heuristic planner by default, so it works without any paid API.
- If you add `GROQ_API_KEY` to `backend/.env`, the app will call Groq chat completions for AI planning and Groq Whisper for voice transcription. It falls back to the heuristic planner if chat generation fails.
- Generated routines are automatically saved into the database after `POST /generate-routine`.

## OTP Email Setup

Password reset OTP now sends through email only. To make it work, add valid SMTP settings in `backend/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=your_email@gmail.com
```

For Gmail:

1. Enable 2-step verification on your Google account.
2. Create an App Password.
3. Use that App Password in `SMTP_PASSWORD`.

After updating `.env`, restart the backend server and use `Forgot Password` from the login page. The app will then show `OTP sent successfully to your email.` and the OTP will be delivered to the registered email address.

## Voice Input

- The frontend uses the Web Speech API in [frontend/js/voice.js](/c:/Users/Dell/OneDrive/Desktop/Project/AutomatedRoutineCreator/frontend/js/voice.js).
- Click the `Mic` button on the dashboard and speak your tasks.
- Supported in Chromium-based browsers and Safari with compatible speech recognition support.

## API Testing Guide

### Authentication

Register:

```http
POST /register
Content-Type: application/json

{
  "name": "Aman",
  "email": "aman@example.com",
  "password": "password123"
}
```

Login:

```http
POST /login
Content-Type: application/json

{
  "email": "aman@example.com",
  "password": "password123"
}
```

### Routine CRUD

Use the JWT token from login in the `Authorization` header:

```text
Authorization: Bearer your_token_here
```

Create routine:

```http
POST /routines
```

List routines:

```http
GET /routines
```

Update routine:

```http
PUT /routines/{id}
```

Delete routine:

```http
DELETE /routines/{id}
```

### AI Planner

```http
POST /generate-routine
Content-Type: application/json
Authorization: Bearer your_token_here

{
  "input_text": "Today I need to study Python, attend meeting at 4 PM, gym in evening, finish project before Thursday.",
  "plan_scope": "today"
}
```

### Dashboard

```http
GET /dashboard/stats
Authorization: Bearer your_token_here
```

### Project Management

List project tasks:

```http
GET /projects/tasks
Authorization: Bearer your_token_here
```

Create project task:

```http
POST /projects/tasks
Content-Type: application/json
Authorization: Bearer your_token_here

{
  "title": "Launch landing page",
  "description": "Finish final polish and QA",
  "due_date": "2026-04-30",
  "assignee": "Aman",
  "priority": "High",
  "status": "In Progress",
  "comments": "Waiting for hero copy review"
}
```

Update project task:

```http
PUT /projects/tasks/{id}
Authorization: Bearer your_token_here
```

Delete project task:

```http
DELETE /projects/tasks/{id}
Authorization: Bearer your_token_here
```

Invite workspace member:

```http
POST /workspace/invitations
Content-Type: application/json
Authorization: Bearer your_token_here

{
  "invitee_email": "teammate@example.com"
}
```

List workspace members:

```http
GET /workspace/members
Authorization: Bearer your_token_here
```

SQL table creation code for the new project management feature is included in [backend/sql/project_management_tables.sql](/c:/Users/Dell/OneDrive/Desktop/Project/AutomatedRoutineCreator/backend/sql/project_management_tables.sql).

## Notes

- Update `API_BASE` in the frontend JavaScript files if your backend runs on another host or port.
- For production, set a strong `SECRET_KEY`, configure a specific `FRONTEND_ORIGIN`, and deploy the frontend behind a web server like Nginx.
- The current codebase uses simple static HTML, CSS, and JavaScript so it runs easily in VS Code without a build step.
