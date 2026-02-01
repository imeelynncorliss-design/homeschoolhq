# HomeschoolHQ Production Readiness Checklist

**Last Updated:** January 25, 2026  
**Status:** Development/Testing Mode - NOT PRODUCTION READY

> **CRITICAL:** This application currently has security bypasses and test configurations that MUST be changed before production deployment.

---

## 🔴 CRITICAL - Security Issues to Fix

### 1. Database Row Level Security (RLS) - DISABLED
**Current State:** All RLS policies are disabled for testing  
**Risk Level:** CRITICAL - Anyone can access all data

**Tables with RLS Disabled:**
- `kids`
- `lessons`
- `assessments`
- `assessment_results`
- `user_standards`
- `calendar_connections`
- `synced_work_events`
- `calendar_sync_log`
- `calendar_conflict_resolutions`

**Required Actions:**
```sql
-- Re-enable RLS on all tables
ALTER TABLE kids ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_work_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_conflict_resolutions ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
```

**Create RLS Policies:**
- [ ] Create organization-based access policies for all tables
- [ ] Test policies with multiple users
- [ ] Verify users can only access their organization's data
- [ ] Test that calendar connections are properly scoped to owners

---

### 2. Storage Security - PUBLIC ACCESS ENABLED
**Current State:** Storage bucket is public with permissive policies  
**Risk Level:** HIGH - Anyone can upload/download files

**Affected Buckets:**
- `child-photos` (currently public with wide-open policy)

**Required Actions:**
```sql
-- Remove permissive testing policy
DROP POLICY IF EXISTS "Allow all operations for testing" ON storage.objects;

-- Create proper policies
CREATE POLICY "Users can upload their own org's photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'child-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM kids WHERE organization_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own org's photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'child-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM kids WHERE organization_id = auth.uid()
  )
);
```

**To Do:**
- [ ] Remove public access from child-photos bucket
- [ ] Create organization-scoped storage policies
- [ ] Test photo upload/download with real auth
- [ ] Set max file sizes
- [ ] Add file type restrictions

---

### 3. Authentication Bypass - TEST MODE ACTIVE
**Current State:** Auth checks bypassed in multiple routes using test UUID  
**Risk Level:** CRITICAL - No user authentication

**Test User UUID:** `00000000-0000-0000-0000-000000000001`

**Files with Auth Bypass (Search for "TEMPORARY"):**
- `app/api/calendar/oauth/google/route.ts` - Lines ~20-25
- `app/api/calendar/oauth/outlook/route.ts` - Lines ~20-25
- `app/api/calendar/connections/route.ts` - Lines ~18-22
- `app/api/calendar/connections/[id]/route.ts` - Lines ~17-21
- `app/api/calendar/sync/route.ts` - Lines ~15-20
- `app/api/calendar/conflicts/route.ts` - Lines ~77-100

**Required Actions:**
- [ ] Set `BYPASS_AUTH_FOR_TESTING=false` in production `.env`
- [ ] Implement proper Supabase Auth
- [ ] Test OAuth flow with real authenticated users
- [ ] Verify all API routes properly check authentication
- [ ] Remove or guard test UUID references

---

## ⚙️ Environment Variables

### Development (.env.local)
```bash
# Auth bypass for testing - MUST BE FALSE IN PRODUCTION
BYPASS_AUTH_FOR_TESTING=true

# Organization ID for testing
TEST_ORG_ID=d52497c0-42a9-49b7-ba3b-849bffa27fc4

# Test user (replace with real auth in production)
TEST_USER_ID=00000000-0000-0000-0000-000000000001

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google Calendar OAuth
GOOGLE_CALENDAR_CLIENT_ID=your-client-id
GOOGLE_CALENDAR_CLIENT_SECRET=your-client-secret
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/calendar/oauth/google

# Microsoft OAuth (if using Outlook)
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/calendar/oauth/outlook

# Calendar sync settings
CALENDAR_SYNC_LOOKBACK_DAYS=7
CALENDAR_SYNC_LOOKAHEAD_DAYS=90
CALENDAR_TOKEN_ENCRYPTION_KEY=your-encryption-key
```

### Production (.env.production)
**Changes Required:**
- [ ] `BYPASS_AUTH_FOR_TESTING=false` ← CRITICAL
- [ ] Remove TEST_ORG_ID and TEST_USER_ID
- [ ] Update GOOGLE_CALENDAR_REDIRECT_URI to production URL
- [ ] Update MICROSOFT_REDIRECT_URI to production URL
- [ ] Generate new CALENDAR_TOKEN_ENCRYPTION_KEY
- [ ] Use production Supabase credentials

---

## 🔐 Google OAuth Setup

**Current State:** Using test users, app not verified  
**Status:** Development mode only

**Test Users Added:**
- imeelynn.corliss@gmail.com

**Production Requirements:**
- [ ] Complete Google OAuth consent screen with all required info
- [ ] Add production redirect URIs to Google Cloud Console
- [ ] Remove test users or keep for staging environment
- [ ] Submit app for Google verification (if publishing publicly)
- [ ] Add privacy policy URL
- [ ] Add terms of service URL
- [ ] Upload app logo and screenshots
- [ ] Complete OAuth app verification process
- [ ] Test with multiple real Google accounts

**Google Cloud Console Updates:**
```
OAuth Consent Screen:
- App name: HomeschoolHQ
- Support email: your-email@domain.com
- Authorized domains: yourdomain.com
- Scopes: calendar.readonly, calendar.events
- Redirect URIs: https://yourdomain.com/api/calendar/oauth/google
```

---

## 🔧 Code Changes Required

### API Routes to Update

**Pattern to search:** `// TEMPORARY` or `BYPASS_AUTH`

#### 1. app/api/calendar/oauth/google/route.ts
```typescript
// CURRENT (Line ~20):
const testUserId = '00000000-0000-0000-0000-000000000001';

// PRODUCTION:
const { data: { user } } = await supabase.auth.getUser();
if (!user) throw new Error('Not authenticated');
const userId = user.id;
```

#### 2. app/api/calendar/connections/route.ts (GET)
```typescript
// CURRENT (Line ~18):
// TEMPORARY: Bypass auth for testing

// PRODUCTION:
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

#### 3. app/api/calendar/conflicts/route.ts (POST)
```typescript
// CURRENT (Line ~84):
const BYPASS_AUTH = process.env.BYPASS_AUTH_FOR_TESTING === 'true';
let userId = '00000000-0000-0000-0000-000000000001';

// PRODUCTION:
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const userId = user.id;
```

**Files to Review:**
- [ ] `app/api/calendar/oauth/google/route.ts`
- [ ] `app/api/calendar/oauth/outlook/route.ts`
- [ ] `app/api/calendar/connections/route.ts`
- [ ] `app/api/calendar/connections/[id]/route.ts`
- [ ] `app/api/calendar/sync/route.ts`
- [ ] `app/api/calendar/conflicts/route.ts`

### TypeScript Workarounds to Remove

**Search for:** `as any`

**Locations:**
- `src/lib/calendar/outlook-calendar.service.ts` - MSAL token responses
- Various API routes using Supabase client

**To Do:**
- [ ] Review all `as any` assertions
- [ ] Add proper type definitions where needed
- [ ] Remove unnecessary type assertions

---

## 🗄️ Database Schema Verification

**Tables Created:**
- [x] `calendar_connections`
- [x] `synced_work_events`
- [x] `calendar_sync_log`
- [x] `calendar_conflict_resolutions`

**Pre-Production Checks:**
- [ ] Verify all foreign key constraints are correct
- [ ] Add indexes on frequently queried columns:
  - `calendar_connections.organization_id`
  - `synced_work_events.calendar_connection_id`
  - `synced_work_events.organization_id`
  - `calendar_conflict_resolutions.organization_id`
- [ ] Test cascading deletes work correctly
- [ ] Verify all timestamp columns have proper defaults
- [ ] Add database-level constraints where needed

---

## 🧪 Testing Requirements

### Pre-Production Testing Checklist

**Authentication:**
- [ ] Test user signup/login flow
- [ ] Test OAuth with real Google account
- [ ] Test OAuth with real Microsoft account (if implementing)
- [ ] Verify users can only access their own data
- [ ] Test logout and token refresh

**Calendar Integration:**
- [ ] Connect Google Calendar with real account
- [ ] Verify events sync correctly
- [ ] Test automatic 15-minute sync
- [ ] Test conflict detection with real lessons
- [ ] Test manual sync button
- [ ] Test disconnect calendar
- [ ] Verify token refresh works automatically

**Data Security:**
- [ ] Test RLS policies with multiple users
- [ ] Verify cross-organization data isolation
- [ ] Test that users can't access other orgs' calendars
- [ ] Test storage policies for photos
- [ ] Attempt unauthorized API access

**Error Handling:**
- [ ] Test with expired OAuth tokens
- [ ] Test with revoked calendar access
- [ ] Test network failures during sync
- [ ] Test invalid date ranges
- [ ] Test missing required fields

**Performance:**
- [ ] Load test sync with 1000+ calendar events
- [ ] Test with multiple concurrent syncs
- [ ] Verify database query performance
- [ ] Check for N+1 queries
- [ ] Monitor memory usage during sync

---

## 📦 Deployment Checklist

### Before Deploying to Production

**Code Review:**
- [ ] Search entire codebase for "TEMPORARY" comments
- [ ] Search entire codebase for "TODO" comments
- [ ] Search for test UUIDs: `00000000-0000-0000-0000-000000000001`
- [ ] Search for `as any` type assertions
- [ ] Search for `console.log` statements (remove or guard)
- [ ] Verify all environment variables are documented

**Security Audit:**
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Review all API routes for auth checks
- [ ] Verify all database RLS policies
- [ ] Check storage bucket policies
- [ ] Review CORS settings
- [ ] Verify no sensitive data in logs

**Environment Setup:**
- [ ] Set all production environment variables
- [ ] Update OAuth redirect URIs to production URLs
- [ ] Generate new encryption keys for production
- [ ] Configure production database
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure logging service

**OAuth Providers:**
- [ ] Update Google OAuth consent screen
- [ ] Add production redirect URIs
- [ ] Submit for verification if needed
- [ ] Test OAuth flow on production domain
- [ ] Configure Microsoft OAuth (if using)

**Database:**
- [ ] Run all migrations on production database
- [ ] Enable RLS on all tables
- [ ] Create proper RLS policies
- [ ] Test policies with real users
- [ ] Set up database backups
- [ ] Configure connection pooling

---

## 🚀 Post-Deployment Monitoring

**Set Up Monitoring For:**
- [ ] OAuth token refresh failures
- [ ] Calendar sync failures
- [ ] API error rates
- [ ] Database query performance
- [ ] RLS policy violations
- [ ] Storage upload failures

**Alerts to Configure:**
- [ ] Sync failure rate > 5%
- [ ] API error rate > 1%
- [ ] Database connection pool exhaustion
- [ ] OAuth token expiration without refresh
- [ ] Unusual data access patterns

---

## 📝 Optional Enhancements (Post-Launch)

**Calendar Features:**
- [ ] Implement Outlook OAuth flow (currently stubbed)
- [ ] Add webhook support for real-time sync
- [ ] Implement cron job for automatic syncs
- [ ] Add sync history/audit log
- [ ] Support multiple calendars per user
- [ ] Add calendar color coding

**User Experience:**
- [ ] Add loading states during sync
- [ ] Show sync progress indicators
- [ ] Add better error messages
- [ ] Implement retry logic for failed syncs
- [ ] Add calendar preview before connecting

**Performance:**
- [ ] Implement incremental sync (use sync tokens)
- [ ] Add Redis caching for frequent queries
- [ ] Optimize conflict detection algorithm
- [ ] Batch database operations
- [ ] Implement background job queue

---

## 🔄 Running List of Issues (Add New Items Here)

### Items from Current Development Session

**Date: January 24-25, 2026**
- [x] RLS disabled on main tables
- [x] RLS disabled on calendar tables
- [x] Storage bucket made public
- [x] Auth bypassed in all API routes
- [x] Test UUID used throughout
- [x] Google OAuth using test users
- [x] TypeScript `as any` workarounds added
- [x] Backward compatibility file created for Supabase imports
- [x] tsconfig.json paths updated for dual structure

**Future Sessions - Add Items Below:**

---

---

## 📚 Documentation to Create

**Before Production:**
- [ ] API documentation for calendar endpoints
- [ ] OAuth setup guide for admins
- [ ] Troubleshooting guide for common sync issues
- [ ] Privacy policy (required for OAuth)
- [ ] Terms of service (required for OAuth)
- [ ] User guide for calendar integration
- [ ] Database schema documentation
- [ ] RLS policy documentation

---

## ✅ Quick Reference - When Ready for Production

**Run this command to find all temporary code:**
```bash
# Search for temporary bypasses
grep -r "TEMPORARY" app/
grep -r "BYPASS_AUTH" app/
grep -r "00000000-0000-0000-0000-000000000001" app/
grep -r "as any" src/
```

**One-line production switch:**
1. Set `BYPASS_AUTH_FOR_TESTING=false` in `.env.production`
2. Re-enable all RLS policies (SQL above)
3. Update OAuth redirect URIs
4. Test authentication flow
5. Deploy!

---

**Questions or issues? Add them here:**
- [ ] 

**Last Review Date:** _____________  
**Reviewed By:** _____________  
**Production Deploy Date:** _____________