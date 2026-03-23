-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add structured compliance columns + seed all 50 states + DC
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add new columns (idempotent)
ALTER TABLE state_compliance
  ADD COLUMN IF NOT EXISTS required_days      int  NOT NULL DEFAULT 180,
  ADD COLUMN IF NOT EXISTS required_hours     int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS noi_required       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS regulation_level   text NOT NULL DEFAULT 'moderate';

-- 2. Update the 10 existing states with structured values
UPDATE state_compliance SET required_days=180, required_hours=0,   noi_required=true,  regulation_level='moderate' WHERE state_code='NC';
UPDATE state_compliance SET required_days=180, required_hours=0,   noi_required=false, regulation_level='low'      WHERE state_code='TX';
UPDATE state_compliance SET required_days=180, required_hours=900, noi_required=true,  regulation_level='high'     WHERE state_code='PA';
UPDATE state_compliance SET required_days=175, required_hours=0,   noi_required=false, regulation_level='moderate' WHERE state_code='CA';
UPDATE state_compliance SET required_days=180, required_hours=900, noi_required=true,  regulation_level='high'     WHERE state_code='NY';
UPDATE state_compliance SET required_days=180, required_hours=0,   noi_required=true,  regulation_level='moderate' WHERE state_code='GA';
UPDATE state_compliance SET required_days=180, required_hours=0,   noi_required=true,  regulation_level='moderate' WHERE state_code='VA';
UPDATE state_compliance SET required_days=180, required_hours=0,   noi_required=true,  regulation_level='low'      WHERE state_code='TN';
UPDATE state_compliance SET required_days=182, required_hours=900, noi_required=true,  regulation_level='moderate' WHERE state_code='OH';
UPDATE state_compliance SET required_days=180, required_hours=0,   noi_required=true,  regulation_level='moderate' WHERE state_code='FL';

-- 3. Insert remaining 40 states + DC (ON CONFLICT updates all four new columns)

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('AL','Alabama',
'# Alabama Homeschool Requirements

## Overview
Alabama requires enrollment in a church school, cover school, or private school — not a traditional state NOI.

## Key Requirements
- Enroll with an approved church school or cover school (most common path)
- Maintain attendance records (180 days recommended)
- No standardized testing required
- No curriculum approval required

## Resources
- Alabama Home Educators: ahea.net
- HSLDA Alabama: hslda.org/legal/alabama',
180, 0, false, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('AK','Alaska',
'# Alaska Homeschool Requirements

## Overview
Alaska is one of the most flexible homeschool states with minimal government oversight.

## Key Requirements
- No notice of intent required
- No standardized testing required
- No mandated curriculum
- Recommended: track 180 school days

## Resources
- Alaska Private & Home Educators Assoc: aphea.net
- HSLDA Alaska: hslda.org/legal/alaska',
180, 0, false, 'low', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('AZ','Arizona',
'# Arizona Homeschool Requirements

## Overview
Arizona requires a one-time affidavit filing. After that, oversight is minimal.

## Key Requirements
- File an affidavit of homeschool intent with your county school superintendent within 30 days of beginning
- Re-file if you move counties
- 180 days of instruction recommended
- No standardized testing required
- No curriculum approval required

## Resources
- Arizona Families for Home Education: afhe.org
- HSLDA Arizona: hslda.org/legal/arizona',
180, 0, true, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('AR','Arkansas',
'# Arkansas Homeschool Requirements

## Overview
Arkansas requires an annual notice of intent and covers core subjects.

## Key Requirements
- File Notice of Intent with local school district by August 15 each year
- Instruction in: reading, language arts, math, science, social studies
- 178 days of instruction per year
- No standardized testing required

## Resources
- Arkansas Christian Home Education Assoc: achea.org
- HSLDA Arkansas: hslda.org/legal/arkansas',
178, 0, true, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('CO','Colorado',
'# Colorado Homeschool Requirements

## Overview
Colorado has moderate requirements with annual notification.

## Key Requirements
- File Notice of Intent with local school district within 14 days of starting each fall
- 172 days of instruction per year
- Required subjects: reading, writing, speaking, math, history, civics, literature, science, and US Constitution
- Standardized testing in grades 3, 5, 7, 9, 11 (OR portfolio review by a licensed teacher)

## Resources
- Christian Home Educators of Colorado: chec.org
- HSLDA Colorado: hslda.org/legal/colorado',
172, 0, true, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('CT','Connecticut',
'# Connecticut Homeschool Requirements

## Overview
Connecticut requires annual notice and a written plan of instruction.

## Key Requirements
- File written notice with local superintendent each year
- Submit an annual plan of instruction describing courses
- No standardized testing required
- No portfolio submission required

## Resources
- Connecticut Homeschool Network: cthomeschoolnetwork.org
- HSLDA Connecticut: hslda.org/legal/connecticut',
180, 0, true, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('DE','Delaware',
'# Delaware Homeschool Requirements

## Overview
Delaware requires annual filing with the state Department of Education.

## Key Requirements
- File annual notice with Delaware Department of Education by September 1
- 180 days of instruction
- Required subjects: English, math, social studies, science, health
- No standardized testing required

## Resources
- Delaware Home Education Association: dheaonline.org
- HSLDA Delaware: hslda.org/legal/delaware',
180, 0, true, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('HI','Hawaii',
'# Hawaii Homeschool Requirements

## Overview
Hawaii requires annual notice and assessment.

## Key Requirements
- File notice with the Hawaii DOE annually
- 180 days of instruction
- Annual assessment: standardized test, portfolio, or evaluation by a licensed teacher
- Submit assessment results to the DOE each year

## Resources
- Hawaii Homeschool Assoc: hawaiihomeschoolassociation.org
- HSLDA Hawaii: hslda.org/legal/hawaii',
180, 0, true, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('ID','Idaho',
'# Idaho Homeschool Requirements

## Overview
Idaho has virtually no homeschool regulation — one of the least restrictive states in the country.

## Key Requirements
- No notice of intent required
- No standardized testing required
- No required subject list
- No minimum instruction days mandated
- Recommended: track 180 days for your own records

## Resources
- Idaho Coalition of Home Educators: iche-idaho.org
- HSLDA Idaho: hslda.org/legal/idaho',
0, 0, false, 'low', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('IL','Illinois',
'# Illinois Homeschool Requirements

## Overview
Illinois treats homeschools as private schools. No state registration required.

## Key Requirements
- No notice of intent or registration required
- Instruction must be in English and equivalent to public school quality
- Required subjects: language arts, math, biological/physical sciences, social sciences, fine arts, health
- No standardized testing required
- 176 days is the commonly recommended minimum

## Resources
- Illinois Christian Home Educators: iche.org
- HSLDA Illinois: hslda.org/legal/illinois',
176, 0, false, 'low', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('IN','Indiana',
'# Indiana Homeschool Requirements

## Overview
Indiana treats homeschools as non-accredited private schools with minimal oversight.

## Key Requirements
- No notice of intent required
- No standardized testing required
- No specific subject requirements
- Instruction must be equivalent to public school standards
- 180 days recommended

## Resources
- Indiana Association of Home Educators: iahe.net
- HSLDA Indiana: hslda.org/legal/indiana',
180, 0, false, 'low', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('IA','Iowa',
'# Iowa Homeschool Requirements

## Overview
Iowa uses a two-track system: supervised (with licensed teacher) or independent.

## Key Requirements
- File annual Competent Private Instruction form with local school district
- 148 days of instruction minimum
- Two options: (1) supervised by licensed teacher, or (2) independent with quarterly assessment
- No standardized testing if using a licensed teacher supervisor

## Resources
- Network of Iowa Christian Home Educators: niche.net
- HSLDA Iowa: hslda.org/legal/iowa',
148, 0, true, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('KS','Kansas',
'# Kansas Homeschool Requirements

## Overview
Kansas requires a one-time registration as an unaccredited private school.

## Key Requirements
- Register as an unaccredited private school (one-time, not annual)
- 186 days of instruction per year
- Required subjects: math, reading, writing, science, social studies
- No standardized testing required

## Resources
- Kansas Christian Home Educators Assoc: kansashomeschool.org
- HSLDA Kansas: hslda.org/legal/kansas',
186, 0, false, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('KY','Kentucky',
'# Kentucky Homeschool Requirements

## Overview
Kentucky treats homeschools as private schools with minimal oversight.

## Key Requirements
- No formal notice of intent required
- 185 days of instruction per year
- Required subjects: reading, writing, math, science, social studies, health, PE, arts
- No standardized testing required

## Resources
- Kentucky Home Education Assoc: khea.net
- HSLDA Kentucky: hslda.org/legal/kentucky',
185, 0, false, 'low', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('LA','Louisiana',
'# Louisiana Homeschool Requirements

## Overview
Louisiana requires annual application approval, though it is routinely granted.

## Key Requirements
- File application with the Louisiana Board of Elementary and Secondary Education (BESE)
- 180 days of instruction
- Required subjects: language arts, math, social studies, science
- No standardized testing required

## Resources
- Louisiana Home Education Network: lahomeeducators.com
- HSLDA Louisiana: hslda.org/legal/louisiana',
180, 0, true, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('ME','Maine',
'# Maine Homeschool Requirements

## Overview
Maine requires annual notice and assessment.

## Key Requirements
- File notice with local school board by September 1 each year
- 175 days of instruction
- Required subjects: English, math, science, social studies, health, PE, fine arts
- Annual assessment: standardized test, portfolio review, or other approved method
- Submit assessment results to the school board

## Resources
- Homeschoolers of Maine: homeschoolersofmaine.org
- HSLDA Maine: hslda.org/legal/maine',
175, 0, true, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('MD','Maryland',
'# Maryland Homeschool Requirements

## Overview
Maryland requires annual notice and a portfolio review.

## Key Requirements
- File notice with your local school superintendent
- Annual portfolio review by local school supervisor or approved umbrella school
- 180 days of instruction
- No standardized testing required (portfolio review suffices)

## Resources
- Maryland Home Education Assoc: mhea.com
- HSLDA Maryland: hslda.org/legal/maryland',
180, 0, true, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('MA','Massachusetts',
'# Massachusetts Homeschool Requirements

## Overview
Massachusetts is one of the most regulated homeschool states. Prior approval is required.

## Key Requirements
- Must obtain prior approval from local school committee or superintendent BEFORE beginning
- Submit proposed curriculum and materials for review
- 180 days of instruction
- Annual assessment: standardized test, portfolio, or progress report
- Approval can be appealed if denied

## Resources
- Massachusetts Home Learning Assoc: mhla.net
- HSLDA Massachusetts: hslda.org/legal/massachusetts',
180, 0, true, 'high', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('MI','Michigan',
'# Michigan Homeschool Requirements

## Overview
Michigan has minimal homeschool requirements with no registration needed.

## Key Requirements
- No notice of intent required
- 180 days of instruction
- Required subjects: reading, spelling, math, science, social studies, history, civics, literature, writing, English grammar, health
- No standardized testing required
- Teaching parent must be the primary instructor (non-parent tutors need certification)

## Resources
- Information Network for Christian Homes (INCH): inch.org
- HSLDA Michigan: hslda.org/legal/michigan',
180, 0, false, 'low', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('MN','Minnesota',
'# Minnesota Homeschool Requirements

## Overview
Minnesota has moderate requirements including an education requirement for the teaching parent.

## Key Requirements
- File annual declaration with local school district
- Teaching parent must have a college degree OR use state-approved curriculum
- 165 days of instruction
- Required subjects: reading, writing, literature, math, science, social studies, arts, health, PE
- Annual standardized test OR portfolio assessment

## Resources
- Minnesota Homeschoolers Alliance: homeschoolers.org
- HSLDA Minnesota: hslda.org/legal/minnesota',
165, 0, true, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('MS','Mississippi',
'# Mississippi Homeschool Requirements

## Overview
Mississippi has very low regulation — just a simple annual enrollment notice.

## Key Requirements
- File annual notice of enrollment with your local school attendance officer
- 180 days of instruction
- No standardized testing required
- No curriculum approval required

## Resources
- Mississippi Home Educators Assoc: mhea.net
- HSLDA Mississippi: hslda.org/legal/mississippi',
180, 0, true, 'low', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('MO','Missouri',
'# Missouri Homeschool Requirements

## Overview
Missouri has minimal requirements — no notice required, just hours of instruction.

## Key Requirements
- No notice of intent required
- 1,000 hours of instruction per year (at least 600 in core subjects: reading, language arts, math, social studies, science)
- No standardized testing required
- Maintain records of attendance, instruction hours, and materials used

## Resources
- Missouri Association of Teaching Christian Homes: match-inc.org
- HSLDA Missouri: hslda.org/legal/missouri',
0, 1000, false, 'low', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('MT','Montana',
'# Montana Homeschool Requirements

## Overview
Montana requires annual notice with the county superintendent.

## Key Requirements
- File annual notice with county school superintendent
- 180 days of instruction
- Required subjects: language arts, math, social studies, science, health
- No standardized testing required

## Resources
- Montana Coalition of Home Educators: mtche.org
- HSLDA Montana: hslda.org/legal/montana',
180, 0, true, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('NE','Nebraska',
'# Nebraska Homeschool Requirements

## Overview
Nebraska tracks instruction by hours rather than days.

## Key Requirements
- File annual notice with Nebraska Department of Education
- 1,032 hours of instruction per year
- Required subjects: language arts, math, science, social studies, health
- No standardized testing required

## Resources
- Nebraska Christian Home Educators Assoc: nchea.org
- HSLDA Nebraska: hslda.org/legal/nebraska',
0, 1032, true, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('NV','Nevada',
'# Nevada Homeschool Requirements

## Overview
Nevada requires annual notice of intent.

## Key Requirements
- File Notice of Intent with local school district annually
- 180 days of instruction
- Required subjects: English, math, science, social studies, health, PE
- No standardized testing required

## Resources
- Nevada Homeschool Network: nevadahomeschoolnetwork.com
- HSLDA Nevada: hslda.org/legal/nevada',
180, 0, true, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('NH','New Hampshire',
'# New Hampshire Homeschool Requirements

## Overview
New Hampshire requires annual notification and assessment.

## Key Requirements
- File annual Notice of Intent with local school district or state DOE
- 180 days of instruction
- Required subjects: science, math, language arts, social studies, health, PE, history, arts
- Annual assessment: standardized test, portfolio, or structured review by a certified teacher

## Resources
- NH Homeschooling Coalition: nhhomeschooling.org
- HSLDA New Hampshire: hslda.org/legal/new-hampshire',
180, 0, true, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('NJ','New Jersey',
'# New Jersey Homeschool Requirements

## Overview
New Jersey treats homeschools as equivalent to private schools with no registration required.

## Key Requirements
- No notice of intent required
- 180 days of instruction
- Instruction must be ''equivalent'' to public school education
- Required subjects: language arts, math, science, social studies, health, PE, arts
- No standardized testing required

## Resources
- New Jersey Homeschool Association: njha.com
- HSLDA New Jersey: hslda.org/legal/new-jersey',
180, 0, false, 'low', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('NM','New Mexico',
'# New Mexico Homeschool Requirements

## Overview
New Mexico has minimal homeschool requirements with no notice needed.

## Key Requirements
- No notice of intent required
- 180 days of instruction
- Required subjects: reading, language arts, math, social studies, science
- No standardized testing required

## Resources
- Christian Association of Parent Educators NM: cape-nm.net
- HSLDA New Mexico: hslda.org/legal/new-mexico',
180, 0, false, 'low', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('ND','North Dakota',
'# North Dakota Homeschool Requirements

## Overview
North Dakota is one of the more regulated states with prior approval and assessment requirements.

## Key Requirements
- File annual Notice of Intent with local school superintendent
- Teaching parent must hold a high school diploma and complete additional qualifications (or use approved online curriculum)
- 175 days of instruction
- Required subjects: language arts, math, science, social studies, health, PE, arts
- Annual standardized testing OR assessment by a certified teacher

## Resources
- North Dakota Home School Assoc: ndhsa.org
- HSLDA North Dakota: hslda.org/legal/north-dakota',
175, 0, true, 'high', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('OK','Oklahoma',
'# Oklahoma Homeschool Requirements

## Overview
Oklahoma is a homeschool-friendly state with minimal requirements.

## Key Requirements
- No notice of intent required
- 180 days of instruction
- Required subjects: reading, writing, math, science, social studies, US Constitution, health
- No standardized testing required

## Resources
- Oklahomans for Excellence in Science Education: oese.org
- HSLDA Oklahoma: hslda.org/legal/oklahoma',
180, 0, false, 'low', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('OR','Oregon',
'# Oregon Homeschool Requirements

## Overview
Oregon requires annual notice and assessment.

## Key Requirements
- File annual notice with your local Education Service District (ESD) by September 1
- 180 days of instruction
- No required subject list mandated
- Annual assessment for students in grades 3-8 and 10: standardized test OR assessment by a licensed teacher
- Assessment results submitted to ESD

## Resources
- Oregon Home Education Network: ohen.org
- HSLDA Oregon: hslda.org/legal/oregon',
180, 0, true, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('RI','Rhode Island',
'# Rhode Island Homeschool Requirements

## Overview
Rhode Island requires approval from the local school committee.

## Key Requirements
- File Notice of Intent with local school committee and obtain approval
- 180 days of instruction
- Required subjects: reading, writing, math, geography, US and Rhode Island history, health, PE
- Annual assessment: standardized test or other approved method

## Resources
- RI Guild of Home Teachers: right.org
- HSLDA Rhode Island: hslda.org/legal/rhode-island',
180, 0, true, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('SC','South Carolina',
'# South Carolina Homeschool Requirements

## Overview
South Carolina offers two compliance pathways — association or school district.

## Key Requirements
- Option 1: Enroll with an approved homeschool association (most common)
- Option 2: Operate under your local school district
- 180 days of instruction
- Required subjects: reading, writing, math, science, social studies
- Annual assessment of student progress

## Resources
- South Carolina Home Educators Assoc: schea.org
- HSLDA South Carolina: hslda.org/legal/south-carolina',
180, 0, false, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('SD','South Dakota',
'# South Dakota Homeschool Requirements

## Overview
South Dakota requires annual notice filing.

## Key Requirements
- File annual notice with local school district
- 175 days of instruction
- Required subjects: language arts, math, social studies, science, health, PE, arts
- No standardized testing required

## Resources
- South Dakota Christian Home Educators: sdche.org
- HSLDA South Dakota: hslda.org/legal/south-dakota',
175, 0, true, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('UT','Utah',
'# Utah Homeschool Requirements

## Overview
Utah is a homeschool-friendly state with minimal requirements.

## Key Requirements
- No notice of intent required
- 180 days of instruction
- No required subject list
- No standardized testing required
- Maintain your own records

## Resources
- Utah Home Education Assoc: utahhomeschooling.org
- HSLDA Utah: hslda.org/legal/utah',
180, 0, false, 'low', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('VT','Vermont',
'# Vermont Homeschool Requirements

## Overview
Vermont requires annual enrollment notice and assessment.

## Key Requirements
- File annual enrollment notice with Vermont Department of Education
- 175 days of instruction
- Required subjects: reading, writing, math, science, history, civics, PE, fine arts, health
- Annual assessment: standardized test, portfolio, or letter of evaluation from a certified teacher

## Resources
- Vermont Home Education Network: vermonthomeschool.org
- HSLDA Vermont: hslda.org/legal/vermont',
175, 0, true, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('WA','Washington',
'# Washington Homeschool Requirements

## Overview
Washington requires annual declaration and assessment.

## Key Requirements
- File annual Declaration of Intent with local school district
- Teaching parent must hold 45 college credits OR be supervised by a certificated teacher OR use an approved curriculum
- 180 days of instruction
- Required subjects: occupational education, science, math, language, social studies, history, health, PE, arts
- Annual assessment by a certificated person

## Resources
- Washington Homeschool Organization: washhomeschool.org
- HSLDA Washington: hslda.org/legal/washington',
180, 0, true, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('WV','West Virginia',
'# West Virginia Homeschool Requirements

## Overview
West Virginia is one of the more regulated states with detailed annual requirements.

## Key Requirements
- File annual Notice of Intent with county superintendent
- Teaching parent must have a high school diploma or GED
- 180 days of instruction
- Required subjects: reading, language arts, math, science, social studies, health, PE
- Annual standardized test or assessment by a certified teacher; results submitted to superintendent

## Resources
- West Virginia Home Educators Assoc: wvhea.org
- HSLDA West Virginia: hslda.org/legal/west-virginia',
180, 0, true, 'high', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('WI','Wisconsin',
'# Wisconsin Homeschool Requirements

## Overview
Wisconsin requires an annual enrollment filing but is otherwise low-regulation.

## Key Requirements
- File annual Statement of Enrollment with Wisconsin Department of Public Instruction
- 875 hours of instruction per year
- Required subjects: reading, language arts, math, social studies, science, health, PE, art, music
- No standardized testing required

## Resources
- Wisconsin Parents Association: homeschooling-wpa.org
- HSLDA Wisconsin: hslda.org/legal/wisconsin',
0, 875, false, 'low', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('WY','Wyoming',
'# Wyoming Homeschool Requirements

## Overview
Wyoming is a homeschool-friendly state with minimal requirements.

## Key Requirements
- No notice of intent required
- 175 days of instruction
- Required subjects: reading, writing, math, science, social studies, US Constitution, health, arts
- No standardized testing required

## Resources
- Wyoming Home Educators Network: when.org
- HSLDA Wyoming: hslda.org/legal/wyoming',
175, 0, false, 'low', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;

INSERT INTO state_compliance (state_code, state_name, legal_markdown, required_days, required_hours, noi_required, regulation_level, updated_at) VALUES
('DC','Washington D.C.',
'# Washington D.C. Homeschool Requirements

## Overview
D.C. has moderate requirements with annual notice and assessment.

## Key Requirements
- File Notice of Intent with DC Office of the State Superintendent of Education (OSSE)
- 180 days of instruction
- Required subjects: reading, writing, math, science, social studies, health, PE
- Annual assessment: standardized test or portfolio review

## Resources
- HSLDA D.C.: hslda.org/legal/district-of-columbia',
180, 0, true, 'moderate', now())
ON CONFLICT (state_code) DO UPDATE SET
  required_days=EXCLUDED.required_days, required_hours=EXCLUDED.required_hours,
  noi_required=EXCLUDED.noi_required, regulation_level=EXCLUDED.regulation_level;
