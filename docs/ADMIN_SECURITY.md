# Admin Security Documentation

## Overview
This document outlines the security measures implemented to ensure only the 4 designated admins have access to admin functionality.

## Authorized Admins
The following 4 email addresses have admin access:
- s220162@psbbschools.edu.in
- s120029@psbbschools.edu.in
- s120007@psbbschools.edu.in
- s160153@psbbschools.edu.in

## Security Layers

### 1. Frontend Protection
- **Route Guards**: `AdminRouteGuard` component in `App.tsx`
- **Navigation Filtering**: Admin-only navigation items are filtered in `AppLayout.tsx`
- **Double Verification**: Admin status is checked twice for security
- **Logging**: All admin access attempts are logged to console

### 2. Backend Protection
- **Middleware**: `requireAdmin` middleware in `worker/src/middleware/admin.ts`
- **Double Check**: Even if role is "admin", email is verified against hardcoded list
- **API Routes**: All `/api/admin/*` routes use `adminOnly` middleware chain
- **Logging**: All access attempts are logged with security warnings

### 3. Authentication Chain
- **Clerk Authentication**: Verified JWT tokens
- **School Email Restriction**: Only @psbbschools.edu.in emails allowed
- **Role Assignment**: Role assigned based on hardcoded admin email list

## Security Features

### Audit Logging
- All admin access attempts are logged
- Unauthorized attempts trigger security warnings
- Successful admin access is logged for audit trail

### Double Verification
- Frontend: Checks `isAdminEmail()` function
- Backend: Checks both role and email against `ADMIN_EMAIL_LIST`
- Prevents role manipulation attacks

### Route Protection
- All admin pages require `AdminRouteGuard`
- All admin APIs require `requireAdmin` middleware
- Automatic redirect to competition page for unauthorized users

## Security Verification

### Automated Check
Run the security verification script:
```bash
npm run security-check
```

This script verifies:
- Frontend and backend admin lists are synchronized
- Exactly 4 admin emails are configured
- All expected admin emails are present

### Manual Verification
1. Check frontend: `frontend/src/lib/schoolRules.ts`
2. Check backend: `worker/src/lib/schoolRules.ts`
3. Verify both files contain identical admin email lists

## Security Best Practices

### Adding/Removing Admins
1. Update `ADMIN_EMAIL_LIST` in BOTH frontend and backend files
2. Run `npm run security-check` to verify synchronization
3. Test with new admin email to ensure access works

### Monitoring
- Monitor browser console for security logs
- Monitor worker logs for unauthorized access attempts
- Set up alerts for security warnings

### Regular Security Reviews
1. Run security verification script regularly
2. Review admin access logs
3. Verify no unexpected admin access attempts
4. Ensure admin list is still accurate

## Threat Mitigation

### Prevented Attacks
- **Role Manipulation**: Backend double-checks email against hardcoded list
- **Direct API Access**: All admin routes require authentication and admin role
- **Frontend Bypass**: Route guards prevent direct URL access
- **Email Forgery**: Clerk authentication verifies email ownership

### Response to Security Incidents
1. Check logs for unauthorized access attempts
2. Remove compromised admin from email lists
3. Run security verification to ensure changes applied
4. Monitor for continued suspicious activity

## Emergency Procedures

### Immediate Admin Lockdown
If immediate admin access lockdown is needed:
1. Clear `ADMIN_EMAIL_LIST` in both files (empty arrays)
2. Redeploy application
3. All admin access will be immediately blocked

### Restoring Admin Access
1. Restore proper admin email lists
2. Run security verification
3. Redeploy application

## Contact
For security concerns or admin access changes, contact the development team.
