# Full Stack Setup Instructions (Frontend & Backend)

This guide provides step-by-step instructions for running both the **Next.js Frontend** and the **Django Backend** in your local Docker environment. The services use a shared Docker network (`ai_pod_network`) to communicate seamlessly.

---

## Step 1: Create the Shared Docker Network

To allow the containers from different repositories to discover and talk to each other securely, they need to run on the same external network. 

**Run this command once on your machine:**
```bash
docker network create ai_pod_network
```

---

## Step 2: Configure and Start the Backend

1. **Navigate to the Backend Directory:**
   ```bash
   cd DailyReportSystem-BACKEND
   ```

2. **Configure the Environment:**
   Ensure you have a `.env` file in this directory. It MUST include the following line so that Django knows to use the correct development settings and database engine:
   ```env
   DJANGO_SETTINGS_MODULE=core.settings.development
   POSTGRES_DB=app_db
   POSTGRES_USER=app_user
   POSTGRES_PASSWORD=app_password
   POSTGRES_HOST=db
   POSTGRES_PORT=5432
   ```

3. **Start the Backend Containers:**
   Start the backend environment (Django, Postgres, Redis, Celery, Flower):
   ```bash
   docker compose up --build
   ```
   *(Add `-d` at the end to run it in detached mode).*

4. **Initialize the Database (If running for the first time):**
   If this is a completely fresh database, you must apply the Django migrations:
   ```bash
   docker compose exec backend python manage.py migrate
   ```

---

## Step 3: Start the Frontend

1. **Navigate to the Frontend Directory:**
   Open a new terminal tab and navigate to the frontend:
   ```bash
   cd DailyReportSystem-FRONTEND
   ```

2. **Start the Frontend Containers:**
   Start the frontend explicitly using the correct compose file:
   ```bash
   docker compose -f docker-compose.frontend.yml up --build
   ```

---

## Step 4: Access the Application

- **Frontend:** [http://localhost:3001](http://localhost:3001) or [http://localhost:3002](http://localhost:3002)
- **Backend API / Admin:** [http://localhost:8000](http://localhost:8000)

> **Note:** The frontend `apiClient.ts` is configured to automatically route server-side requests to `http://backend:8000` via the shared Docker network, while client-side requests from your browser hit `http://localhost:8000`. You do not need to configure API URLs manually!
