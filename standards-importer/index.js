#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import * as logger from './utils/logger.js';
import * as db from './utils/database.js';
import { importCommonCoreStandards } from './importers/commoncore.js';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const program = new Command();

program
  .name('standards-importer')
  .description('HomeschoolHQ Standards Importer')
  .version('2.0.0');

program
  .command('import-commoncore-template')
  .description('Import Common Core standards as templates')
  .option('--states <states>', 'State codes (default: CA,VT,MA)', 'CA,VT,MA')
  .action(async (options) => {
    logger.section('Common Core Templates Import');
    const states = options.states.split(',').map(s => s.trim().toUpperCase());
    try {
      const connected = await db.testConnection();
      if (!connected) {
        logger.error('Cannot connect to database');
        process.exit(1);
      }
      const standards = await importCommonCoreStandards(states);
      const byState = {};
      states.forEach(state => {
        byState[state] = standards.filter(s => s.state_code === state);
      });
      for (const [state, stateStandards] of Object.entries(byState)) {
        const metadata = {
          source_name: 'Common Core State Standards Initiative',
          source_url: 'http://www.corestandards.org/'
        };
        const results = await db.insertStandardTemplates(stateStandards, '2024-' + state + '-CCSS', metadata);
        logger.success('✓ ' + state + ': ' + results.inserted + ' templates imported');
      }
    } catch (error) {
      logger.error('Import failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('check-templates')
  .description('Check available templates')
  .action(async () => {
    logger.section('Available Standards Templates');
    const states = ['TX', 'CA', 'VT', 'MA', 'VA', 'NC'];
    for (const state of states) {
      const count = await db.getExistingTemplatesCount(state);
      if (count > 0) {
        logger.success(state + ': ' + count + ' standards');
      } else {
        logger.info(state + ': No templates available');
      }
    }
  });

program
  .command('clone-to-user')
  .description('Clone a template to a user account')
  .requiredOption('--org <orgId>', 'Organization UUID')
  .requiredOption('--state <state>', 'State code')
  .action(async (options) => {
    logger.section('Clone Template to User');
    const { org, state } = options;
    try {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      const { data: orgCheck, error: orgError } = await supabase.from('organizations').select('id').eq('id', org).single();
      if (orgError || !orgCheck) {
        logger.error('Organization ' + org + ' not found');
        process.exit(1);
      }
      logger.info('Organization: ' + org);
      logger.info('State: ' + state);
      const { count: existingCount } = await supabase.from('user_standards').select('*', { count: 'exact', head: true }).eq('organization_id', org).eq('state_code', state);
      if (existingCount && existingCount > 0) {
        logger.warn('Organization already has ' + existingCount + ' standards for ' + state);
        logger.info('Skipping import');
        process.exit(0);
      }
      const templateVersion = '2024-' + state + '-CCSS';
      logger.info('Fetching template: ' + templateVersion);
      const { data: templates, error: fetchError } = await supabase.from('standard_templates').select('*').eq('state_code', state).eq('template_version', templateVersion);
      if (fetchError || !templates || templates.length === 0) {
        logger.error('No templates found');
        process.exit(1);
      }
      logger.success('Found ' + templates.length + ' standards in template');
      const userStandards = templates.map(t => ({
        organization_id: org,
        state_code: t.state_code,
        grade_level: t.grade_level,
        subject: t.subject,
        standard_code: t.standard_code,
        description: t.description,
        domain: t.domain,
        source: 'template',
        template_id: t.id,
        template_version: t.template_version,
        imported_date: new Date().toISOString(),
        active: true
      }));
      logger.info('Inserting standards...');
      const { error: insertError } = await supabase.from('user_standards').insert(userStandards);
      if (insertError) {
        logger.error('Insert failed:', insertError.message);
        process.exit(1);
      }
      logger.success('✓ Cloned ' + userStandards.length + ' standards to user account');
    } catch (error) {
      logger.error('Clone failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('check-user')
  .description('Check user standards')
  .requiredOption('--org <orgId>', 'Organization UUID')
  .action(async (options) => {
    logger.section('User Standards Summary');
    try {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      const { data: standards, error } = await supabase.from('user_standards').select('state_code, subject, active').eq('organization_id', options.org);
      if (error || !standards || standards.length === 0) {
        logger.info('User has no standards imported yet');
        process.exit(0);
      }
      const summary = {};
      standards.forEach(std => {
        if (!summary[std.state_code]) {
          summary[std.state_code] = { total: 0, active: 0, subjects: {} };
        }
        summary[std.state_code].total++;
        if (std.active) summary[std.state_code].active++;
        if (!summary[std.state_code].subjects[std.subject]) {
          summary[std.state_code].subjects[std.subject] = 0;
        }
        summary[std.state_code].subjects[std.subject]++;
      });
      Object.entries(summary).forEach(([state, data]) => {
        logger.success(state + ': ' + data.active + ' active / ' + data.total + ' total');
        Object.entries(data.subjects).forEach(([subject, count]) => {
          logger.info('  → ' + subject + ': ' + count + ' standards');
        });
      });
    } catch (error) {
      logger.error('Check failed:', error.message);
      process.exit(1);
    }
  });

program.parse();