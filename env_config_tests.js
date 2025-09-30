// Post-Deployment Environment Configuration Tests
const fs = require('fs');
const path = require('path');

console.log('=== POST-DEPLOYMENT: ENVIRONMENT CONFIGURATION TESTS ===\n');

function testEnvironmentVariables() {
  console.log('1. Testing Required Environment Variables...');
  
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET', 
    'NEXT_PUBLIC_BASE_URL',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY'
  ];
  
  const missingVars = [];
  const insecureVars = [];
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      missingVars.push(varName);
      console.log(`   ✗ Missing: ${varName}`);
    } else {
      // Check for insecure defaults
      if (varName === 'JWT_SECRET' && 
          (value === 'CRMSecretKey' || value === 'your-secret-key-here' || value.length < 32)) {
        insecureVars.push(varName);
        console.log(`   ⚠ Insecure JWT_SECRET: ${varName} (too short or default value)`);
      } else {
        console.log(`   ✓ Set: ${varName} (${value.length} chars)`);
      }
    }
  });
  
  if (missingVars.length === 0) {
    console.log('   ✓ All required environment variables are present');
  } else {
    console.log(`   ⚠ ${missingVars.length} required variables are missing`);
  }
  
  if (insecureVars.length > 0) {
    console.log(`   ⚠ ${insecureVars.length} variables have insecure values`);
  }
  
  return { missingVars, insecureVars };
}

function testEnvironmentContext() {
  console.log('\n2. Testing Environment Context...');
  
  const env = process.env.NODE_ENV || 'development';
  console.log(`   ✓ NODE_ENV: ${env}`);
  
  // Check if we're in a serverless environment
  const isVercel = process.env.VERCEL === '1';
  const isNetlify = process.env.NETLIFY === 'true';
  const isServerless = isVercel || isNetlify || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  
  console.log(`   ✓ Platform detection: ${isVercel ? 'Vercel' : isNetlify ? 'Netlify' : 'Other'}`);
  console.log(`   ✓ Serverless environment: ${isServerless ? 'Yes' : 'No'}`);
  
  // Check for serverless-specific limitations
  if (isServerless) {
    console.log('   ⚠ Serverless platform detected - checking limitations...');
    
    // Maximum function timeout (Vercel has 60s default for hobby, 900s for pro)
    console.log('   - Function timeout: max 60s (hobby) or 900s (pro/enterprise) on Vercel');
    console.log('   - Consider optimizing long-running operations');
  }
  
  return { env, isServerless };
}

function testDatabaseConfig() {
  console.log('\n3. Testing Database Configuration...');
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('   ✗ DATABASE_URL not set');
    return false;
  }
  
  try {
    const url = new URL(dbUrl);
    console.log(`   ✓ Database provider: ${url.protocol.replace(':', '')}`);
    console.log(`   ✓ Database host: ${url.hostname}`);
    console.log(`   ✓ Database name: ${url.pathname.split('/')[1] || 'default'}`);
    
    // Check if using local database (common development mistake)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      console.log('   ⚠ Using local database - may not work in cloud deployment');
    } else {
      console.log('   ✓ Using remote database - appropriate for cloud deployment');
    }
    
    return true;
  } catch (error) {
    console.log(`   ✗ Invalid DATABASE_URL format: ${error.message}`);
    return false;
  }
}

function testFileUploadConfig() {
  console.log('\n4. Testing File Upload Configuration...');
  
  const cloudinaryConfig = {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  };
  
  const missingCloudinary = [];
  Object.entries(cloudinaryConfig).forEach(([key, value]) => {
    if (!value) {
      missingCloudinary.push(key);
      console.log(`   ✗ Missing Cloudinary config: ${key}`);
    } else {
      console.log(`   ✓ Cloudinary ${key}: set`);
    }
  });
  
  if (missingCloudinary.length === 0) {
    console.log('   ✓ All Cloudinary configuration present');
  } else {
    console.log(`   ⚠ ${missingCloudinary.length} Cloudinary config items missing`);
    console.log('   - File uploads may fallback to local storage which won\'t work on serverless platforms');
  }
  
  return { missingCloudinary };
}

function runEnvironmentTests() {
  console.log('Starting environment configuration tests...\n');
  
  const envVars = testEnvironmentVariables();
  const envContext = testEnvironmentContext();
  const dbConfig = testDatabaseConfig();
  const fileConfig = testFileUploadConfig();
  
  console.log('\n=== ENVIRONMENT TEST SUMMARY ===');
  console.log(`Missing environment variables: ${envVars.missingVars.length}`);
  console.log(`Insecure environment variables: ${envVars.insecureVars.length}`);
  console.log(`Missing Cloudinary config: ${fileConfig.missingCloudinary.length}`);
  console.log('Database configuration:', dbConfig ? 'Valid' : 'Invalid');
  
  if (envVars.missingVars.length > 0 || envVars.insecureVars.length > 0) {
    console.log('\n⚠ RECOMMENDATION: Fix environment configuration before deployment');
  } else {
    console.log('\n✓ Environment configuration looks good for deployment');
  }
}

runEnvironmentTests();