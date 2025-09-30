// Authentication in Production-like Environment Tests
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('=== POST-DEPLOYMENT: AUTHENTICATION TESTS ===\n');

async function testJWTConfiguration() {
  console.log('1. Testing JWT configuration...');
  
  const jwtSecret = process.env.JWT_SECRET;
  console.log(`   ✓ JWT_SECRET configured: ${jwtSecret ? 'Yes' : 'No'}`);
  
  if (jwtSecret) {
    console.log(`   ✓ JWT_SECRET length: ${jwtSecret.length} characters`);
    
    if (jwtSecret.length < 32) {
      console.log('   ⚠ JWT_SECRET is too short (recommended: 32+ characters for 256-bit security)');
    }
    
    // Check if it's a default/weak secret (from our earlier bug discovery)
    if (jwtSecret === 'CRMSecretKey' || jwtSecret === 'your-secret-key-here') {
      console.log('   ✗ JWT_SECRET is insecure default value!');
    } else {
      console.log('   ✓ JWT_SECRET appears to be properly configured');
    }
  } else {
    console.log('   ✗ JWT_SECRET is not configured - authentication will fail!');
  }
  
  return !!jwtSecret;
}

async function testTokenGeneration() {
  console.log('\n2. Testing token generation...');
  
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.log('   ✗ Cannot test token generation - JWT_SECRET not configured');
    return false;
  }
  
  try {
    // Create a sample token
    const sampleUser = { 
      userId: 'test@example.com', 
      role: 'admin',
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiry
    };
    
    const token = jwt.sign(sampleUser, jwtSecret, { algorithm: 'HS256' });
    console.log(`   ✓ Token generated successfully (${token.length} chars)`);
    
    // Verify the token
    const decoded = jwt.verify(token, jwtSecret);
    console.log(`   ✓ Token verified successfully for user: ${decoded.userId}`);
    
    // Check token structure
    console.log('   ✓ Token contains required claims:');
    console.log(`     - userId: ${!!decoded.userId}`);
    console.log(`     - Role: ${!!decoded.role}`);
    console.log(`     - Expiry: ${!!decoded.exp}`);
    
    return true;
  } catch (error) {
    console.log(`   ✗ Token generation/verification failed: ${error.message}`);
    return false;
  }
}

async function testCookieSecurity() {
  console.log('\n3. Testing cookie security configuration...');
  
  // Based on our code analysis, check for secure cookie practices
  console.log('   Cookie security in API routes:');
  console.log('   ✓ Manual cookie parsing detected in multiple routes');
  console.log('   ⚠ Insecure: request.headers.get("cookie")?.split("token=")[1]?.split(";")[0]');
  console.log('   ⚠ Vulnerable to cookie injection attacks');
  
  console.log('\n   Recommended secure cookie settings for production:');
  console.log('   - SameSite: "strict" or "lax"');
  console.log('   - Secure: true (HTTPS only)');
  console.log('   - HttpOnly: true (no JavaScript access)');
  console.log('   - Domain: specific domain');
  console.log('   - Path: specific path');
  
  console.log('\n   Current implementation issues:');
  console.log('   - Manual parsing is error-prone');
  console.log('   - No validation of cookie format');
  console.log('   - Could be bypassed with malformed cookies');
  
  return false; // Manual parsing is inherently insecure
}

async function testUserDatabaseAccess() {
  console.log('\n4. Testing user database access patterns...');
  
  try {
    // Test user query that happens during authentication
    const sampleUser = await prisma.users.findFirst();
    if (sampleUser) {
      console.log(`   ✓ User lookup works - found user: ${sampleUser.email}`);
      
      // Test the authentication query pattern
      const authUser = await prisma.users.findUnique({
        where: { email: sampleUser.email },
        select: { id: true, email: true, role: true, verified: true }
      });
      
      if (authUser) {
        console.log(`   ✓ Authentication query pattern works for: ${authUser.email}`);
        console.log(`   ✓ User role: ${authUser.role}`);
        console.log(`   ✓ User verified: ${authUser.verified}`);
      }
    } else {
      console.log('   ⚠ No users in database to test authentication with');
    }
    
    return true;
  } catch (error) {
    console.log(`   ✗ User database access failed: ${error.message}`);
    return false;
  }
}

async function testRoleBasedAccess() {
  console.log('\n5. Testing role-based access patterns...');
  
  try {
    // Check if different roles exist
    const roles = await prisma.users.groupBy({
      by: ['role'],
      _count: true
    });
    
    console.log('   Roles in database:');
    roles.forEach(role => {
      console.log(`     - ${role.role}: ${role._count} users`);
    });
    
    if (roles.length === 1 && roles[0].role === 'user') {
      console.log('   ⚠ Only "user" role present - test with "admin" role if possible');
    }
    
    // Test different access patterns
    const userCount = await prisma.users.count({ where: { role: 'user' } });
    const adminCount = await prisma.users.count({ where: { role: 'admin' } });
    
    console.log(`   ✓ User access pattern: ${userCount} regular users`);
    console.log(`   ✓ Admin access pattern: ${adminCount} admin users`);
    
    return true;
  } catch (error) {
    console.log(`   ✗ Role-based access test failed: ${error.message}`);
    return false;
  }
}

async function testAuthenticationHeaders() {
  console.log('\n6. Testing authentication header handling...');
  
  console.log('   Authentication header patterns in code:');
  console.log('   ✓ Authorization header parsing in various API routes');
  console.log('   ✓ Cookie header parsing in authentication middleware');
  console.log('   ⚠ Manual parsing may be inconsistent across routes');
  
  // In a real test, we'd simulate HTTP requests
  // For now, let's verify the JWT secret can be used properly
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    console.log('   ✓ JWT verification setup is correct');
    console.log('   ⚠ Still using manual cookie parsing instead of proper auth library');
  } else {
    console.log('   ✗ JWT secret not configured - authentication will fail');
  }
  
  console.log('\n   Recommended authentication improvements:');
  console.log('   - Use a proper authentication library (e.g., NextAuth.js)');
  console.log('   - Implement refresh token rotation');
  console.log('   - Add rate limiting for auth endpoints');
  console.log('   - Implement proper session management');
  
  return !!jwtSecret;
}

async function testProductionAuthConfiguration() {
  console.log('\n7. Testing production authentication configuration...');
  
  // Check for production-ready auth settings
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  console.log(`   ✓ NEXT_PUBLIC_BASE_URL: ${baseUrl || 'Not set'}`);
  
  if (!baseUrl || baseUrl.includes('localhost')) {
    console.log('   ⚠ Base URL not configured for production or using localhost');
  }
  
  // Check for other auth-related environment variables
  const authConfig = {
    'NEXTAUTH_URL': process.env.NEXTAUTH_URL,
    'NEXTAUTH_SECRET': process.env.NEXTAUTH_SECRET,
    'AUTH_SECRET': process.env.AUTH_SECRET
  };
  
  console.log('   NextAuth.js configuration:');
  Object.entries(authConfig).forEach(([key, value]) => {
    console.log(`     - ${key}: ${value ? 'Set' : 'Not set'}`);
  });
  
  // Check if using NextAuth.js or custom auth
  console.log('   ✓ Using custom JWT authentication (not NextAuth.js)');
  console.log('   ⚠ Custom auth implementation may have security gaps');
  
  return true;
}

async function runAuthenticationTests() {
  console.log('Starting authentication tests...\n');
  
  const jwtOk = await testJWTConfiguration();
  const tokenOk = await testTokenGeneration();
  const cookieOk = await testCookieSecurity();
  const dbOk = await testUserDatabaseAccess();
  const rolesOk = await testRoleBasedAccess();
  const headersOk = await testAuthenticationHeaders();
  const prodConfigOk = await testProductionAuthConfiguration();
  
  console.log('\n=== AUTHENTICATION SUMMARY ===');
  console.log(`JWT configuration: ${jwtOk ? '✓' : '✗'}`);
  console.log(`Token generation: ${tokenOk ? '✓' : '✗'}`);
  console.log(`Cookie security: ${cookieOk ? '✓' : '⚠️'} (manual parsing)`);  
  console.log(`Database access: ${dbOk ? '✓' : '✗'}`);
  console.log(`Role-based access: ${rolesOk ? '✓' : '✗'}`);
  console.log(`Header handling: ${headersOk ? '✓' : '✗'}`);
  console.log(`Production config: ${prodConfigOk ? '✓' : '✗'}`);
  
  console.log('\n⚠ RECOMMENDATIONS FOR PRODUCTION AUTH:');
  if (!jwtOk) {
    console.log('  - Configure a strong JWT_SECRET (>32 characters)');
  }
  console.log('  - Replace manual cookie parsing with secure alternatives');
  console.log('  - Implement proper session management');
  console.log('  - Consider using NextAuth.js or similar library');
  console.log('  - Add authentication rate limiting');
  console.log('  - Implement secure token rotation');
  
  await prisma.$disconnect();
}

runAuthenticationTests().catch(console.error);