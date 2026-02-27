/**
 * useDashboardStats.ts
 * Fetches all 4 stats bar values for the HomeschoolHQ dashboard.
 *
 * Stats:
 *  1. Today's lessons   — lessons scheduled for today (by org)
 *  2. Annual goal       — % of required school days completed (school_year_config + daily_attendance)
 *  3. This week         — distinct school days logged this calendar week
 *  4. Compliance        — % toward state-required days (user_compliance_settings + daily_attendance)
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/src/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  todayCount: number;          // lessons scheduled today
  todayDone: number;           // lessons marked complete today
  annualPct: number;           // 0–100 percent of required days done
  annualDays: number;          // days logged so far
  annualRequired: number;      // required days for the year
  weekDays: number;            // school days logged this Mon–Sun
  compliancePct: number;       // 0–100 compliance progress
  complianceState: string;     // e.g. "NC"
  complianceAlert: boolean;    // true when < 50%
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns YYYY-MM-DD for today in local time */
function toDateStr(d: Date): string {
  return d.toLocaleDateString("en-CA"); // en-CA gives YYYY-MM-DD
}

/** Monday of the current week */
function weekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

/** Sunday of the current week */
function weekEnd(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useDashboardStats(organizationId: string | null): DashboardStats {
  const [stats, setStats] = useState<Omit<DashboardStats, "refetch">>({
    todayCount: 0,
    todayDone: 0,
    annualPct: 0,
    annualDays: 0,
    annualRequired: 180,
    weekDays: 0,
    compliancePct: 0,
    complianceState: "",
    complianceAlert: false,
    loading: true,
    error: null,
  });

  const fetchStats = useCallback(async () => {
    if (!organizationId) return;

    setStats((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const today = toDateStr(new Date());
      const monStr = weekStart();
      const sunStr = weekEnd();

      // ── 1. TODAY'S LESSONS ────────────────────────────────────────────────
      // Lessons with a scheduled_date of today for this org
      const { data: todayLessons, error: todayErr } = await supabase
        .from("lessons")
        .select("id, status")
        .eq("organization_id", organizationId)
        .eq("lesson_date", today);

      if (todayErr) throw todayErr;

      const todayCount = todayLessons?.length ?? 0;
      const todayDone =
        todayLessons?.filter((l) => l.status === "completed").length ?? 0;

      // ── 2. ANNUAL GOAL (school days logged vs required) ───────────────────
      // Pull required days from school_year_config (active record)
      const { data: configData, error: configErr } = await supabase
      .from("school_year_settings")
      .select("annual_goal_value, school_year_start, school_year_end")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

      if (configErr) throw configErr;

      const annualRequired = configData?.annual_goal_value ?? 180;
      const yearStart = configData?.school_year_start ?? null;
      const yearEnd = configData?.school_year_end ?? null;

      // Count distinct attended days in the current school year.
      // daily_attendance uses status = 'full_day' | 'half_day' (not a boolean).
      let attendanceQuery = supabase
        .from("daily_attendance")
        .select("attendance_date")
        .eq("organization_id", organizationId)
        .in("status", ["full_day", "half_day"]);

      if (yearStart) attendanceQuery = attendanceQuery.gte("attendance_date", yearStart);
      if (yearEnd)   attendanceQuery = attendanceQuery.lte("attendance_date", yearEnd);

      const { data: attendanceData, error: attendErr } = await attendanceQuery;
      if (attendErr) throw attendErr;

      // De-duplicate by date — a family logs once per day, but some records
      // have a kid_id (per-child rows) alongside org-level rows, so dedup is essential.
      const uniqueDays = new Set(
        (attendanceData ?? []).map((r) => r.attendance_date)
      );
      const annualDays = uniqueDays.size;
      const annualPct = Math.min(
        100,
        Math.round((annualDays / annualRequired) * 100)
      );

      // ── 3. THIS WEEK'S DAYS LOGGED ────────────────────────────────────────
      // Pull from daily_attendance (family school days)
      const { data: weekData, error: weekErr } = await supabase
        .from("daily_attendance")
        .select("attendance_date")
        .eq("organization_id", organizationId)
        .in("status", ["full_day", "half_day"])
        .gte("attendance_date", monStr)
        .lte("attendance_date", sunStr);

      if (weekErr) throw weekErr;

      // Also pull co-op class attendance this week (class_attendance table).
      // status = 'present' means the kid attended a co-op class that day.
      const { data: coopWeekData, error: coopWeekErr } = await supabase
        .from("class_attendance")
        .select("attendance_date")
        .eq("organization_id", organizationId)
        .eq("status", "present")
        .gte("attendance_date", monStr)
        .lte("attendance_date", sunStr);

      // coopWeekErr is non-fatal — co-op may not be set up yet
      if (coopWeekErr) {
        console.warn("class_attendance week query failed (non-fatal):", coopWeekErr.message);
      }

      // Merge both sources — a day only counts once regardless of source
      const weekUnique = new Set([
        ...(weekData ?? []).map((r) => r.attendance_date),
        ...(coopWeekData ?? []).map((r) => r.attendance_date),
      ]);
      const weekDays = weekUnique.size;

      // ── 4. COMPLIANCE ─────────────────────────────────────────────────────
      // Pull the state + required days from user_compliance_settings
      const { data: compSettings, error: compErr } = await supabase
      .from("user_compliance_settings")
      .select("state_code, required_annual_days")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

      if (compErr) throw compErr;

      const complianceState = compSettings?.state_code ?? "";
      const compRequired = compSettings?.required_annual_days ?? annualRequired;

      // Re-use annualDays for compliance progress — same attendance source,
      // already filtered with status IN ('full_day', 'half_day')
      const compliancePct = Math.min(
        100,
        Math.round((annualDays / compRequired) * 100)
      );
      const complianceAlert = compliancePct < 50;

      // ── SET STATE ─────────────────────────────────────────────────────────
      setStats({
        todayCount,
        todayDone,
        annualPct,
        annualDays,
        annualRequired,
        weekDays,
        compliancePct,
        complianceState,
        complianceAlert,
        loading: false,
        error: null,
      });
    } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "object" && err !== null && "message" in err
            ? String((err as any).message)
            : JSON.stringify(err) || "Failed to load dashboard stats";
        console.error("useDashboardStats error details:", JSON.stringify(err, null, 2));
        setStats((prev) => ({ ...prev, loading: false, error: message }));
      }

  }, [organizationId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { ...stats, refetch: fetchStats };
}