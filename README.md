# EduTrack Pro | Full-Stack College Attendance, Timetable & Notes Portal

A production-ready Full-Stack College Management Web Application for teachers and faculty administrators built with the **MERN Stack** (MongoDB, Express.js, React.js, Node.js) and styled with modern **Tailwind CSS** and **Lucide Icons**.

---

## 🚀 Key Features

### 1. Strict Single-Teacher Authentication & Security
- **Hardcoded / Seeded Admin Credentials**:
  - **Email**: `admin@gmail.com`
  - **Password**: `admin@gmail.com`
- **Zero Public Registration**: Registration endpoint (`POST /api/auth/register`) is permanently disabled with a `403 Forbidden` response.
- **JWT Protection**: Secure stateless JSON Web Token sessions with an Express auth middleware protecting all `/api/*` routes.
- **Auto-Logout & Interceptors**: Axios interceptor automatically attaches the `Authorization: Bearer <token>` header to all requests and redirects to login on 401 session expiry.
- **Convenient UI Demo Helper**: 1-click button to auto-fill default admin credentials on the login screen.

### 2. Database Architecture (MongoDB & Mongoose)
- **`Student`**:
  - `name`: String (required)
  - `rollNumber`: String (required, unique, uppercase)
  - `department`: String (default: `'Computer Science & Engineering'`)
  - `semester`: String (e.g. `'Semester 4'`)
  - `createdAt`: Date
- **`Attendance`**:
  - `date`: String (`YYYY-MM-DD`, indexed)
  - `subject`: String (required)
  - `semester`: String
  - `records`: Array of `{ studentId, rollNumber, name, status: ['Present', 'Absent'] }`
  - Compound Unique Index: `{ date: 1, subject: 1, semester: 1 }` ensuring fast upserts
- **`Timetable`**:
  - `dayOfWeek`: Enum `['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']`
  - `startTime`: String (e.g. `'09:00 AM'`)
  - `endTime`: String (e.g. `'10:00 AM'`)
  - `subject`: String (required)
  - `semester`: String
  - `roomNumber`: String (e.g. `'Lab 301'`)
- **`Note`**:
  - `title`: String (required)
  - `subject`: String (required)
  - `semester`: String
  - `content`: String (supports markdown / rich text)
  - `resourceUrl`: String (optional PDF or Google Drive link)
  - `createdAt`: Date
- **Automatic In-Memory Fallback**: If a local MongoDB instance is not active, the backend automatically initializes an embedded MongoDB instance for seamless instant local execution!

### 3. Core REST API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Validates `admin@gmail.com` / `admin@gmail.com` & returns JWT |
| `GET` | `/api/auth/me` | Fetches authenticated teacher session profile |
| `GET` | `/api/students` | Get roster (filterable by `semester`, `department`, `search`) |
| `POST` | `/api/students` | Add new student (validates unique roll number) |
| `PUT` | `/api/students/:id` | Update student profile |
| `DELETE` | `/api/students/:id` | Remove student from roster & cleanup attendance records |
| `GET` | `/api/attendance` | Fetch attendance session by `date`, `subject`, and `semester` |
| `POST` | `/api/attendance` | Batch upsert attendance records for a class |
| `GET` | `/api/attendance/summary` | Cumulative attendance percentage & compliance calculation |
| `GET` | `/api/attendance/dashboard-stats` | Aggregated metrics for dashboard cards and today's classes |
| `GET` | `/api/attendance/history` | List of historical attendance sessions |
| `DELETE` | `/api/attendance/:id` | Delete attendance session |
| `GET` | `/api/timetable` | List timetable slots (filterable by `dayOfWeek`, `semester`) |
| `POST` | `/api/timetable` | Add new class period slot |
| `PUT` | `/api/timetable/:id` | Update class period slot |
| `DELETE` | `/api/timetable/:id` | Delete class period slot |
| `GET` | `/api/notes` | List notes (filterable by `subject`, `semester`, `search`) |
| `POST` | `/api/notes` | Publish new lecture note |
| `PUT` | `/api/notes/:id` | Update lecture note |
| `DELETE` | `/api/notes/:id` | Delete lecture note |

### 4. Frontend Views & UI
- **Dashboard Overview**:
  - Quick stat cards: Total Students, Today's Classes, Today's Attendance Sessions, Total Notes.
  - Today's schedule cards with direct "Take Attendance" one-click action.
  - Low-attendance watchlist alert (<75% defaulters).
- **Take & View Attendance**:
  - Date picker, Semester selector, and Subject dropdown/custom entry.
  - Student roster table with one-click green (`Present`) / red (`Absent`) toggle buttons.
  - "Mark All Present" & "Mark All Absent" quick action buttons.
  - Persists directly to MongoDB with visual indicator of existing vs new session.
  - Secondary tab: **Attendance History & Percentage Analytics** with color-coded progress bars (Green $\ge$ 75%, Yellow 60-74%, Red < 60%).
- **Student Roster Management**:
  - Searchable by name and roll number, filterable by semester/department.
  - Modal to enroll new students and edit existing details.
  - Confirmation modal for safe student deletion.
- **Timetable Manager**:
  - Interactive day-by-day tabs (Monday–Saturday) with class count badges.
  - Add/Edit class slot modal with room number, times, and subject.
  - Quick "Take Attendance" jump button.
- **Notes & Study Material**:
  - Card grid displaying published notes.
  - Full modal viewer with formatted markdown preview.
  - External PDF / Drive link button that opens in a new tab.

---

## 🛠️ Project Structure

```
d:\StudentAttandenceWeb
├── backend/
│   ├── config/
│   │   ├── db.js             # Mongoose connection with in-memory fallback
│   │   └── seed.js           # Seeder for admin, students, timetable, notes
│   ├── middleware/
│   │   └── authMiddleware.js # JWT Bearer authorization check
│   ├── models/
│   │   ├── User.js           # Admin user model
│   │   ├── Student.js        # Student roster model
│   │   ├── Attendance.js     # Attendance session & records model
│   │   ├── Timetable.js      # Timetable class periods model
│   │   └── Note.js           # Lecture notes & resources model
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── studentRoutes.js
│   │   ├── attendanceRoutes.js
│   │   ├── timetableRoutes.js
│   │   └── noteRoutes.js
│   ├── .env.example          # Environment variables template
│   ├── .env                  # Active environment variables
│   ├── package.json
│   └── server.js             # Express app setup and server entry point
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── axiosClient.js # Axios instance with JWT interceptor
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Authentication state provider
│   │   ├── components/
│   │   │   ├── Navbar.jsx      # Top header with date & logout
│   │   │   ├── Sidebar.jsx     # Responsive navigation sidebar
│   │   │   ├── Toast.jsx       # Notification toast alerts
│   │   │   └── ConfirmModal.jsx# Reusable action confirmation dialog
│   │   ├── views/
│   │   │   ├── LoginView.jsx   # Admin login screen
│   │   │   ├── DashboardView.jsx # View 1: Overview and live stats
│   │   │   ├── AttendanceView.jsx# View 2: Take & inspect attendance
│   │   │   ├── StudentsView.jsx  # View 3: Student roster management
│   │   │   ├── TimetableView.jsx # View 4: Weekly schedule
│   │   │   └── NotesView.jsx     # View 5: Notes & study materials
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css           # Tailwind CSS styles
│   ├── vite.config.js          # Vite config with @tailwindcss/vite & proxy
│   └── package.json
├── package.json                # Root scripts
└── README.md
```

---

## ⚙️ Quick Start Guide

### 1. Prerequisites
- Node.js (v18 or newer recommended, tested on v24)
- npm (v9 or newer)
- MongoDB (Optional: local service or MongoDB Atlas; an embedded in-memory database will run automatically if MongoDB is not locally running)

### 2. Environment Configuration
The backend contains a `.env` file pre-configured with:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/college_portal
JWT_SECRET=supersecretkey
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=admin@gmail.com
```

### 3. Running the Backend Server
```bash
cd backend
npm install
npm run dev
```
The server will start at `http://localhost:5000`.

### 4. Running the Frontend
```bash
cd frontend
npm install
npm run dev
```
The Vite development server will start at `http://localhost:5173`.

### 5. Logging In
Open your browser to `http://localhost:5173`:
- **Email**: `admin@gmail.com`
- **Password**: `admin@gmail.com`
*(Or click the "Click to autofill default credentials" helper button on the login form)*.
