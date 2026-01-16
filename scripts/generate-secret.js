#!/usr/bin/env node

const crypto = require('crypto');

// Generate a secure random secret
const secret = crypto.randomBytes(32).toString('base64');

console.log('\n✅ Generated NEXTAUTH_SECRET:');
console.log(secret);
console.log('\n📝 Add this to your .env file:');
console.log(`NEXTAUTH_SECRET="${secret}"`);
console.log('\n');
