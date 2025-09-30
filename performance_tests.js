// Performance Tests with Larger Datasets
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('=== POST-DEPLOYMENT: PERFORMANCE WITH LARGER DATASETS ===\n');

async function testDatasetSizes() {
  console.log('1. Testing current dataset sizes...');
  
  try {
    const counts = {
      users: await prisma.users.count(),
      leads: await prisma.leads.count(),
      opportunities: await prisma.opportunities.count(),
      attendances: await prisma.attendances.count(),
      activities: await prisma.activities.count(),
      notifications: await prisma.notifications.count(),
      immediate_sales: await prisma.immediate_sales.count(),
      daily_follow_ups: await prisma.daily_follow_ups.count(),
      companies: await prisma.companies.count(),
      contacts: await prisma.contacts.count(),
      pending_quotations: await prisma.pending_quotations.count(),
      pipelines: await prisma.pipelines.count(),
      projects: await prisma.projects.count(),
      forecasts: await prisma.forecasts.count()
    };
    
    console.log('   Current dataset sizes:');
    Object.entries(counts).forEach(([model, count]) => {
      let perfNote = '';
      if (count > 10000) perfNote = ' ⚠ Large dataset';
      else if (count > 1000) perfNote = ' ⚠ Medium dataset';
      else if (count > 100) perfNote = ' (normal for development)';
      else perfNote = ' (small for performance testing)';
      
      console.log(`     - ${model}: ${count}${perfNote}`);
    });
    
    return counts;
  } catch (error) {
    console.log(`   ✗ Dataset size test failed: ${error.message}`);
    return null;
  }
}

async function testPaginationPerformance() {
  console.log('\n2. Testing pagination performance...');
  
  try {
    // Test fetching different page sizes
    const pageSizes = [10, 50, 100, 500];
    
    for (const pageSize of pageSizes) {
      const start = Date.now();
      
      const result = await prisma.leads.findMany({
        take: pageSize,
        select: { id: true, name: true, createdDate: true, qualificationStage: true }
      });
      
      const duration = Date.now() - start;
      
      console.log(`   ✓ Page size ${pageSize}: ${duration}ms (${result.length} records)`);
      
      if (duration > 1000) {
        console.log(`     ⚠ Slow performance for page size ${pageSize}`);
      } else if (duration > 500) {
        console.log(`     ⚠ Moderate performance for page size ${pageSize}`);
      }
    }
    
    return true;
  } catch (error) {
    console.log(`   ✗ Pagination performance test failed: ${error.message}`);
    return false;
  }
}

async function testFilteringPerformance() {
  console.log('\n3. Testing filtering performance...');
  
  try {
    // Test filtering on different fields
    const filters = [
      { name: 'Date range filter', filter: { createdDate: { gte: new Date('2024-01-01') } } },
      { name: 'Status filter', filter: { qualificationStage: 'NEW' } },
      { name: 'User filter', filter: { ownerId: 1 } }
    ];
    
    for (const { name, filter } of filters) {
      const start = Date.now();
      
      const result = await prisma.leads.findMany({
        where: filter,
        take: 10
      });
      
      const duration = Date.now() - start;
      console.log(`   ✓ ${name}: ${duration}ms (${result.length} results)`);
      
      if (duration > 500) {
        console.log(`     ⚠ Slow performance for ${name.toLowerCase()}`);
      }
    }
    
    return true;
  } catch (error) {
    console.log(`   ✗ Filtering performance test failed: ${error.message}`);
    return false;
  }
}

async function testAnalyticsQueryPerformance() {
  console.log('\n4. Testing analytics query performance...');
  
  try {
    // Simulate analytics queries that might be used in production
    const analyticsQueries = [
      {
        name: 'Lead conversion rates',
        query: async () => prisma.leads.groupBy({
          by: ['qualificationStage'],
          _count: true
        })
      },
      {
        name: 'Opportunity pipeline',
        query: async () => prisma.opportunities.groupBy({
          by: ['stage'],
          _count: true
        })
      },
      {
        name: 'User activity',
        query: async () => prisma.activities.groupBy({
          by: ['userId'],
          _count: true
        })
      },
      {
        name: 'Monthly leads',
        query: async () => prisma.leads.groupBy({
          by: ['createdDate'],
          _count: true
        })
      }
    ];
    
    for (const { name, query } of analyticsQueries) {
      const start = Date.now();
      
      try {
        const result = await query();
        const duration = Date.now() - start;
        
        console.log(`   ✓ ${name}: ${duration}ms (${result.length} groups)`);
        
        if (duration > 2000) {
          console.log(`     ⚠ Very slow analytics query: ${name}`);
        } else if (duration > 1000) {
          console.log(`     ⚠ Slow analytics query: ${name}`);
        } else if (duration > 500) {
          console.log(`     ⚠ Moderate analytics query: ${name}`);
        }
        
        // If we have results, show a sample
        if (result.length > 0) {
          console.log(`     Sample: ${JSON.stringify(result[0])}`);
        }
      } catch (queryError) {
        console.log(`   ✗ ${name} failed: ${queryError.message}`);
      }
    }
    
    return true;
  } catch (error) {
    console.log(`   ✗ Analytics query performance test failed: ${error.message}`);
    return false;
  }
}

async function testSearchPerformance() {
  console.log('\n5. Testing search performance...');
  
  try {
    const searchTerms = [
      { name: 'Short name', term: 'PRATEEK' },
      { name: 'Email', term: 'gmail.com' },
      { name: 'Status', term: 'NEW' }
    ];
    
    for (const { name, term } of searchTerms) {
      const start = Date.now();
      
      // Simple search using contains (this would be better with database indices)
      const result = await prisma.users.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } }
          ]
        },
        take: 10
      });
      
      const duration = Date.now() - start;
      console.log(`   ✓ ${name} ('${term}'): ${duration}ms (${result.length} results)`);
      
      if (duration > 1000) {
        console.log(`     ⚠ Slow search performance for ${name.toLowerCase()}`);
        console.log(`     ⚠ Consider adding database indices for search fields`);
      }
    }
    
    return true;
  } catch (error) {
    console.log(`   ✗ Search performance test failed: ${error.message}`);
    return false;
  }
}

async function testLargeJoinPerformance() {
  console.log('\n6. Testing large dataset join performance...');
  
  try {
    // Test a complex join that might be problematic with larger datasets
    const start = Date.now();
    
    const result = await prisma.users.findMany({
      include: {
        leads: {
          include: {
            opportunities: {
              include: {
                pipelines: true
              }
            }
          },
          take: 2  // Limit to prevent too much data
        }
      },
      take: 2  // Limit to prevent too much data
    });
    
    const duration = Date.now() - start;
    console.log(`   ✓ Complex join (users with leads->opportunities->pipelines): ${duration}ms`);
    console.log(`   ✓ Retrieved data for ${result.length} users with their relations`);
    
    if (duration > 3000) {
      console.log('   ⚠ Very slow complex join performance - needs optimization');
      console.log('   ⚠ Consider denormalization or separate queries');
    } else if (duration > 1500) {
      console.log('   ⚠ Slow complex join performance');
    } else if (duration > 500) {
      console.log('   ⚠ Moderate complex join performance');
    }
    
    return duration;
  } catch (error) {
    console.log(`   ✗ Large join performance test failed: ${error.message}`);
    return null;
  }
}

async function runPerformanceTests() {
  console.log('Starting performance tests with datasets...\n');
  
  const sizes = await testDatasetSizes();
  if (!sizes) return;
  
  const paginationOk = await testPaginationPerformance();
  const filteringOk = await testFilteringPerformance();
  const analyticsOk = await testAnalyticsQueryPerformance();
  const searchOk = await testSearchPerformance();
  const joinTime = await testLargeJoinPerformance();
  
  console.log('\n=== PERFORMANCE SUMMARY ===');
  console.log(`Dataset sizes: ${sizes ? 'Analyzed' : 'Failed'}`);
  console.log(`Pagination performance: ${paginationOk ? '✓' : '✗'}`);
  console.log(`Filtering performance: ${filteringOk ? '✓' : '✗'}`);
  console.log(`Analytics queries: ${analyticsOk ? '✓' : '✗'}`);
  console.log(`Search performance: ${searchOk ? '✓' : '✗'}`);
  console.log(`Large join performance: ${joinTime ? `${joinTime}ms` : 'Failed'}`);
  
  console.log('\n⚠ RECOMMENDATION: For production deployment:');
  console.log('  - Add database indices for frequently queried fields');
  console.log('  - Implement pagination for large datasets');
  console.log('  - Optimize complex join queries');
  console.log('  - Consider caching for frequently accessed data');
  console.log('  - Monitor query performance in production');
  
  await prisma.$disconnect();
}

runPerformanceTests().catch(console.error);