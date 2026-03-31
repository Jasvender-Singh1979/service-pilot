# Attendance Phase 2: Field Operations Module

## Implementation Complete

Upgraded attendance system into a comprehensive field operations module with geolocation, validation rules, manager dashboards, and consistency checks.

---

## 1. DATABASE SCHEMA CHANGES

### New Columns Added to `attendance` Table
- **Geolocation at Check-in:**
  - `check_in_latitude` (DECIMAL)
  - `check_in_longitude` (DECIMAL)
  - `check_in_accuracy` (DECIMAL)
  - `check_in_address` (TEXT)

- **Geolocation at Check-out:**
  - `check_out_latitude` (DECIMAL)
  - `check_out_longitude` (DECIMAL)
  - `check_out_accuracy` (DECIMAL)
  - `check_out_address` (TEXT)

- **Work Duration & Status:**
  - `worked_duration_minutes` (INTEGER) - Auto-calculated on check-out
  - `attendance_status` (TEXT) - 'complete' | 'incomplete'
  - `missed_checkout` (BOOLEAN) - Flagged for data issues
  - `last_activity_time` (TIMESTAMP) - Updated on check-in/out
  - `assigned_calls_count` (INTEGER) - Denormalized for query performance

---

## 2. GEOLOCATION IMPLEMENTATION

### Check-in/Check-out with GPS Capture
**Files Updated:**
- `/app/api/attendance/check-in/route.ts`
- `/app/api/attendance/check-out/route.ts`
- `/app/engineer/components/AttendanceCard.tsx`

**Features:**
- Captures latitude, longitude, and accuracy on both check-in and check-out
- Uses Capacitor Geolocation API for native mobile (iOS/Android)
- Falls back to browser Geolocation API for web preview
- Location is optional (doesn't block check-in/out if unavailable)
- Displays last known location coordinates in manager dashboard
- Links to Google Maps for location verification

**Usage:**
```bash
npm install @capacitor/geolocation  # Already installed
```

---

## 3. ATTENDANCE VALIDATION RULES

### Rule #1: Prevent Duplicate Check-in
- **Implemented in:** `/app/api/attendance/check-in/route.ts`
- **Logic:** If engineer already has `check_in_time` today, reject with error
- **Error Response:** "Already checked in today. Please check out first."

### Rule #2: Prevent Check-out Without Check-in
- **Implemented in:** `/app/api/attendance/check-out/route.ts`
- **Logic:** Verify `check_in_time` exists before allowing check-out
- **Error Response:** "Cannot check out without checking in first"

### Rule #3: Check-out After Check-in
- **Logic:** Validate that check-out time is strictly after check-in time
- **Error Response:** "Check-out time must be after check-in time"

### Rule #4: Auto-calculate Worked Duration
- **Formula:** `(check_out_time - check_in_time) / 60` = minutes
- **Stored:** `worked_duration_minutes` column
- **Display:** Formatted as "Xh Ym" in UI

### Rule #5: Status Management
- Check-in → `status='checked_in'`, `attendance_status='incomplete'`
- Check-out → `status='checked_out'`, `attendance_status='complete'`
- Used for filters and reporting

---

## 4. MANAGER LIVE ATTENDANCE DASHBOARD

### API Route
**File:** `/app/api/attendance/manager-dashboard/route.ts`

**Endpoint:** `GET /api/attendance/manager-dashboard`

**Response Structure:**
```json
{
  "success": true,
  "engineers": [
    {
      "id": "engineer_id",
      "name": "Engineer Name",
      "email": "engineer@example.com",
      "mobile_number": "+91...",
      "attendance_status": "checked_in" | "checked_out" | null,
      "check_in_time": "ISO timestamp",
      "check_out_time": "ISO timestamp",
      "worked_duration_minutes": 480,
      "check_in_latitude": 28.6139,
      "check_in_longitude": 77.2090,
      "check_in_address": null,
      "check_out_latitude": null,
      "check_out_longitude": null,
      "check_out_address": null,
      "last_activity_time": "ISO timestamp",
      "completion_status": "complete" | "incomplete",
      "assigned_calls_count": 3
    }
  ],
  "summary": {
    "checked_in_count": 5,
    "checked_out_count": 3,
    "not_checked_in_count": 2,
    "total_engineers": 10
  }
}
```

### UI Page
**File:** `/app/manager/attendance/page.tsx`

**Features:**
- **Team Summary Cards** - Real-time counts of checked in/out engineers
- **Engineer List** - Sortable by name, shows current status, check-in time, duration, active calls
- **Engineer Details Modal** - Click to view:
  - Contact information
  - Today's attendance times & duration
  - Last known location with Google Maps link
  - Active call count
  - Link to full history

**Permissions:** `manager`, `super_admin`

---

## 5. DAILY ATTENDANCE SUMMARY

### API Route
**File:** `/app/api/attendance/daily-summary/route.ts`

**Endpoint:** `GET /api/attendance/daily-summary?engineer_id=X&from_date=YYYY-MM-DD&to_date=YYYY-MM-DD`

**Parameters Required:**
- `engineer_id` - Target engineer
- `from_date` - Start date
- `to_date` - End date

**Response:**
```json
{
  "success": true,
  "records": [
    {
      "attendance_date": "2024-01-15",
      "engineer_user_id": "...",
      "check_in_time": "2024-01-15T09:00:00Z",
      "check_out_time": "2024-01-15T17:30:00Z",
      "worked_duration_minutes": 510,
      "attendance_status": "complete",
      "missed_checkout": false,
      "status": "checked_out"
    }
  ],
  "summary": {
    "total_days": 30,
    "complete_days": 28,
    "incomplete_days": 2,
    "missed_checkout_count": 0,
    "total_worked_hours": 224.5,
    "average_daily_hours": 8.2
  }
}
```

### UI Page
**File:** `/app/manager/attendance/history/page.tsx`

**Features:**
- **Date Range Picker** - Filter by custom date range (default: last 30 days)
- **Summary Statistics:**
  - Total days in range
  - Complete days (with check-out)
  - Total worked hours
  - Average hours per day
  - Missed checkout count (with warning badge)
- **Daily Records** - Each day shows:
  - Attendance date
  - Status badge (complete/incomplete)
  - Check-in & check-out times
  - Total duration worked
  - Missed checkout flag if applicable

**Permissions:** `manager`, `super_admin`

---

## 6. CONSISTENCY CHECKS

### API Route
**File:** `/app/api/attendance/consistency-check/route.ts`

**Endpoint:** `GET /api/attendance/consistency-check`

### Three Flags Implemented

#### Flag #1: Checked In But No Work
- **Type:** `checked_in_no_work`
- **Severity:** WARNING
- **Logic:** Engineer checked in today but has 0 assigned/in-progress calls
- **Insight:** May indicate idle time or unassigned work
- **Details:** Shows check-in time

#### Flag #2: Call Active But Not Checked In (CRITICAL)
- **Type:** `work_without_checkin`
- **Severity:** CRITICAL
- **Logic:** Engineer has assigned/in-progress calls but is not checked in
- **Insight:** Data integrity issue - engineer doing work without attendance record
- **Details:** Shows call ID
- **Action:** Requires immediate attention

#### Flag #3: Checked Out With Open Calls
- **Type:** `checked_out_with_open_calls`
- **Severity:** WARNING
- **Logic:** Engineer checked out but still has assigned/in-progress calls
- **Insight:** Incomplete handoff or data inconsistency
- **Details:** Count of open calls

### Response Structure
```json
{
  "success": true,
  "flags": [
    {
      "engineer_id": "...",
      "engineer_name": "Raj Kumar",
      "flag_type": "checked_in_no_work",
      "severity": "warning",
      "description": "Engineer checked in but has no assigned work",
      "details": {
        "checked_in_since": "2024-01-15T09:00:00Z"
      }
    }
  ],
  "total_issues": 3,
  "critical_count": 1,
  "warning_count": 2
}
```

### UI Page
**File:** `/app/manager/attendance/consistency/page.tsx`

**Features:**
- **Real-time Monitoring** - Auto-refresh every 30 seconds (toggle to disable)
- **Issues Summary** - Total issues, critical count, warning count
- **Critical Issues Section** - Red cards with quick action buttons
- **Warnings Section** - Yellow cards for non-urgent issues
- **All Clear State** - Success message when no issues detected
- **Quick Navigation** - Click "View" to jump to engineer details

**Permissions:** `manager`, `super_admin`

---

## 7. ENGINEER-SIDE UPDATES

### Attendance Card Component
**File:** `/app/engineer/components/AttendanceCard.tsx`

**Enhancements:**
- **Geolocation on Check-in/Out:**
  - Shows "Getting location..." while acquiring GPS
  - Displays success message if location captured
  - Continues if location unavailable (graceful degradation)
  
- **Duration Display:**
  - Shows "Today's Duration" after check-out
  - Format: "Xh Ym" (e.g., "8h 30m")
  
- **Location Verification:**
  - Shows check-in coordinates (4 decimal places)
  - Useful for field verification
  - Only visible if location was captured

- **Button States:**
  - `not_checked_in` → Green "Check In"
  - `checked_in` → Blue "Check Out"
  - `checked_out` → Gray "Completed"

- **IST Timezone:**
  - All times use Asia/Kolkata timezone
  - Consistent with dateUtils.ts

---

## 8. TIMEZONE HANDLING

### Consistent IST (Asia/Kolkata) Boundaries

**Key Utility:** `/lib/dateUtils.ts`

**Usage in Attendance:**
- Check-in/check-out: Timestamps in UTC, stored in DB
- Today's attendance: Filter by IST date boundaries
- Daily summary: Range queries use IST date conversion
- Manager dashboard: Today's data = IST day boundaries

**Time Zones:**
- Database: UTC (standard)
- Queries: IST boundaries (UTC-5:30 conversion)
- Display: IST formatted timestamps

---

## 9. APIs CREATED/UPDATED

### New APIs

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/attendance/check-in` | POST | Engineer check-in with geolocation |
| `/api/attendance/check-out` | POST | Engineer check-out with geolocation |
| `/api/attendance/today` | GET | Get today's attendance status |
| `/api/attendance/manager-dashboard` | GET | Manager's real-time team view |
| `/api/attendance/daily-summary` | GET | Historical summary by engineer & date range |
| `/api/attendance/consistency-check` | GET | Detect anomalies & data integrity issues |

---

## 10. PAGES CREATED/UPDATED

### Engineer Pages
- **`/app/engineer/page.tsx`** - Already has AttendanceCard component
  - Updated to show check-in/out with geolocation
  - Shows duration worked if checked out today

### Manager Pages (NEW)
- **`/app/manager/attendance/page.tsx`** 
  - Live team attendance dashboard
  - Engineer status, check-in times, active calls
  - Click-through to engineer details modal

- **`/app/manager/attendance/history/page.tsx`**
  - Historical attendance records
  - Date range filtering (default: 30 days)
  - Summary stats & per-day breakdown
  - Missed checkout detection

- **`/app/manager/attendance/consistency/page.tsx`**
  - Real-time anomaly detection
  - Critical vs warning severity levels
  - Auto-refresh option (30s intervals)
  - Quick navigation to engineers

---

## 11. DEPENDENCIES

### Installed
- `@capacitor/geolocation` - Native GPS access

### Pre-installed (Already Available)
- `@capacitor/core` - Capacitor framework
- `date-fns` - Date formatting
- Next.js 15 - Framework
- TailwindCSS - Styling

---

## 12. DATA FLOW DIAGRAM

```
ENGINEER SIDE:
  AttendanceCard.tsx
    ↓ (clicks Check In)
  getLocation() → Capacitor Geolocation
    ↓
  POST /api/attendance/check-in
    ↓ (with lat, lon, accuracy)
  INSERT attendance record
    ↓ (with geolocation columns)
  Store in database

MANAGER SIDE:
  /manager/attendance/page.tsx
    ↓ (loads on mount)
  GET /api/attendance/manager-dashboard
    ↓ (queries today's records)
  Shows live status, duration, location
    ↓ (click engineer)
  Details modal with contact & location
    ↓ (click "View Full History")
  → /manager/attendance/history?engineer_id=X

CONSISTENCY:
  /manager/attendance/consistency/page.tsx
    ↓ (auto-refresh every 30s)
  GET /api/attendance/consistency-check
    ↓ (runs 3 flag queries)
  Displays critical & warning issues
    ↓ (click View)
  Jumps to engineer in main dashboard
```

---

## 13. ATTENDANCE RULES SUMMARY

| Rule | Type | Action | Response |
|------|------|--------|----------|
| Duplicate Check-in | PREVENTION | Reject if already checked in | Error message |
| No Check-in Before Checkout | PREVENTION | Require check-in first | Error message |
| Checkout After Checkin | VALIDATION | Verify time order | Error message |
| Auto Duration | CALCULATION | On checkout, compute minutes | Stored in DB |
| IST Boundaries | FILTER | All date queries use IST | Accurate daily summaries |
| Checked In No Work | DETECTION | Flag for review | Warning |
| Work Without Checkin | DETECTION | Critical issue | Critical flag |
| Checked Out Open Calls | DETECTION | Flag incomplete handoff | Warning |

---

## 14. UI/UX HIGHLIGHTS

### Engineer Experience
✅ One-tap check-in/out  
✅ Automatic location capture  
✅ See worked duration immediately  
✅ Know location was captured  

### Manager Experience
✅ Live team overview at a glance  
✅ Drill down to individual engineer details  
✅ Historical trends & averages  
✅ Proactive anomaly alerts  
✅ Quick links to Google Maps for location verification  

### Data Integrity
✅ Duplicate check-in prevention  
✅ Check-in before check-out enforcement  
✅ Automatic duration calculation  
✅ Consistency checks catch edge cases  

---

## 15. QUERY PERFORMANCE NOTES

- **Manager Dashboard:** Denormalized `assigned_calls_count` for fast queries
- **Consistency Checks:** Uses simple aggregation queries
- **Daily Summary:** Range queries indexed by `attendance_date`
- **All Timestamps:** UTC stored, IST boundaries applied in queries

---

## 16. FUTURE ENHANCEMENTS (Not Implemented)

- Geofencing (automatic check-in at site)
- Offline sync for field connectivity gaps
- Facial recognition verification
- Payroll integration (hours → salary)
- Real-time map view
- Location history trails
- Manual checkout entry (for missed checkouts)
- Leave/holiday exceptions

---

## 17. TESTING CHECKLIST

Engineer Side:
- [ ] Check in captures GPS
- [ ] Check out captures GPS
- [ ] Duration calculated correctly
- [ ] Cannot check in twice
- [ ] Cannot check out without check-in
- [ ] Timestamps in IST

Manager Side:
- [ ] Dashboard loads live data
- [ ] Engineer list updates in real-time
- [ ] Engineer modal shows correct data
- [ ] History filter works (date ranges)
- [ ] Summary calculations correct
- [ ] Consistency checks detect issues
- [ ] Location links work in Google Maps
- [ ] Auto-refresh works

Database:
- [ ] Geolocation columns populated
- [ ] Worked duration calculated
- [ ] Status values correct
- [ ] IST date boundaries respected

---

## 18. NOTES

**IST Timezone:** All date calculations use Asia/Kolkata (UTC+5:30) day boundaries as specified.

**Geolocation:** Optional feature—if unavailable, check-in/out still succeeds. Location capture is "best effort."

**Consistency Flags:** Real-time detection runs on every manager dashboard request. Critical issues should trigger immediate manager review.

**Mobile-First:** All manager pages designed mobile-first with bottom-sheet modals for details.

**No External Dependencies:** Uses native Capacitor geolocation API—no third-party maps or location services.
