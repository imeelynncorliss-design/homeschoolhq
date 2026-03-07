import { useState } from "react";

const C = {
  navDark:"#1E1060", purple:"#7C3AED", pink:"#EC4899", yellow:"#FBD24D",
  bg:"#F0EFFA", white:"#FFFFFF", textDark:"#1a1a2e", textMid:"#4B5563",
  textLight:"#9CA3AF", border:"#E5E7EB", purpleLight:"#EDE9FE",
  gradient:"linear-gradient(135deg, #6B21A8 0%, #9333EA 50%, #EC4899 100%)",
};

const SUPPORTED = {
  "North Carolina": {
    difficulty:"Moderate", diffColor:"#F59E0B",
    note:"NC is structured — but HomeschoolReady handles all of this automatically.",
    reqs:[
      {icon:"📋",label:"Notice of Intent",desc:"File annually with your local school district before Aug 1st or within 30 days of starting."},
      {icon:"📅",label:"180 Teaching Days",desc:"Required minimum per school year across all subjects."},
      {icon:"📚",label:"9 Core Subjects",desc:"English, math, science, social studies, health, PE, arts, foreign language, and computer skills."},
      {icon:"📊",label:"Annual Assessment",desc:"Nationally standardized test OR review by a certified teacher required each year."},
    ],
  },
  "Texas": {
    difficulty:"Easy", diffColor:"#10B981",
    note:"Texas is one of the most homeschool-friendly states. Very few requirements.",
    reqs:[
      {icon:"📋",label:"No Registration Required",desc:"Texas does not require you to notify anyone that you are homeschooling."},
      {icon:"📚",label:"Bona Fide Curriculum",desc:"Must cover reading, spelling, grammar, math, and good citizenship."},
      {icon:"📁",label:"No Testing Required",desc:"Texas does not require standardized testing or portfolio reviews."},
    ],
  },
  "Florida": {
    difficulty:"Moderate", diffColor:"#F59E0B",
    note:"Florida requires a portfolio — HomeschoolReady helps you build one automatically.",
    reqs:[
      {icon:"📋",label:"Notice of Intent",desc:"File with your county school superintendent within 30 days of starting."},
      {icon:"📅",label:"180 Teaching Days",desc:"Required minimum per school year."},
      {icon:"📊",label:"Annual Evaluation",desc:"Portfolio review OR standardized test OR licensed psychologist evaluation — your choice."},
      {icon:"📁",label:"Portfolio Required",desc:"Keep samples of work, log of educational activities, and materials used."},
    ],
  },
  "New York": {
    difficulty:"Strict", diffColor:"#EF4444",
    note:"New York has some of the strictest requirements. HomeschoolReady's compliance tools are essential here.",
    reqs:[
      {icon:"📋",label:"Annual IHIP",desc:"Submit an Individualized Home Instruction Plan to your school district by July 1st."},
      {icon:"📅",label:"900–990 Hours",desc:"Required minimum depending on grade level."},
      {icon:"📚",label:"10+ Subjects",desc:"Extensive required subject list including patriotism, civics, and fire/traffic safety."},
      {icon:"📊",label:"Quarterly Reports",desc:"Submit quarterly reports AND an annual assessment to your school district."},
    ],
  },
  "Pennsylvania": {
    difficulty:"Strict", diffColor:"#EF4444",
    note:"Pennsylvania is one of the strictest states — HomeschoolReady's compliance tools are built for this.",
    reqs:[
      {icon:"📋",label:"Annual Affidavit",desc:"File with your school district superintendent by Aug 1st each year."},
      {icon:"📅",label:"180 Teaching Days",desc:"With 900 hours at elementary and 990 hours at secondary level."},
      {icon:"📚",label:"Core Subjects",desc:"Extensive list including English, math, science, history, geography, art, music, health, and more."},
      {icon:"📊",label:"Portfolio Review",desc:"Annual evaluation by a licensed psychologist or certified teacher required."},
    ],
  },
  "Georgia": {
    difficulty:"Moderate", diffColor:"#F59E0B",
    note:"Georgia has clear requirements that are easy to track with HomeschoolReady.",
    reqs:[
      {icon:"📋",label:"Declaration of Intent",desc:"File annually with your local school superintendent by Sept 1st."},
      {icon:"📅",label:"180 Teaching Days",desc:"Required minimum, with 4.5 hours per day."},
      {icon:"📚",label:"Core Subjects",desc:"Reading, language arts, math, social studies, and science required."},
      {icon:"📊",label:"Annual Testing",desc:"Standardized test required every 3 years starting in 3rd grade."},
    ],
  },
  "Virginia": {
    difficulty:"Moderate", diffColor:"#F59E0B",
    note:"Virginia has clear annual requirements that HomeschoolReady tracks automatically.",
    reqs:[
      {icon:"📋",label:"Notice of Intent",desc:"File with your school division superintendent by Aug 15th each year."},
      {icon:"👨‍🏫",label:"Instructor Requirement",desc:"Teaching parent must have a high school diploma or GED, or meet other qualifications."},
      {icon:"📚",label:"Core Subjects",desc:"Curriculum must include math, science, English, and history."},
      {icon:"📊",label:"Annual Assessment",desc:"Standardized test, portfolio review, or other evidence of progress required annually."},
    ],
  },
  "Tennessee": {
    difficulty:"Easy", diffColor:"#10B981",
    note:"Tennessee is relatively homeschool-friendly with two clear paths to choose from.",
    reqs:[
      {icon:"📋",label:"Registration",desc:"Register with your local school district or a church-related school."},
      {icon:"📅",label:"180 Teaching Days",desc:"Required minimum per school year."},
      {icon:"📚",label:"Core Subjects",desc:"Reading, language arts, math, science, and social studies required."},
      {icon:"📊",label:"Annual Testing",desc:"Standardized test required in grades 5, 7, and 9 under the independent option."},
    ],
  },
  "California": {
    difficulty:"Moderate", diffColor:"#F59E0B",
    note:"California's PSA process sounds complex but HomeschoolReady walks you through it.",
    reqs:[
      {icon:"📋",label:"Private School Affidavit",desc:"File annually with the state between Oct 1–15. Registers your home as a private school."},
      {icon:"📅",label:"175 Teaching Days",desc:"Required minimum per school year."},
      {icon:"📚",label:"Core Subjects",desc:"English, math, social sciences, science, fine arts, health, and PE."},
      {icon:"👨‍🏫",label:"Instructor Qualification",desc:"Teaching parent must be 'capable of teaching' — no formal credential required."},
    ],
  },
  "Ohio": {
    difficulty:"Moderate", diffColor:"#F59E0B",
    note:"Ohio's requirements are straightforward and easy to manage with HomeschoolReady.",
    reqs:[
      {icon:"📋",label:"Annual Notification",desc:"File with your school district superintendent by the first day of school each year."},
      {icon:"📅",label:"900 Hours",desc:"Required minimum instructional hours per year."},
      {icon:"📚",label:"Core Subjects",desc:"Language arts, math, science, social studies, health, fine arts, and electives."},
      {icon:"📊",label:"Annual Assessment",desc:"Standardized test OR portfolio assessed by a certified teacher."},
    ],
  },
};

const ALL_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

const SUPPORTED_LIST = Object.keys(SUPPORTED);

function InfoBlurb({ text }) {
  return (
    <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:8, padding:"10px 14px", display:"flex", gap:8, alignItems:"flex-start" }}>
      <span style={{ fontSize:14, flexShrink:0 }}>💡</span>
      <p style={{ fontSize:12, color:"#78350F", lineHeight:1.6, margin:0 }}>{text}</p>
    </div>
  );
}

function DYKTooltip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position:"relative", display:"inline-block" }}>
      <button onClick={() => setOpen(!open)} style={{
        background: open ? C.yellow : "rgba(251,210,77,0.15)",
        border:`1.5px solid ${C.yellow}`, borderRadius:20, padding:"4px 12px",
        fontSize:11, fontWeight:700, color:C.navDark, cursor:"pointer",
        fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:5,
      }}>💡 Did you know?</button>
      {open && (
        <div style={{
          position:"absolute", top:36, left:0, zIndex:20,
          background:C.navDark, borderRadius:12, padding:"14px 16px",
          width:300, boxShadow:"0 8px 30px #0003", border:`1px solid ${C.yellow}44`,
        }}>
          <div style={{ position:"absolute", top:-6, left:16, width:12, height:12, background:C.navDark, transform:"rotate(45deg)", border:`1px solid ${C.yellow}44`, borderBottom:"none", borderRight:"none" }} />
          <p style={{ fontSize:13, color:"#E9D8FD", lineHeight:1.6, margin:0 }}>{text}</p>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [selected, setSelected]   = useState("");
  const [search, setSearch]       = useState("");
  const [confirmed, setConfirmed] = useState(false);
  // unsupported paths
  const [panel, setPanel]         = useState("main"); // main | notify | custom | remindme | done
  const [notifyEmail, setNotifyEmail] = useState("");
  const [remindEmail, setRemindEmail] = useState("");
  const [customReqs, setCustomReqs] = useState({ teachingDays:"", subjects:"", testing:"", noticeOfIntent:false, portfolio:false });
  const [extras, setExtras]       = useState([]);
  const [newExtra, setNewExtra]   = useState("");

  const isSupported   = SUPPORTED_LIST.includes(selected);
  const isUnsupported = selected && !isSupported;
  const stateData     = SUPPORTED[selected];

  const filtered = ALL_STATES.filter(s => s.toLowerCase().includes(search.toLowerCase()));

  function pickState(s) {
    setSelected(s); setSearch(""); setConfirmed(false); setPanel("main");
    setNotifyEmail(""); setRemindEmail("");
    setCustomReqs({ teachingDays:"", subjects:"", testing:"", noticeOfIntent:false, portfolio:false });
    setExtras([]); setNewExtra("");
  }

  function addExtra() {
    if (newExtra.trim()) { setExtras(p => [...p, newExtra.trim()]); setNewExtra(""); }
  }

  const canSaveCustom = customReqs.teachingDays || customReqs.subjects || customReqs.testing || customReqs.noticeOfIntent || customReqs.portfolio || extras.length > 0;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,700;0,800;1,700&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .si{padding:9px 14px;cursor:pointer;font-size:14px;border-radius:8px;display:flex;align-items:center;justify-content:space-between;transition:all 0.12s;}
        .si:hover{background:#EDE9FE;color:#7C3AED;}
        .bp{background:linear-gradient(135deg,#6B21A8 0%,#9333EA 50%,#EC4899 100%);color:#fff;border:none;border-radius:10px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;width:100%;box-shadow:0 4px 16px #9333EA33;}
        .bp:hover{opacity:0.92;transform:translateY(-1px);}
        .bp:disabled{opacity:0.35;cursor:not-allowed;transform:none;}
        .bg{background:transparent;color:#7C3AED;border:2px solid #7C3AED;border-radius:10px;padding:11px;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;width:100%;}
        .bg:hover{background:#EDE9FE;}
        .inp{width:100%;background:#F0EFFA;border:2px solid #E5E7EB;border-radius:10px;padding:12px 14px;font-size:14px;color:#1a1a2e;font-family:'DM Sans',sans-serif;outline:none;transition:border 0.15s;}
        .inp:focus{border-color:#7C3AED;}
        .rr{display:flex;gap:12px;align-items:flex-start;padding:11px 0;border-bottom:1px solid #F3F4F6;}
        .rr:last-child{border-bottom:none;}
      `}</style>

      {/* Nav */}
      <div style={{ background:`linear-gradient(135deg,${C.navDark} 0%,#4C1D95 60%,${C.purple} 100%)`, padding:"0 32px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ background:C.white, borderRadius:6, width:26, height:26, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>🏡</div>
          <span style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:700, color:C.white }}>Homeschool<span style={{ color:C.yellow }}>Ready</span></span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:12, color:"#C4B5FD" }}>Step 5 of 6 — Your State</span>
          <div style={{ width:100, height:5, background:"rgba(255,255,255,0.2)", borderRadius:3, overflow:"hidden" }}>
            <div style={{ height:"100%", width:"83%", background:C.yellow, borderRadius:3 }} />
          </div>
        </div>
      </div>

      {/* Layout */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"36px 20px", gap:24, maxWidth:880, margin:"0 auto" }}>

        {/* LEFT — selector */}
        <div style={{ width:280, flexShrink:0 }}>
          <div style={{ marginBottom:20 }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:C.purpleLight, borderRadius:20, padding:"4px 14px", fontSize:11, fontWeight:700, color:C.purple, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:12 }}>🗺️ Your State</div>
            <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:26, fontWeight:800, color:C.textDark, lineHeight:1.2, marginBottom:10 }}>Where do you homeschool?</h2>
            <DYKTooltip text="Every state has different homeschool laws — some require nothing at all, others require annual testing and portfolio reviews. Knowing your state's requirements upfront means you won't get a nasty surprise at the end of the year." />
          </div>

          {/* Search */}
          <div style={{ position:"relative", marginBottom:8 }}>
            <span style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", fontSize:13, color:C.textLight }}>🔍</span>
            <input className="inp" value={search} onChange={e => { setSearch(e.target.value); }} placeholder="Search your state..." style={{ paddingLeft:36, fontSize:14 }} />
          </div>

          {/* List */}
          <div style={{ background:C.white, borderRadius:14, border:`1px solid ${C.border}`, maxHeight:310, overflowY:"auto", padding:"6px" }}>
            {filtered.map(s => {
              const sup = SUPPORTED_LIST.includes(s);
              return (
                <div key={s} className="si" style={{ background: selected===s ? C.purpleLight : "transparent", color: selected===s ? C.purple : C.textDark, fontWeight: selected===s ? 700 : 400 }} onClick={() => pickState(s)}>
                  <span>{s}</span>
                  {sup && <span style={{ background:"#DCFCE7", color:"#166534", fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:10 }}>✓</span>}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:8, fontSize:11, color:C.textLight }}>
            <span style={{ background:"#DCFCE7", color:"#166534", borderRadius:10, padding:"2px 7px", fontWeight:700, fontSize:10 }}>✓</span>{" "}
            {SUPPORTED_LIST.length} of 50 states supported
          </div>
        </div>

        {/* RIGHT — dynamic panel */}
        <div style={{ flex:1, minWidth:0 }}>

          {/* Empty state */}
          {!selected && (
            <div style={{ background:C.white, borderRadius:20, padding:"40px 28px", border:`1px solid ${C.border}`, textAlign:"center" }}>
              <div style={{ fontSize:48, marginBottom:14 }}>🗺️</div>
              <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:700, color:C.textDark, marginBottom:10 }}>Select your state to see requirements</h3>
              <p style={{ fontSize:14, color:C.textMid, lineHeight:1.6, marginBottom:20 }}>We'll show you exactly what's required and set up your compliance tracking automatically.</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center" }}>
                {["Texas — Easy 🤠","North Carolina — Moderate","New York — Strict 🗽"].map(s => (
                  <span key={s} style={{ background:C.purpleLight, color:C.purple, borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:600 }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* ── SUPPORTED ── */}
          {isSupported && !confirmed && (
            <div style={{ background:C.white, borderRadius:20, overflow:"hidden", border:`1px solid ${C.border}`, animation:"slideUp 0.3s ease", boxShadow:"0 8px 32px #0001" }}>
              <div style={{ background:C.gradient, padding:"22px 26px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.7)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>✓ Fully Supported</div>
                    <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:24, fontWeight:800, color:C.white, marginBottom:4 }}>{selected}</h3>
                    <p style={{ fontSize:13, color:"rgba(255,255,255,0.8)", fontStyle:"italic" }}>{stateData.note}</p>
                  </div>
                  <div style={{ background:stateData.diffColor, color:"#fff", borderRadius:20, padding:"4px 14px", fontSize:12, fontWeight:700, flexShrink:0 }}>{stateData.difficulty}</div>
                </div>
              </div>
              <div style={{ padding:"20px 26px" }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.purple, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>What {selected} Requires</div>
                <div style={{ marginBottom:18 }}>
                  {stateData.reqs.map(r => (
                    <div key={r.label} className="rr">
                      <div style={{ width:34, height:34, background:C.purpleLight, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>{r.icon}</div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:C.textDark, marginBottom:2 }}>{r.label}</div>
                        <div style={{ fontSize:12, color:C.textMid, lineHeight:1.5 }}>{r.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background:"#ECFDF5", borderRadius:12, padding:"11px 14px", marginBottom:18, display:"flex", gap:10, alignItems:"center" }}>
                  <span style={{ fontSize:18 }}>🤖</span>
                  <div style={{ fontSize:13, color:"#166534", lineHeight:1.5 }}><strong>HomeschoolReady will auto-populate your compliance goals</strong> based on these requirements when you save.</div>
                </div>
                <button className="bp" onClick={() => setConfirmed(true)}>Set {selected} & auto-setup compliance →</button>
                <button className="bg" style={{ marginTop:10 }} onClick={() => setPanel("remindme")}>Skip — remind me later</button>
              </div>
            </div>
          )}

          {/* Supported confirmed */}
          {isSupported && confirmed && (
            <div style={{ background:C.white, borderRadius:20, padding:"36px 28px", border:`1px solid ${C.border}`, textAlign:"center", animation:"slideUp 0.3s ease" }}>
              <div style={{ fontSize:52, marginBottom:14 }}>✅</div>
              <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:24, fontWeight:800, color:C.textDark, marginBottom:10 }}>{selected} compliance ready!</h3>
              <p style={{ fontSize:14, color:C.textMid, lineHeight:1.7, marginBottom:20 }}>Compliance tracking is set up based on <strong>{selected}</strong>'s requirements. You'll see your goals on the dashboard.</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:24, textAlign:"left" }}>
                {stateData.reqs.map(r => (
                  <div key={r.label} style={{ display:"flex", alignItems:"center", gap:10, background:"#ECFDF5", borderRadius:10, padding:"9px 14px" }}>
                    <span style={{ color:"#10B981", fontWeight:700 }}>✓</span>
                    <span style={{ fontSize:13, color:"#166534", fontWeight:600 }}>{r.label}</span>
                    <span style={{ fontSize:11, color:"#4ADE80", marginLeft:"auto" }}>tracking enabled</span>
                  </div>
                ))}
              </div>
              <button className="bp">Continue to Dashboard →</button>
            </div>
          )}

          {/* ── UNSUPPORTED — main ── */}
          {isUnsupported && panel==="main" && (
            <div style={{ background:C.white, borderRadius:20, overflow:"hidden", border:`1px solid ${C.border}`, animation:"slideUp 0.3s ease", boxShadow:"0 8px 32px #0001" }}>
              <div style={{ background:"linear-gradient(135deg,#1E1060,#4C1D95)", padding:"20px 26px" }}>
                <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.6)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>Not yet available</div>
                <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:800, color:C.white, marginBottom:4 }}>{selected}</h3>
                <p style={{ fontSize:13, color:"#C4B5FD", lineHeight:1.5 }}>We're not in {selected} yet — but it's on our roadmap. Everything else in HomeschoolReady is ready to go.</p>
              </div>
              <div style={{ padding:"20px 26px" }}>
                <div style={{ background:C.purpleLight, borderRadius:12, padding:"13px 16px", marginBottom:18 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.textDark, marginBottom:8 }}>What you can still do right now:</div>
                  {["AI lesson generation","Teaching schedule & planning","Student progress tracking","Co-teacher collaboration","Transcript generation"].map(f => (
                    <div key={f} style={{ display:"flex", gap:8, alignItems:"center", fontSize:13, color:C.textMid, marginBottom:5 }}>
                      <span style={{ color:C.purple }}>✓</span>{f}
                    </div>
                  ))}
                </div>

                {/* Notify */}
                <div style={{ marginBottom:12 }}>
                  <label style={{ display:"block", fontSize:13, fontWeight:700, color:C.textDark, marginBottom:8 }}>📬 Notify me when {selected} launches</label>
                  <input className="inp" value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)} placeholder="your@email.com" style={{ marginBottom:10, fontSize:14 }} />
                  <button className="bp" disabled={!notifyEmail.includes("@")} onClick={() => setPanel("notified")}>Notify me when {selected} is ready</button>
                </div>

                <div style={{ display:"flex", alignItems:"center", gap:10, margin:"14px 0" }}>
                  <div style={{ flex:1, height:1, background:C.border }} />
                  <span style={{ fontSize:12, color:C.textLight, fontWeight:600 }}>OR</span>
                  <div style={{ flex:1, height:1, background:C.border }} />
                </div>

                {/* Custom entry */}
                <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:12, padding:"14px 16px", marginBottom:12 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#92400E", marginBottom:6 }}>📋 Add {selected}'s requirements yourself</div>
                  <p style={{ fontSize:12, color:"#78350F", lineHeight:1.6, marginBottom:10 }}>
                    You can enter them manually and we'll track your progress. Verify your state's laws at{" "}
                    <a href="https://hslda.org" target="_blank" rel="noopener noreferrer" style={{ color:C.purple, fontWeight:700 }}>HSLDA.org</a>{" "}
                    or your state's Dept of Education.
                  </p>
                  <button onClick={() => setPanel("custom")} style={{ background:C.yellow, border:"none", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:700, color:C.navDark, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                    Enter {selected}'s requirements →
                  </button>
                </div>

                <button className="bg" onClick={() => setPanel("remindme")}>Skip for now — remind me later</button>
              </div>
            </div>
          )}

          {/* Unsupported — notified */}
          {isUnsupported && panel==="notified" && (
            <div style={{ background:C.white, borderRadius:20, padding:"36px 28px", border:`1px solid ${C.border}`, textAlign:"center", animation:"slideUp 0.3s ease" }}>
              <div style={{ fontSize:52, marginBottom:14 }}>📬</div>
              <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:24, fontWeight:800, color:C.textDark, marginBottom:10 }}>You're on the list!</h3>
              <p style={{ fontSize:14, color:C.textMid, lineHeight:1.7, marginBottom:24 }}>We'll email you the moment <strong>{selected}</strong> compliance launches. Everything else in HomeschoolReady is ready to go now.</p>
              <button className="bp">Continue to Dashboard →</button>
            </div>
          )}

          {/* Unsupported — custom form */}
          {isUnsupported && panel==="custom" && (
            <div style={{ background:C.white, borderRadius:20, overflow:"hidden", border:`1px solid ${C.border}`, animation:"slideUp 0.3s ease", boxShadow:"0 8px 32px #0001" }}>
              <div style={{ background:"linear-gradient(135deg,#92400E,#D97706)", padding:"18px 26px" }}>
                <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.7)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>Custom Setup</div>
                <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:800, color:C.white, marginBottom:4 }}>{selected} — Enter Requirements</h3>
                <p style={{ fontSize:12, color:"rgba(255,255,255,0.8)" }}>
                  Not a legal advisor. Verify at{" "}
                  <a href="https://hslda.org" target="_blank" rel="noopener noreferrer" style={{ color:C.yellow, fontWeight:700 }}>HSLDA.org</a>{" "}
                  before relying on these.
                </p>
              </div>
              <div style={{ padding:"20px 26px", display:"flex", flexDirection:"column", gap:14 }}>

                {/* Teaching days */}
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <label style={{ fontSize:12, fontWeight:700, color:C.textDark }}>📅 Required teaching days per year</label>
                    <span style={{ background:"#FDE68A", border:"1px solid #F59E0B", borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700, color:"#92400E" }}>💡 Recommended</span>
                  </div>
                  <input className="inp" value={customReqs.teachingDays} onChange={e => setCustomReqs(r => ({...r, teachingDays:e.target.value}))} placeholder="e.g. 180 — most states require 150–180 days" style={{ fontSize:14 }} />
                  {!customReqs.teachingDays && <p style={{ fontSize:11, color:"#F59E0B", marginTop:5 }}>⚡ Teaching days drives your attendance tracking — strongly recommended.</p>}
                </div>

                {/* Subjects */}
                <div>
                  <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.textDark, marginBottom:6 }}>📚 Required subjects <span style={{ fontWeight:400, color:C.textLight }}>(comma separated)</span></label>
                  <input className="inp" value={customReqs.subjects} onChange={e => setCustomReqs(r => ({...r, subjects:e.target.value}))} placeholder="e.g. Math, English, Science, History" style={{ fontSize:14 }} />
                </div>

                {/* Testing */}
                <div>
                  <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.textDark, marginBottom:6 }}>📊 Assessment or testing requirement</label>
                  <input className="inp" value={customReqs.testing} onChange={e => setCustomReqs(r => ({...r, testing:e.target.value}))} placeholder="e.g. Annual standardized test in grades 3, 5, 8" style={{ fontSize:14 }} />
                </div>

                {/* Notice of Intent checkbox + blurb */}
                <div>
                  <div onClick={() => setCustomReqs(r => ({...r, noticeOfIntent:!r.noticeOfIntent}))} style={{ background:customReqs.noticeOfIntent ? C.purpleLight : C.bg, border:`2px solid ${customReqs.noticeOfIntent ? C.purple : C.border}`, borderRadius:10, padding:"11px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:10, marginBottom:8, transition:"all 0.15s" }}>
                    <div style={{ width:18, height:18, borderRadius:4, flexShrink:0, background:customReqs.noticeOfIntent ? C.purple : C.white, border:`2px solid ${customReqs.noticeOfIntent ? C.purple : C.border}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {customReqs.noticeOfIntent && <span style={{ color:C.white, fontSize:11, fontWeight:700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, color:customReqs.noticeOfIntent ? C.purple : C.textDark }}>📋 Notice of Intent required</span>
                    <span style={{ fontSize:11, color:C.textLight, marginLeft:"auto" }}>click to toggle</span>
                  </div>
                  <InfoBlurb text="A Notice of Intent (NOI) is a formal letter you send to your local school district or state education office to notify them you are homeschooling. Some states require this annually — others don't require it at all. Think of it as officially registering your homeschool each year." />
                </div>

                {/* Portfolio checkbox + blurb */}
                <div>
                  <div onClick={() => setCustomReqs(r => ({...r, portfolio:!r.portfolio}))} style={{ background:customReqs.portfolio ? C.purpleLight : C.bg, border:`2px solid ${customReqs.portfolio ? C.purple : C.border}`, borderRadius:10, padding:"11px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:10, marginBottom:8, transition:"all 0.15s" }}>
                    <div style={{ width:18, height:18, borderRadius:4, flexShrink:0, background:customReqs.portfolio ? C.purple : C.white, border:`2px solid ${customReqs.portfolio ? C.purple : C.border}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {customReqs.portfolio && <span style={{ color:C.white, fontSize:11, fontWeight:700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, color:customReqs.portfolio ? C.purple : C.textDark }}>📁 Portfolio required</span>
                    <span style={{ fontSize:11, color:C.textLight, marginLeft:"auto" }}>click to toggle</span>
                  </div>
                  <InfoBlurb text="A homeschool portfolio is a collection of your child's work throughout the year — writing samples, art, math worksheets, project photos, reading logs, and more. Some states require you to submit it for review by a certified teacher or school official to show educational progress." />
                </div>

                {/* Freeform extras */}
                <div>
                  <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.textDark, marginBottom:6 }}>➕ Any other requirements? <span style={{ fontWeight:400, color:C.textLight }}>(optional)</span></label>
                  <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                    <input className="inp" value={newExtra} onChange={e => setNewExtra(e.target.value)} onKeyDown={e => e.key==="Enter" && addExtra()} placeholder="e.g. Annual immunization records" style={{ fontSize:13 }} />
                    <button onClick={addExtra} style={{ background:C.purple, border:"none", borderRadius:8, padding:"0 16px", color:C.white, fontSize:20, cursor:"pointer", flexShrink:0 }}>+</button>
                  </div>
                  {extras.map((ex, i) => (
                    <div key={i} style={{ background:C.purpleLight, borderRadius:8, padding:"7px 12px", fontSize:12, color:C.purple, display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <span>📌 {ex}</span>
                      <span onClick={() => setExtras(p => p.filter((_,j) => j!==i))} style={{ cursor:"pointer", color:C.pink, fontWeight:700, fontSize:14 }}>✕</span>
                    </div>
                  ))}
                </div>

                <div style={{ display:"flex", gap:10 }}>
                  <button className="bp" style={{ flex:2 }} disabled={!canSaveCustom} onClick={() => setPanel("customdone")}>Save & start tracking {selected} →</button>
                  <button className="bg" style={{ flex:1 }} onClick={() => setPanel("main")}>← Back</button>
                </div>
              </div>
            </div>
          )}

          {/* Custom saved */}
          {isUnsupported && panel==="customdone" && (
            <div style={{ background:C.white, borderRadius:20, padding:"36px 28px", border:`1px solid ${C.border}`, textAlign:"center", animation:"slideUp 0.3s ease" }}>
              <div style={{ fontSize:52, marginBottom:14 }}>🎉</div>
              <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:24, fontWeight:800, color:C.textDark, marginBottom:10 }}>{selected} compliance set up!</h3>
              <p style={{ fontSize:14, color:C.textMid, lineHeight:1.7, marginBottom:16 }}>
                We'll track your progress against the requirements you entered. Remember to verify at{" "}
                <a href="https://hslda.org" target="_blank" rel="noopener noreferrer" style={{ color:C.purple, fontWeight:700 }}>HSLDA.org</a>.
              </p>
              <div style={{ background:C.bg, borderRadius:12, padding:"14px 16px", marginBottom:20, textAlign:"left" }}>
                {customReqs.teachingDays && <div style={{ fontSize:13, color:C.textMid, marginBottom:6 }}>📅 <strong>{customReqs.teachingDays}</strong> teaching days/year</div>}
                {customReqs.subjects && <div style={{ fontSize:13, color:C.textMid, marginBottom:6 }}>📚 {customReqs.subjects}</div>}
                {customReqs.testing && <div style={{ fontSize:13, color:C.textMid, marginBottom:6 }}>📊 {customReqs.testing}</div>}
                {customReqs.noticeOfIntent && <div style={{ fontSize:13, color:C.textMid, marginBottom:6 }}>📋 Notice of Intent — reminder set</div>}
                {customReqs.portfolio && <div style={{ fontSize:13, color:C.textMid, marginBottom:6 }}>📁 Portfolio — tracking enabled</div>}
                {extras.map((ex,i) => <div key={i} style={{ fontSize:13, color:C.textMid, marginBottom:6 }}>📌 {ex}</div>)}
                <div style={{ marginTop:8, fontSize:11, color:"#F59E0B", fontStyle:"italic" }}>⚠️ Self-reported requirements — HomeschoolReady does not verify legal accuracy.</div>
              </div>
              <button className="bp">Continue to Dashboard →</button>
            </div>
          )}

          {/* Remind me later */}
          {panel==="remindme" && (
            <div style={{ background:C.white, borderRadius:20, overflow:"hidden", border:`1px solid ${C.border}`, animation:"slideUp 0.3s ease", boxShadow:"0 8px 32px #0001" }}>
              <div style={{ background:"linear-gradient(135deg,#1E1060,#4C1D95)", padding:"20px 26px" }}>
                <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.6)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>No rush</div>
                <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:800, color:C.white, marginBottom:4 }}>We'll remind you to finish this</h3>
                <p style={{ fontSize:13, color:"#C4B5FD", lineHeight:1.5 }}>Compliance tracking is one of HomeschoolReady's most valuable features — we don't want you to miss it.</p>
              </div>
              <div style={{ padding:"20px 26px" }}>
                {/* Dashboard nudge preview */}
                <div style={{ marginBottom:18 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.textDark, marginBottom:8, letterSpacing:"0.04em", textTransform:"uppercase" }}>You'll see this on your dashboard:</div>
                  <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
                    <span style={{ fontSize:22 }}>⚠️</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#92400E", marginBottom:2 }}>Compliance tracking not set up yet</div>
                      <div style={{ fontSize:12, color:"#78350F" }}>Set up your state requirements so we can track your progress.</div>
                    </div>
                    <div style={{ background:C.yellow, borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:700, color:C.navDark, flexShrink:0 }}>Set up now →</div>
                  </div>
                </div>

                {/* Optional email reminder */}
                <div style={{ background:C.purpleLight, borderRadius:12, padding:"14px 16px", marginBottom:16 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.textDark, marginBottom:4 }}>Want an email reminder? <span style={{ fontWeight:400, color:C.textLight }}>(optional)</span></div>
                  <p style={{ fontSize:12, color:C.textMid, lineHeight:1.5, marginBottom:10 }}>One reminder in 3 days — no spam, one email only.</p>
                  <input className="inp" value={remindEmail} onChange={e => setRemindEmail(e.target.value)} placeholder="your@email.com (optional)" style={{ fontSize:13 }} />
                </div>

                <button className="bp" onClick={() => setPanel("remindset")}>Got it — go to my Dashboard</button>
                <button className="bg" style={{ marginTop:10 }} onClick={() => setPanel("main")}>← Actually, let me set it up now</button>
              </div>
            </div>
          )}

          {/* Remind set */}
          {panel==="remindset" && (
            <div style={{ background:C.white, borderRadius:20, padding:"36px 28px", border:`1px solid ${C.border}`, textAlign:"center", animation:"slideUp 0.3s ease" }}>
              <div style={{ fontSize:52, marginBottom:14 }}>👍</div>
              <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:24, fontWeight:800, color:C.textDark, marginBottom:10 }}>All set — we'll remind you</h3>
              <p style={{ fontSize:14, color:C.textMid, lineHeight:1.7, marginBottom:14 }}>
                You'll see a nudge on your dashboard to finish setting up compliance.
                {remindEmail && ` We'll also send a reminder to ${remindEmail} in 3 days.`}
              </p>
              <div style={{ background:C.purpleLight, borderRadius:12, padding:"11px 14px", marginBottom:22, fontSize:13, color:C.purple, lineHeight:1.5 }}>
                💡 Find it anytime under <strong>Dashboard → Complete your setup</strong> or <strong>Settings → School → Compliance</strong>
              </div>
              <button className="bp">Continue to Dashboard →</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
