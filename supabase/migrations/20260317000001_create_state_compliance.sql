-- State compliance knowledge base for Scout RAG
-- Each row contains the legal/regulatory text for a state's homeschool requirements

CREATE TABLE IF NOT EXISTS state_compliance (
  state_code   char(2)  PRIMARY KEY,  -- e.g. 'NC', 'TX', 'PA'
  state_name   text     NOT NULL,
  legal_markdown text   NOT NULL,      -- The compliance text injected into Scout's context
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Public read — anyone authenticated can read compliance text (not sensitive)
ALTER TABLE state_compliance ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'state_compliance'
    AND policyname = 'Authenticated users can read state compliance'
  ) THEN
    CREATE POLICY "Authenticated users can read state compliance"
      ON state_compliance FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Seed: North Carolina
INSERT INTO state_compliance (state_code, state_name, legal_markdown) VALUES (
'NC',
'North Carolina',
'# North Carolina Homeschool Requirements

## Overview
North Carolina is a moderately regulated homeschool state. Requirements are straightforward and HomeschoolReady handles all compliance tracking automatically.

## Legal Basis
North Carolina homeschools operate under **G.S. § 115C-563 through 115C-565** as "non-public schools."

## Key Requirements

### 1. Notice of Intent (NOI)
- **Who:** All families starting a new homeschool or resuming after a gap.
- **When:** File BEFORE you begin homeschooling. Re-file if you move to a new county.
- **Where:** Submit to the NC Division of Non-Public Education (DNPE) online at: ncpublicschools.gov/dnpe
- **Cost:** Free.
- HomeschoolReady reminder: Use the Compliance Checklist to track your NOI status.

### 2. Annual Notice of Continuing Operation
- **Who:** All active homeschools.
- **When:** Each year between **August 1 – August 31**.
- **Where:** NC DNPE website.
- HomeschoolReady tracks this deadline automatically in your Compliance dashboard.

### 3. Standardized Testing
- **Who:** All homeschool students must be tested each year.
- **When:** Annually. No specific month required.
- **Approved tests include:** Iowa Test of Basic Skills, CAT, SAT, Stanford Achievement Test, and others listed by DNPE.
- Results must be kept on file by the parent — you do NOT submit scores to the state.
- HomeschoolReady: Use the Assessments section to log test dates and keep records.

### 4. Immunization Records
- You must maintain an immunization record for each student. You are NOT required to submit it to the state.

### 5. Attendance Records
- **Requirement:** Maintain a record of attendance.
- **Minimum school days:** 9 months of instruction per year (approximately 180 days).
- HomeschoolReady tracks attendance automatically and shows your progress toward 180 days.

### 6. Qualified Instructor
- At least one parent or guardian must have a **high school diploma or GED** to operate a homeschool.

### 7. Subjects Required
- NC does not specify a mandatory list of subjects. You have full curriculum freedom.
- HomeschoolReady tip: Most families cover the core subjects (math, language arts, science, social studies) to prepare for future schooling or college.

### 8. Record-Keeping
Keep the following on file for at least **one year** after the school year ends:
- Attendance records
- Immunization records
- Annual standardized test results

## What NC Does NOT Require
- Portfolio review
- Approval of curriculum
- Teacher certification
- Submitting test scores to the state
- Notifying your local school district (only the state DNPE)

## Penalties for Non-Compliance
Failure to file the NOI or annual notice can result in the homeschool being considered operating illegally.

## Resources
- NC Division of Non-Public Education (DNPE): ncpublicschools.gov/dnpe
- HSLDA NC page: hslda.org/legal/north-carolina
- NC Home Educators: nche.com
'
) ON CONFLICT (state_code) DO UPDATE SET
  legal_markdown = EXCLUDED.legal_markdown,
  updated_at = now();

-- Seed: Texas
INSERT INTO state_compliance (state_code, state_name, legal_markdown) VALUES (
'TX',
'Texas',
'# Texas Homeschool Requirements

## Overview
Texas is one of the most homeschool-friendly states in the country. Minimal government oversight with maximum parental freedom.

## Legal Basis
Texas homeschools are classified as **private schools** under the Texas Education Code § 25.086(a)(1). There is no state oversight body for homeschools.

## Key Requirements

### 1. No Registration or Notice Required
- You do NOT file anything with the state, county, or school district.
- Simply withdraw your child from public school (if applicable) in writing.

### 2. Curriculum
- Must include the **five core subjects:** reading, spelling, grammar, mathematics, and good citizenship.
- No approval or review of curriculum is required.

### 3. Written Curriculum
- Texas courts have ruled that a **bona fide** homeschool must use a written curriculum — this does not need to be a formal boxed curriculum. A lesson plan or digital curriculum qualifies.

### 4. Attendance Records
- No specific attendance requirement or log mandated by law.
- HomeschoolReady: Tracking attendance is still recommended as evidence of a bona fide homeschool.

### 5. Testing / Assessment
- **No standardized testing required** by the state.
- No portfolio review required.

### 6. Instructor Qualifications
- No teaching credentials or education level required for parents.

## What Texas Does NOT Require
- Registration with any state agency
- Notice of Intent
- Annual reporting
- Portfolio submission
- Standardized testing
- Curriculum approval

## Tips for Texas Homeschoolers
- Keep a simple attendance log and curriculum outline in case a school district ever questions you.
- When withdrawing from public school, send a withdrawal letter to the school principal in writing.

## Resources
- Texas Home School Coalition (THSC): thsc.org
- HSLDA Texas: hslda.org/legal/texas
'
) ON CONFLICT (state_code) DO UPDATE SET
  legal_markdown = EXCLUDED.legal_markdown,
  updated_at = now();

-- Seed: Pennsylvania
INSERT INTO state_compliance (state_code, state_name, legal_markdown) VALUES (
'PA',
'Pennsylvania',
'# Pennsylvania Homeschool Requirements

## Overview
Pennsylvania is one of the most regulated homeschool states. HomeschoolReady''s compliance tools are specifically designed to help PA families stay on top of the detailed requirements.

## Legal Basis
Pennsylvania homeschools operate under **24 P.S. § 13-1327.1** (the homeschool statute).

## Key Requirements

### 1. Annual Affidavit
- **Who:** Every homeschool family.
- **When:** File by **August 1** each year (or within 10 days of starting if mid-year).
- **Where:** Submit to your local school superintendent.
- The affidavit must include: names and ages of children, the name of the supervisor (parent/guardian), a certification that you hold a high school diploma or equivalent.
- HomeschoolReady tracks this deadline in your Compliance dashboard.

### 2. Supervisor Qualifications
- The homeschool supervisor must hold a **high school diploma or GED**, OR provide instruction through an approved tutor or online school.

### 3. Required Subjects by Grade

**Grades 1–3:**
English (reading, writing, spelling), arithmetic, science, health, music, art, physical education.

**Grades 4–6 (add):**
Social studies (geography, history of PA and US), civics.

**Grades 7–12 (add):**
English (literature, composition, grammar), math (including algebra/geometry), science (biology, chemistry, physics), history (US, PA, world), geography, civics, economics, health/physiology, music, art, physical education.

### 4. Minimum Instruction Days
- **180 days** of instruction per year, OR **900 hours** (elementary) / **990 hours** (secondary).
- HomeschoolReady''s Attendance tracker counts toward this automatically.

### 5. Portfolio / Evaluator Review
- Maintain a **portfolio** of the student''s work throughout the year. Include:
  - A log of reading materials
  - Samples of written work
  - Workbooks, worksheets, or projects
- Portfolio must be reviewed **annually** by a **certified teacher** (or approved evaluator). The evaluator writes a letter stating the student received an appropriate education.
- Submit the evaluator letter to the school superintendent with your next affidavit.

### 6. Standardized Testing (Every Other Year)
- Students in **3rd, 5th, and 8th grade** must take a nationally-normed standardized test.
- Tests in: reading, language arts, math.
- Results stay at home — not submitted to the district.

### 7. Immunization Records
- Keep current immunization records on file.

## What PA Requires That Most States Do Not
- Annual written affidavit to local superintendent
- Portfolio review by a certified teacher
- Standardized testing in specific grades
- Subject requirements by grade band

## Resources
- PA Department of Education: education.pa.gov
- PAHOMESCHOOLERS: pahomeschoolers.com
- HSLDA Pennsylvania: hslda.org/legal/pennsylvania
'
) ON CONFLICT (state_code) DO UPDATE SET
  legal_markdown = EXCLUDED.legal_markdown,
  updated_at = now();

-- Seed: California
INSERT INTO state_compliance (state_code, state_name, legal_markdown) VALUES (
'CA',
'California',
'# California Homeschool Requirements

## Overview
California homeschool law is nuanced — families have several legal options for how they operate. The most common is filing a **Private School Affidavit (PSA)** to register as a private home-based school.

## Legal Basis
California does not have a specific homeschool statute. Families operate under the general private school exemption in **California Education Code § 48222**.

## Primary Options for Homeschooling in California

### Option 1: Private School Affidavit (Most Common)
- File a **Private School Affidavit** with the California Department of Education (CDE) each year.
- **When:** Between **October 1 and October 15** annually (window is only 15 days).
- **Where:** Online at cde.ca.gov/sp/ps/rn/affidavit.asp
- This registers your home as a private school. You become the "principal" of your school.
- Curriculum and testing are entirely up to you.
- HomeschoolReady: The Compliance dashboard will remind you about this October window.

### Option 2: Public Independent Study / Charter School
- Enroll in a public charter school with independent study options.
- The charter school provides curriculum and oversight.
- No PSA required — you''re technically a public school student.

### Option 3: Private Tutor
- Hire a California-credentialed private tutor who provides instruction in the required subjects.
- Less common due to cost.

### Option 4: Umbrella School / Independent Study Program
- Enroll in an accredited private school that offers independent study.
- The private school holds the credentialed teachers; you do the teaching at home.

## Key Requirements (PSA Path)

### Subjects Required
California requires instruction in: English (including grammar, reading, penmanship), math, social sciences (history, geography), science, fine arts, health, physical education.

For grades 7–12, also required: English, foreign language, physical education, math, science, social studies, visual/performing arts, career technical education.

### Attendance Records
- Maintain attendance records. No minimum day count is mandated by state law for private schools, but maintaining a 180-day log is recommended.

### Instructor Qualifications
- **No teaching credential required** when operating under the PSA as a home-based private school.
- You must be "capable of teaching" — no specific test or certification.

### Testing
- No standardized testing required for private school homeschoolers (PSA path).

## Resources
- California Department of Education: cde.ca.gov
- California Homeschool Network: californiahomeschool.net
- HSLDA California: hslda.org/legal/california
'
) ON CONFLICT (state_code) DO UPDATE SET
  legal_markdown = EXCLUDED.legal_markdown,
  updated_at = now();

-- Seed: New York
INSERT INTO state_compliance (state_code, state_name, legal_markdown) VALUES (
'NY',
'New York',
'# New York Homeschool Requirements

## Overview
New York is one of the most regulated homeschool states in the country. It has detailed annual requirements, but HomeschoolReady is designed to help you stay on top of all of them.

## Legal Basis
New York homeschools operate under **Education Law § 3204** and **Commissioner''s Regulations Part 100.10**.

## Key Requirements

### 1. Annual Notice of Intent (IHIP)
- **Who:** Every homeschool family.
- **When:** By **July 1** each year (or 14 days after beginning to homeschool).
- **Where:** Submit to your local school district superintendent.
- The notice must include: names and ages of children, the address of instruction, and the name of the instructor.
- HomeschoolReady tracks this deadline in your Compliance dashboard.

### 2. Individualized Home Instruction Plan (IHIP)
- After filing your Notice of Intent, you must submit an **IHIP** within 4 weeks.
- The IHIP must list: the syllabi or curriculum materials you plan to use, the number of hours of instruction, and the subject areas to be covered.
- The school district reviews the IHIP to confirm it meets state requirements.

### 3. Required Subjects by Grade

**Grades 1–6:**
Arithmetic, reading, spelling, writing, English language arts, geography, US history, science, health, music, visual arts, physical education.

**Grades 7–8 (add):**
Social studies, practical arts, library skills.

**Grades 9–12:**
English (4 units), social studies (4 units including US history and government, global history), math (3 units), science (3 units), LOTE or the arts or career education (1 unit), health (½ unit), physical education (2 units), electives.

### 4. Minimum Instruction Hours
- **Grades 1–6:** 900 hours per year
- **Grades 7–12:** 990 hours per year
- HomeschoolReady''s Attendance tracker helps you log toward these totals.

### 5. Quarterly Reports
- You must submit **4 quarterly reports** to the school district each year.
- Each report lists the subjects covered, the number of hours of instruction, and a grade or assessment for each subject.
- HomeschoolReady: Keep lesson and attendance records to make quarterly reporting straightforward.

### 6. Annual Assessment
- Students must be assessed annually, alternating between:
  - **Standardized tests** (grades 4, 5, 6, 7, 8) in years 1, 3, 5...
  - **Written narrative evaluations** by a certified teacher in alternating years
- In grades 9–12, assessment may be via transcript review.
- Results are submitted to the school district.

### 7. Instructor Qualifications
- No teaching credential required. Parents must be "competent."
- The school district reviews your IHIP and may request additional information if qualifications are questioned.

## What NY Requires That Most States Do Not
- Detailed IHIP submitted to school district
- Four quarterly progress reports per year
- Annual standardized testing OR certified teacher evaluation
- High school credit tracking and transcript

## Resources
- NY State Education Department: nysed.gov
- LEAH (Loving Education at Home): leah.org
- HSLDA New York: hslda.org/legal/new-york
'
) ON CONFLICT (state_code) DO UPDATE SET
  legal_markdown = EXCLUDED.legal_markdown,
  updated_at = now();

-- Seed: Georgia
INSERT INTO state_compliance (state_code, state_name, legal_markdown) VALUES (
'GA',
'Georgia',
'# Georgia Homeschool Requirements

## Overview
Georgia has moderate, straightforward homeschool requirements. Annual declaration and attendance records are the main obligations.

## Legal Basis
Georgia homeschools operate under **O.C.G.A. § 20-2-690**.

## Key Requirements

### 1. Annual Declaration of Intent
- **Who:** Every homeschool family.
- **When:** By **September 1** each year (or within 30 days of beginning to homeschool mid-year).
- **Where:** Submit to your local school superintendent.
- HomeschoolReady tracks this deadline in your Compliance dashboard.

### 2. Required Subjects
Georgia requires instruction in: reading, language arts, mathematics, social studies, and science.

### 3. Minimum Instruction Days
- **180 days** of instruction per year, with at least **4.5 hours** per day.
- HomeschoolReady''s Attendance tracker counts toward this automatically.

### 4. Attendance Records
- Maintain an attendance record showing at least 180 days of instruction.
- You do NOT submit it to the state — keep it on file at home.

### 5. Annual Assessment
- Students must be assessed every year using ONE of the following:
  - A **nationally standardized achievement test** administered by a non-family member
  - An **assessment** by a certified Georgia teacher
  - A **portfolio review** by a certified Georgia teacher
- Results are kept at home — not submitted to the school district.

### 6. Instructor Qualifications
- The parent/instructor must have a **high school diploma or GED**.

### 7. Record-Keeping
Keep these on file:
- Attendance records
- Annual assessment results
- Records must be available for inspection if requested.

## What GA Does NOT Require
- Curriculum approval
- Portfolio submission to the state
- Quarterly reports

## Resources
- Georgia Department of Education: gadoe.org
- Georgia Home Education Association (GHEA): ghea.org
- HSLDA Georgia: hslda.org/legal/georgia
'
) ON CONFLICT (state_code) DO UPDATE SET
  legal_markdown = EXCLUDED.legal_markdown,
  updated_at = now();

-- Seed: Virginia
INSERT INTO state_compliance (state_code, state_name, legal_markdown) VALUES (
'VA',
'Virginia',
'# Virginia Homeschool Requirements

## Overview
Virginia has moderate homeschool requirements with two main compliance pathways. Most families use the standard notice-of-intent path.

## Legal Basis
Virginia homeschools operate under **Virginia Code § 22.1-254.1**.

## Compliance Pathways

### Path 1: Standard Homeschool (Most Common)
This is the primary path for most families.

#### Annual Notice of Intent
- **Who:** Every family on the standard path.
- **When:** By **August 15** each year.
- **Where:** Submit to your local school division superintendent.
- The notice must include: the name and age of each child, and evidence that the parent meets the instructor qualification requirement.
- HomeschoolReady tracks this deadline in your Compliance dashboard.

#### Instructor Qualifications (one of the following):
- Hold a **bachelor''s degree**
- Be a licensed teacher in Virginia
- Use a **curriculum approved by the school board**
- Provide evidence that the parent is able to provide an adequate education (evaluated by the superintendent)

#### Annual Assessment
- Each year, you must provide evidence of the student''s academic progress using ONE of the following:
  - **Standardized test** results (child must score in or above the 23rd percentile)
  - **Academic year portfolio** reviewed and approved by a licensed Virginia teacher
  - **Letter of progress** from a licensed teacher who has reviewed the child''s work
  - A Virginia Department of Education-approved assessment
- Submit the results to the school division by **August 1** of the following year.

### Path 2: Religious Exemption
- Available to families with sincere religious objection to school attendance.
- Requires annual application to the school board.
- No assessment or curriculum requirements apply under this path.

## Required Subjects
Virginia does not mandate specific subjects, but the assessment requirement effectively requires coverage of core academics (reading, math, language arts, science, social studies).

## Minimum Instruction Days
- No specific minimum is mandated by law.
- HomeschoolReady recommends tracking 180 days to support your annual assessment evidence.

## What VA Does NOT Require
- Specific curriculum approval (standard path)
- Portfolio submission to the state (a licensed teacher review suffices)
- Quarterly reports

## Resources
- Virginia Department of Education: doe.virginia.gov
- Home Educators Association of Virginia (HEAV): heav.org
- HSLDA Virginia: hslda.org/legal/virginia
'
) ON CONFLICT (state_code) DO UPDATE SET
  legal_markdown = EXCLUDED.legal_markdown,
  updated_at = now();

-- Seed: Tennessee
INSERT INTO state_compliance (state_code, state_name, legal_markdown) VALUES (
'TN',
'Tennessee',
'# Tennessee Homeschool Requirements

## Overview
Tennessee is a relatively easy state for homeschooling with two primary pathways. Requirements are manageable and HomeschoolReady handles the tracking automatically.

## Legal Basis
Tennessee homeschools operate under **T.C.A. § 49-6-3050**.

## Compliance Pathways

### Path 1: Parent-Taught (Most Common)
The standard path for families where a parent teaches their children.

#### Annual Registration
- **Who:** Every family on the parent-taught path.
- **When:** Register by **August 1** each year (or within 30 days of starting).
- **Where:** Submit to your local LEA (Local Education Agency / school district).
- HomeschoolReady tracks this deadline in your Compliance dashboard.

#### Instructor Qualifications
- The parent/instructor must have a **high school diploma or GED**.

#### Required Subjects
Tennessee requires instruction in: language arts (reading, grammar, composition, spelling), math, science, social studies, and health.

#### Minimum Instruction Days
- **180 days** per year.
- HomeschoolReady''s Attendance tracker counts toward this automatically.

#### Annual Testing
- Students in **grades 5, 7, and 9** must take a standardized achievement test each year.
- Approved tests include nationally normed tests (Iowa, CAT, Stanford, etc.).
- Results are submitted to the LEA.
- Students in all other grades do NOT require annual testing.

#### Record-Keeping
Keep the following on file:
- Attendance records
- Test results (for grades 5, 7, 9)

### Path 2: Church-Related School Umbrella
- Families can enroll under an approved church-related school or umbrella program.
- The umbrella school handles registration and compliance oversight.
- This path has different (often simpler) requirements managed by the umbrella school.

## What TN Does NOT Require
- Portfolio review
- Curriculum approval
- Quarterly reports
- Annual testing for most grades (only 5, 7, 9)

## Resources
- Tennessee Department of Education: tn.gov/education
- Tennessee Home Education Association (THEA): tnhea.org
- HSLDA Tennessee: hslda.org/legal/tennessee
'
) ON CONFLICT (state_code) DO UPDATE SET
  legal_markdown = EXCLUDED.legal_markdown,
  updated_at = now();

-- Seed: Ohio
INSERT INTO state_compliance (state_code, state_name, legal_markdown) VALUES (
'OH',
'Ohio',
'# Ohio Homeschool Requirements

## Overview
Ohio has moderate homeschool requirements with a straightforward annual notification process. HomeschoolReady handles compliance tracking automatically.

## Legal Basis
Ohio homeschools operate under **Ohio Revised Code § 3321.042**.

## Key Requirements

### 1. Annual Notice of Intent
- **Who:** Every homeschool family.
- **When:** By **September 1** each year (or within 14 days of beginning to homeschool).
- **Where:** Submit to your local school district superintendent.
- The notice must include: the child''s name, age, and address; the parent''s name and address; and assurance that the parent holds a high school diploma or equivalent.
- HomeschoolReady tracks this deadline in your Compliance dashboard.

### 2. Instructor Qualifications
- The parent/instructor must have a **high school diploma or GED**.
- If the parent does not meet this requirement, a licensed teacher must work with the family, OR the child must be assessed annually by a licensed teacher.

### 3. Required Subjects
Ohio requires instruction in: language arts (reading, spelling, writing, English grammar), mathematics, geography, history of the US and Ohio, national, state, and local government, natural science, health, physical education, fine arts including music.

### 4. Minimum Instruction Days
- **900 hours** per year (equivalent to approximately 180 days).
- HomeschoolReady''s Attendance tracker counts toward this automatically.

### 5. Annual Assessment
- Each year, you must demonstrate the child''s academic progress using ONE of the following:
  - **Standardized achievement test** (administered by a qualified examiner, not a parent)
  - **Written portfolio assessment** by a licensed teacher
  - **Psychologist assessment**
  - **Other approved assessment** as agreed with the superintendent
- Results are submitted to the school district superintendent.

### 6. Superintendent Review
- The superintendent reviews your notice and assessment results.
- If a child is found to not be making adequate progress for two consecutive years, the superintendent may take action.

### 7. Record-Keeping
Keep the following on file:
- Attendance log
- Annual assessment results

## What OH Does NOT Require
- Specific curriculum approval
- Quarterly progress reports
- Portfolio submission to the state (assessor review suffices)

## Resources
- Ohio Department of Education: education.ohio.gov
- Home School Legal Defense Association Ohio: hslda.org/legal/ohio
- Christian Home Educators of Ohio (CHEO): cheohome.org
'
) ON CONFLICT (state_code) DO UPDATE SET
  legal_markdown = EXCLUDED.legal_markdown,
  updated_at = now();

-- Seed: Florida
INSERT INTO state_compliance (state_code, state_name, legal_markdown) VALUES (
'FL',
'Florida',
'# Florida Homeschool Requirements

## Overview
Florida has clear, manageable homeschool requirements. Annual notice and a portfolio are the main obligations.

## Legal Basis
Florida Statutes **§ 1002.41**.

## Key Requirements

### 1. Notice of Intent
- **Who:** Every homeschool family.
- **When:** File within **30 days** of beginning to homeschool.
- **Where:** Submit to your county school superintendent (or designee). Many counties accept online submissions.
- Re-file each year within 30 days of the start of your school year.
- HomeschoolReady tracks this in your Compliance dashboard.

### 2. Portfolio Maintenance
- Maintain a **portfolio** of the student''s work, including:
  - A log of educational activities (by subject)
  - Samples of the student''s work (writing, projects, tests, worksheets)
- The portfolio must cover the required subjects.

### 3. Required Subjects
Florida requires instruction in: reading, language arts, math, science, social studies, health, physical education, and the arts.

### 4. Annual Portfolio Review
- Once a year, the portfolio must be reviewed by ONE of the following:
  - A Florida-certified teacher (can be a friend, tutor, or hired reviewer)
  - A licensed psychologist or psychiatrist
  - A Florida Association of Academic Nonpublic Schools (FAANS) evaluator
  - A certified teacher selected by the parent through a homeschool association
- The reviewer evaluates the portfolio and writes a letter or note. Results do NOT go to the school district.

### 5. Attendance / Instruction Days
- No specific minimum number of days required by law.
- HomeschoolReady recommends tracking 180 days to ensure a robust academic record.

### 6. Testing
- No mandated standardized testing (portfolio review replaces it).

### 7. Instructor Qualifications
- No credential or diploma required for parents teaching their own children.

### 8. End of Year
- File the annual termination notice with the superintendent at the end of your school year (or when you stop homeschooling).

## Resources
- Florida Department of Education: fldoe.org
- Florida Parent Educators Association: fpea.com
- HSLDA Florida: hslda.org/legal/florida
'
) ON CONFLICT (state_code) DO UPDATE SET
  legal_markdown = EXCLUDED.legal_markdown,
  updated_at = now();
