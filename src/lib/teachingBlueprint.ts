// ─── Teaching Blueprint ────────────────────────────────────────────────────────
// The bridge between a parent's teaching style, their child's VAK learning
// style, and the child's Multiple Intelligences profile.
//
// This data powers:
//   1. The Teaching Blueprint card in child profiles
//   2. The onboarding completion screen preview
//   3. Scout's system prompt context for lesson personalization

// ── Types ─────────────────────────────────────────────────────────────────────

export type TeachingStyleId =
  | 'charlotte' | 'traditional' | 'eclectic' | 'unschooling'
  | 'classical'  | 'montessori'  | 'unit'      | 'waldorf'

export type VakType = 'visual' | 'auditory' | 'kinesthetic'

export type MiId =
  | 'logical' | 'musical' | 'naturalistic' | 'intrapersonal'
  | 'existential' | 'visual' | 'verbal' | 'kinesthetic' | 'interpersonal'

// ── Style × VAK Bridge Matrix ─────────────────────────────────────────────────
// For each teaching style + VAK combination: 4-5 actionable tips + a Scout tip

export interface VakBridge {
  headline: string   // "Charlotte Mason × Visual"
  intro: string      // one sentence framing the pairing
  tips: string[]     // 4-5 specific actionable teaching tips
  scoutTip: string   // Scout-voice recommendation combining all dimensions
}

type VakBridgeMatrix = Record<TeachingStyleId, Record<VakType, VakBridge>>

export const VAK_BRIDGE: VakBridgeMatrix = {

  charlotte: {
    visual: {
      headline: 'Charlotte Mason × Visual',
      intro: 'A natural fit — CM\'s picture study, illustrated living books, and nature journals are built for visual learners.',
      tips: [
        'Use nature journals with illustrations instead of written narration — let them draw what they observed',
        'Choose living books with strong illustrations; picture study is already a core CM practice',
        'Copywork works best when the passage is handwritten in a beautiful format they can see and imitate',
        'Create a "Book of Centuries" timeline with drawings and images to anchor history visually',
        'Use maps, nature field guides, and illustrated poetry collections as primary resources',
      ],
      scoutTip: 'Ask Scout to generate a nature journal prompt with an illustration guide — it combines CM narration with the visual strength perfectly.',
    },
    auditory: {
      headline: 'Charlotte Mason × Auditory',
      intro: 'Read-aloud and oral narration are CM cornerstones — auditory learners thrive in this environment.',
      tips: [
        'Lean heavily into oral narration — ask them to tell back what they heard immediately after reading aloud',
        'Poetry recitation and composer study are natural fits; make these a daily rhythm',
        'Dictation exercises are especially effective — hearing the passage before writing anchors it',
        'Try "loop scheduling" with short, varied lessons and frequent verbal check-ins',
        'Let them narrate into a recorder or "teach" you what they learned — speaking solidifies the memory',
      ],
      scoutTip: 'Ask Scout to write a read-aloud discussion guide for any living book — it gives you the right questions to spark oral narration.',
    },
    kinesthetic: {
      headline: 'Charlotte Mason × Kinesthetic',
      intro: 'CM\'s short lessons and outdoor focus give kinesthetic learners what they need — movement, nature, and doing.',
      tips: [
        'Nature study is your power tool — collecting, pressing, labeling, and building with natural materials',
        'Keep lessons to 15–20 minutes max; movement breaks between subjects are non-negotiable',
        'Copywork on a standing board or while seated outside changes the physical experience',
        'Act out historical scenes or narrate stories through dramatic play instead of writing',
        'Garden-based learning and handicrafts (knitting, woodworking, baking) count as CM lessons',
      ],
      scoutTip: 'Ask Scout to turn any CM lesson topic into a hands-on outdoor activity — it can suggest nature crafts, collections, and movement-based narration.',
    },
  },

  traditional: {
    visual: {
      headline: 'Traditional × Visual',
      intro: 'Traditional structure paired with visual presentation creates a clear, predictable learning environment.',
      tips: [
        'Choose textbooks with strong diagrams, charts, and color-coded sections over text-heavy workbooks',
        'Use color-coding for notes — different subjects or concept types get their own color',
        'Create a graphic organizer before every essay or writing assignment to visualize the structure',
        'Whiteboard or wall-mounted timeline for history keeps the big picture always visible',
        'Watch documentary supplements alongside the textbook chapter to reinforce visually',
      ],
      scoutTip: 'Ask Scout to create a visual study guide or concept map for any textbook chapter — it turns dense text into something a visual learner can scan and remember.',
    },
    auditory: {
      headline: 'Traditional × Auditory',
      intro: 'Read the textbook out loud and turn every lesson into a conversation — auditory learners learn best when they hear it.',
      tips: [
        'Read textbook sections aloud together rather than silent independent reading',
        'End every lesson with a verbal review — "Tell me the three things you learned today"',
        'Use audio supplements (audiobooks, educational podcasts) alongside the textbook',
        'For math, narrate the steps out loud while solving — "First I multiply, then I add..."',
        'Create memory songs or rhymes for facts that need memorizing (math facts, history dates)',
      ],
      scoutTip: 'Ask Scout to write a verbal review script for any subject — a set of discussion questions you can go through out loud at the end of each lesson.',
    },
    kinesthetic: {
      headline: 'Traditional × Kinesthetic',
      intro: 'Traditional structure needs adaptation — break it into short active bursts and add physical anchors to every lesson.',
      tips: [
        'Break lessons into 15-minute blocks with a movement break between each subject',
        'Use manipulatives for math — base-10 blocks, fraction tiles, dice, and counters',
        'Write spelling words with finger on a textured surface, in sand, or with large arm movements',
        'Do science experiments before reading the chapter — experience first, text second',
        'Let them work standing at a counter or on a clip board on the floor instead of at a desk',
      ],
      scoutTip: 'Ask Scout to add a hands-on activity to any traditional lesson plan — it can suggest experiments, building projects, or movement-based drills that reinforce the concept.',
    },
  },

  classical: {
    visual: {
      headline: 'Classical × Visual',
      intro: 'Classical education\'s love of order and structure pairs well with visual organization tools.',
      tips: [
        'Use illustrated timelines — classical history is chronological, and a wall timeline anchors every lesson',
        'Graphic organizers for logic stage: Venn diagrams, argument maps, cause-and-effect charts',
        'Latin and grammar rules work well as color-coded charts on the wall for daily reference',
        'Great Books study: let them illustrate scenes or create visual summaries of chapters',
        'Science diagrams drawn by hand — label, color, and annotate rather than just reading descriptions',
      ],
      scoutTip: 'Ask Scout to create a visual grammar or logic chart for any concept — it can format rules, patterns, and structures in a scannable visual format.',
    },
    auditory: {
      headline: 'Classical × Auditory',
      intro: 'Socratic discussion, recitation, and rhetoric are classical cornerstones — auditory learners were born for this.',
      tips: [
        'Memory work (grammar stage) done through oral recitation, chanting, and songs — not written drills',
        'Socratic discussion for every Great Books reading — ask "why" and let them reason out loud',
        'Latin is best learned through verbal recitation of paradigms and chanting declensions',
        'Logic stage: debate exercises where they argue both sides of an issue out loud',
        'Rhetoric stage: speeches, presentations, and oral essays before written ones',
      ],
      scoutTip: 'Ask Scout to write a Socratic discussion guide for any Great Book or history topic — it gives you the right questions to draw out their reasoning.',
    },
    kinesthetic: {
      headline: 'Classical × Kinesthetic',
      intro: 'Classical\'s disciplined structure needs physical anchoring — bring history and ideas into the body.',
      tips: [
        'Act out historical events: assign roles, create costumes, debate as historical figures',
        'Memory work pegged to movements — each grammar rule or fact has a physical gesture',
        'Build models: Roman aqueducts, Greek temples, medieval siege weapons from cardboard',
        'Logic puzzles and debates with physical props — tangrams, building blocks for abstract concepts',
        'Write on a large whiteboard standing up — the whole-body movement helps retention',
      ],
      scoutTip: 'Ask Scout to turn any classical history lesson into a hands-on project or role-play scenario — it can script historical debates and model-building activities.',
    },
  },

  unschooling: {
    visual: {
      headline: 'Unschooling × Visual',
      intro: 'Follow the child\'s interests and let them document everything visually — the portfolio becomes the curriculum.',
      tips: [
        'Documentary films, YouTube deep-dives, and illustrated reference books are legitimate curriculum',
        'Let them create visual projects: posters, illustrated books, sketchnote journals of interests',
        'Photography as learning: document nature, community, experiments, and discoveries with a camera',
        'Map-making for any interest — geography of a favorite book world, local nature trail maps',
        'Visual interest journals: scrapbooks, Pinterest-style collections of anything they\'re obsessing over',
      ],
      scoutTip: 'Ask Scout to suggest a visual project based on your child\'s current interest — it can generate illustrated book ideas, documentary recommendations, and display project concepts.',
    },
    auditory: {
      headline: 'Unschooling × Auditory',
      intro: 'Conversation IS the curriculum for auditory unschoolers — rich discussions and storytelling are the core practice.',
      tips: [
        'Audiobooks and podcasts count as deep learning — curate a library of their interests',
        'Long conversations about anything they\'re curious about are the lesson',
        'Let them "teach" what they\'ve learned by explaining it to you — speaking cements knowing',
        'Music, song-writing, and spoken word poetry are legitimate academic pursuits',
        'Record their stories, ideas, and explanations — playback reinforces and they often want to improve it',
      ],
      scoutTip: 'Ask Scout to suggest podcast series, audiobook recommendations, or discussion starters based on your child\'s current interest area.',
    },
    kinesthetic: {
      headline: 'Unschooling × Kinesthetic',
      intro: 'This is the most natural pairing in homeschooling — a kinesthetic child learning through doing is unschooling at its purest.',
      tips: [
        'Real-world projects are the full curriculum: cooking, building, gardening, coding, crafting',
        'Field trips, apprenticeships, and community involvement count as rigorous learning',
        'Let them run, build, take things apart, and make things — document it as portfolio evidence',
        'Sports, dance, martial arts, and maker spaces are subject areas, not extracurriculars',
        'Co-ops and collaborative projects with other kids bring interpersonal depth to kinesthetic work',
      ],
      scoutTip: 'Ask Scout to suggest real-world projects based on your child\'s current interest — it can map any hobby or passion to multiple subject areas for portfolio documentation.',
    },
  },

  eclectic: {
    visual: {
      headline: 'Eclectic × Visual',
      intro: 'The eclectic approach gives you freedom to always choose the most visual option — use it.',
      tips: [
        'Pick the most visual version of any curriculum — illustrated workbooks, diagram-heavy texts, video-based programs',
        'Color-code your subject rotation: each subject has a color for notebooks, folders, and schedule blocks',
        'For any topic with a boring textbook, swap in a documentary, illustrated reference, or infographic instead',
        'Teaching Textbooks, Khan Academy videos, and Visual Latin are great eclectic picks for visual learners',
        'Create a visual learning portfolio: photos, drawings, and visual projects as the record of learning',
      ],
      scoutTip: 'Ask Scout to recommend the most visual-friendly resource for any subject — it can suggest illustrated books, video series, and diagram-heavy workbooks.',
    },
    auditory: {
      headline: 'Eclectic × Auditory',
      intro: 'Mix and match freely — always bias toward audio, discussion, and verbal processing when choosing resources.',
      tips: [
        'Supplement any written curriculum with its audiobook or podcast equivalent',
        'Discussion-heavy for humanities; verbal narration replaces written summaries wherever possible',
        'Brave Writer\'s approach to writing through talking is a natural eclectic pick',
        'Morning meeting/circle time with verbal review of the week anchors the eclectic schedule',
        'Let them choose which subjects to cover verbally vs in writing — honor the preference',
      ],
      scoutTip: 'Ask Scout to convert any written assignment into a verbal alternative — it can create oral discussion guides, podcast-style reporting, and verbal narration prompts.',
    },
    kinesthetic: {
      headline: 'Eclectic × Kinesthetic',
      intro: 'Eclectic means you\'re free to ditch anything that requires sitting still — build a kinesthetic-first schedule.',
      tips: [
        'Popcorn reading and discussion replaces silent reading; math manipulatives replace worksheets',
        'Build your schedule around 15-minute subject blocks with movement between each',
        'Five in a Row and unit studies are strong eclectic picks — project-based and multi-sensory',
        'Science hands-on first, always: experiment before reading the explanation',
        'For subjects they resist, find the kinesthetic version first — math through cooking, history through building',
      ],
      scoutTip: 'Ask Scout to redesign any lesson as a hands-on activity — it can suggest projects, experiments, and movement-based learning for any subject.',
    },
  },

  montessori: {
    visual: {
      headline: 'Montessori × Visual',
      intro: 'Montessori materials are already beautifully visual — lean into the color-coded bead chains, cards, and maps.',
      tips: [
        'Montessori color-coded grammar symbols and bead materials are perfect for visual learners — use them intentionally',
        'Three-part cards (picture, label, combined) for any subject: geography, botany, zoology',
        'Create a beautiful, visually organized environment — Montessori shelves as visual menus of learning',
        'Illustrated Montessori timeline of life and history of the universe are visual anchor points',
        'Botany and zoology cards with detailed illustrations — visual learners love the detail',
      ],
      scoutTip: 'Ask Scout to suggest Montessori three-part card topics for any subject your child is interested in — it can outline the vocabulary and illustrations needed.',
    },
    auditory: {
      headline: 'Montessori × Auditory',
      intro: 'Pair Montessori\'s self-directed work with rich verbal demonstrations and storytelling presentations.',
      tips: [
        'Montessori Great Lessons are storytelling — tell them with full dramatic effect for auditory learners',
        'Give verbal demonstrations of every new material before expecting independent work',
        'Three-period lessons work especially well verbally: "This is... Show me... What is this?"',
        'Read aloud about any topic they\'re working with independently — context through story',
        'Let them narrate their work back to you at the end of the work period',
      ],
      scoutTip: 'Ask Scout to write a storytelling version of any Montessori Great Lesson topic — auditory learners need the narrative before the material work.',
    },
    kinesthetic: {
      headline: 'Montessori × Kinesthetic',
      intro: 'This is Montessori\'s core gift — the materials ARE hands-on. Kinesthetic learners thrive with full Montessori implementation.',
      tips: [
        'Prioritize every material that involves manipulation: bead chains, spindle boxes, moveable alphabet',
        'Practical life activities (pouring, spooning, folding, food prep) are core academic work — treat them as such',
        'Outdoor Montessori: gardening, nature observation trays, and outdoor practical life',
        'Let them move between the shelves freely during work periods — kinesthetic learners need this choice',
        'Metal insets, sandpaper letters, and the stamp game are especially powerful for kinesthetic learners',
      ],
      scoutTip: 'Ask Scout to suggest Montessori practical life extensions for any concept — it can connect abstract academic ideas to hands-on material work.',
    },
  },

  unit: {
    visual: {
      headline: 'Unit Studies × Visual',
      intro: 'Unit studies let you go deep on one topic — create a visual world around the theme and let the learner live in it.',
      tips: [
        'Create a visual display wall for the unit: maps, timelines, images, artifacts, and the child\'s own work',
        'Documentary film series as a unit spine — especially powerful for visual learners',
        'Illustrated timelines for history-based units; nature field guides for science units',
        'End each unit with a visual presentation: poster, illustrated book, or display project',
        'Five in a Row and Tapestry of Grace both have strong visual components — good starting points',
      ],
      scoutTip: 'Ask Scout to suggest a visual display project for your current unit theme — it can outline a gallery-style display, illustrated timeline, or documentary list.',
    },
    auditory: {
      headline: 'Unit Studies × Auditory',
      intro: 'Wrap the entire unit in story, discussion, and audio — auditory learners love the narrative richness unit studies offer.',
      tips: [
        'Open every unit with a read-aloud of the best narrative book on the topic',
        'Documentary podcasts and audio histories add depth — assign listening as part of the unit',
        'End-of-unit oral presentation or "museum exhibit" where they explain what they learned',
        'Discussion as daily practice: "What surprised you most? What questions do you still have?"',
        'Create a unit soundtrack — find music from the era or region being studied',
      ],
      scoutTip: 'Ask Scout to write an oral presentation guide for the end of any unit — it gives your child a structured way to talk through everything they\'ve learned.',
    },
    kinesthetic: {
      headline: 'Unit Studies × Kinesthetic',
      intro: 'Unit studies and kinesthetic learners are a natural match — one big hands-on project ties the whole unit together.',
      tips: [
        'Anchor every unit with a big build project: model pyramids, pioneer cabin, medieval trebuchet, terrarium',
        'Cooking and food as curriculum: historical recipes, regional dishes, science of cooking',
        'Field trips tied to the unit theme are the most powerful kinesthetic learning experiences',
        'KONOS character-based unit studies are designed for kinesthetic multi-age learning',
        'End with a "living museum" — the child becomes an expert and demonstrates or performs',
      ],
      scoutTip: 'Ask Scout to suggest a hands-on culminating project for any unit theme — it can outline a step-by-step build, cooking project, or living museum presentation.',
    },
  },

  waldorf: {
    visual: {
      headline: 'Waldorf × Visual',
      intro: 'Waldorf\'s main lesson books and artistic integration are built for visual learners — beauty is the pedagogy.',
      tips: [
        'Main lesson books with careful illustrations, borders, and watercolor paintings are the core practice',
        'Block crayons and wet-on-wet watercolor before every academic introduction — image before concept',
        'Form drawing as a daily visual-spatial practice that bridges art and geometry',
        'Chalkboard drawings done by the parent during oral lessons give visual learners an image to hold',
        'Eurythmy and seasonal festivals have visual-aesthetic depth — don\'t skip the artistic components',
      ],
      scoutTip: 'Ask Scout to suggest a main lesson book layout for any topic — it can outline illustrations, borders, and artistic elements to create alongside the content.',
    },
    auditory: {
      headline: 'Waldorf × Auditory',
      intro: 'Storytelling IS Waldorf — auditory learners are at home in a method built on oral tradition and rhythm.',
      tips: [
        'All academic content introduced through storytelling first — never textbook first',
        'Morning circle with verses, songs, and recitation anchors the auditory learner\'s day',
        'Speech and drama exercises — tongue twisters, poetry, and class plays',
        'Recall the story the next morning before introducing any new content — oral narration',
        'Music is mandatory in Waldorf: recorder, singing, and pentatonic instruments for young children',
      ],
      scoutTip: 'Ask Scout to write a Waldorf-style story introduction to any academic topic — the narrative comes first, always, for auditory learners.',
    },
    kinesthetic: {
      headline: 'Waldorf × Kinesthetic',
      intro: 'Waldorf\'s handwork, eurythmy, and rhythmic learning are gifts to kinesthetic learners — embrace all of it.',
      tips: [
        'Handwork is academic: knitting, cross-stitch, woodworking, and weaving develop fine motor and focus',
        'Eurythmy (movement art) is a core Waldorf practice — kinesthetic learners need this daily rhythm',
        'Form drawing done with large arm movements before pencil — embody the shape first',
        'Beeswax modeling instead of clay; candle-making, bread-baking, and crafts as curriculum',
        'Morning circle verses and songs with full body movement — clapping, stomping, and gesturing',
      ],
      scoutTip: 'Ask Scout to suggest a Waldorf handwork project connected to any academic topic — it can link crafts, movement, and seasonal work to what you\'re studying.',
    },
  },
}

// ── MI × Teaching Style Bridges ───────────────────────────────────────────────
// For each MI type: how each teaching style can lean into that intelligence

export interface MiBridgeTip {
  styleId: TeachingStyleId
  tip: string
}

export const MI_TIPS: Record<MiId, { headline: string; parentNote: string; forStyle: Partial<Record<TeachingStyleId, string>> }> = {
  logical: {
    headline: 'Logical-Mathematical',
    parentNote: 'This child loves patterns, sequences, and figuring out how things work. Give them the rules and the "why" — they\'ll want to test the edges.',
    forStyle: {
      charlotte: 'Nature classification, timeline sequencing, and logic puzzles between lessons',
      classical: 'This is classical\'s home turf — logic stage and math are natural strengths',
      traditional: 'Sequential textbook math is a natural fit; add logic puzzles as enrichment',
      montessori: 'Bead chains, stamp game, and the mathematical mind materials are ideal',
      unschooling: 'Coding, strategy games, puzzles, and building challenges as the full curriculum',
    },
  },
  musical: {
    headline: 'Musical-Rhythmic',
    parentNote: 'Rhythm is how this child organizes information. Songs, patterns, and instruments aren\'t extras — they\'re the primary learning mode.',
    forStyle: {
      charlotte: 'Composer study is already CM — expand it; add memory songs for any fact-based content',
      waldorf: 'Perfect fit — recorder, pentatonic instruments, and morning verses are core Waldorf practice',
      classical: 'Memory work chanted and sung in the grammar stage; music history in the logic stage',
      traditional: 'Replace drills with songs; math facts, history dates, and grammar rules all benefit from melody',
      unschooling: 'Music lessons, songwriting, and instrument mastery as the legitimate full curriculum',
    },
  },
  naturalistic: {
    headline: 'Naturalist',
    parentNote: 'This child needs to be outside. Nature isn\'t a break from learning — it IS learning. Bring the classroom outdoors as often as possible.',
    forStyle: {
      charlotte: 'Charlotte Mason was made for naturalists — nature journals, field guides, and outdoor lessons are the spine',
      montessori: 'Waseca biomes materials, garden-based practical life, outdoor trays, and nature tables',
      waldorf: 'Seasonal rhythms, nature crafts, gardening, and outdoor forest time are core Waldorf practice',
      unschooling: 'Nature as the entire curriculum — identification, ecology, citizen science projects',
      unit: 'Nature-based unit studies: biomes, local ecology, animal deep-dives, and conservation',
    },
  },
  intrapersonal: {
    headline: 'Intrapersonal',
    parentNote: 'This child is deeply self-aware and needs time to process internally before sharing. Don\'t rush the response — the thinking is happening.',
    forStyle: {
      charlotte: 'Solo nature study, journaling, and self-paced reading with reflection time',
      montessori: 'Self-directed work periods are ideal — this child thrives with independent material exploration',
      unschooling: 'Self-directed interest work with journaling and personal project documentation',
      classical: 'Written narration and essay work; Socratic discussion with time to think before answering',
      waldorf: 'Main lesson book as personal reflection space; solo handwork and artistic practice',
    },
  },
  existential: {
    headline: 'Existentialist',
    parentNote: 'This child asks "why does this matter?" before engaging. Lead with the big idea, the purpose, or the story — then zoom into the content.',
    forStyle: {
      charlotte: 'Living books that connect to human meaning; nature study as wonder practice',
      classical: 'Great Books, Socratic seminars, and philosophy woven through history and literature',
      waldorf: 'Waldorf\'s developmental arc is fundamentally existential — cosmic stories and big questions are the spine',
      unschooling: 'Follow their philosophical questions wherever they lead — deep dives into ethics, religion, and culture',
      unit: 'History and culture unit studies with a "why does this civilization matter?" framing',
    },
  },
  visual: {
    headline: 'Visual-Spatial',
    parentNote: 'This child thinks in pictures and space. They need to see it, map it, or build it to understand it. Text alone won\'t stick.',
    forStyle: {
      charlotte: 'Picture study, nature journals, illustrated living books, and maps',
      classical: 'Illustrated timelines, graphic organizers, and color-coded grammar charts',
      montessori: 'Three-part cards, color-coded materials, and beautifully organized shelves',
      waldorf: 'Main lesson book illustrations, form drawing, and chalkboard drawings',
      unit: 'Visual display walls, illustrated timelines, and documentary-based unit studies',
    },
  },
  verbal: {
    headline: 'Verbal-Linguistic',
    parentNote: 'Words are this child\'s native language. Reading, writing, and speaking are both how they learn and how they shine.',
    forStyle: {
      charlotte: 'Living books, narration, copywork, dictation, and poetry recitation — all perfect fits',
      classical: 'The grammar-logic-rhetoric stages are built for verbal learners; Latin is a bonus',
      waldorf: 'Storytelling, verses, and main lesson books deeply honor verbal-linguistic strength',
      eclectic: 'Brave Writer, strong read-aloud programs, and writing-heavy supplements',
      traditional: 'Standard textbooks work well; add journal writing and book reports as expression outlets',
    },
  },
  kinesthetic: {
    headline: 'Kinesthetic-Bodily',
    parentNote: 'This child learns through movement and touch. Sitting still is not a discipline issue — it\'s a mismatch. Build movement into the lesson, not just around it.',
    forStyle: {
      montessori: 'The most natural fit — all Montessori materials are tactile and kinesthetic',
      charlotte: 'Hands-on nature study, handicrafts, and dramatic narration; keep lessons short',
      unschooling: 'Real-world doing IS the curriculum — building, cooking, sports, and making',
      waldorf: 'Eurythmy, handwork, and movement in morning circle deeply honor kinesthetic learners',
      unit: 'Hands-on culminating projects, living museum presentations, and field trips',
    },
  },
  interpersonal: {
    headline: 'Interpersonal',
    parentNote: 'This child thinks out loud with other people. Solo work is harder — they need a partner, a discussion, or an audience to reach full engagement.',
    forStyle: {
      classical: 'Socratic seminars, debate, and co-op learning are perfect; classical conversations co-ops',
      unschooling: 'Co-ops, community projects, apprenticeships, and collaborative making',
      unit: 'Multi-age unit study groups, co-op presentations, and collaborative projects',
      charlotte: 'Narration to a partner, poetry teatime with others, and CM co-op settings',
      waldorf: 'Class plays, group projects, and seasonal festival celebrations emphasize the social',
    },
  },
}

// ── Utility: Get Bridge for a specific combination ────────────────────────────

export function getVakBridge(styleId: string, vak: string): VakBridge | null {
  const style = VAK_BRIDGE[styleId as TeachingStyleId]
  if (!style) return null
  return style[vak as VakType] ?? null
}

export function getMiTips(miIds: string[], styleId: string): Array<{ mi: typeof MI_TIPS[MiId]; styleTip: string | null }> {
  return miIds.map(id => {
    const mi = MI_TIPS[id as MiId]
    if (!mi) return null
    return {
      mi,
      styleTip: mi.forStyle[styleId as TeachingStyleId] ?? null,
    }
  }).filter(Boolean) as Array<{ mi: typeof MI_TIPS[MiId]; styleTip: string | null }>
}
