# TANIM System - Local Deployment Guide for Interns

## Table of Contents

1. [System Overview](#system-overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start (Docker Compose)](#quick-start-docker-compose)
4. [Manual Local Setup](#manual-local-setup)
5. [Running the Application](#running-the-application)
6. [Testing the System](#testing-the-system)
7. [Project Structure](#project-structure)
8. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
9. [Next Steps](#next-steps)

---

## System Overview

TANIM is a comprehensive **seed management and inventory system** for agricultural research institutions built with the modern **PERN stack** (PostgreSQL, Express, React, Node.js). It provides:

- **User Authentication & Authorization**: Secure login and role-based access control
- **Seed Inventory Management**: Track seed lots, varieties, and storage information
- **Transaction Tracking**: Record seed check-in/check-out operations
- **Germination Testing**: Log and monitor seed germination records
- **Project Management**: Organize and manage research projects
- **Real-time Notifications**: Get alerts about system events
- **Audit Trails**: Complete audit logs for compliance and tracking

### Key Technologies (PERN Stack)

- **Frontend**: React with Vite, Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Docker**: Containerization for consistent environments

---

## Prerequisites

### Option: Manual Local Setup

- **Node.js**: v16 or higher ([Download](https://nodejs.org/))
  - Verify with: `node --version`
- **npm**: Comes with Node.js
  - Verify with: `npm --version`
- **PostgreSQL**: v14 or higher ([Download](https://www.postgresql.org/download/))
  - On macOS with Homebrew: `brew install postgresql && brew services start postgresql`
  - On Ubuntu/Debian: `sudo apt-get install postgresql postgresql-contrib`

---

## Manual Local Setup

### 1. Set Up PostgreSQL

**On macOS:**

```bash
brew install postgresql
brew services start postgresql
createdb tanim_db
psql -d tanim_db -U postgres
```

**On Ubuntu/Debian:**

```bash
sudo apt-get install postgresql postgresql-contrib
sudo -u postgres createdb tanim_db
sudo -u postgres psql -d tanim_db
```

### 2. Initialize Database Schema

```bash
psql -h localhost -U postgres -d tanim_db -f database_init.sql
psql -U postgres -d tanim_db -f seed_dummy_data.sql  # Optional: load sample data

# To load it in if you are already in the database use \i database_init.sql (make sure you are in same dir)
```

### 3. Backend Setup

```bash
cd backend
npm install
# Create .env file (see Quick Start section)
npm start
```

### 4. Frontend Setup

```bash
cd frontend
npm install
# Create .env file (see Quick Start section)
npm run dev
```

---

## Running the Application

### Manual Setup

**Terminal 1 - Backend:**

```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173`

---

## Testing the System

### 1. Check API Health

```bash
curl http://localhost:3001/health
```

Expected response: `OK` or similar status message

### 2. Test User Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tanim.com","password":"password123"}'
```

You'll receive a JWT token in the response. Use this for authenticated requests.

### 3. Test Seed Creation (Requires Auth)

```bash
# Replace JWT_TOKEN with token from previous response
curl -X POST http://localhost:3001/api/seeds \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -d '{
    "crop_type":"soybean",
    "variety":"Tiwala 6",
    "classification":"nucleus",
    "gross_weight":10
  }'
```

### 4. Verify in Database

```bash
psql -U postgres -d tanim_db

-- Check if seed was created
SELECT id, crop_type, variety, gross_weight, created_at FROM seed WHERE crop_type = 'soybean';

-- Check audit logs
SELECT audit_id, action_type, actor FROM audit_log ORDER BY logged_at DESC LIMIT 5;
```

### 5. Use the Web Interface

1. Navigate to http://localhost:5173
2. Login with sample credentials
3. Create a new seed
4. Create a transaction
5. View notifications and reports

---

## Project Structure

```
tanim/
├── backend/                          # Node.js Express backend
│   ├── src/
│   │   ├── controllers/              # Request handlers
│   │   ├── services/                 # Business logic
│   │   ├── models/                   # Database models & queries
│   │   ├── routes/                   # API route definitions
│   │   ├── middleware/               # Auth, validation middleware
│   │   ├── constants/                # Configuration constants
│   │   └── utils/                    # Helper functions
│   ├── migrations/                   # Database migrations
│   ├── tests/                        # Test files
│   ├── server.js                     # Server entry point
│   ├── package.json
│   └── .env                          # Environment configuration
│
├── frontend/                         # React + Vite frontend
│   ├── src/
│   │   ├── components/               # Reusable React components
│   │   ├── pages/                    # Page components
│   │   ├── services/                 # API client
│   │   ├── context/                  # React Context (Auth, etc.)
│   │   ├── utils/                    # Helper functions
│   │   ├── constants/                # Frontend constants
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/                       # Static assets
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env                          # Environment configuration
│
├── docker-compose.yml                # Docker Compose configuration
├── database_init.sql                 # Database schema
├── seed_dummy_data.sql               # Sample data
├── SETUP.md                          # Original setup guide
└── LOCAL_DEPLOYMENT.md               # This file
```

---

## Common Issues & Troubleshooting

### Issue: `Connection refused` errors from backend

**Problem**: Backend can't connect to PostgreSQL

**Solutions**:

1. Verify environment variables in `.env`

### Issue: Database connection errors

**Problem**: PostgreSQL credentials or connection string is wrong

**Solutions**:

```bash
# Test connection directly
psql -h localhost -p 5433 -U postgres -d tanim_db
```

### Issue: Port already in use

**Problem**: Another application is using ports 3001, 5173, or 5433

**Solutions**:

```bash
# Find what's using the port (macOS/Linux)
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or change port in .env or docker-compose.yml
```

### Issue: Frontend doesn't load

**Problem**: Blank page or CORS errors

**Solutions**:

1. Check browser console for errors (F12 → Console)
2. Verify backend is running and accessible: `curl http://localhost:3001/health`
3. Check CORS_ORIGIN matches frontend URL in backend `.env`
4. Clear browser cache: `Ctrl+Shift+Delete` or `Cmd+Shift+Delete`

### Issue: Login fails

**Problem**: Cannot login with credentials

**Solutions**:

1. Verify database has users: `SELECT * FROM "user" WHERE email = 'admin@tanim.com';`
2. Reset sample data:
   ```bash
    psql -U postgres -d tanim_db -f /seed_dummy_data.sql
   ```
3. Check backend logs for authentication errors

---

## Performance Tips

1. **Database**: Add indexes on frequently queried columns
2. **Frontend**: Use React DevTools to identify slow components
3. **Backend**: Enable query logging in `.env` for debugging:
   ```env
   DB_DEBUG=true
   ```

---

## Next Steps

### For Interns Extending the System

1. **Add New Features**:
   - Create controllers in `backend/src/controllers/`
   - Add models in `backend/src/models/`
   - Create routes in `backend/src/routes/`
   - Build components in `frontend/src/components/`

2. **Database Changes**:
   - Create migrations in `backend/migrations/`
   - Document schema changes

3. **Testing**:
   - Write unit tests in `backend/tests/`
   - Test API endpoints with Postman/Insomnia
   - Test React components with React Testing Library

4. **Deployment to Production**:
   - See [SETUP.md](SETUP.md) for production considerations
   - Use environment-specific configuration
   - Set secure `JWT_SECRET` and database credentials
   - Use managed PostgreSQL service

---

## Useful Commands

```bash

# Connect to PostgreSQL
psql -U postgres -d tanim_db

# Run backend tests
cd backend && npm test

# Lint frontend code
cd frontend && npm run lint

# Build frontend for production
cd frontend && npm run build

# Check API documentation (if available)
curl http://localhost:3001/api/docs
```

---

## Getting Help

- Check the [SETUP.md](SETUP.md) for detailed information about the system architecture
- Review code comments in source files
- Check backend logs: `docker-compose logs backend`
- Check frontend browser console (F12)
- Ask senior developers or check documentation

---

## Additional Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Documentation](https://docs.docker.com/)

---

Good luck! Welcome to the TANIM team! 🌱
