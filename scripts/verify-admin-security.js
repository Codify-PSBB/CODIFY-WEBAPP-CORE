#!/usr/bin/env node

/**
 * Security Verification Script
 * Ensures admin email lists are synchronized and consistent across frontend and backend
 */

const fs = require('fs');
const path = require('path');

// Expected admin emails
const EXPECTED_ADMINS = [
  's220162@psbbschools.edu.in',
  's120029@psbbschools.edu.in',
  's120007@psbbschools.edu.in',
  's160153@psbbschools.edu.in'
];

console.log('=== Admin Security Verification ===\n');

// Check frontend admin list
const frontendPath = path.join(__dirname, '../frontend/src/lib/schoolRules.ts');
const frontendContent = fs.readFileSync(frontendPath, 'utf8');

// Check backend admin list
const backendPath = path.join(__dirname, '../worker/src/lib/schoolRules.ts');
const backendContent = fs.readFileSync(backendPath, 'utf8');

// Extract admin lists from both files
function extractAdminList(content) {
  const match = content.match(/ADMIN_EMAIL_LIST\s*=\s*\[([\s\S]*?)\]/);
  if (!match) return null;
  
  const listStr = match[1];
  const emails = [];
  
  // Extract emails from the array (handle both single and double quotes)
  const singleQuoteMatches = listStr.match(/'([^']+)'/g);
  const doubleQuoteMatches = listStr.match(/"([^"]+)"/g);
  
  if (singleQuoteMatches) {
    emails.push(...singleQuoteMatches.map(e => e.replace(/'/g, '').trim()));
  }
  
  if (doubleQuoteMatches) {
    emails.push(...doubleQuoteMatches.map(e => e.replace(/"/g, '').trim()));
  }
  
  return emails.sort();
}

const frontendAdmins = extractAdminList(frontendContent);
const backendAdmins = extractAdminList(backendContent);

console.log('Expected admins:', EXPECTED_ADMINS.length);
console.log('Frontend admins:', frontendAdmins?.length || 0);
console.log('Backend admins:', backendAdmins?.length || 0);

// Verify counts
if (frontendAdmins?.length !== EXPECTED_ADMINS.length) {
  console.error('ERROR: Frontend admin count mismatch!');
  process.exit(1);
}

if (backendAdmins?.length !== EXPECTED_ADMINS.length) {
  console.error('ERROR: Backend admin count mismatch!');
  process.exit(1);
}

// Verify synchronization
if (JSON.stringify(frontendAdmins) !== JSON.stringify(backendAdmins)) {
  console.error('ERROR: Frontend and backend admin lists are not synchronized!');
  console.error('Frontend:', frontendAdmins);
  console.error('Backend:', backendAdmins);
  process.exit(1);
}

// Verify expected admins
const frontendSet = new Set(frontendAdmins);
const backendSet = new Set(backendAdmins);

for (const expectedAdmin of EXPECTED_ADMINS) {
  if (!frontendSet.has(expectedAdmin)) {
    console.error(`ERROR: Expected admin ${expectedAdmin} missing from frontend!`);
    process.exit(1);
  }
  
  if (!backendSet.has(expectedAdmin)) {
    console.error(`ERROR: Expected admin ${expectedAdmin} missing from backend!`);
    process.exit(1);
  }
}

console.log('\n=== Security Verification PASSED ===');
console.log('All admin lists are properly synchronized and contain the expected 4 admins.');
console.log('Admin emails:');
frontendAdmins.forEach(admin => console.log(`  - ${admin}`));
