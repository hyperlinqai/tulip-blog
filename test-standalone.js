const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Testing standalone backend...');

// Test that all required files exist
const requiredFiles = [
  'package.json',
  '.env',
  'src/main.js',
  'src/database.js',
  'prisma/schema.prisma',
  'README.md',
  'Dockerfile'
];

console.log('📁 Checking required files...');
const fs = require('fs');
let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    allFilesExist = false;
  }
});

if (allFilesExist) {
  console.log('🎉 All required files present! Backend is ready for deployment.');
} else {
  console.log('❌ Some files are missing. Please check the setup.');
}

// Test environment variables
console.log('\n🔧 Checking environment variables...');
try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
  
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
  ];

  let allEnvVarsSet = true;
  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar] && process.env[envVar] !== 'your-secret-key-here-min-32-chars') {
      console.log(`✅ ${envVar} is set`);
    } else {
      console.log(`❌ ${envVar} is not set or uses default value`);
      allEnvVarsSet = false;
    }
  });

  if (allEnvVarsSet) {
    console.log('🎉 All environment variables are configured!');
  } else {
    console.log('❌ Some environment variables need to be configured.');
  }
} catch (error) {
  console.log('ℹ️ Environment check skipped (dotenv not installed yet)');
}

console.log('\n📋 Deployment Summary:');
console.log('- Standalone backend created at: /Users/shoaibkhan/Desktop/Development/blog-backend-standalone');
console.log('- Ready for deployment to any server');
console.log('- Use "npm start" to run in production');
console.log('- Use "npm run dev" for development');
console.log('- Docker support included');
console.log('- PM2 configuration included');