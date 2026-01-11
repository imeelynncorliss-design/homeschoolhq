import * as logger from '../utils/logger.js';

const COMMONCORE_STATES = { 'CA': 'California', 'VT': 'Vermont', 'MA': 'Massachusetts' };

export async function importCommonCoreStandards(stateCodes = ['CA', 'VT', 'MA']) {
  logger.section('Common Core Standards Import');
  logger.info(`Importing Common Core for: ${stateCodes.join(', ')}`);
  
  const allStandards = [];

  try {
    const elaStandards = getEmbeddedCommonCoreELA();
    const mathStandards = getEmbeddedCommonCoreMath();

    for (const stateCode of stateCodes) {
      const stateStandards = [
        ...duplicateForState(elaStandards, stateCode),
        ...duplicateForState(mathStandards, stateCode)
      ];
      
      allStandards.push(...stateStandards);
      logger.success(`  ✓ ${COMMONCORE_STATES[stateCode]}: ${stateStandards.length} standards`);
    }

    logger.success(`Total Common Core standards: ${allStandards.length}`);
    return allStandards;
  } catch (error) {
    logger.error('Fled to import Common Core:', error.message);
    throw error;
  }
}

function duplicateForState(standards, stateCode) {
  return standards.map(standard => ({
    state_code: stateCode,
    grade_level: standard.grade_level,
    subject: standard.subject,
    standard_code: standard.standard_code,
    description: standard.description,
    domain: standard.domain,
    template_name: standard.template_name,
    source_name: standard.source_name,
    source_url: standard.source_url,
    import_method: standard.import_method
  }));
}

function getEmbeddedCommonCoreELA() {
  return [
    {
      grade_level: '3',
      subject: 'English Language Arts',
      standard_code: 'CCSS.ELA-LITERACY.RL.3.1',
      description: 'Ask and answer questions to demonstrate understanding of a text, referring explicitly to the text as the basis for the answers.',
      domain: 'Reading Literature',
      template_name: 'Common Core State Standards ELA',
      source_name: 'Common Core State Standards Initiative',
      source_url: 'http://www.corestandards.org/',
      import_method: 'embedded'
    },
    {
      grade_level: '3',
      subject: 'English Language Arts',
      standard_code: 'CCSS.ELA-LITERACY.W.3.1',
      description: 'Write opinion pieces on topics or texts, supporting a point of view with reasons.',
      domain: 'Writing',
      template_name: 'Common Core State Standards ELA',
      source_name: 'Common Core State Standards Initiative',
      source_url: 'http://www.corestandards.org/',
      import_method: 'embedded'
    }
  ];
}

function getEmbeddedCommonCoreMath() {
  return [
    {
      grade_level: '3',
      subject: 'Mathematics',
      standard_code: 'CCSS.MATH.3.OA.A.1',
      description: 'Interpret products of whole numbers, e.g., interpret 5 × 7 as the total number of objects in 5 groups of 7 objects each.',
      domain: 'Operations & Algebraic Thinking',
      template_name: 'Common Core State Standards Math',
      source_name: 'Common Core State Standards Initiative',
      source_url: 'htp://www.corestandards.org/',
      import_method: 'embedded'
    },
    {
      grade_level: '3',
      subject: 'Mathematics',
      standard_code: 'CCSS.MATH.3.NBT.A.1',
      description: 'Use place value understanding to round whole numbers to the nearest 10 or 100.',
      domain: 'Number & Operations in Base Ten',
      template_name: 'Common Core State Standards Math',
      source_name: 'Common Core State Standards Initiative',
      source_url: 'http://www.corestandards.org/',
      import_method: 'embedded'
    }
  ];
}

export default { importCommonCoreStandards };
