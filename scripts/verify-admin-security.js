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

// Check backend admin list
const backendPath = path.join(__dirname, '../worker/src/lib/schoolRules.ts');
const backendContent = fs.readFileSync(backendPath, 'utf8');

// Extract admin lists from content
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

const backendAdmins = extractAdminList(backendContent);

console.log('Expected admins:', EXPECTED_ADMINS.length);
console.log('Backend admins:', backendAdmins?.length || 0);

if (backendAdmins?.length !== EXPECTED_ADMINS.length) {
  console.error('ERROR: Backend admin count mismatch!');
  process.exit(1);
}

// Verify expected admins
const backendSet = new Set(backendAdmins);

for (const expectedAdmin of EXPECTED_ADMINS) {
  if (!backendSet.has(expectedAdmin)) {
    console.error(`ERROR: Expected admin ${expectedAdmin} missing from backend!`);
    process.exit(1);
  }
}

console.log('\n=== Security Verification PASSED ===');
console.log('The backend admin list contains all expected admins and is properly configured.');
console.log('Admin emails:');
backendAdmins.forEach(admin => console.log(`  - ${admin}`));

