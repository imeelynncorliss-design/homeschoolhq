# HomeschoolHQ Product Backlog

**Last Updated:** February 1, 2026  
**Sprint:** Week 2-3 (Pro Tier Development)

---

## 🎯 Current Sprint (Week 2-3)

**Goal:** Launch Pro Tier with Compliance Tracking

### In Progress
- [x] Tier system migration (FREE/ESSENTIAL/PRO/PREMIUM)
- [x] Compliance settings page
- [x] Compliance hooks (useComplianceSettings, useComplianceHours, useComplianceHealthScore)
- [x] Main compliance dashboard
- [ ] Dashboard widget integration
- [ ] Compliance badge indicators

### Done This Sprint
- Tier-aware navigation
- DevTierToggle with 4 tiers
- Database schema corrections (added missing columns)
- Organization-wide compliance model

---

## 📦 Backlog: Future Features

### Phase 3: Advanced Compliance Features

#### **Feature: Split Custody / Multi-Household Compliance Support**

**Priority:** Low (1% use case)  
**Effort:** Medium (3-5 days)  
**Impact:** Low (affects very few users)

**User Story:**
> As a divorced/separated homeschool parent with split custody across state lines, I want to track compliance requirements for the time my children spend with me in my state, separate from their time with the other parent in a different state, so that I can ensure I'm meeting my state's legal obligations during my custody time.

**Use Case:**
- Parent A homeschools in North Carolina (180 days required)
- Parent B homeschools in South Carolina (180 days required)  
- Child splits time 50/50 between households
- Each parent needs to track compliance separately

**Why Not Now:**
- **Legal Reality:** 99% of homeschool families have all children under the same state's jurisdiction
- **UCCJEA Law:** Child's "home state" (where they've lived 6+ months) determines jurisdiction
- **Edge Case:** Extremely rare for both parents to actively homeschool in different states
- **Complexity:** Would require significant DB and UI changes
- **Current Solution Works:** Parent tracks their portion; other parent uses separate account/app

**Research Findings:** (February 2026)
- Multi-state custody exists, but typically ONE parent has educational jurisdiction
- Even with long-distance visitation, compliance follows primary parent's state
- No states require separate tracking for custody split scenarios
- Iowa is only state allowing different educational *structures* per child (not compliance)

**Implementation Notes:**

**Database Changes:**
```sql
-- Option 1: Add household_id to support multiple compliance contexts
ALTER TABLE user_compliance_settings
ADD COLUMN household_id UUID REFERENCES households(id);

-- Would allow: 
-- Household A: NC requirements
-- Household B: SC requirements
-- Kids associated with both households

-- Option 2: Make kid_id non-nullable again, allow multiple rows per org
-- Each kid can have different settings
-- More flexible but more complex
```

**UI Changes:**
- Toggle in settings: "Split custody mode"
- If enabled, show household selector
- Compliance dashboard filters by household
- Visual indicator showing "NC compliance (your household)"

**User Flow:**
1. Parent enables "Split custody mode"
2. Creates two households: "Mom's household (NC)" and "Dad's household (SC)"
3. Assigns kids to both households
4. Sets compliance requirements per household
5. Dashboard shows compliance for "active household"
6. Can switch between household views

**MVP Implementation:**
- Phase 1: UI toggle + basic household concept
- Phase 2: Separate compliance settings per household
- Phase 3: Aggregate reporting across households

**Alternatives Considered:**
1. **Just use two separate HomeschoolHQ accounts** - Simple but requires paying twice
2. **Manual notes field** - "This tracks only my custody time" - Low-tech solution
3. **Percentage-based tracking** - Parent enters "I have custody 60% of year" and app calculates 60% of 180 days = 108 days required

**Recommendation:**
- **Don't build yet** - Wait for user feedback
- If 5+ users request this, reconsider for Phase 3
- For now, document in Help Center: "If you have split custody across states, track only your custody time in HomeschoolHQ. The other parent should use a separate account."

---

### Phase 2: Social & Collaboration Features

#### **Feature: Co-op Compliance Tracking**
**Priority:** Medium  
**Effort:** Medium  
**Status:** Planned for Premium tier

**User Story:**
> As a homeschool co-op organizer, I want to track attendance and instructional hours across multiple families, so that all families in the co-op can meet their state requirements collectively.

**Notes:**
- Extends compliance tracking to group settings
- Multiple families share attendance data
- Aggregate reporting for co-op leaders
- Individual reporting for each family

---

### Phase 2: Work Calendar Integration

#### **Feature: Work Calendar Sync**
**Priority:** High (Pro tier differentiator)  
**Effort:** Large (1-2 weeks)  
**Status:** Planned for Pro tier completion

**User Story:**
> As a working homeschool parent, I want to sync my work calendar with my homeschool schedule, so that I can automatically block school time around my work meetings and obligations.

**Technical Notes:**
- Google Calendar API integration
- Outlook Calendar API integration
- Two-way sync
- Conflict detection
- Smart scheduling suggestions

---

### Phase 3: Advanced Features

#### **Feature: Multi-State Requirements Database**
**Priority:** Medium  
**Effort:** Large  
**Status:** Backlog

**User Story:**
> As a military family that moves frequently, I want HomeschoolHQ to automatically update my compliance requirements when I move to a new state, so I don't have to research state laws each time.

**Implementation:**
- Comprehensive state requirements database (all 50 states)
- Auto-update settings on state change
- Migration guides when moving
- State-specific reporting templates

---

#### **Feature: Transcript Generation with Compliance Data**
**Priority:** High  
**Effort:** Medium  
**Status:** Planned for Phase 3

**User Story:**
> As a parent preparing my high schooler for college, I want to generate a transcript that includes compliance documentation, so colleges can see we met all state requirements.

**Features:**
- Auto-generated transcripts from lesson data
- Includes compliance hours/days
- State requirement attestation
- Official-looking PDF export
- Digital signatures

---

### Phase 4: AI & Automation

#### **Feature: Compliance Autopilot**
**Priority:** Low  
**Effort:** Large  
**Status:** Future consideration

**User Story:**
> As a busy homeschool parent, I want AI to automatically track compliance from my daily activities, so I don't have to manually log hours.

**Features:**
- AI infers instructional hours from activities
- Auto-categorizes activities by subject
- Suggests makeup days when behind
- Predicts end-of-year compliance status
- Automated reporting

---

## 🗂️ Parking Lot: Ideas to Evaluate

**Not prioritized yet - need user research:**

- [ ] Portfolio generator (combine work samples + compliance data)
- [ ] Standardized test tracking integration
- [ ] Multi-year compliance trends/analytics
- [ ] Compliance "insurance" - automated alerts before deadlines
- [ ] State reporting automation (auto-fill state forms)
- [ ] Homeschool group compliance aggregation
- [ ] IEP integration for special needs compliance
- [ ] Dual enrollment tracking (homeschool + public school classes)
- [ ] Religious exemption documentation
- [ ] College admissions compliance package

---

## 📊 Decision Framework

**When to promote from Backlog to Sprint:**

1. **User Demand:** 10+ users request it OR
2. **Competitive Pressure:** Competitor launches similar feature OR  
3. **Strategic Alignment:** Unlocks new market segment OR
4. **Revenue Impact:** Clear path to conversion/retention increase

**When to build the 1% feature (Split Custody):**
- 5+ specific user requests with detailed use cases
- Interview users to validate implementation approach
- Consider simpler alternatives first (two accounts, manual notes)
- Only build if no workaround satisfies the need

---

## 💡 Feature Request Process

**How to add items to backlog:**

1. Document in this file under appropriate phase
2. Include: User story, priority, effort, implementation notes
3. Tag with research date if based on user feedback
4. Review quarterly during sprint planning

**Priority Levels:**
- **High:** Must-have for market competitiveness
- **Medium:** Nice-to-have, improves experience  
- **Low:** Edge case or niche use case

**Effort Levels:**
- **Small:** 1-2 days
- **Medium:** 3-5 days
- **Large:** 1-2 weeks
- **XL:** 2+ weeks

---

## 🎯 North Star Metrics

**What we're optimizing for:**

1. **User Retention:** Daily active homeschool families
2. **Compliance Success:** % of families meeting state requirements
3. **Time Saved:** Hours saved per week vs manual tracking
4. **Tier Upgrades:** Conversion from Free → Essential → Pro
5. **NPS Score:** Would you recommend HomeschoolHQ?

---

## 📝 Notes & Research

**Research: Split Custody Compliance** (Feb 1, 2026)
- Researched multi-state custody, UCCJEA law, homeschool regulations
- Finding: 99% of families have organization-wide compliance
- Recommendation: Document as future enhancement, don't build now
- Alternative: Two separate accounts (acceptable workaround)

---

**Next Review:** End of Week 3 Sprint (Compliance Dashboard Launch)