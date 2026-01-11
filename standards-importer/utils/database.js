import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

function getSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
      auth: {
        persistSession: false
      }
    }
  );
}

export async function insertStandardTemplates(standards, templateVersion, metadata = {}) {
  const supabase = getSupabaseClient();
  const batchSize = 100;
  const results = { inserted: 0, failed: 0, errors: [] };

  console.log(`\nDEBUG: Received ${standards.length} standards`);
  
  // Debug ALL standards
  standards.forEach((std, idx) => {
    console.log(`Standard ${idx + 1}: code=${std.standard_code}, subject="${std.subject}"`);
  });

  const templatesWithMeta = standards.map(std => ({
    state_code: std.state_code,
    grade_level: std.grade_level,
    subject: std.subject,
    standard_code: std.standard_code,
    description: std.description,
    domain: std.domain,
    template_version: templateVersion,
    template_name: std.template_name,
    source_name: metadata.source_name || 'Imported',
    source_url: metadata.source_url || null,
    import_method: std.import_method || 'api'
  }));

  console.log('\nDEBUG: After mapping:');
  templatesWithMeta.forEach((std, idx) => {
    console.log(`Template ${idx + 1}: code=${std.standard_code}, subject="${std.subject}"`);
  });

  for (let i = 0; i < templatesWithMeta.length; i += batchSize) {
    const batch = templatesWithMeta.slice(i, i + batchSize);
    
    try {
      const { data, error } = await supabase
        .from('standard_templates')
        .insert(batch)
        .select();

      if (error) {
        console.error('Insert error:', error);
        results.failed += batch.length;
        results.errors.push({ batch: Math.floor(i / batchSize) + 1, error: error.message });
      } else {
        const insertedCount = data?.length || 0;
        results.inserted += insertedCount;
        console.log(`Batch inserted: ${insertedCount} records`);
      }
    } catch (err) {
      console.error('Exception:', err);
      results.failed += batch.length;
      results.errors.push({ batch: Math.floor(i / batchSize) + 1, error: err.message });
    }
  }

  return results;
}

export async function getExistingTemplatesCount(stateCode) {
  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from('standard_templates')
    .select('*', { count: 'exact', head: true })
    .eq('state_code', stateCode);

  if (error) throw new Error(`Failed to check templates: ${error.message}`);
  return count || 0;
}

export async function testConnection() {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('standard_templates').select('id').limit(1);
    return !error;
  } catch (err) {
    return false;
  }
}

export default { insertStandardTemplates, getExistingTemplatesCount, testConnection };
