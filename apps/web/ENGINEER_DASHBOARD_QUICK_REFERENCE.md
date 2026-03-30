# Engineer Dashboard Summary - Quick Reference

## 🎯 Three Summary Metrics

### 1️⃣ Assigned Today
**What:** Calls assigned to engineer TODAY  
**SQL:** `WHERE assigned_engineer_user_id = ${userId} AND created_at (IST) = today`  
**Purpose:** Track new work assigned today  
**Example:** Engineer gets 3 new calls = Assigned Today = 3  

### 2️⃣ Closed Today  
**What:** Calls closed by engineer TODAY  
**SQL:** `WHERE assigned_engineer_user_id = ${userId} AND call_status = 'closed' AND closure_timestamp (IST) = today`  
**Purpose:** Track completed work  
**Example:** Engineer closes 2 calls = Closed Today = 2  

### 3️⃣ Pending Today
**What:** ALL currently open work (any age)  
**SQL:** `WHERE assigned_engineer_user_id = ${userId} AND call_status IN ('assigned', 'in_progress', 'pending_action_required', 'pending_under_services')`  
**Purpose:** Show total workload  
**NO DATE FILTER** - this is a snapshot of current work, not today-only  
**Example:** 6 calls in open statuses = Pending = 6  

---

## ⚡ The Critical Difference

| Metric | Date Filter? | Why |
|--------|-------------|-----|
| Assigned Today | ✅ YES (created_at=today) | Event count - new work |
| Closed Today | ✅ YES (closure_timestamp=today) | Event count - completed |
| **Pending Today** | ❌ **NO** | Snapshot - show all open work |

---

## 🔑 Key Rule

> **"Pending" does NOT mean "assigned today"**  
> **"Pending" means "currently open and needs work"**

An engineer must see all work that needs doing, not just today's new work.

---

## 🐛 Common Mistakes (Don't Do These)

❌ **DO NOT** filter Pending by date  
❌ **DO NOT** use created_at for Pending (use status instead)  
❌ **DO NOT** filter Pending by `closed_at` (it's for closed work)  
❌ **DO NOT** include cancelled/closed calls in Pending  

---

## ✅ If You Modify This Logic

1. **Always use centralized date utility**
   - `getTodayIST()` for date strings
   - `getTodayRangeIST()` for timestamp ranges
   - Don't calculate dates locally

2. **Always use timezone-aware queries**
   - `(column AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date`
   - Not `DATE(column)` - loses timezone info

3. **Test with multi-day scenarios**
   - Create calls Monday, Tuesday
   - Check counts on Friday
   - Pending should include ALL open calls, not just Friday's

4. **Add debug logs**
   - Engineer ID being queried
   - Today's IST date
   - Summary count results

---

## 📍 File Location
`/app/api/engineers/dashboard/route.ts`

---

## 🧪 Quick Test

Create 5 calls for an engineer:
- Monday: 2 calls → status: "in_progress"
- Tuesday: 1 call → status: "pending_action"  
- Wednesday: 2 calls → closed

Check the dashboard on Wednesday:
- Assigned Today = 2 (Wed's calls only)
- Closed Today = 2
- Pending = 3 (Mon's 2 + Tue's 1, all still open)

If Pending shows only 2, the date filter bug is back.

---

## 📋 Status Values to Use

**Open statuses** (counted in Pending):
- 'assigned'
- 'in_progress'
- 'pending_action_required'
- 'pending_under_services'

**Closed statuses** (NOT in Pending):
- 'closed'
- 'cancelled'
- 'unassigned'

---

**Last Updated:** 2024  
**Reviewed by:** Product Engineering  
**Status:** ✅ Production Ready
