import { useState } from "react";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const C = {
  navDark:     "#1E1060",
  purple:      "#7C3AED",
  purpleMid:   "#9333EA",
  pink:        "#EC4899",
  yellow:      "#FBD24D",
  bg:          "#F0EFFA",
  white:       "#FFFFFF",
  textDark:    "#1a1a2e",
  textMid:     "#4B5563",
  textLight:   "#9CA3AF",
  border:      "#E5E7EB",
  purpleLight: "#EDE9FE",
  gradient:    "linear-gradient(135deg, #6B21A8 0%, #9333EA 50%, #EC4899 100%)",
};

// ── Steps ─────────────────────────────────────────────────────────────────────
const STEPS = ["school", "quiz", "result", "curriculum", "child", "done"];
const STEP_LABELS = ["Your School", "Teaching Style", "Your Result", "Curriculum", "Your Child", "All Set!"];

// ── Quiz data ─────────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    id: "schedule", emoji: "🗓️",
    question: "How do you picture your school day?",
    tooltip: { label: "Did you know?", text: "Homeschool families are not required to follow a 9–3 school schedule. Many families teach in as little as 2–3 focused hours a day — and kids often retain more because of it." },
    answers: [
      { id: "traditional", text: "Set times for each subject, like a school schedule", emoji: "📋" },
      { id: "eclectic",    text: "A loose plan with room to go deeper when curiosity strikes", emoji: "🌿" },
      { id: "charlotte",  text: "Short focused sessions spread across the day", emoji: "⏱️" },
      { id: "unschool",   text: "Honestly, I have no idea yet — and that's okay", emoji: "🤷" },
    ],
  },
  {
    id: "materials", emoji: "📚",
    question: "When you imagine teaching, what does it look like?",
    tooltip: { label: "Did you know?", text: "You don't need to buy a full curriculum to start. Many successful homeschool families mix library books, online videos, hands-on projects, and real-world experiences." },
    answers: [
      { id: "traditional", text: "Textbooks, workbooks, and clear structure", emoji: "📘" },
      { id: "eclectic",    text: "A mix of books, projects, and real-world experiences", emoji: "🎨" },
      { id: "charlotte",  text: "Living books, nature study, and hands-on learning", emoji: "🌱" },
      { id: "unschool",   text: "Whatever keeps them engaged that day", emoji: "✨" },
    ],
  },
  {
    id: "progress", emoji: "📈",
    question: "How do you want to know your child is learning?",
    tooltip: { label: "Did you know?", text: "Most states don't require formal grades or standardized tests for homeschoolers. You get to define what 'progress' means for your child." },
    answers: [
      { id: "traditional", text: "Tests and grades — I want clear benchmarks", emoji: "✅" },
      { id: "eclectic",    text: "A mix depending on the subject and the kid", emoji: "⚖️" },
      { id: "charlotte",  text: "A portfolio of their work, art, and projects", emoji: "📁" },
      { id: "unschool",   text: "Conversations — I'll know by how they talk about it", emoji: "💬" },
    ],
  },
];

// ── Style results ─────────────────────────────────────────────────────────────
const STYLES = {
  traditional: {
    name: "Traditional / School-at-Home", emoji: "🏫", color: "#3B82F6", bg: "#EFF6FF",
    tagline: "Structure gives you confidence — and your kids know what to expect.",
    description: "You value clear expectations, measurable progress, and a familiar rhythm. Traditional homeschooling uses textbooks, workbooks, and scheduled lessons — with the huge advantage of one-on-one attention.",
    strengths: ["Clear daily structure", "Easy to track progress", "Familiar to new parents"],
  },
  charlotte: {
    name: "Charlotte Mason", emoji: "🌿", color: "#10B981", bg: "#ECFDF5",
    tagline: "Learning through living — short lessons, big ideas, and the great outdoors.",
    description: "Charlotte Mason believed children learn best through 'living books', nature study, and short focused lessons. Sessions are typically 15–20 minutes, which keeps kids energized and curious.",
    strengths: ["Short focused lessons", "Builds a love of reading", "Lots of hands-on learning"],
  },
  eclectic: {
    name: "Eclectic", emoji: "🎨", color: "#F59E0B", bg: "#FFFBEB",
    tagline: "You take the best from everything — and make it your own.",
    description: "Eclectic homeschoolers mix and match methods based on what works for each child and subject. This is the most common approach among experienced homeschool families.",
    strengths: ["Maximum flexibility", "Tailored to each child", "Adapts as kids grow"],
  },
  unschool: {
    name: "Unschooling / Child-Led", emoji: "✨", color: "#8B5CF6", bg: "#F5F3FF",
    tagline: "Trust the learner. Follow the curiosity. Get out of the way.",
    description: "Unschooling flows from the child's natural interests and daily life. It requires deep trust in the process and an abundance of rich experiences.",
    strengths: ["Deeply intrinsically motivated", "No curriculum cost", "Builds independent thinkers"],
  },
};

// ── Curriculum data ───────────────────────────────────────────────────────────
const CURRICULA = {
  traditional: [
    { name: "Abeka", type: "paid", desc: "Comprehensive K–12 curriculum with structured daily lessons and assessments.", url: "#", featured: false },
    { name: "Saxon Math", type: "paid", desc: "Incremental math curriculum used in thousands of homeschool families. Highly structured.", url: "#", featured: false },
    { name: "Easy Peasy All-in-One", type: "free", desc: "A complete free online curriculum covering all subjects, K–8. No materials needed.", url: "#", featured: false },
  ],
  charlotte: [
    { name: "Ambleside Online", type: "free", desc: "A free Charlotte Mason curriculum with curated living books and a structured year plan.", url: "#", featured: false },
    { name: "Simply Charlotte Mason", type: "paid", desc: "Practical CM guides, planners, and resources. Great for beginners to the method.", url: "#", featured: false },
    { name: "Gentle + Classical", type: "paid", desc: "Combines Charlotte Mason with classical elements. Beautiful books and narration focus.", url: "#", featured: false },
  ],
  eclectic: [
    { name: "Build Your Library", type: "paid", desc: "Literature-based, secular curriculum guides you can mix with any other resources.", url: "#", featured: false },
    { name: "Khan Academy", type: "free", desc: "Free, world-class math and science instruction. Perfect as a standalone or supplement.", url: "#", featured: false },
    { name: "Teaching Textbooks", type: "paid", desc: "Self-grading math curriculum with audio/visual lessons. Kids often love the independence.", url: "#", featured: false },
  ],
  unschool: [
    { name: "Khan Academy", type: "free", desc: "Self-paced, child-led learning across math, science, and more. Zero pressure.", url: "#", featured: false },
    { name: "Library + Real Life", type: "free", desc: "Many unschoolers find the library, documentaries, and daily experiences are enough.", url: "#", featured: false },
    { name: "Brave Writer", type: "paid", desc: "A child-led approach to writing and language arts. Celebrates each child's voice.", url: "#", featured: false },
  ],
};

const GRADE_OPTIONS = ["Pre-K", "Kindergarten", "1st Grade", "2nd Grade", "3rd Grade", "4th Grade", "5th Grade", "6th Grade", "7th Grade", "8th Grade", "9th Grade", "10th Grade", "11th Grade", "12th Grade"];

// ── Curriculum detail data (for modal) ───────────────────────────────────────
const CURR_DETAIL = {
  "Abeka": {
    cost: "~$150–$600/yr depending on grade",
    bestFor: ["Traditional", "Structured learners", "Parents who want everything planned"],
    notIdealFor: "Families wanting flexibility or a child-led approach",
    overview: "Abeka is a faith-based, fully structured K–12 curriculum with daily lesson plans, workbooks, and assessments. It mirrors a traditional classroom closely — comfortable for parents new to homeschooling who want clear guidance.",
    website: "abeka.com",
  },
  "Saxon Math": {
    cost: "~$60–$100 per level",
    bestFor: ["Math-focused families", "Kids who need repetition", "Traditional & Eclectic styles"],
    notIdealFor: "Families who prefer project-based or conceptual math",
    overview: "Saxon uses an incremental approach — new concepts introduced in small steps and reviewed continuously. One of the most widely used homeschool math programs with a long track record.",
    website: "saxonmath.com",
  },
  "Easy Peasy All-in-One": {
    cost: "Free",
    bestFor: ["Families on a budget", "K–8 grades", "Parents who want a complete ready-made plan"],
    notIdealFor: "High schoolers needing accredited transcripts",
    overview: "A completely free online curriculum covering all core subjects K–8. Lessons are short and self-directed. An incredible value — especially for families just starting out.",
    website: "allinonehomeschool.com",
  },
  "Ambleside Online": {
    cost: "Free",
    bestFor: ["Charlotte Mason families", "Literature-rich learning", "Families who love living books"],
    notIdealFor: "Parents wanting a highly structured, test-based approach",
    overview: "A free, volunteer-run Charlotte Mason curriculum with carefully curated book lists and a structured year plan. One of the most respected CM resources, refined by a large community over many years.",
    website: "amblesideonline.org",
  },
  "Simply Charlotte Mason": {
    cost: "~$15–$100 for guides and planners",
    bestFor: ["Charlotte Mason beginners", "Practical CM guidance", "K–12"],
    notIdealFor: "Families who want a fully secular curriculum",
    overview: "Practical guides, book lists, and planning resources to help families implement the Charlotte Mason method. Their website is also a goldmine of free articles explaining the approach.",
    website: "simplycharlottemason.com",
  },
  "Gentle + Classical": {
    cost: "~$25–$75/yr",
    bestFor: ["Blending CM with classical elements", "Literature and narration focus"],
    notIdealFor: "Families wanting heavy math or science focus",
    overview: "Combines Charlotte Mason's living books approach with classical structure. Strong on language arts, history, and narration. Beautiful books and a warm, unhurried pace.",
    website: "gentleandclassical.com",
  },
  "Build Your Library": {
    cost: "~$35–$75 per level guide",
    bestFor: ["Eclectic families", "Literature-based secular learning", "Mixing resources"],
    notIdealFor: "Families wanting a complete all-in-one solution",
    overview: "Literature-based curriculum guides you layer over any resources you already have. Secular and flexible — you bring the books, they bring the structure.",
    website: "buildyourlibrary.com",
  },
  "Khan Academy": {
    cost: "Free",
    bestFor: ["All styles as a supplement", "Math and science", "Self-directed learners"],
    notIdealFor: "Replacing a full curriculum on its own for younger kids",
    overview: "A free, world-class platform covering math, science, history and more. Used by millions of homeschoolers as both a primary resource and supplement. Mastery-based — kids move at their own pace.",
    website: "khanacademy.org",
  },
  "Teaching Textbooks": {
    cost: "~$30–$55/yr per subject",
    bestFor: ["Math focus", "Independent learners", "Eclectic & Traditional styles"],
    notIdealFor: "Families wanting an all-subjects curriculum",
    overview: "A beloved homeschool math program with audio/visual lessons and automatic grading. Kids often love the independence — and parents love that it largely teaches itself.",
    website: "teachingtextbooks.com",
  },
  "Library + Real Life": {
    cost: "Free (library card)",
    bestFor: ["Unschoolers", "Child-led learners", "Naturally curious kids"],
    notIdealFor: "Families needing formal records or structured progression",
    overview: "Many unschooling families find that a library card, documentaries, real-world experiences, and following curiosity provide a richer education than any packaged curriculum.",
    website: "Your local library",
  },
  "Brave Writer": {
    cost: "~$15–$200 depending on products",
    bestFor: ["Unschoolers", "Writing & language arts focus", "Families who hate forcing writing"],
    notIdealFor: "Families wanting heavy grammar drills or formal writing instruction",
    overview: "Built on the belief that writing flows from a child's natural voice. Warm, literature-rich, and deeply respectful of each child's perspective. A favorite among unschooling and eclectic families.",
    website: "bravewriter.com",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getResult(answers) {
  const counts = {};
  Object.values(answers).forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "eclectic";
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Tooltip({ data }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen(!open)} style={{
        background: open ? C.yellow : "rgba(251,210,77,0.15)",
        border: `1.5px solid ${C.yellow}`, borderRadius: 20, padding: "4px 12px",
        fontSize: 11, fontWeight: 700, color: C.navDark, cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 5,
        transition: "all 0.2s",
      }}>
        <span>💡</span> {data.label}
      </button>
      {open && (
        <div style={{
          position: "absolute", top: 36, left: 0, zIndex: 20,
          background: C.navDark, borderRadius: 12, padding: "14px 16px",
          width: 280, boxShadow: "0 8px 30px #0003",
          border: `1px solid ${C.yellow}44`, animation: "fadeIn 0.15s ease",
        }}>
          <div style={{
            position: "absolute", top: -6, left: 16, width: 12, height: 12,
            background: C.navDark, transform: "rotate(45deg)",
            border: `1px solid ${C.yellow}44`, borderBottom: "none", borderRight: "none",
          }} />
          <p style={{ fontSize: 13, color: "#E9D8FD", lineHeight: 1.6, margin: 0 }}>{data.text}</p>
        </div>
      )}
    </div>
  );
}

function ProgressBar({ currentStep }) {
  const idx = STEPS.indexOf(currentStep);
  return (
    <div style={{
      background: "rgba(255,255,255,0.1)",
      padding: "10px 32px",
      display: "flex", alignItems: "center", gap: 0,
    }}>
      {STEP_LABELS.map((label, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", flex: i < STEP_LABELS.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: done ? C.yellow : active ? C.white : "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700,
                color: done ? C.navDark : active ? C.purple : "rgba(255,255,255,0.5)",
                border: active ? `2px solid ${C.yellow}` : "none",
                transition: "all 0.3s",
                flexShrink: 0,
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{
                fontSize: 9, fontWeight: active ? 700 : 400,
                color: active ? C.yellow : done ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)",
                whiteSpace: "nowrap", letterSpacing: "0.03em",
              }}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: "0 4px", marginBottom: 14,
                background: done ? C.yellow : "rgba(255,255,255,0.2)",
                transition: "background 0.3s",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CurriculumModal({ item, onClose, onSave, saved }) {
  const detail = CURR_DETAIL[item.name] || {};
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(30,16,96,0.6)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, animation: "fadeIn 0.2s ease",
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.white, borderRadius: 20, maxWidth: 520, width: "100%",
          boxShadow: "0 24px 80px #1E106066", overflow: "hidden",
          animation: "slideUp 0.25s ease",
        }}
      >
        {/* Modal header */}
        <div style={{ background: C.gradient, padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.2)", borderRadius: 20,
                padding: "3px 10px", fontSize: 10, fontWeight: 700,
                color: C.white, letterSpacing: "0.06em", textTransform: "uppercase",
                marginBottom: 10,
              }}>
                {item.type === "free" ? "✓ Free" : "💳 Paid"}
              </div>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 800, color: C.white, marginBottom: 4 }}>
                {item.name}
              </h3>
              {detail.cost && (
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>💰 {detail.cost}</div>
              )}
            </div>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.2)", border: "none",
              borderRadius: "50%", width: 32, height: 32,
              color: C.white, fontSize: 16, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>✕</button>
          </div>
        </div>

        {/* Modal body */}
        <div style={{ padding: "24px 28px" }}>
          <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.7, marginBottom: 20 }}>
            {detail.overview || item.desc}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            {/* Best for */}
            <div style={{ background: "#ECFDF5", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                ✓ Best for
              </div>
              {(detail.bestFor || []).map(b => (
                <div key={b} style={{ fontSize: 12, color: "#374151", marginBottom: 5, display: "flex", gap: 6 }}>
                  <span style={{ color: "#10B981" }}>→</span>{b}
                </div>
              ))}
            </div>

            {/* Not ideal for */}
            <div style={{ background: "#FFF7ED", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#92400E", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                ⚠ Consider if
              </div>
              <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>
                {detail.notIdealFor || "May not suit all families"}
              </div>
            </div>
          </div>

          {/* Note about keeping momentum */}
          <div style={{
            background: C.purpleLight, borderRadius: 10, padding: "10px 14px",
            fontSize: 12, color: C.purple, marginBottom: 20, lineHeight: 1.5,
          }}>
            💡 You don't need to decide now — this will be saved in <strong>Resources → Teaching Styles</strong> for you to revisit anytime.
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => { onSave(item.name); onClose(); }}
              style={{
                flex: 2, background: saved ? "#ECFDF5" : C.gradient,
                color: saved ? "#166534" : C.white,
                border: saved ? "2px solid #10B981" : "none",
                borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
              }}
            >
              {saved ? "✓ Saved to Resources" : "Save to my Resources"}
            </button>
            <a
              href={`https://${detail.website}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1, background: C.white, color: C.purple,
                border: `2px solid ${C.purple}`, borderRadius: 10,
                padding: "12px", fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                textDecoration: "none", display: "flex",
                alignItems: "center", justifyContent: "center", gap: 4,
              }}
            >
              Visit site ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function CurriculumCard({ item, onLearnMore }) {
  return (
    <div style={{
      background: C.white, borderRadius: 14, padding: "18px 20px",
      border: `2px solid ${item.featured ? C.yellow : C.border}`,
      position: "relative", transition: "all 0.2s",
    }}>
      {item.featured && (
        <div style={{
          position: "absolute", top: -10, right: 14,
          background: C.yellow, color: C.navDark,
          fontSize: 9, fontWeight: 700, padding: "2px 10px",
          borderRadius: 10, letterSpacing: "0.06em", textTransform: "uppercase",
        }}>Featured Partner</div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8, gap: 10 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, color: C.textDark }}>
          {item.name}
        </div>
        <span style={{
          flexShrink: 0,
          background: item.type === "free" ? "#DCFCE7" : "#EDE9FE",
          color: item.type === "free" ? "#166534" : C.purple,
          fontSize: 10, fontWeight: 700, padding: "3px 10px",
          borderRadius: 20, letterSpacing: "0.05em", textTransform: "uppercase",
        }}>
          {item.type === "free" ? "✓ Free" : "Paid"}
        </span>
      </div>
      <p style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6, marginBottom: 14 }}>{item.desc}</p>
      <button
        onClick={() => onLearnMore(item)}
        style={{
          background: "none", border: `1.5px solid ${C.purple}`,
          borderRadius: 8, padding: "6px 14px", fontSize: 12,
          fontWeight: 700, color: C.purple, cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
        }}
      >
        Learn more →
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep]           = useState("school");
  const [schoolName, setSchoolName] = useState("");
  const [qIndex, setQIndex]       = useState(0);
  const [answers, setAnswers]     = useState({});
  const [result, setResult]       = useState(null);
  const [currChoice, setCurrChoice] = useState(null);
  const [curriculumName, setCurriculumName] = useState("");
  const [childName, setChildName] = useState("");
  const [childGrade, setChildGrade] = useState("");
  const [childNickname, setChildNickname] = useState("");
  const [modalItem, setModalItem] = useState(null);
  const [savedCurricula, setSavedCurricula] = useState([]);

  const currentQ = QUESTIONS[qIndex];
  const resultStyle = result ? STYLES[result] : null;
  const suggestedCurricula = result ? CURRICULA[result] : [];

  function handleAnswer(styleId) {
    const updated = { ...answers, [currentQ.id]: styleId };
    setAnswers(updated);
    if (qIndex < QUESTIONS.length - 1) {
      setQIndex(qIndex + 1);
    } else {
      setResult(getResult(updated));
      setStep("result");
    }
  }

  function handleSaveCurriculum(name) {
    setSavedCurricula(prev => prev.includes(name) ? prev : [...prev, name]);
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      {/* ── Curriculum modal ── */}
      {modalItem && (
        <CurriculumModal
          item={modalItem}
          onClose={() => setModalItem(null)}
          onSave={handleSaveCurriculum}
          saved={savedCurricula.includes(modalItem.name)}
        />
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,700;0,800;1,700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(6px);  } to { opacity: 1; transform: none; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
        .answer-card {
          background: #fff; border: 2px solid #E5E7EB; border-radius: 14px;
          padding: 16px 20px; cursor: pointer; transition: all 0.18s;
          display: flex; align-items: center; gap: 14px;
          animation: slideUp 0.3s ease both;
        }
        .answer-card:hover { border-color: #7C3AED; background: #EDE9FE; transform: translateX(4px); box-shadow: 0 4px 16px #7C3AED22; }
        .btn-primary {
          background: linear-gradient(135deg, #6B21A8 0%, #9333EA 50%, #EC4899 100%);
          color: #fff; border: none; border-radius: 10px; padding: 14px 28px;
          font-size: 15px; font-weight: 700; cursor: pointer;
          font-family: 'DM Sans', sans-serif; transition: all 0.2s;
          box-shadow: 0 4px 16px #9333EA33;
        }
        .btn-primary:hover { opacity: 0.92; transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }
        .btn-ghost {
          background: transparent; color: #7C3AED; border: 2px solid #7C3AED;
          border-radius: 10px; padding: 12px 24px; font-size: 14px; font-weight: 700;
          cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s;
        }
        .btn-ghost:hover { background: #EDE9FE; }
        .curr-choice:hover { border-color: #7C3AED !important; background: #EDE9FE !important; }
        input, select {
          width: 100%; background: #F0EFFA; border: 2px solid #E5E7EB;
          border-radius: 10px; padding: 13px 16px; font-size: 15px;
          color: #1a1a2e; font-family: 'DM Sans', sans-serif; outline: none;
          transition: border 0.15s; appearance: none;
        }
        input:focus, select:focus { border-color: #7C3AED; }
      `}</style>

      {/* ── Nav ── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navDark} 0%, #4C1D95 60%, ${C.purple} 100%)`,
        padding: "0 32px", height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: C.white, borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🏡</div>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, color: C.white }}>
            Homeschool<span style={{ color: C.yellow }}>Ready</span>
          </span>
        </div>
        {step === "quiz" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#C4B5FD" }}>Question {qIndex + 1} of {QUESTIONS.length}</span>
            <div style={{ width: 100, height: 5, background: "rgba(255,255,255,0.2)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 3, width: `${((qIndex + 1) / QUESTIONS.length) * 100}%`, background: C.yellow, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Progress stepper ── */}
      <ProgressBar currentStep={step} />

      {/* ── Content ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>

        {/* STEP 1 — School name */}
        {step === "school" && (
          <div style={{ maxWidth: 500, width: "100%", animation: "slideUp 0.4s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>🏡</div>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 34, fontWeight: 800, color: C.textDark, marginBottom: 10, lineHeight: 1.2 }}>
                Let's set up your school
              </h1>
              <p style={{ fontSize: 15, color: C.textMid, lineHeight: 1.6 }}>
                Every great homeschool starts with a name.
              </p>
            </div>
            <div style={{ background: C.white, borderRadius: 20, padding: "32px", boxShadow: "0 8px 40px #0001", border: `1px solid ${C.border}` }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.textDark, marginBottom: 8 }}>
                What would you like to call your homeschool?
              </label>
              <div style={{ marginBottom: 12 }}>
                <Tooltip data={{ label: "Did you know?", text: "Many states allow you to register as a private school under your own name. Giving your homeschool a name is often the first official step — and your kids will love having their own school identity!" }} />
              </div>
              <input value={schoolName} onChange={e => setSchoolName(e.target.value)} onKeyDown={e => e.key === "Enter" && schoolName.trim() && setStep("quiz")} placeholder="e.g. The Johnson Academy, Sunrise Learning Co..." style={{ marginBottom: 24 }} />
              <button className="btn-primary" style={{ width: "100%" }} onClick={() => setStep("quiz")} disabled={!schoolName.trim()}>
                Continue →
              </button>
              <p style={{ textAlign: "center", fontSize: 12, color: C.textLight, marginTop: 12 }}>You can always change this in Settings</p>
            </div>
          </div>
        )}

        {/* STEP 2 — Quiz */}
        {step === "quiz" && (
          <div style={{ maxWidth: 560, width: "100%", animation: "slideUp 0.3s ease" }} key={qIndex}>
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.purpleLight, borderRadius: 20, padding: "4px 14px", fontSize: 11, fontWeight: 700, color: C.purple, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>
                {currentQ.emoji} Question {qIndex + 1} of {QUESTIONS.length}
              </div>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 800, color: C.textDark, lineHeight: 1.3, marginBottom: 14 }}>
                {currentQ.question}
              </h2>
              <Tooltip data={currentQ.tooltip} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {currentQ.answers.map((ans, i) => (
                <div key={ans.id} className="answer-card" style={{ animationDelay: `${i * 0.07}s` }} onClick={() => handleAnswer(ans.id)}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: C.purpleLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{ans.emoji}</div>
                  <span style={{ fontSize: 15, color: C.textDark, fontWeight: 500, lineHeight: 1.4 }}>{ans.text}</span>
                  <span style={{ marginLeft: "auto", color: C.textLight, fontSize: 18, flexShrink: 0 }}>→</span>
                </div>
              ))}
            </div>
            {qIndex > 0 && (
              <button onClick={() => setQIndex(qIndex - 1)} style={{ background: "none", border: "none", color: C.textLight, fontSize: 13, cursor: "pointer", marginTop: 20, fontFamily: "'DM Sans', sans-serif" }}>
                ← Back
              </button>
            )}
          </div>
        )}

        {/* STEP 3 — Result */}
        {step === "result" && resultStyle && (
          <div style={{ maxWidth: 560, width: "100%", animation: "slideUp 0.4s ease" }}>
            <div style={{ background: C.white, borderRadius: 24, overflow: "hidden", boxShadow: "0 16px 60px #0002", border: `1px solid ${C.border}` }}>
              <div style={{ background: C.gradient, padding: "32px", textAlign: "center" }}>
                <div style={{ fontSize: 52, marginBottom: 8 }}>{resultStyle.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                  {schoolName} · Your teaching style
                </div>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 800, color: C.white, marginBottom: 10 }}>{resultStyle.name}</h2>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", fontStyle: "italic", lineHeight: 1.5 }}>"{resultStyle.tagline}"</p>
              </div>
              <div style={{ padding: "28px 32px" }}>
                <p style={{ fontSize: 15, color: C.textMid, lineHeight: 1.7, marginBottom: 20 }}>{resultStyle.description}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
                  {resultStyle.strengths.map(s => (
                    <span key={s} style={{ background: C.purpleLight, color: C.purple, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600 }}>✓ {s}</span>
                  ))}
                </div>
                <button className="btn-primary" style={{ width: "100%", marginBottom: 10 }} onClick={() => setStep("curriculum")}>
                  See curriculum suggestions →
                </button>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn-ghost" style={{ flex: 1, fontSize: 13, padding: "10px" }} onClick={() => { setQIndex(0); setAnswers({}); setStep("quiz"); }}>
                    Retake quiz
                  </button>
                  <button className="btn-ghost" style={{ flex: 1, fontSize: 13, padding: "10px" }} onClick={() => setStep("curriculum")}>
                    Skip for now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 — Curriculum */}
        {step === "curriculum" && (
          <div style={{ maxWidth: 620, width: "100%", animation: "slideUp 0.4s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 800, color: C.textDark, marginBottom: 10 }}>
                Do you have a curriculum?
              </h2>
              <p style={{ fontSize: 15, color: C.textMid, lineHeight: 1.6 }}>
                No pressure — many families start without one and figure it out as they go.
              </p>
            </div>

            {/* Three path choices */}
            {!currChoice && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                {[
                  { id: "yes", emoji: "✅", label: "Yes, I already have one", sub: "Tell us what you're using" },
                  { id: "no",  emoji: "🔍", label: "Not yet — show me suggestions", sub: `Based on your ${resultStyle?.name} style` },
                  { id: "skip", emoji: "⏭️", label: "I'll figure it out later", sub: "You can always add this in Resources" },
                ].map(choice => (
                  <div
                    key={choice.id}
                    className="curr-choice"
                    onClick={() => setCurrChoice(choice.id)}
                    style={{
                      background: C.white, border: `2px solid ${C.border}`, borderRadius: 14,
                      padding: "16px 20px", cursor: "pointer", transition: "all 0.18s",
                      display: "flex", alignItems: "center", gap: 16,
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{choice.emoji}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.textDark }}>{choice.label}</div>
                      <div style={{ fontSize: 12, color: C.textLight }}>{choice.sub}</div>
                    </div>
                    <span style={{ marginLeft: "auto", color: C.textLight, fontSize: 18 }}>→</span>
                  </div>
                ))}
              </div>
            )}

            {/* Path: Yes — enter curriculum name */}
            {currChoice === "yes" && (
              <div style={{ background: C.white, borderRadius: 16, padding: "28px", border: `1px solid ${C.border}`, animation: "fadeIn 0.2s ease", marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.textDark, marginBottom: 8 }}>
                  What curriculum are you using?
                </label>
                <input value={curriculumName} onChange={e => setCurriculumName(e.target.value)} placeholder="e.g. Abeka, Saxon Math, Ambleside Online..." style={{ marginBottom: 20 }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn-primary" style={{ flex: 2 }} onClick={() => setStep("child")} disabled={!curriculumName.trim()}>
                    Continue →
                  </button>
                  <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setCurrChoice(null)}>← Back</button>
                </div>
              </div>
            )}

            {/* Path: No — show suggestions */}
            {currChoice === "no" && (
              <div style={{ animation: "fadeIn 0.2s ease" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.purple, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>
                      Suggested for {resultStyle?.name}
                    </div>
                    <div style={{ fontSize: 12, color: C.textLight }}>Mix of free and paid — clearly labeled</div>
                  </div>
                  <button onClick={() => setCurrChoice(null)} style={{ background: "none", border: "none", color: C.textLight, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Change</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                  {suggestedCurricula.map(item => (
                    <CurriculumCard
                      key={item.name}
                      item={item}
                      onLearnMore={setModalItem}
                    />
                  ))}
                </div>
                <div style={{
                  background: C.purpleLight, borderRadius: 12, padding: "12px 16px",
                  fontSize: 13, color: C.purple, marginBottom: 20, lineHeight: 1.5,
                }}>
                  💡 You don't need to decide today. These suggestions will always be available in <strong>Resources → Teaching Styles</strong>.
                </div>
                <button className="btn-primary" style={{ width: "100%" }} onClick={() => setStep("child")}>
                  Continue without choosing →
                </button>
              </div>
            )}

            {/* Path: Skip */}
            {currChoice === "skip" && (
              <div style={{ textAlign: "center", animation: "fadeIn 0.2s ease", padding: "20px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👍</div>
                <p style={{ fontSize: 15, color: C.textMid, marginBottom: 24, lineHeight: 1.6 }}>
                  No problem at all. You can explore curriculum options anytime in <strong>Resources</strong>.
                </p>
                <button className="btn-primary" style={{ width: "100%" }} onClick={() => setStep("child")}>
                  Continue →
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 5 — Add first child */}
        {step === "child" && (
          <div style={{ maxWidth: 500, width: "100%", animation: "slideUp 0.4s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>👦</div>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 800, color: C.textDark, marginBottom: 10 }}>
                Now let's add your first student
              </h2>
              <p style={{ fontSize: 15, color: C.textMid, lineHeight: 1.6 }}>
                This is the heart of it all. You can add more kids after setup.
              </p>
            </div>

            <div style={{ background: C.white, borderRadius: 20, padding: "32px", boxShadow: "0 8px 40px #0001", border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.textDark, marginBottom: 8 }}>
                    Child's first name
                  </label>
                  <input value={childName} onChange={e => setChildName(e.target.value)} placeholder="e.g. Emma" />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.textDark, marginBottom: 8 }}>
                    Nickname (optional)
                    <span style={{ fontWeight: 400, color: C.textLight, marginLeft: 6 }}>— how you'd like to see them in the app</span>
                  </label>
                  <input value={childNickname} onChange={e => setChildNickname(e.target.value)} placeholder="e.g. Em, Bug, Buddy..." />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.textDark, marginBottom: 8 }}>
                    Current grade level
                  </label>
                  <div style={{ marginBottom: 8 }}>
                    <Tooltip data={{ label: "Did you know?", text: "In homeschooling, grade levels are flexible. Many families teach to their child's actual ability level rather than their age — so a 9-year-old might do 5th grade math and 3rd grade reading. You can always adjust this later." }} />
                  </div>
                  <select value={childGrade} onChange={e => setChildGrade(e.target.value)} style={{ background: C.bg }}>
                    <option value="">Select a grade...</option>
                    {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <button
                className="btn-primary"
                style={{ width: "100%", marginTop: 28 }}
                onClick={() => setStep("done")}
                disabled={!childName.trim() || !childGrade}
              >
                Add {childName || "student"} & continue →
              </button>
              <p style={{ textAlign: "center", fontSize: 12, color: C.textLight, marginTop: 12 }}>
                You can add more children after setup
              </p>
            </div>
          </div>
        )}

        {/* STEP 6 — Done */}
        {step === "done" && (
          <div style={{ maxWidth: 520, width: "100%", textAlign: "center", animation: "slideUp 0.5s ease" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 36, fontWeight: 800, color: C.textDark, marginBottom: 12, lineHeight: 1.2 }}>
              {schoolName} is ready!
            </h2>
            <p style={{ fontSize: 16, color: C.textMid, lineHeight: 1.7, marginBottom: 32 }}>
              You've set up <strong>{schoolName}</strong>, discovered your <strong>{resultStyle?.name}</strong> teaching style, and added <strong>{childName}</strong> as your first student. That's a great start.
            </p>

            <div style={{
              background: C.white, borderRadius: 16, padding: "20px 24px",
              border: `1px solid ${C.border}`, marginBottom: 28, textAlign: "left",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.purple, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
                Your setup summary
              </div>
              {[
                { icon: "🏡", label: "School", value: schoolName },
                { icon: "🎨", label: "Teaching style", value: resultStyle?.name },
                { icon: "👦", label: "First student", value: `${childName}${childNickname ? ` (${childNickname})` : ""} · ${childGrade}` },
                { icon: "📚", label: "Curriculum", value: curriculumName || (currChoice === "skip" ? "To be decided" : "Exploring options") },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, fontSize: 14 }}>
                  <span style={{ fontSize: 18 }}>{row.icon}</span>
                  <span style={{ color: C.textLight, minWidth: 120 }}>{row.label}</span>
                  <span style={{ color: C.textDark, fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}
            </div>

            <button className="btn-primary" style={{ width: "100%", fontSize: 16 }}>
              Go to my Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
