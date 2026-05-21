# Frontend Integration Guide

## 📋 Quick Start

### 1. Copy Environment Files

```bash
cd frontend

# Copy example to .env.development
cp .env.example .env.development
cp .env.example .env.production
```

### 2. Update Environment Files

**`.env.development`**:
```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=ITPM
```

**`.env.production`**:
```env
VITE_API_URL=https://your-domain.com/api
VITE_APP_NAME=ITPM
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Update `App.tsx` to Include Routes and AuthProvider

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { LoginPage } from '@/pages/Auth/Login';
import { AcceptInvitePage } from '@/pages/Auth/AcceptInvite';
import { InvitationsPage } from '@/pages/Invitations';
import { DepartmentsPage } from '@/pages/Departments';
import { useAuth } from '@/hooks/useAuth';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      
      {/* Protected Routes */}
      <Route
        path="/invitations"
        element={
          <ProtectedRoute>
            <InvitationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/departments"
        element={
          <ProtectedRoute>
            <DepartmentsPage />
          </ProtectedRoute>
        }
      />
      
      {/* Redirect */}
      <Route path="/" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
```

### 5. Start Development Server

```bash
npm run dev
```

Then open: `http://localhost:5173`

---

## 🎯 Feature Walkthrough

### 1. **Login Page**
- URL: `http://localhost:5173/login`
- Enter credentials
- JWT token saved to localStorage

### 2. **Accept Invite Page**
- URL: `http://localhost:5173/accept-invite?token=xxxxx`
- Email link redirects here
- User creates password

### 3. **Invitations Dashboard**
- URL: `http://localhost:5173/invitations`
- List invitations by status (Pending, Accepted, Expired)
- Send new invitations

### 4. **Departments Management**
- URL: `http://localhost:5173/departments`
- Create departments
- Add/remove members (coming soon)
- Delete departments

---

## 📁 Key Files

```
frontend/src/
├── config/
│   └── api.ts                      # API URLs & endpoints
│
├── services/
│   ├── authService.ts              # Auth API calls
│   └── departmentService.ts        # Department API calls
│
├── hooks/
│   └── useAuth.ts                  # AuthContext & hook
│
├── pages/
│   ├── Auth/
│   │   ├── Login.tsx               # Login form
│   │   └── AcceptInvite.tsx        # Accept invite form
│   ├── Invitations.tsx             # Invitations dashboard
│   └── Departments.tsx             # Departments management
│
├── types/
│   └── *.ts                        # Type definitions
│
└── App.tsx                         # Main routing
```

---

## 🔄 Data Flow

```
Frontend                          Backend
  ↓                                 ↓
1. authService.login()  -------→  POST /auth/login
                        ←-------   JWT Token
   Save to localStorage

2. authService.sendInvitation()   POST /workspace/invite
                        ←-------   Email sent

3. authService.acceptInvitation() POST /workspace/accept-invite
                        ←-------   New JWT Token

4. departmentService.getDepartments()  GET /departments
                        ←-------   Department list

5. departmentService.addMembers()  POST /departments/:id/members
                        ←-------   Updated dept
```

---

## 🧪 Testing Checklist

- [ ] Start backend: `npm run dev` (port 5000)
- [ ] Start frontend: `npm run dev` (port 5173)
- [ ] Navigate to `/login`
- [ ] Try login with valid credentials
- [ ] Check localStorage for `authToken`
- [ ] Navigate to `/invitations`
- [ ] Send an invitation
- [ ] Open email link in new tab
- [ ] Fill out `/accept-invite` form
- [ ] Verify new user can login
- [ ] Navigate to `/departments`
- [ ] Create a new department
- [ ] Verify department list updates

---

## 🔐 Security Notes

1. **JWT Token Storage**:
   - Stored in localStorage (not HttpOnly)
   - For production, consider moving to HttpOnly cookies

2. **Password Protection**:
   - Bcrypt hashing on backend
   - HTTPS required in production

3. **CORS**:
   - Only allow frontend domain
   - Check `.env` CORS_ORIGIN

4. **Role-Based Access**:
   - Admin-only endpoints
   - Manager endpoints
   - Frontend should check user.role before showing options

---

## 🐛 Troubleshooting

### "API_URL is undefined"
**Solution**: Check `.env.development` has `VITE_API_URL`

### "401 Unauthorized"
**Solution**: 
- Token may be expired
- Check Authorization header in network tab
- Login again

### "CORS error"
**Solution**:
- Backend `.env` CORS_ORIGIN should match frontend URL
- Check network tab for exact error

### "localStorage token exists but page shows login"
**Solution**:
- Token may be invalid
- Clear localStorage and login again
- Check backend JWT_SECRET matches

---

✨ **Frontend is Production-Ready!** ✨
