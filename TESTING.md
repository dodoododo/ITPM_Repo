# 🧪 Complete Testing & Integration Guide

## 📋 Pre-Launch Checklist

- [ ] MongoDB running (Atlas or local)
- [ ] Backend `.env` created with all variables
- [ ] Frontend `.env.development` created
- [ ] `npm install` run in both backend and frontend
- [ ] All files created without errors

---

## 🚀 Start Servers

### Terminal 1: Backend
```bash
cd backend
npm install  # If not done yet
npm run dev
```
Expected output:
```
✅ Server running on port 5000
✅ MongoDB connected
```

### Terminal 2: Frontend
```bash
cd frontend
npm install  # If not done yet
npm run dev
```
Expected output:
```
✅ Local:   http://localhost:5173/
VITE ready in 123 ms
```

---

## 🔄 End-to-End Testing

### Test 1: Login Flow ✅

**Precondition**: Create a test user in MongoDB directly or via signup

**Steps**:
1. Navigate to `http://localhost:5173/login`
2. Enter email: `admin@itpm.pro`
3. Enter password: (your test password)
4. Click "Đăng nhập"

**Expected Results**:
- ✅ Redirect to dashboard (or /invitations)
- ✅ Token visible in localStorage (DevTools → Application → Local Storage)
- ✅ No errors in browser console
- ✅ No CORS errors in Network tab

**Troubleshoot**:
- Check backend logs for "Invalid credentials"
- Verify .env CORS_ORIGIN matches `http://localhost:5173`
- Ensure MongoDB has user with matching email/password

---

### Test 2: Send Invitation ✅

**Precondition**: User must be logged in + have admin/manager role

**Steps**:
1. Navigate to `http://localhost:5173/invitations`
2. Click "Gửi Lời mời"
3. Enter email: `newuser@example.com`
4. Select role: `employee`
5. Select department: (any)
6. Click "Gửi Lời mời"

**Expected Results**:
- ✅ Dialog closes
- ✅ New invitation appears in "Pending" tab
- ✅ Email received (check SMTP_* config if not)
- ✅ No errors in console

**Network Request Check**:
```
POST http://localhost:5000/api/workspace/invite
Status: 201 Created
Response: { success: true, data: { email, token, status } }
```

**Troubleshoot**:
- If email not sent: Check SMTP credentials in `.env`
- If 403 Forbidden: User doesn't have admin/manager role
- If 400 Bad Request: Email already invited

---

### Test 3: Accept Invitation ✅

**Precondition**: Invitation sent to email

**Steps**:
1. Get invitation link from email (or manually: `http://localhost:5173/accept-invite?token=xxxxx`)
2. Enter full name: `Nguyễn Văn A`
3. Enter password: `password123`
4. Confirm password: `password123`
5. Click "Tạo Tài khoản"

**Expected Results**:
- ✅ Success message appears
- ✅ Auto-redirect to login after 2 seconds
- ✅ Can login with new credentials
- ✅ User role is as invited (employee/manager/admin)

**Network Request Check**:
```
POST http://localhost:5000/api/workspace/accept-invite
Status: 201 Created
Response: { user: { ... }, token: "jwt_token" }
```

**Troubleshoot**:
- If "Expired token": Invitation token expired (check DB expiry)
- If "Invalid token": Token not found in DB
- If 400 Bad Request: Passwords don't match or invalid format

---

### Test 4: Department Management ✅

#### 4a. Create Department

**Steps**:
1. Navigate to `http://localhost:5173/departments`
2. Click "Tạo Phòng ban"
3. Enter name: `Phòng IT`
4. Enter description: `Phòng kỹ thuật phát triển`
5. Select color: Blue
6. Click "Tạo Phòng ban"

**Expected Results**:
- ✅ Dialog closes
- ✅ New department appears in grid
- ✅ Color indicator matches selected color
- ✅ Member count shows "0 thành viên"

**Network Request Check**:
```
POST http://localhost:5000/api/departments
Status: 201 Created
Response: { success: true, data: { ... } }
```

#### 4b. List Departments

**Steps**:
1. Navigate to `http://localhost:5173/departments`
2. Wait for grid to load

**Expected Results**:
- ✅ All departments display
- ✅ Member count accurate
- ✅ Colors match what was set

**Network Request Check**:
```
GET http://localhost:5000/api/departments
Status: 200 OK
Response: [ { _id, name, description, color, member_ids, member_count } ]
```

#### 4c. Delete Department

**Steps**:
1. In departments grid, click trash icon on any department
2. Confirm deletion

**Expected Results**:
- ✅ Confirmation dialog appears
- ✅ Department removed from grid
- ✅ No errors in console

**Network Request Check**:
```
DELETE http://localhost:5000/api/departments/dept_id
Status: 200 OK
Response: { success: true, message: "Department deleted" }
```

---

## 🔍 Network Tab Verification

### Check Each Request

1. **Open DevTools**: F12 → Network tab
2. **Clear logs**: Clear button
3. **Perform action**: (e.g., login)
4. **Check requests**:
   - ✅ All requests show Status 200/201
   - ✅ No 401 Unauthorized (unless testing auth)
   - ✅ No 403 Forbidden (unless role-based)
   - ✅ No CORS errors
   - ✅ Response contains expected data

### Example Request Headers

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Example Response Body

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Phòng IT",
    "description": "...",
    "color": "#2563EB",
    "member_ids": [],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## 📊 Database Verification

### Check Collections Created

```bash
# MongoDB CLI
use itpm_db
show collections
```

Should see:
- users
- invitations
- departments
- projects
- tasks
- comments
- notifications
- conversations
- messages
- activity_logs

### Check Data Inserted

```bash
# Check users
db.users.find().pretty()

# Check invitations
db.invitations.find().pretty()

# Check departments
db.departments.find().pretty()
```

---

## 🐛 Common Issues & Fixes

### Issue: "Cannot GET /api/departments"
**Cause**: Routes not mounted in server.js
**Fix**: 
```javascript
const departmentRoutes = require('./routes/department.routes');
app.use('/api/departments', departmentRoutes);
```

### Issue: "401 Unauthorized"
**Cause**: Missing or invalid JWT token
**Fix**:
- Check Authorization header: `Authorization: Bearer <token>`
- Verify token in localStorage
- Re-login to get fresh token

### Issue: "CORS error in browser"
**Cause**: Backend CORS_ORIGIN doesn't match frontend
**Fix**:
```env
# backend/.env
CORS_ORIGIN=http://localhost:5173
```

### Issue: "Cannot find module 'bcrypt'"
**Cause**: Dependency not installed
**Fix**:
```bash
cd backend
npm install bcrypt jsonwebtoken
```

### Issue: Email not sending
**Cause**: SMTP credentials invalid
**Fix**:
```bash
# Test with Gmail
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_char_app_password  # Get from Google Account
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

### Issue: "Token expired"
**Cause**: Invitation token older than 7 days
**Fix**: Send new invitation

---

## ✅ Final Validation

Run through all these without errors:

```bash
# 1. Backend health
curl http://localhost:5000/

# 2. Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@itpm.pro","password":"password"}'

# 3. Get departments (replace TOKEN)
curl http://localhost:5000/api/departments \
  -H "Authorization: Bearer TOKEN"

# 4. Create department
curl -X POST http://localhost:5000/api/departments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name":"IT","description":"Tech","color":"#2563EB"}'
```

---

## 📝 Test Case Summary

| Feature | Test | Status |
|---------|------|--------|
| Login | Valid credentials → Token in localStorage | ⬜ |
| Login | Invalid credentials → Error message | ⬜ |
| Send Invite | Admin sends → Email received | ⬜ |
| Send Invite | Non-admin sends → 403 Forbidden | ⬜ |
| Accept Invite | Valid token → New account created | ⬜ |
| Accept Invite | Expired token → Error shown | ⬜ |
| Departments | GET list → All departments display | ⬜ |
| Departments | POST create → New department appears | ⬜ |
| Departments | DELETE → Department removed | ⬜ |
| Auth | Protected route without token → Redirect to login | ⬜ |
| Auth | Protected route with token → Page displays | ⬜ |

---

## 🎉 Success Criteria

If all tests pass, you have:
- ✅ Working authentication system
- ✅ Email invitation workflow
- ✅ Department management CRUD
- ✅ Role-based access control
- ✅ Production-ready API

**Next Steps**:
1. Add members to departments modal
2. Create Projects module
3. Create Tasks module
4. Add real-time WebSocket updates
5. Deploy to production

---

💡 **Tip**: Save this checklist as a bookmark or print it for testing sessions!
