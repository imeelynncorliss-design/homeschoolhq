/**
 * StatsBar.tsx
 * Wired version of the dashboard stats bar using live Supabase data.
 *
 * Usage in Dashboard.tsx:
 *   import StatsBar from "@/components/dashboard/StatsBar";
 *   <StatsBar organizationId={organizationId} />
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDashboardStats } from "@/src/hooks/useDashboardStats";

interface StatsBarProps {
  organizationId: string | null;
}

export default function StatsBar({ organizationId }: StatsBarProps) {
  const router = useRouter();
  const {
    todayCount, todayDone,
    annualPct, annualDays, annualRequired,
    weekDays,
    compliancePct, complianceState, complianceAlert,
    loading, error, refetch,
  } = useDashboardStats(organizationId);

  const stats = [
    {
      id: "today",
      icon: "📚",
      label: "Today",
      value: loading ? "—" : `${todayDone}/${todayCount}`,
      sub: loading ? "loading..." : todayCount === 0 ? "no lessons scheduled" : "lessons done",
      alert: false,
      href: "/lessons",
      cta: "View today →",
    },
    {
      id: "goal",
      icon: "🎯",
      label: "Annual Goal",
      value: loading ? "—" : `${annualPct}%`,
      sub: loading ? "loading..." : `${annualDays} of ${annualRequired} days`,
      alert: false,
      href: "/progress",
      cta: "Track progress →",
    },
    {
      id: "week",
      icon: "✅",
      label: "Attendance",
      value: loading ? "—" : `${weekDays}`,
      sub: loading ? "loading..." : weekDays === 1 ? "day logged" : "days logged",
      alert: false,
      href: "/attendance",
      cta: "Log attendance →",
    },
    {
      id: "compliance",
      icon: complianceAlert ? "⚠️" : "✅",
      label: "Compliance",
      value: loading ? "—" : `${compliancePct}%`,
      sub: loading
        ? "loading..."
        : complianceState
        ? `${complianceState} · ${complianceAlert ? "needs attention" : "on track"}`
        : "set up compliance →",
      alert: complianceAlert,
      href: "/school-year",
      cta: complianceAlert ? "Fix now →" : "View details →",
    },
  ];

  return (
    <>
      <style>{`
        .stats-bar {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background: #fff;
          border-bottom: 1px solid #ede9fe;
          box-shadow: 0 2px 8px rgba(124,58,237,0.07);
        }
        @media (max-width: 640px) {
          .stats-bar {
            grid-template-columns: repeat(2, 1fr);
          }
          /* Remove right border on even cells (right column) */
          .stats-bar .stat-cell:nth-child(2n) {
            border-right: none;
          }
          /* Add bottom border between rows */
          .stats-bar .stat-cell:nth-child(-n+2) {
            border-bottom: 1px solid #f3f4f6;
          }
        }
      `}</style>

      {error && (
        <div style={css.errorBanner}>
          ⚠️ Could not load stats.{" "}
          <button onClick={refetch} style={css.retryBtn}>Retry</button>
        </div>
      )}

      <div className="stats-bar">
        {stats.map((stat, i) => (
          <StatCell
            key={stat.id}
            stat={stat}
            loading={loading}
            isLast={i === stats.length - 1}
            onClick={() => router.push(stat.href)}
          />
        ))}
      </div>
    </>
  );
}

// ─── Stat Cell ────────────────────────────────────────────────────────────────

interface Stat {
  id: string;
  icon: string;
  label: string;
  value: string;
  sub: string;
  alert: boolean;
  href: string;
  cta: string;
}

function StatCell({
  stat,
  loading,
  isLast,
  onClick,
}: {
  stat: Stat;
  loading: boolean;
  isLast: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="stat-cell"
      style={{
        ...css.statCell,
        ...(stat.alert ? css.statCellAlert : {}),
        ...(hovered ? (stat.alert ? css.statCellAlertHover : css.statCellHover) : {}),
        // On desktop, remove right border on last item only
        // On mobile the CSS class handles it
        ...(isLast ? { borderRight: "none" } : {}),
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ ...css.iconWrap, background: stat.alert ? "#fef3c7" : "#f5f3ff" }}>
        <span style={css.icon}>{stat.icon}</span>
      </div>

      <div style={css.body}>
        <div style={css.label}>{stat.label}</div>
        {loading ? (
          <div style={css.skeleton} />
        ) : (
          <div style={{ ...css.value, ...(stat.alert ? css.valueAlert : {}) }}>
            {stat.value}
          </div>
        )}
        <div style={css.sub}>{stat.sub}</div>
      </div>

      {hovered && !loading && (
        <div style={{ ...css.cta, ...(stat.alert ? css.ctaAlert : {}) }}>
          {stat.cta}
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const css: Record<string, React.CSSProperties> = {
  errorBanner: {
    background: "#fef2f2",
    borderBottom: "1px solid #fecaca",
    padding: "8px 20px",
    fontSize: 13,
    color: "#dc2626",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  retryBtn: {
    background: "none",
    border: "none",
    color: "#7c3aed",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 13,
    padding: 0,
    textDecoration: "underline",
  },
  statCell: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    borderRight: "1px solid #f3f4f6",
    cursor: "pointer",
    transition: "background 0.15s ease",
    position: "relative",
    userSelect: "none",
  },
  statCellHover: { background: "#faf5ff" },
  statCellAlert: { background: "#fffbeb", borderRight: "1px solid #fef3c7" },
  statCellAlertHover: { background: "#fef3c7" },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontSize: 18,
    transition: "background 0.15s ease",
  },
  icon: { lineHeight: 1 },
  body: { flex: 1, minWidth: 0 },
  label: {
    fontSize: 10,
    fontWeight: 700,
    color: "#9ca3af",
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  },
  value: {
    fontSize: 20,
    fontWeight: 900,
    color: "#111827",
    lineHeight: 1.15,
    marginTop: 1,
  },
  valueAlert: { color: "#d97706" },
  sub: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 2,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cta: {
    position: "absolute" as const,
    bottom: 8,
    right: 12,
    fontSize: 11,
    fontWeight: 700,
    color: "#7c3aed",
    whiteSpace: "nowrap" as const,
  },
  ctaAlert: { color: "#d97706" },
  skeleton: {
    height: 22,
    width: 52,
    borderRadius: 6,
    background: "linear-gradient(90deg, #f3f4f6 25%, #e9eaeb 50%, #f3f4f6 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.4s infinite",
    marginTop: 2,
  },
};