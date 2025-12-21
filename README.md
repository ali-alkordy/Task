# Team Tasks (React + TypeScript + Vite)

A small task management UI built with **React + TypeScript + Vite** using:
- **React Router** for routing
- **React Query (TanStack Query)** for server-state fetching/caching
- **Axios (single axios instance)** with interceptors for auth + error handling
- **ThemeProvider** (CSS variables + Ant Design ConfigProvider)
- **Firebase (mock data)** for tasks endpoints (Cloud Functions / Firestore) during development

---

## Requirements

- **Node.js** (recommended: latest LTS)
- **npm** (or yarn/pnpm if you prefer)

---

## Setup

1) Install dependencies:

```bash
npm install


2) Create an .env file in the project root:

#note am giving here the apikey and the url cause its only a task and public it only for u to test it 
# Firebase Web App config (NO QUOTES)


3) Run the project:

npm run dev

Then open: http://localhost:5173


4) Build for production:
npm run build

5) Preview the production build locally:
npm run preview


##################################################################################################################
quick overview

Project Structure (High Level)

src/api/axios.ts
Axios instance + interceptors (Authorization header + 401/403 handling).

src/services/**
Service layer that contains all API calls (tasks/auth/stats/settings).
Components do not call axios directly.

src/routes/AppRoutes.tsx
All routes, including protected pages.

src/routes/RequireAuth.tsx
Route guard that blocks protected pages if the user is not authenticated.

src/providers/ThemeProvider.tsx
Theme context + CSS variables + Ant Design tokens using ConfigProvider.

This project uses a small set of libraries to keep the UI clean, the forms safe, and the API layer reliable:
## Frontend Libraries 
- **Ant Design (antd)**  
  Used for ready-made production UI components (Table, Modal, Form controls, Select, DatePicker, etc.) so the app has a consistent and usable interface without building everything from scratch.

- **Tailwind CSS**  
  Used for fast styling and layout (spacing, flex/grid, responsive UI) and for the custom “glass” look across the app. Tailwind complements AntD where custom styling is needed.

- **Zod + React Hook Form**  
  Used for **type-safe form validation** on the client side.  
  Zod defines the schema + rules, while React Hook Form manages form state and integrates with Zod via `@hookform/resolvers`.

- **Axios (single axios instance + interceptors)**  
  All HTTP requests go through a shared Axios instance to keep:
  - consistent base URLs
  - consistent headers
  - auth token injection
  - unified error handling (401/403 redirects, normalized error format)

- **js-cookie**  
  Used to store the JWT access token in a cookie instead of `localStorage` (more secure than localStorage in many cases). This allows the app to persist auth across refreshes and avoids exposing tokens directly to JavaScript storage APIs.

- **lucide-react**  
  Used for lightweight, consistent icons across the UI (Navbar, buttons, status indicators, empty states, error pages).

- **React Query (TanStack Query)**  
  Used for server state (tasks list, stats, task details) with caching, retries, invalidation, and clean loading/error states.
################################################################################################################

more details , why is used this technologyes : 

Why React Query (TanStack Query)

We use React Query because tasks/statistics data is server-state:

Automatic caching

Background refetching

Loading/error states handled cleanly

Query invalidation after mutations (create/update/delete)

Avoids manual useEffect + useState boilerplate

All pages use useQuery / useMutation and invalidate relevant queries after changes.

-----------------------------------------------------------------------------------------

Why Axios Instance (src/api/axios.ts)

Instead of calling axios everywhere, we use one configured axios instance:

Central place to set baseURL, timeout, JSON headers

Request interceptor attaches Authorization: Bearer <token>

Response interceptor handles:

401 (logout + redirect)

403 (redirect)

Consistent error normalization across the app

This keeps components clean and prevents duplicated auth logic.

-----------------------------------------------------------------------------------------

Why RequireAuth.tsx

RequireAuth is a route guard that:

Prevents unauthenticated users from accessing protected routes

Redirects to /auth (or unauthorized page depending on your flow)

Keeps auth checks consistent and centralized

So pages like /tasks never need to manually check authentication.

-----------------------------------------------------------------------------------------

Why “Services” Layer

All HTTP calls live in src/services/**:

Components stay UI-focused

API endpoints are reusable across pages

Easier to maintain and refactor (change endpoint once)

Easier testing (mock services)

Example:

services/Tasks/tasks.service.ts

services/Tasks/tasksStats.service.ts

services/Auth/auth.service.ts

services/settings/settings.service.ts

-----------------------------------------------------------------------------------------
Why QueryProvider

QueryProvider wraps the app with:

QueryClientProvider

Common defaults (retries, refetch behavior, etc.)

Optionally React Query Devtools (if enabled)

This avoids re-creating the QueryClient and ensures consistent caching behavior.

-----------------------------------------------------------------------------------------

Why ThemeProvider.tsx

We use a custom ThemeProvider to support:

Multiple themes (ocean, emerald, violet, amber, light)

CSS variables stored in themes.css

data-theme attribute on <html> to switch theme instantly

Ant Design theme tokens mapped from our CSS variables via ConfigProvider

Theme persisted in localStorage

Result: One source of truth for colors across Tailwind + AntD.

-----------------------------------------------------------------------------------------

Firebase for Mock Data

During development, Firebase is used as a mock backend:

Tasks are stored/fetched via Firebase (Firestore/Functions)

Allows fast iteration without a full custom backend

Same frontend architecture still works later with a REST API

When switching to a real backend later, only the services layer typically needs changes.
