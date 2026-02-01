# Production-Ready API Routes - Implementation Guide

## 🎯 Overview

These updated API routes use **environment variable-based auth bypass** instead of hardcoded test mode. This means:

✅ **Development:** Set `BYPASS_AUTH_FOR_TESTING=true` - uses test user/org  
✅ **Production:** Set `BYPASS_AUTH_FOR_TESTING=false` - requires real authentication

**No code changes needed when deploying!**

---

## 📋 Step 1: Add Environment Variable

Add this line to your `.env.local`:

```bash
BYPASS_AUTH_FOR_TESTING=true
TEST_ORG_ID=d52497c0-42a9-49b7-ba3b-849bffa27fc4
TEST_USER_ID=00000000-0000-0000-0000-000000000001
```

---

## 📁 Step 2: Replace API Route Files

Replace your existing files with these production-ready versions:

| File to Replace | New File |
|----------------|----------|
| `app/api/calendar/oauth/google/route.ts` | `google-oauth-route-PRODUCTION-READY.ts` |
| `app/api/calendar/connections/route.ts` | `connections-route-PRODUCTION-READY.ts` |
| `app/api/calendar/connections/[id]/route.ts` | `connections-id-route-PRODUCTION-READY.ts` |
| `app/api/calendar/sync/route.ts` | `sync-route-PRODUCTION-READY.ts` |
| `app/api/calendar/conflicts/route.ts` | `conflicts-route-PRODUCTION-READY.ts` |

---

## 🔍 How It Works

### The Pattern

Each route now has this pattern:

```typescript
// Auth bypass for testing - controlled by environment variable
const BYPASS_AUTH = process.env.BYPASS_AUTH_FOR_TESTING === 'true';
let userId: string;

if (BYPASS_AUTH) {
  // TESTING: Use test user
  userId = process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000001';
  console.log('⚠️ BYPASS_AUTH enabled - using test user');
} else {
  // PRODUCTION: Real authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  userId = user.id;
}
```

### What Changed

**Before (Hardcoded Test Mode):**
```typescript
// TEMPORARY: Bypass auth for testing
const testUserId = '00000000-0000-0000-0000-000000000001';
```

**After (Environment Variable):**
```typescript
const BYPASS_AUTH = process.env.BYPASS_AUTH_FOR_TESTING === 'true';
if (BYPASS_AUTH) {
  userId = process.env.TEST_USER_ID;
} else {
  // Real auth code
}
```

---

## 🚀 Deploying to Production

### One-Step Switch

In your production `.env.production` or Vercel environment variables:

```bash
BYPASS_AUTH_FOR_TESTING=false
```

That's it! All routes automatically switch to real authentication.

### Complete Production Checklist

1. **Environment Variables:**
   ```bash
   BYPASS_AUTH_FOR_TESTING=false
   # Remove TEST_ORG_ID
   # Remove TEST_USER_ID
   GOOGLE_CALENDAR_REDIRECT_URI=https://yourdomain.com/api/calendar/oauth/google
   ```

2. **Database Security:**
   - Re-enable Row Level Security (see PRODUCTION_CHECKLIST.md)
   - Create RLS policies
   - Re-enable Storage policies

3. **OAuth Setup:**
   - Update redirect URIs in Google Console
   - Submit for Google verification
   - Test with real accounts

4. **Testing:**
   - Test auth flow works
   - Verify users can't access other orgs' data
   - Test calendar sync with real calendar

---

## 🔧 Key Features

### 1. Consistent Auth Pattern

Every route checks `BYPASS_AUTH` first:
- ✅ Development: Uses test IDs
- ✅ Production: Requires authentication
- ✅ Logs when in test mode
- ✅ Clear error messages

### 2. Organization-Based Access

Routes properly fetch organization from authenticated user:

```typescript
const { data: profile } = await supabase
  .from('user_profiles')
  .select('organization_id')
  .eq('user_id', user.id)
  .single();
```

### 3. Ownership Verification

Routes verify users own the resources they're accessing:

```typescript
if (!BYPASS_AUTH && connection.user_id !== userId) {
  return NextResponse.json(
    { error: 'Access denied' },
    { status: 403 }
  );
}
```

---

## 📊 Testing in Development

Your app works exactly as before:

```bash
# .env.local
BYPASS_AUTH_FOR_TESTING=true
TEST_ORG_ID=d52497c0-42a9-49b7-ba3b-849bffa27fc4
TEST_USER_ID=00000000-0000-0000-0000-000000000001
```

You'll see console logs confirming test mode:
```
⚠️ BYPASS_AUTH enabled - using test user
⚠️ BYPASS_AUTH enabled - using test organization
```

---

## ⚠️ Important Notes

1. **Console Warnings:** Test mode logs warnings - this is intentional for visibility
2. **Ownership Checks:** Bypassed in test mode, enforced in production
3. **Organization Access:** Uses query params in test mode, derives from user in production
4. **No Code Changes:** Just flip the environment variable

---

## 🎉 Benefits

✅ **No Manual Code Changes** - Just update environment variable  
✅ **Always Production-Ready** - Auth code is always present  
✅ **Clear Test Mode** - Console logs show when bypassing auth  
✅ **Easy to Verify** - Search for `BYPASS_AUTH` to find all auth logic  
✅ **Safer Deployment** - Can't accidentally forget to enable auth  

---

## 🔍 Verification Commands

After implementing, verify everything is set up correctly:

```bash
# Check all routes have the BYPASS_AUTH pattern
grep -r "BYPASS_AUTH" app/api/calendar/

# Verify no hardcoded test UUIDs remain
grep -r "00000000-0000-0000-0000-000000000001" app/api/calendar/

# Check environment variables are set
cat .env.local | grep BYPASS_AUTH
```

---

## 📚 Related Files

- **PRODUCTION_CHECKLIST.md** - Complete pre-deployment checklist
- **env.local.template** - Template for all environment variables
- All production-ready route files

---

## ✅ Quick Start

1. Add environment variables to `.env.local`
2. Replace 5 API route files
3. Test your app - should work exactly as before
4. When ready for production: change one environment variable
5. Deploy! 🚀

---

**Questions?** Check the PRODUCTION_CHECKLIST.md for comprehensive deployment steps.