import { useState } from "react";

const C = {
  navDark:"#1E1060", purple:"#7C3AED", pink:"#EC4899", yellow:"#FBD24D",
  bg:"#F0EFFA", white:"#FFFFFF", textDark:"#1a1a2e", textMid:"#4B5563",
  textLight:"#9CA3AF", border:"#E5E7EB", purpleLight:"#EDE9FE",
  g1:"linear-gradient(135deg,#6B21A8,#7C3AED)",
  g2:"linear-gradient(135deg,#7C3AED,#9333EA,#EC4899)",
  g3:"linear-gradient(135deg,#9333EA,#EC4899)",
  g4:"linear-gradient(135deg,#6B21A8,#C026D3)",
  gFull:"linear-gradient(135deg,#6B21A8 0%,#9333EA 50%,#EC4899 100%)",
};

const SCHOOL = { name:"The Johnson Academy", state:"North Carolina", style:"Charlotte Mason" };

const TODAY = [
  { subject:"Math",    title:"Fractions — Adding Unlike Denominators", kid:"Emma", done:true },
  { subject:"Science", title:"Life Cycles: Butterflies & Moths",        kid:"Emma", done:false },
  { subject:"Reading", title:"Charlotte's Web — Chapters 4 & 5",        kid:"Liam", done:false },
  { subject:"Math",    title:"Counting by 5s and 10s",                  kid:"Liam", done:true },
];

const COMPLIANCE = [
  { icon:"📋", label:"Notice of Intent",  done:true  },
  { icon:"📅", label:"180 Teaching Days", done:false },
  { icon:"📚", label:"9 Core Subjects",   done:false },
  { icon:"📊", label:"Annual Assessment", done:false },
];

const STYLES = [
  { id:"charlotte",  emoji:"🌿", name:"Charlotte Mason",     color:"#7C3AED", bg:C.purpleLight,
    tagline:"Learning through living — short lessons, big ideas, the great outdoors.",
    desc:"Short focused lessons, living books, nature study, and narration. Typically 15–20 minutes per lesson, keeping kids energized and curious.",
    strengths:["Short focused lessons","Builds love of reading","Lots of hands-on learning"],
    curricula:["Ambleside Online (free)","Simply Charlotte Mason","Gentle + Classical"],
  },
  { id:"traditional", emoji:"🏫", name:"Traditional",         color:"#6D28D9", bg:"#EDE9FE",
    tagline:"Structure gives you confidence — and your kids know what to expect.",
    desc:"Textbooks, workbooks, and scheduled lessons. Closest to a classroom experience — with the huge advantage of one-on-one attention.",
    strengths:["Clear daily structure","Easy to track progress","Familiar to new parents"],
    curricula:["Abeka","Saxon Math","Easy Peasy All-in-One (free)"],
  },
  { id:"eclectic",   emoji:"🎨", name:"Eclectic",            color:"#9333EA", bg:"#F5F3FF",
    tagline:"You take the best from everything — and make it your own.",
    desc:"Mix and match methods based on what works for each child and subject. The most common approach among experienced homeschool families.",
    strengths:["Maximum flexibility","Tailored to each child","Adapts as kids grow"],
    curricula:["Build Your Library","Teaching Textbooks","Khan Academy (free)"],
  },
  { id:"unschool",   emoji:"✨", name:"Unschooling",         color:"#A855F7", bg:"#F5F3FF",
    tagline:"Trust the learner. Follow the curiosity. Get out of the way.",
    desc:"Learning flows from the child's interests and daily life. Requires deep trust in the process and an abundance of rich experiences.",
    strengths:["Intrinsically motivated","No curriculum cost","Builds independent thinkers"],
    curricula:["Khan Academy (free)","Library + Real Life (free)","Brave Writer"],
  },
  { id:"classical",  emoji:"📜", name:"Classical",           color:"#EC4899", bg:"#FDF2F8",
    tagline:"Grammar, logic, rhetoric — teaching kids how to think, not what to think.",
    desc:"Three-stage learning aligned to child's development. Heavy on great books, Latin, and Socratic discussion.",
    strengths:["Trains critical thinking","Deep engagement with ideas","Strong writing foundation"],
    curricula:["Classical Conversations","The Well-Trained Mind","Memoria Press"],
  },
];

const CURRICULA = {
  charlotte:  [
    { name:"Ambleside Online",      type:"free", desc:"Free CM curriculum with curated living book lists and a structured year plan." },
    { name:"Simply Charlotte Mason",type:"paid", desc:"Practical guides and planners for implementing the CM method. Great for beginners." },
    { name:"Gentle + Classical",    type:"paid", desc:"Blends CM with classical elements. Beautiful books and a warm, unhurried pace." },
  ],
  traditional:[
    { name:"Abeka",                  type:"paid", desc:"Faith-based, fully structured K–12 curriculum with daily lesson plans and assessments." },
    { name:"Saxon Math",             type:"paid", desc:"Incremental math curriculum with a strong track record in homeschool families." },
    { name:"Easy Peasy All-in-One",  type:"free", desc:"A completely free online curriculum covering all core subjects K–8." },
  ],
  eclectic:   [
    { name:"Build Your Library",    type:"paid", desc:"Literature-based guides you layer over any resources you already have." },
    { name:"Teaching Textbooks",    type:"paid", desc:"Self-grading math with audio/visual lessons. Kids love the independence." },
    { name:"Khan Academy",          type:"free", desc:"Free world-class math, science, and more. Works for all styles as a supplement." },
  ],
  unschool:   [
    { name:"Khan Academy",          type:"free", desc:"Self-paced, child-led learning with zero pressure." },
    { name:"Library + Real Life",   type:"free", desc:"A library card, documentaries, and daily experiences often provide everything needed." },
    { name:"Brave Writer",          type:"paid", desc:"Child-led writing approach that celebrates each child's natural voice." },
  ],
  classical:  [
    { name:"Classical Conversations",type:"paid", desc:"Community-based classical program with weekly group learning." },
    { name:"The Well-Trained Mind",  type:"paid", desc:"The definitive guide to classical homeschooling by Susan Wise Bauer." },
    { name:"Memoria Press",          type:"paid", desc:"Traditional classical curriculum with Latin, logic, and great books." },
  ],
};

const COMPLIANCE_TERMS = [
  { term:"📋 Notice of Intent (NOI)", def:"A formal letter sent to your local school district to notify them you are homeschooling. Some states require this annually — others don't require it at all. Think of it as registering your homeschool each year." },
  { term:"📁 Portfolio",              def:"A collection of your child's work throughout the year — writing samples, art, worksheets, project photos, and reading logs. Some states require annual submission to a certified teacher to show educational progress." },
  { term:"📊 Annual Assessment",      def:"An evaluation of your child's progress. Can be a standardized test, portfolio review, or another approved method depending on your state." },
  { term:"📅 Instructional Days",     def:"The minimum number of days you must teach each year. Most states require 150–180 days. HomeschoolReady counts a teaching day when at least one lesson is marked complete." },
  { term:"🏫 Umbrella School",        def:"A private school that homeschool families can enroll in to satisfy legal requirements in certain states. The umbrella school holds official records and may provide accreditation." },
];

// ── Sidebar nav ───────────────────────────────────────────────────────────────
function Nav({ page, setPage }) {
  const items = [
    { id:"dashboard",  icon:"🏠", label:"Dashboard"  },
    { id:"schedule",   icon:"📅", label:"Schedule"   },
    { id:"lessons",    icon:"📚", label:"Lessons"    },
    { id:"kids",       icon:"👦", label:"Kids"       },
    { id:"compliance", icon:"✅", label:"Compliance" },
    { id:"resources",  icon:"💡", label:"Resources"  },
  ];
  return (
    <div style={{ background:"linear-gradient(160deg,#1E1060 0%,#4C1D95 40%,#7C3AED 80%,#C026D3 100%)", width:200, minHeight:"100vh", display:"flex", flexDirection:"column", flexShrink:0 }}>
      <div style={{ padding:"20px 18px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
          <div style={{ background:C.white, borderRadius:6, width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>🏡</div>
          <span style={{ fontFamily:"'Fraunces',serif", fontSize:15, fontWeight:700, color:C.white }}>Homeschool<span style={{ color:C.yellow }}>Ready</span></span>
        </div>
        <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:10, padding:"9px 12px" }}>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)", marginBottom:2 }}>Your school</div>
          <div style={{ fontSize:13, fontWeight:700, color:C.white }}>{SCHOOL.name}</div>
          <div style={{ fontSize:11, color:C.yellow }}>{SCHOOL.style}</div>
        </div>
      </div>
      <div style={{ flex:1 }}>
        {items.map(item => (
          <div key={item.id} onClick={() => setPage(item.id)} style={{
            display:"flex", alignItems:"center", gap:10, padding:"10px 18px",
            cursor:"pointer", transition:"all 0.15s",
            background: page===item.id ? "rgba(255,255,255,0.12)" : "transparent",
            borderLeft: page===item.id ? `3px solid ${C.yellow}` : "3px solid transparent",
          }}>
            <span style={{ fontSize:15 }}>{item.icon}</span>
            <span style={{ fontSize:13, fontWeight:page===item.id?700:400, color:page===item.id?C.white:"rgba(255,255,255,0.55)" }}>{item.label}</span>
          </div>
        ))}
      </div>
      <div style={{ padding:"14px 18px", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:30, height:30, borderRadius:"50%", background:C.gFull, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:C.white }}>JF</div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:C.white }}>Jennifer F.</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)" }}>Admin</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ setPage }) {
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const doneCount = TODAY.filter(l => l.done).length;

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"28px 30px", background:C.bg }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

      {/* Greeting header — gradient band */}
      <div style={{ background:C.gFull, borderRadius:16, padding:"22px 26px", marginBottom:22, boxShadow:"0 6px 24px #7C3AED33" }}>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)", marginBottom:4 }}>Good morning 👋</div>
        <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:26, fontWeight:800, color:C.white, marginBottom:6 }}>Welcome to {SCHOOL.name}</h1>
        <div style={{ display:"flex", alignItems:"center", gap:16, fontSize:13, color:"rgba(255,255,255,0.85)" }}>
          <span>📍 {SCHOOL.state}</span>
          <span>🎨 {SCHOOL.style}</span>
          <span>👦 2 students</span>
        </div>
      </div>

      {/* Compliance nudge */}
      {!nudgeDismissed && (
        <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:14, padding:"13px 18px", marginBottom:20, display:"flex", alignItems:"center", gap:12, animation:"fadeIn 0.3s ease" }}>
          <span style={{ fontSize:22, flexShrink:0 }}>⚠️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#92400E", marginBottom:2 }}>Annual assessment not yet scheduled</div>
            <div style={{ fontSize:12, color:"#78350F" }}>NC requires an annual assessment before your school year ends. Set a reminder so you don't miss the deadline.</div>
          </div>
          <button onClick={() => setPage("compliance")} style={{ background:C.yellow, border:"none", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:700, color:C.navDark, cursor:"pointer", flexShrink:0, fontFamily:"'DM Sans',sans-serif" }}>Set reminder →</button>
          <button onClick={() => setNudgeDismissed(true)} style={{ background:"none", border:"none", color:C.textLight, cursor:"pointer", fontSize:16, flexShrink:0 }}>✕</button>
        </div>
      )}

      {/* Stat cards — each with gradient */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>
        {[
          { icon:"📅", value:"47",              label:"Days logged",  sub:"of 180 required",    grad:C.g1 },
          { icon:"✅", value:`${doneCount}/${TODAY.length}`, label:"Done today",   sub:"lessons complete",   grad:C.g2 },
          { icon:"👦", value:"2",               label:"Students",    sub:"active this year",    grad:C.g3 },
          { icon:"📊", value:"6/9",             label:"Subjects",    sub:"covered this year",   grad:C.g4 },
        ].map(s => (
          <div key={s.label} style={{ background:s.grad, borderRadius:14, padding:"16px 18px", boxShadow:"0 4px 18px #7C3AED2A" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontSize:20 }}>{s.icon}</span>
              <span style={{ fontFamily:"'Fraunces',serif", fontSize:26, fontWeight:800, color:C.white }}>{s.value}</span>
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:C.white }}>{s.label}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:22 }}>

        {/* Today's lessons */}
        <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.border}`, overflow:"hidden" }}>
          <div style={{ background:C.gFull, padding:"13px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontFamily:"'Fraunces',serif", fontSize:15, fontWeight:700, color:C.white }}>Today's Lessons</span>
            <span onClick={() => setPage("schedule")} style={{ fontSize:12, color:C.yellow, fontWeight:700, cursor:"pointer" }}>View schedule →</span>
          </div>
          <div style={{ padding:"6px 18px 14px" }}>
            {TODAY.map((l,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 0", borderBottom:i<TODAY.length-1?`1px solid ${C.border}`:"none" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:l.done?C.purple:C.border, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.textDark, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.title}</div>
                  <div style={{ fontSize:11, color:C.textLight }}>{l.kid} · {l.subject}</div>
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:l.done?C.purple:C.textLight, flexShrink:0 }}>{l.done?"✓ Done":"Pending"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance snapshot */}
        <div style={{ background:C.white, borderRadius:16, border:`1px solid ${C.border}`, overflow:"hidden" }}>
          <div style={{ background:C.gFull, padding:"13px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontFamily:"'Fraunces',serif", fontSize:15, fontWeight:700, color:C.white }}>NC Compliance</span>
            <span onClick={() => setPage("compliance")} style={{ fontSize:12, color:C.yellow, fontWeight:700, cursor:"pointer" }}>Full view →</span>
          </div>
          <div style={{ padding:"14px 18px" }}>
            <div style={{ fontSize:12, color:C.textLight, marginBottom:10 }}>School year progress</div>
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:5 }}>
                <span style={{ fontWeight:600, color:C.textDark }}>📅 Teaching Days</span>
                <span style={{ color:C.textLight }}>47 / 180</span>
              </div>
              <div style={{ height:7, background:C.bg, borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${(47/180)*100}%`, background:C.gFull, borderRadius:4 }} />
              </div>
            </div>
            {COMPLIANCE.map(item => (
              <div key={item.label} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderTop:`1px solid ${C.border}` }}>
                <span style={{ fontSize:14 }}>{item.icon}</span>
                <span style={{ flex:1, fontSize:12, color:C.textMid }}>{item.label}</span>
                <span style={{ fontSize:12, fontWeight:700, color:item.done?C.purple:C.pink }}>{item.done?"✓ Done":"In progress"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Nav cards */}
      <div>
        <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:700, color:C.textDark, marginBottom:14 }}>Quick Access</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
          {[
            { icon:"📅", label:"Schedule",   desc:"View & manage teaching days",  page:"schedule",   grad:C.g1 },
            { icon:"📚", label:"Lessons",    desc:"Create and generate lessons",   page:"lessons",    grad:C.g2 },
            { icon:"👦", label:"Kids",       desc:"Student profiles & progress",   page:"kids",       grad:C.g3 },
            { icon:"✅", label:"Compliance", desc:"Track NC requirements",         page:"compliance", grad:C.g4 },
          ].map(card => (
            <div key={card.label} onClick={() => setPage(card.page)}
              style={{ background:C.white, borderRadius:14, padding:"18px 16px", border:`1px solid ${C.border}`, cursor:"pointer", transition:"all 0.18s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=C.purple; e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 8px 24px #7C3AED22"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}>
              <div style={{ width:42, height:42, background:card.grad, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, marginBottom:10, boxShadow:"0 3px 10px #7C3AED33" }}>{card.icon}</div>
              <div style={{ fontSize:14, fontWeight:700, color:C.textDark, marginBottom:3 }}>{card.label}</div>
              <div style={{ fontSize:11, color:C.textLight, lineHeight:1.4 }}>{card.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Resources ─────────────────────────────────────────────────────────────────
function Resources() {
  const [topic, setTopic]       = useState("styles");
  const [expanded, setExpanded] = useState("charlotte");
  const [currStyle, setCurrStyle] = useState("charlotte");

  const tabs = [
    { id:"styles",     icon:"🎨", label:"Teaching Styles"  },
    { id:"curriculum", icon:"📚", label:"Curriculum"       },
    { id:"compliance", icon:"✅", label:"Compliance Basics"},
  ];

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"28px 30px", background:C.bg }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>

      {/* Header */}
      <div style={{ background:C.gFull, borderRadius:16, padding:"22px 26px", marginBottom:22, boxShadow:"0 6px 24px #7C3AED33" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(255,255,255,0.2)", borderRadius:20, padding:"3px 12px", fontSize:10, fontWeight:700, color:C.white, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>💡 Resources</div>
        <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:26, fontWeight:800, color:C.white, marginBottom:4 }}>Your Homeschool Library</h1>
        <p style={{ fontSize:13, color:"rgba(255,255,255,0.8)" }}>Teaching styles, curriculum guides, and compliance basics — all in one place.</p>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:10, marginBottom:24 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTopic(t.id)} style={{
            display:"flex", alignItems:"center", gap:7, padding:"9px 18px",
            borderRadius:20, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
            fontSize:13, fontWeight:700, transition:"all 0.15s",
            background: topic===t.id ? C.gFull : C.white,
            color: topic===t.id ? C.white : C.textMid,
            border: topic===t.id ? "none" : `1px solid ${C.border}`,
            boxShadow: topic===t.id ? "0 4px 14px #7C3AED44" : "none",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* Teaching Styles */}
      {topic==="styles" && (
        <div style={{ animation:"fadeIn 0.3s ease" }}>
          <div style={{ background:C.purpleLight, borderRadius:12, padding:"11px 16px", marginBottom:18, fontSize:13, color:C.purple, lineHeight:1.5 }}>
            🎨 Your current style is <strong>{SCHOOL.style}</strong>. Explore others below — most families blend two styles over time.
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {STYLES.map(s => (
              <div key={s.id} style={{ background:C.white, borderRadius:14, border:`2px solid ${expanded===s.id?s.color:C.border}`, overflow:"hidden", transition:"border 0.2s" }}>
                <div onClick={() => setExpanded(expanded===s.id?null:s.id)} style={{ padding:"14px 18px", cursor:"pointer", display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:40, height:40, background:expanded===s.id?`linear-gradient(135deg,${s.color},#EC4899)`:s.bg, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, transition:"background 0.2s" }}>{s.emoji}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontFamily:"'Fraunces',serif", fontSize:15, fontWeight:700, color:C.textDark }}>{s.name}</span>
                      {s.name===SCHOOL.style && <span style={{ background:C.gFull, color:C.white, fontSize:9, fontWeight:700, padding:"2px 8px", borderRadius:10 }}>YOUR STYLE</span>}
                    </div>
                    <div style={{ fontSize:12, color:C.textLight, fontStyle:"italic" }}>"{s.tagline}"</div>
                  </div>
                  <span style={{ color:C.textLight, fontSize:16, transition:"transform 0.2s", display:"block", transform:expanded===s.id?"rotate(180deg)":"none" }}>▾</span>
                </div>
                {expanded===s.id && (
                  <div style={{ padding:"0 18px 18px", borderTop:`1px solid ${C.border}`, animation:"fadeIn 0.2s ease" }}>
                    <p style={{ fontSize:13, color:C.textMid, lineHeight:1.7, margin:"14px 0" }}>{s.desc}</p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
                      <div style={{ background:`linear-gradient(135deg,${s.color}18,${s.color}08)`, borderRadius:10, padding:"12px 14px", border:`1px solid ${s.color}22` }}>
                        <div style={{ fontSize:10, fontWeight:700, color:s.color, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8 }}>✦ Strengths</div>
                        {s.strengths.map(str => <div key={str} style={{ fontSize:12, color:C.textMid, marginBottom:4 }}>→ {str}</div>)}
                      </div>
                      <div style={{ background:C.bg, borderRadius:10, padding:"12px 14px" }}>
                        <div style={{ fontSize:10, fontWeight:700, color:C.purple, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8 }}>📚 Often paired with</div>
                        {s.curricula.map(c => <div key={c} style={{ fontSize:12, color:C.textMid, marginBottom:4 }}>→ {c}</div>)}
                      </div>
                    </div>
                    <button onClick={() => { setCurrStyle(s.id); setTopic("curriculum"); }} style={{ background:C.gFull, border:"none", borderRadius:8, padding:"8px 16px", fontSize:12, fontWeight:700, color:C.white, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", boxShadow:"0 3px 10px #7C3AED33" }}>
                      See {s.name} curriculum suggestions →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Curriculum */}
      {topic==="curriculum" && (
        <div style={{ animation:"fadeIn 0.3s ease" }}>
          <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
            {STYLES.map(s => (
              <button key={s.id} onClick={() => setCurrStyle(s.id)} style={{
                padding:"6px 14px", borderRadius:20, cursor:"pointer",
                fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:700,
                background: currStyle===s.id ? `linear-gradient(135deg,${s.color},#EC4899)` : C.white,
                color: currStyle===s.id ? C.white : C.textMid,
                border: currStyle===s.id ? "none" : `1px solid ${C.border}`,
                boxShadow: currStyle===s.id ? "0 3px 10px #7C3AED33" : "none",
              }}>{s.emoji} {s.name}</button>
            ))}
          </div>
          <div style={{ background:C.purpleLight, borderRadius:12, padding:"11px 16px", marginBottom:18, fontSize:13, color:C.purple }}>
            📚 Showing curricula for <strong>{STYLES.find(s=>s.id===currStyle)?.name}</strong>. These are curated suggestions — always research before purchasing.
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {(CURRICULA[currStyle]||[]).map(item => (
              <div key={item.name} style={{ background:C.white, borderRadius:14, padding:"16px 18px", border:`1px solid ${C.border}`, display:"flex", alignItems:"flex-start", gap:14 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                    <span style={{ fontFamily:"'Fraunces',serif", fontSize:15, fontWeight:700, color:C.textDark }}>{item.name}</span>
                    <span style={{ background:item.type==="free"?"#FEF9C3":C.purpleLight, color:item.type==="free"?C.navDark:C.purple, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:10 }}>
                      {item.type==="free"?"✓ Free":"Paid"}
                    </span>
                  </div>
                  <p style={{ fontSize:13, color:C.textMid, lineHeight:1.6, margin:0 }}>{item.desc}</p>
                </div>
                <button style={{ background:"none", border:`1.5px solid ${C.purple}`, borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:700, color:C.purple, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", flexShrink:0 }}>Learn more →</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance Basics */}
      {topic==="compliance" && (
        <div style={{ animation:"fadeIn 0.3s ease" }}>
          <div style={{ background:C.white, borderRadius:14, padding:"18px 20px", border:`1px solid ${C.border}`, marginBottom:14 }}>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:17, fontWeight:700, color:C.textDark, marginBottom:6 }}>What is homeschool compliance?</div>
            <p style={{ fontSize:13, color:C.textMid, lineHeight:1.7, margin:0 }}>Every state has different laws governing homeschooling — some require almost nothing, others require annual filings, testing, and portfolio reviews. Compliance means meeting your state's specific requirements each year. HomeschoolReady tracks all of this automatically once your state is set up.</p>
          </div>
          {COMPLIANCE_TERMS.map(item => (
            <div key={item.term} style={{ background:C.white, borderRadius:14, padding:"15px 18px", border:`1px solid ${C.border}`, marginBottom:10 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.textDark, marginBottom:5 }}>{item.term}</div>
              <p style={{ fontSize:13, color:C.textMid, lineHeight:1.6, margin:0 }}>{item.def}</p>
            </div>
          ))}
          <div style={{ background:C.purpleLight, borderRadius:12, padding:"12px 16px", fontSize:13, color:C.purple, lineHeight:1.5 }}>
            💡 HomeschoolReady is not a legal advisor. Always verify requirements at{" "}
            <a href="https://hslda.org" target="_blank" rel="noopener noreferrer" style={{ color:C.purple, fontWeight:700 }}>HSLDA.org</a>{" "}
            or your state's Department of Education.
          </div>
        </div>
      )}
    </div>
  );
}

function Placeholder({ icon, label }) {
  return (
    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:C.bg }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:52, marginBottom:14 }}>{icon}</div>
        <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:700, color:C.textDark, marginBottom:6 }}>{label}</div>
        <div style={{ fontSize:14, color:C.textLight }}>This page is built — not in scope for this mockup.</div>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("dashboard");
  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,700;0,800;1,700&family=DM+Sans:wght@400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <Nav page={page} setPage={setPage} />
      {page==="dashboard"  && <Dashboard setPage={setPage} />}
      {page==="resources"  && <Resources />}
      {page==="schedule"   && <Placeholder icon="📅" label="Teaching Schedule" />}
      {page==="lessons"    && <Placeholder icon="📚" label="Lessons" />}
      {page==="kids"       && <Placeholder icon="👦" label="Kids" />}
      {page==="compliance" && <Placeholder icon="✅" label="Compliance Tracker" />}
    </div>
  );
}
