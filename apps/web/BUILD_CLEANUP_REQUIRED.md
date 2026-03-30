# STALE BUILD CLEANUP REQUIRED

## SITUATION

The app source code has been fixed to use relative `/api/...` paths, but **STALE COMPILED BUILDS** containing the old hardcoded external URL are still present.

Browser is loading old compiled JavaScript that tries to call:
```
https://service-pilot-b3df0d.appgen.co/api/...  ❌ CROSS-ORIGIN (cookies not sent)
```

Instead of:
```
/api/...  ✅ SAME-ORIGIN (cookies sent automatically)
```

---

## CONSEQUENCE

- **Dashboard shows Users = 0** (stats call fails silently with 401)
- **Manager creation returns 401 Unauthorized** (no session cookie sent)
- **Any authenticated request fails** (cross-origin blocks cookies)

---

## STALE BUILD LOCATIONS

1. **`/home/user/apps/web/out/`**
   - Directory: Old static export build
   - Problem: Contains compiled chunks with hardcoded URL
   - Example: `out/_next/static/chunks/app/page-0ad3f77c15750a86.js` has `"https://service-pilot-b3df0d.appgen.co"`

2. **`/home/user/apps/web/android/app/src/main/assets/public/`**
   - Directory: Old Capacitor Android APK assets
   - Problem: Copied from old `/out/` with same hardcoded URL
   - Example: `android/.../public/_next/static/chunks/app/page-0ad3f77c15750a86.js` has same URL

3. **`/home/user/apps/web/.next/`**
   - Directory: Next.js build cache
   - Status: May contain stale data
   - Action: Clear on next build

---

## SOURCE CODE STATUS

✅ **All source files are CORRECT:**

- `/app/page.tsx` - Uses `/api/user/by-email` (no hardcoded URL)
- `/app/super-admin/page.tsx` - Uses `/api/user/me`, `/api/stats` (no hardcoded URL)
- `/app/super-admin/managers/page.tsx` - Uses `/api/managers` (no hardcoded URL)
- `/app/manager/page.tsx` - Uses `/api/stats`, `/api/service-calls/counts` (no hardcoded URL)
- All other pages similarly fixed

All authenticated requests include `credentials: 'include'`

---

## WHAT NEEDS TO BE DONE

### Step 1: Remove Stale Build Artifacts

Execute the following to safely delete old builds:
```bash
rm -rf /home/user/apps/web/out
rm -rf /home/user/apps/web/.next
rm -rf /home/user/apps/web/android/app/src/main/assets/public
```

### Step 2: Restart Dev Server

The Next.js dev server will automatically:
- Recompile from latest source code
- Create fresh `.next/` build with correct `/api/...` paths
- Serve the corrected compiled files

### Step 3: Verify Browser Request

Open DevTools (F12) → Network tab:
- Request URL should be: `/api/...` (not `https://...`)
- Request headers should include: `Cookie: auth.session=...`

### Step 4: Test Functionality

1. Reload app
2. Login as super_admin
3. Dashboard should show Users = 1 ✅
4. Create manager should succeed (201 Created) ✅
5. No more 401 Unauthorized errors ✅

### Step 5: Rebuild Android/iOS

After cleanup, rebuild Capacitor:
- `npm run build` (creates `.next/` and generates new APK assets)
- Old hardcoded URL will NOT appear in new build
- New build will use fresh compiled code with relative paths

---

## VERIFICATION CHECKLIST

After cleanup:

- [ ] Directory `/out/` does not exist
- [ ] Directory `/android/app/src/main/assets/public/` does not exist (or is empty)
- [ ] Browser loads page from http://localhost:3000/ (dev server)
- [ ] DevTools Network tab shows requests to `/api/...` (not `https://...`)
- [ ] Dashboard shows Users count (not 0)
- [ ] Manager creation succeeds
- [ ] No 401 Unauthorized errors in console
- [ ] Can refresh page and still logged in
- [ ] Can logout and login again

---

## AFFECTED FUNCTIONALITY

These features will NOT work correctly until cleanup is done:

- ❌ Super Admin Dashboard (Users = 0)
- ❌ Manager Creation (401 Unauthorized)
- ❌ Manager Deletion (401 Unauthorized)
- ❌ Stats/Reports (fails silently)
- ❌ Manager Page (can't load stats)
- ❌ Engineer Dashboard (can't load stats)
- ❌ Any authenticated API call

---

## ROOT CAUSE

The app had:
1. Old NEXT_PUBLIC_API_URL configured to `https://service-pilot-b3df0d.appgen.co`
2. Static export created to `/out/` directory (for Capacitor)
3. Assets copied to `/android/` directory
4. Later, source code was fixed to use `/api/...` paths
5. But old build artifacts were never removed
6. Dev server is serving fresh code, but old compiled assets still exist

This is a **build artifact cleanup issue**, not a code issue.

---

**Status**: Ready for cleanup. All source files are correct. Awaiting stale build removal.
