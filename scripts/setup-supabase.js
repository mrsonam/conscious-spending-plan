#!/usr/bin/env node

/**
 * Setup script to help configure Supabase connection
 * Run: node scripts/setup-supabase.js
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('🚀 Supabase Setup Helper\n');
  console.log('This script will help you configure your Supabase connection.\n');

  const connectionString = await question('Enter your Supabase connection string: ');
  
  if (!connectionString || !connectionString.includes('postgresql://')) {
    console.error('❌ Invalid connection string. Must start with postgresql://');
    process.exit(1);
  }

  // Ensure sslmode=require is present
  const finalConnectionString = connectionString.includes('sslmode=require') 
    ? connectionString 
    : `${connectionString}${connectionString.includes('?') ? '&' : '?'}sslmode=require`;

  console.log('\n✅ Connection string validated!');
  console.log('\n📝 Next steps:');
  console.log('1. Add this to your .env file:');
  console.log(`   DATABASE_URL="${finalConnectionString}"`);
  console.log('\n2. Run database migration:');
  console.log('   npx prisma generate');
  console.log('   npx prisma migrate dev --name init');
  console.log('\n3. Verify in Supabase Table Editor that tables are created');
  console.log('\n4. For Vercel deployment, add DATABASE_URL to environment variables');

  rl.close();
}

main().catch(console.error);
