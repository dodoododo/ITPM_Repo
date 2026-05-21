# Backend API Setup Guide

## 📋 Quick Start

### 1. Update `backend/src/server.js` to Mount Routes

```javascript
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Connect to Database
connectDB();

// ============================================================================
// MOUNT ALL ROUTES
// ============================================================================

// Auth Routes
const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

// Workspace & Invitation Routes
const workspaceRoutes = require('./routes/workspace.routes');
app.use('/api/workspace', workspaceRoutes);

// User Management Routes
const userRoutes = require('./routes/user.routes');
app.use('/api/users', userRoutes);

// Department Management Routes
const departmentRoutes = require('./routes/department.routes');
app.use('/api/departments', departmentRoutes);

// Health Check
app.get("/", (req, res) => {
  res.json({ 
    status: "✅ API Running",
    message: "ITPM Backend is up and running"
  });
});

// Error Handler (Optional - Add at the end)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
```

### 2. Install Required Dependencies

```bash
cd backend

npm install bcrypt jsonwebtoken nodemailer

# If you don't have these:
npm install express mongoose cors dotenv
```

### 3. Update `backend/.env`

```env
PORT=5000
MONGODB_URI=mongodb+srv://your_user:your_password@cluster.mongodb.net/itpm_db
NODE_ENV=development

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_12345

# CORS
CORS_ORIGIN=http://localhost:5173

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@itpm.com

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - Đăng nhập
  ```bash
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"user@example.com","password":"password123"}'
  ```

### Workspace & Invitations
- `POST /api/workspace/invite` - Gửi lời mời (Requires: Admin/Manager + Bearer Token)
  ```bash
  curl -X POST http://localhost:5000/api/workspace/invite \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer your_jwt_token" \
    -d '{"email":"newuser@example.com","role":"employee","department_id":"dept_id"}'
  ```

- `POST /api/workspace/accept-invite` - Chấp nhận lời mời
  ```bash
  curl -X POST http://localhost:5000/api/workspace/accept-invite \
    -H "Content-Type: application/json" \
    -d '{"token":"invite_token_here","full_name":"Nguyễn Văn A","password":"pass123"}'
  ```

- `GET /api/workspace/invitations` - Lấy danh sách lời mời (Requires: Admin/Manager + Bearer Token)

### Users
- `GET /api/users` - Lấy danh sách users (Requires: Admin + Bearer Token)
- `GET /api/users/:id` - Lấy user chi tiết (Requires: Bearer Token)
- `PATCH /api/users/:id/status` - Khóa/Mở tài khoản (Requires: Admin + Bearer Token)
  ```bash
  curl -X PATCH http://localhost:5000/api/users/user_id/status \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer your_jwt_token" \
    -d '{"isActive":false}'
  ```
- `PATCH /api/users/:id` - Cập nhật user (Requires: Bearer Token)

### Departments
- `GET /api/departments` - Lấy danh sách phòng ban
- `GET /api/departments/:id` - Lấy chi tiết phòng ban
- `POST /api/departments` - Tạo phòng ban (Requires: Admin + Bearer Token)
- `PATCH /api/departments/:id` - Cập nhật phòng ban (Requires: Admin + Bearer Token)
- `POST /api/departments/:id/members` - Thêm thành viên (Requires: Admin/Manager + Bearer Token)
  ```bash
  curl -X POST http://localhost:5000/api/departments/dept_id/members \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer your_jwt_token" \
    -d '{"user_ids":["user_id_1","user_id_2"]}'
  ```
- `DELETE /api/departments/:id/members/:userId` - Xóa thành viên (Requires: Admin/Manager + Bearer Token)
- `DELETE /api/departments/:id` - Xóa phòng ban (Requires: Admin + Bearer Token)

---

## 🔐 Authentication Flow

### 1. Login
```
POST /api/auth/login
Response: { user: { ... }, token: "jwt_token" }
```

### 2. Send Invitation (Admin/Manager)
```
POST /api/workspace/invite
Response: { invitation: { email, token, status, expiresAt } }
Email sent: "Accept Invite" link with token
```

### 3. Accept Invitation (New User)
```
POST /api/workspace/accept-invite
Response: { user: { ... }, token: "jwt_token" }
```

### 4. Protected Routes
```
All subsequent requests:
Header: Authorization: Bearer jwt_token
```

---

## 🧪 Testing with Postman

1. **Create Collection**: ITPM Backend
2. **Set Variables**:
   - `base_url`: `http://localhost:5000/api`
   - `token`: (will be set after login)

3. **Test Sequence**:
   - ✅ POST /auth/login → Copy token
   - ✅ GET /users (with token)
   - ✅ POST /workspace/invite
   - ✅ POST /workspace/accept-invite
   - ✅ GET /departments
   - ✅ POST /departments

---

## ⚠️ Common Issues

### Issue: "Cannot find module 'bcrypt'"
**Solution**: 
```bash
npm install bcrypt
```

### Issue: "JWT_SECRET is undefined"
**Solution**: Add to `.env`:
```env
JWT_SECRET=your_secret_key
```

### Issue: CORS errors
**Solution**: Check `.env` CORS_ORIGIN matches frontend URL:
```env
CORS_ORIGIN=http://localhost:5173
```

### Issue: Email not sending
**Solution**: Enable "Less secure apps" in Gmail or use App Password:
```env
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_char_app_password  # NOT your regular password
```

---

## 📚 Files Structure

```
backend/src/
├── routes/
│   ├── auth.routes.js              # Login
│   ├── workspace.routes.js         # Invitations & Accept
│   ├── user.routes.js              # User management & deactivate
│   └── department.routes.js        # Department CRUD & members
│
├── middleware/
│   └── auth.middleware.js          # verifyToken, requireRole
│
├── utils/
│   ├── authHelpers.js              # JWT, bcrypt, tokens
│   ├── emailHelpers.js             # Nodemailer setup
│   └── apiHelpers.js               # Response formatting
│
├── models/
│   ├── User.js
│   ├── Invitation.js
│   └── Department.js
│
└── server.js                        # Main app entry
```

---

✨ **Backend is Production-Ready!** ✨
