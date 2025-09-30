// Database Connection Under Load Tests
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('=== POST-DEPLOYMENT: DATABASE CONNECTION TESTS ===\n');

async function testConnectionPool() {
  console.log('1. Testing database connection configuration...');
  
  try {
    // Test basic connection
    await prisma.$connect();
    console.log('   ✓ Basic database connection successful');
    
    // Get connection info (if available)
    try {
      const result = await prisma.$queryRaw`SELECT version(), current_database(), current_user;`;
      console.log('   Database info:');
      console.log(`     - Version: ${result[0].version.split(' ')[0] || result[0].version}`);
      console.log(`     - Current DB: ${result[0].current_database}`);
      console.log(`     - Current user: ${result[0].current_user}`);
    } catch (queryError) {
      console.log(`   ⚠ Could not get detailed database info: ${queryError.message}`);
    }
    
    return true;
  } catch (error) {
    console.log(`   ✗ Database connection failed: ${error.message}`);
    return false;
  }
}

async function testConnectionPerformance() {
  console.log('\n2. Testing connection performance...');
  
  const iterations = 10;
  let totalTime = 0;
  
  try {
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await prisma.users.count(); // Simple query
      const end = Date.now();
      const duration = end - start;
      totalTime += duration;
      
      if (i < 3 || i === iterations - 1) { // Show first few and last
        console.log(`   Query ${i + 1}: ${duration}ms`);
      }
    }
    
    const avgTime = totalTime / iterations;
    console.log(`   Average query time: ${avgTime.toFixed(2)}ms`);
    
    if (avgTime > 500) {
      console.log('   ⚠ Slow connection performance detected (average > 500ms)');
    } else if (avgTime > 100) {
      console.log('   ⚠ Moderate connection performance (average > 100ms)');
    } else {
      console.log('   ✓ Good connection performance');
    }
    
    return avgTime;
  } catch (error) {
    console.log(`   ✗ Connection performance test failed: ${error.message}`);
    return null;
  }
}

async function testConnectionStress() {
  console.log('\n3. Testing connection stress (concurrent requests)...');
  
  try {
    const concurrentRequests = 5;
    console.log(`   Making ${concurrentRequests} concurrent requests...`);
    
    const start = Date.now();
    const promises = [];
    
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        prisma.users.count().then(count => ({
          id: i,
          count,
          time: Date.now()
        }))
      );
    }
    
    const results = await Promise.all(promises);
    const end = Date.now();
    const totalDuration = end - start;
    
    console.log(`   ✓ All ${concurrentRequests} concurrent requests completed in ${totalDuration}ms`);
    console.log(`   Individual results: ${results.map(r => r.count).join(', ')}`);
    
    if (totalDuration > 2000) {
      console.log('   ⚠ High stress response time detected (> 2s for concurrent requests)');
    } else {
      console.log('   ✓ Good stress performance');
    }
    
    return totalDuration;
  } catch (error) {
    console.log(`   ✗ Connection stress test failed: ${error.message}`);
    return null;
  }
}

async function testConnectionReliability() {
  console.log('\n4. Testing connection reliability...');
  
  try {
    // Simulate connection interruptions by disconnecting and reconnecting
    await prisma.$disconnect();
    console.log('   ✓ Disconnected from database');
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Reconnect
    await prisma.$connect();
    console.log('   ✓ Reconnected to database successfully');
    
    // Verify connection works after reconnection
    const userCount = await prisma.users.count();
    console.log(`   ✓ Connection verified - found ${userCount} users`);
    
    return true;
  } catch (error) {
    console.log(`   ✗ Connection reliability test failed: ${error.message}`);
    return false;
  }
}

async function testQueryComplexity() {
  console.log('\n5. Testing complex query performance...');
  
  try {
    // Test a complex join query similar to what might be used in analytics
    const start = Date.now();
    
    const complexResult = await prisma.leads.findMany({
      take: 5,
      include: {
        users: true,
        opportunities: {
          include: {
            pipelines: true
          }
        }
      }
    });
    
    const duration = Date.now() - start;
    console.log(`   Complex query (5 leads with relations) took ${duration}ms`);
    
    if (duration > 1000) {
      console.log('   ⚠ Complex query performance concern (> 1000ms)');
    } else if (duration > 500) {
      console.log('   ⚠ Moderate complex query performance (> 500ms)');
    } else {
      console.log('   ✓ Good complex query performance');
    }
    
    console.log(`   ✓ Retrieved ${complexResult.length} leads with full relations`);
    
    return duration;
  } catch (error) {
    console.log(`   ✗ Complex query test failed: ${error.message}`);
    return null;
  }
}

async function runDatabaseTests() {
  console.log('Starting database connection tests...\n');
  
  const connectionOk = await testConnectionPool();
  let avgTime = null;
  let stressTime = null;
  let reliabilityOk = null;
  let queryTime = null;
  
  if (connectionOk) {
    avgTime = await testConnectionPerformance();
    stressTime = await testConnectionStress();
    reliabilityOk = await testConnectionReliability();
    queryTime = await testQueryComplexity();
  }
  
  console.log('\n=== DATABASE CONNECTION SUMMARY ===');
  console.log(`Basic connection: ${connectionOk ? '✓' : '✗'}`);
  console.log(`Average query time: ${avgTime ? `${avgTime.toFixed(2)}ms` : 'Failed'}`);
  console.log(`Stress test time: ${stressTime ? `${stressTime}ms` : 'Failed'}`);
  console.log(`Reliability test: ${reliabilityOk ? '✓' : '✗'}`);
  console.log(`Complex query time: ${queryTime ? `${queryTime}ms` : 'Failed'}`);
  
  if (avgTime && avgTime > 200) {
    console.log('\n⚠ RECOMMENDATION: Database performance optimization needed:');
    console.log('  - Add proper indexing');
    console.log('  - Optimize complex queries');
    console.log('  - Consider connection pooling settings');
  }
  
  await prisma.$disconnect();
}

runDatabaseTests().catch(console.error);