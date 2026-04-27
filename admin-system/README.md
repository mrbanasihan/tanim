# Admin System

This is a separate top-level app from TANIM, not a folder inside TANIM. It should be deployed independently because it has its own backend and frontend, its own environment variables, and a different user workflow.

## Why separate

- TANIM is the operational app used by researchers and staff.
- The Admin System is an internal control plane for audit logs, user management, projects, rooms, and future temperature/sensor operations.
- Keeping it separate makes deployment, auth, and permissions easier to manage.

## Current scope

- Audit log viewer for everything captured in `audit_log`.
- User management: list, add, edit, delete, and role assignment.
- Project management: list, add, edit, delete.
- Room management: list, add, edit, delete.
- Kafka consumer hook for TANIM topics so the admin backend can stay aligned with live events.
- Temperature sensor management is intentionally deferred for later.

## Directory layout

- `backend/` Node.js + Express API
- `frontend/` React + Vite admin UI

## Deployment suggestion

- Backend: Render or Railway
- Frontend: Vercel
- Database: the same Supabase project as TANIM
- Kafka: the same Aiven service as TANIM

## Environment

Copy `.env.example` in `backend/` and fill in the same Supabase/Aiven values you already use for TANIM.
