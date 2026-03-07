import { useState } from "react";

const routes = {
  preAuth: [
    {
      path: "/",
      label: "Login / Sign Up",
      icon: "🔑",
      description: "Entry point. Email/password auth. Co-teacher invite code path. Routes admin → dashboard, co-teacher → schedule.",
      tags: ["Auth"],
      color: "#4CAF82",
    },
  ],
  admin: [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: "🧭",
      description: "Nav cards command center. Live stats bar. Onboarding checklist. Your hub for everything.",
      tags: ["Admin"],
      color: "#5B8DEF",
    },
    {
      path: "/schedule",
      label: "Teaching Schedule",
      icon: "📅",
      description: "Grouped lesson views, mark-complete. Shared with co-teachers but admin sees all kids.",
      tags: ["Admin"],
      color: "#5B8DEF",
    },
    {
      path: "/lessons",
      label: "Lessons",
      icon: "📚",
      description: "Create, generate with AI, manage lessons per kid and subject.",
      tags: ["Admin"],
      color: "#5B8DEF",
    },
    {
      path: "/kids",
      label: "Students",
      icon: "👦",
      description: "Student profiles, grade levels, subjects assigned.",
      tags: ["Admin"],
      color: "#5B8DEF",
    },
    {
      path: "/compliance",
      label: "Compliance",
      icon: "✅",
      description: "State requirements, attendance tracking, annual learning goals. Pro tier.",
      tags: ["Admin", "Pro"],
      color: "#5B8DEF",
    },
    {
      path: "/reports",
      label: "Reports",
      icon: "📄",
      description: "Transcripts, PDF audit reports, progress summaries. Pro tier.",
      tags: ["Admin", "Pro"],
      color: "#5B8DEF",
    },
    {
      path: "/resources",
      label: "Resources",
      icon: "🎓",
      description: "Teaching styles, deload explained, what you'll need, did you know, FAQ. Always accessible to all logged-in users.",
      tags: ["Admin", "Co-Teacher"],
      color: "#5B8DEF",
    },
    {
      path: "/settings",
      label: "Settings",
      icon: "⚙️",
      description: "School settings, state selection, billing, co-teacher management, profile.",
      tags: ["Admin"],
      color: "#5B8DEF",
    },
  ],
  coTeacher: [
    {
      path: "/schedule",
      label: "Teaching Schedule",
      icon: "📅",
      description: "Co-teacher's primary view. See assigned lessons, mark complete. Filtered to their assigned kids only.",
      tags: ["Co-Teacher"],
      color: "#E8724A",
    },
    {
      path: "/resources",
      label: "Resources",
      icon: "🎓",
      description: "Teaching styles, deload, reference materials. Read-only access.",
      tags: ["Co-Teacher"],
      color: "#E8724A",
    },
  ],
};

const tagColors = {
  Auth: { bg: "#EDE7F6", text: "#4527A0" },
  Admin: { bg: "#E3F2FD", text: "#1565C0" },
  "Co-Teacher": { bg: "#FCE4EC", text: "#880E4F" },
  Pro: { bg: "#FFF8E1", text: "#F57F17" },
};

const navStates = [
  {
    state: "Pre-Login",
    icon: "🔒",
    color: "#4CAF82",
    items: ["Logo", "Login", "Sign Up"],
    note: "No content visible before auth",
  },
  {
    state: "Admin",
    icon: "🏫",
    color: "#5B8DEF",
    items: ["Dashboard", "Schedule", "Lessons", "Kids", "Compliance", "Reports", "Resources", "Settings"],
    note: "Full access, all features by tier",
  },
  {
    state: "Co-Teacher",
    icon: "👩‍🏫",
    color: "#E8724A",
    items: ["Teaching Schedule", "Resources"],
    note: "Scoped to assigned kids only",
  },
];

const userJourneys = [
  {
    label: "New Admin",
    icon: "🆕",
    steps: ["/ Login", "/dashboard (onboarding checklist)", "/settings (school setup)", "/kids (add students)", "/lessons (create or generate)", "/schedule"],
  },
  {
    label: "Co-Teacher",
    icon: "📬",
    steps: ["Invite email received", "/ Sign up with invite code", "/schedule (direct landing)", "/resources (optional)"],
  },
  {
    label: "Returning Admin",
    icon: "🔄",
    steps: ["/ Login", "/dashboard", "→ any nav card"],
  },
];

function Tag({ label }) {
  const style = tagColors[label] || { bg: "#f0f0f0", text: "#333" };
  return (
    <span style={{
      background: style.bg, color: style.text,
      fontSize: "10px", fontWeight: 700,
      padding: "2px 7px", borderRadius: "20px",
      letterSpacing: "0.04em", textTransform: "uppercase",
    }}>
      {label}
    </span>
  );
}

function RouteCard({ route, selected, onClick }) {
  return (
    <div
      onClick={() => onClick(route)}
      style={{
        background: selected ? "#1a2744" : "#fff",
        border: `2px solid ${selected ? route.color : "#e8edf5"}`,
        borderRadius: "12px",
        padding: "14px 16px",
        cursor: "pointer",
        transition: "all 0.18s",
        boxShadow: selected ? `0 0 0 3px ${route.color}33` : "0 1px 4px #0001",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>{route.icon}</span>
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: 11,
          color: selected ? "#7eb8f7" : "#9aacbc", letterSpacing: "0.05em",
        }}>
          {route.path}
        </span>
      </div>
      <div style={{
        fontFamily: "'Fraunces', Georgia, serif", fontSize: 15,
        fontWeight: 600, color: selected ? "#fff" : "#1a2744", marginBottom: 6,
      }}>
        {route.label}
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {route.tags.map(t => <Tag key={t} label={t} />)}
      </div>
    </div>
  );
}

function SectionLabel({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
      <span style={{
        fontFamily: "'DM Mono', monospace", fontSize: 11,
        fontWeight: 500, color, letterSpacing: "0.1em", textTransform: "uppercase",
      }}>
        {label}
      </span>
    </div>
  );
}

export default function App() {
  const [selected, setSelected] = useState(null);
  const [activeNav, setActiveNav] = useState(1);
  const [activeTab, setActiveTab] = useState("structure");

  const handleClick = (route) => {
    setSelected(selected?.path === route.path && selected?.tags[0] === route.tags[0] ? null : route);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7fb", fontFamily: "'DM Sans', system-ui, sans-serif", padding: "32px 20px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: 980, margin: "0 auto 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            background: "#1a2744", borderRadius: 10, width: 36, height: 36,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>🏡</div>
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: "#1a2744", lineHeight: 1.1 }}>
              HomeschoolReady
            </div>
            <div style={{ fontSize: 12, color: "#7a90a8", letterSpacing: "0.04em" }}>
              Site Architecture — Everything post-login
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6 }}>
          {["structure", "nav", "journeys"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: activeTab === tab ? "#1a2744" : "#fff",
              color: activeTab === tab ? "#fff" : "#5a7080",
              border: `2px solid ${activeTab === tab ? "#1a2744" : "#e8edf5"}`,
              borderRadius: 8, padding: "7px 18px",
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
              cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s",
            }}>
              {tab === "structure" ? "🗺 Page Structure" : tab === "nav" ? "🔀 Nav States" : "🚶 User Journeys"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>

        {activeTab === "structure" && <>
          {/* Pre-auth */}
          <section>
            <SectionLabel color="#4CAF82" label="Entry Point — Pre-Login" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {routes.preAuth.map(r => <RouteCard key={r.path + r.tags[0]} route={r} selected={selected?.path === r.path && selected?.tags[0] === r.tags[0]} onClick={handleClick} />)}
            </div>
          </section>

          {/* Admin */}
          <section>
            <SectionLabel color="#5B8DEF" label="Admin Pages — Full Access" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {routes.admin.map(r => <RouteCard key={r.path + r.tags[0]} route={r} selected={selected?.path === r.path && selected?.tags[0] === r.tags[0]} onClick={handleClick} />)}
            </div>
          </section>

          {/* Co-Teacher */}
          <section>
            <SectionLabel color="#E8724A" label="Co-Teacher Pages — Scoped View" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {routes.coTeacher.map(r => <RouteCard key={r.path + r.tags[0]} route={r} selected={selected?.path === r.path && selected?.tags[0] === r.tags[0]} onClick={handleClick} />)}
            </div>
          </section>

          {/* Detail panel */}
          {selected && (
            <div style={{
              background: "#1a2744", borderRadius: 16, padding: "22px 26px",
              color: "#fff", display: "flex", gap: 20, alignItems: "flex-start",
            }}>
              <div style={{ fontSize: 36 }}>{selected.icon}</div>
              <div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#7eb8f7", marginBottom: 4 }}>{selected.path}</div>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{selected.label}</div>
                <p style={{ color: "#b8cce0", fontSize: 14, lineHeight: 1.6, margin: "0 0 12px" }}>{selected.description}</p>
                <div style={{ display: "flex", gap: 6 }}>
                  {selected.tags.map(t => <Tag key={t} label={t} />)}
                </div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div style={{
            background: "#fff", borderRadius: 12, padding: "14px 20px",
            display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
            border: "1px solid #e8edf5", fontSize: 11, color: "#9aacbc",
          }}>
            <span style={{ fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Tags:</span>
            {Object.keys(tagColors).map(tag => <Tag key={tag} label={tag} />)}
            <span style={{ marginLeft: "auto" }}>Click any card to see details</span>
          </div>
        </>}

        {activeTab === "nav" && (
          <section>
            <SectionLabel color="#9B6DFF" label="Nav — Three States" />
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {navStates.map((n, i) => (
                <div key={n.state} onClick={() => setActiveNav(i)} style={{
                  background: activeNav === i ? "#1a2744" : "#fff",
                  border: `2px solid ${activeNav === i ? n.color : "#e8edf5"}`,
                  borderRadius: 14, padding: "20px 22px", cursor: "pointer",
                  minWidth: 220, flex: 1, transition: "all 0.18s",
                  boxShadow: activeNav === i ? `0 0 0 3px ${n.color}33` : "0 1px 4px #0001",
                }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{n.icon}</div>
                  <div style={{
                    fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700,
                    color: activeNav === i ? "#fff" : "#1a2744", marginBottom: 4,
                  }}>{n.state}</div>
                  <div style={{ fontSize: 11, color: activeNav === i ? n.color : "#9aacbc", marginBottom: 14, fontStyle: "italic" }}>
                    {n.note}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {n.items.map(item => (
                      <div key={item} style={{
                        fontSize: 13, color: activeNav === i ? "#b8cce0" : "#5a7080",
                        display: "flex", alignItems: "center", gap: 8,
                        background: activeNav === i ? "#ffffff10" : "#f4f7fb",
                        padding: "6px 10px", borderRadius: 6,
                      }}>
                        <span style={{ color: n.color, fontSize: 8 }}>●</span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "journeys" && (
          <section>
            <SectionLabel color="#E8A838" label="User Journeys" />
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {userJourneys.map(j => (
                <div key={j.label} style={{
                  background: "#fff", borderRadius: 14, padding: "20px 24px",
                  border: "1px solid #e8edf5", boxShadow: "0 1px 4px #0001",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 22 }}>{j.icon}</span>
                    <span style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, color: "#1a2744" }}>{j.label}</span>
                  </div>
                  <div style={{ display: "flex", gap: 0, flexWrap: "wrap", alignItems: "center" }}>
                    {j.steps.map((step, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 8 }}>
                        <div style={{
                          background: "#1a2744", color: "#fff", borderRadius: 8,
                          padding: "6px 12px", fontSize: 12, fontFamily: "'DM Mono', monospace",
                          whiteSpace: "nowrap",
                        }}>
                          {step}
                        </div>
                        {i < j.steps.length - 1 && (
                          <span style={{ color: "#9aacbc", fontSize: 16, margin: "0 6px" }}>→</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
