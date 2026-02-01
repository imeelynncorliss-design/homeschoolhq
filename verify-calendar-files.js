// verify-calendar-files.js
// Run this to verify all Work Calendar Integration files are in place
// Usage: node verify-calendar-files.js

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Work Calendar Integration Files...\n');

let missing = 0;
let found = 0;

const files = {
  'Service Files': [
    'src/lib/calendar/google-calendar-service.ts',
    'src/lib/calendar/outlook-calendar-service.ts',
    'src/lib/calendar/calendar-sync-service.ts',
    'src/lib/calendar/conflict-detection-service.ts',
  ],
  'Types File': [
    'src/types/calendar.ts',
  ],
  'API Routes': [
    'app/api/calendar/oauth/google/route.ts',
    'app/api/calendar/oauth/outlook/route.ts',
    'app/api/calendar/sync/route.ts',
    'app/api/calendar/conflicts/route.ts',
    'app/api/calendar/connections/route.ts',
    'app/api/calendar/connections/[id]/route.ts',
  ],
  'UI Pages': [
    'app/calendar/connect/page.tsx',
    'app/calendar/conflicts/page.tsx',
  ],
};

for (const [category, fileList] of Object.entries(files)) {
  console.log(`📁 ${category} (${fileList.length}):`);
  
  fileList.forEach(file => {
    const exists = fs.existsSync(file);
    if (exists) {
      console.log(`✅ ${file}`);
      found++;
    } else {
      console.log(`❌ MISSING: ${file}`);
      missing++;
    }
  });
  
  console.log('');
}

console.log('================================');
console.log('📊 Summary:');
console.log(`   Found: ${found} / 13`);
console.log(`   Missing: ${missing} / 13`);
console.log('================================\n');

if (missing === 0) {
  console.log('🎉 SUCCESS! All 13 files are in place!\n');
  console.log('Next steps:');
  console.log('1. npm run dev');
  console.log('2. Visit: http://localhost:3000/calendar/connect');
  console.log('3. Click "Connect Google Calendar"');
} else {
  console.log('⚠️  Please copy the missing files listed above');
  process.exit(1);
}