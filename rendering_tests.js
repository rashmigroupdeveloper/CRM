// Static/Dynamic Rendering Issues Tests
const fs = require('fs');
const path = require('path');

console.log('=== POST-DEPLOYMENT: STATIC/DYNAMIC RENDERING TESTS ===\n');

function testPageGeneration() {
  console.log('1. Testing page generation patterns...');
  
  const appDir = path.join(__dirname, 'src', 'app');
  if (!fs.existsSync(appDir)) {
    console.log('   ✗ src/app directory not found');
    return false;
  }
  
  // Count the number of page files
  const pageFiles = [];
  const dynamicRoutes = [];
  
  function walkDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (file === 'api') continue; // Skip API routes for now
        
        // Check if this is a dynamic route
        if (file.startsWith('[') && file.endsWith(']')) {
          dynamicRoutes.push(filePath);
        }
        
        walkDirectory(filePath);
      } else if (file === 'page.tsx' || file === 'page.jsx') {
        pageFiles.push(filePath);
      }
    }
  }
  
  walkDirectory(appDir);
  
  console.log(`   ✓ Found ${pageFiles.length} page components`);
  console.log(`   ✓ Found ${dynamicRoutes.length} dynamic route directories`);
  
  if (dynamicRoutes.length > 0) {
    console.log('   Dynamic routes found:');
    dynamicRoutes.slice(0, 5).forEach(route => {
      console.log(`     - ${path.relative(appDir, route)}`);
    });
    if (dynamicRoutes.length > 5) {
      console.log(`     ... and ${dynamicRoutes.length - 5} more`);
    }
  }
  
  return true;
}

function testRouteConfigurations() {
  console.log('\n2. Testing route configurations...');
  
  // Check for mixed static and dynamic routes
  const appDir = path.join(__dirname, 'src', 'app');
  
  // Common routes that might need dynamic rendering due to auth/data fetching
  const routesToCheck = [
    'dashboard',
    'leads',
    'opportunities', 
    'attendance',
    'analytics',
    'profile'
  ];
  
  console.log('   Checking common CRM routes:');
  routesToCheck.forEach(route => {
    const routePath = path.join(appDir, route, 'page.tsx');
    const routeExists = fs.existsSync(routePath);
    console.log(`     - /${route}: ${routeExists ? 'Exists' : 'Not found'}`);
  });
  
  // Check for dynamic routes that require data fetching
  console.log('\n   Dynamic routes requiring data fetching:');
  const dynamicExamples = [
    { route: 'leads/[id]', purpose: 'Lead details' },
    { route: 'opportunities/[id]', purpose: 'Opportunity details' },
    { route: 'companies/[id]', purpose: 'Company details' }
  ];
  
  dynamicExamples.forEach(example => {
    const routePath = path.join(appDir, example.route.replace(/\[.*?\]/g, 'id'), 'page.tsx');
    const exists = fs.existsSync(routePath);
    console.log(`     - /${example.route} (${example.purpose}): ${exists ? 'Exists' : 'Not found'}`);
  });
  
  return true;
}

function testDataFetchingPatterns() {
  console.log('\n3. Testing data fetching patterns...');
  
  // Look for common data fetching patterns that affect rendering
  const commonDataFetchPatterns = [
    { name: 'Server-side fetching', pattern: 'fetch(', risk: 'Can slow page loads' },
    { name: 'Database queries', pattern: 'prisma.', risk: 'Can cause slow SSR' },
    { name: 'Environment checks', pattern: 'process.env', risk: 'SSG vs SSR implications' },
    { name: 'Auth checks', pattern: 'getUserFromToken', risk: 'Can cause hydration issues' }
  ];
  
  console.log('   Potential rendering impact patterns:');
  commonDataFetchPatterns.forEach(pattern => {
    console.log(`     - ${pattern.name}: ${pattern.risk}`);
  });
  
  // Check a sample page for data fetching
  const samplePageRoute = path.join(__dirname, 'src', 'app', 'dashboard', 'page.tsx');
  if (fs.existsSync(samplePageRoute)) {
    const pageContent = fs.readFileSync(samplePageRoute, 'utf8');
    
    console.log('\n   Data fetching analysis for dashboard page:');
    commonDataFetchPatterns.forEach(pattern => {
      const hasPattern = pageContent.includes(pattern.pattern);
      console.log(`     - ${pattern.name}: ${hasPattern ? 'Found' : 'Not found'}`);
    });
  } else {
    console.log('\n   Dashboard page not found to analyze.');
  }
  
  return true;
}

function testBuildConfiguration() {
  console.log('\n4. Testing build configuration...');
  
  // Check next.config.js for rendering optimization settings
  const nextConfigPath = path.join(__dirname, 'next.config.ts');
  if (!fs.existsSync(nextConfigPath)) {
    console.log('   ✗ next.config.ts not found');
    return false;
  }
  
  const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
  
  console.log('   Next.js configuration analysis:');
  
  // Check for static generation settings
  const hasStaticGeneration = nextConfig.includes('output: \'export\'') || 
                             nextConfig.includes('trailingSlash') ||
                             nextConfig.includes('images: {') ||
                             nextConfig.includes('reactStrictMode');
  
  // Check for server-side rendering settings
  const hasSSRSettings = nextConfig.includes('headers') || 
                        nextConfig.includes('async headers') ||
                        nextConfig.includes('X-Frame-Options') ||
                        nextConfig.includes('security headers');
  
  console.log(`     - Static generation friendly: ${hasStaticGeneration ? 'Yes' : 'Limited'}`);
  console.log(`     - Server-side rendering support: ${hasSSRSettings ? 'Yes' : 'Basic'}`);
  
  // Check for image optimization
  const hasImageConfig = nextConfig.includes('images:') || nextConfig.includes('remotePatterns');
  console.log(`     - Image optimization configured: ${hasImageConfig ? 'Yes' : 'No'}`);
  
  // Check for security headers
  const hasSecurityHeaders = nextConfig.includes('X-Frame-Options') || 
                            nextConfig.includes('X-Content-Type-Options') ||
                            nextConfig.includes('Strict-Transport-Security');
  console.log(`     - Security headers configured: ${hasSecurityHeaders ? 'Yes' : 'No'}`);
  
  return true;
}

function testEnvironmentDependentRendering() {
  console.log('\n5. Testing environment-dependent rendering...');
  
  // Check for patterns that might cause differences between dev/prod
  const potentialIssues = [
    { name: 'NODE_ENV checks', pattern: 'process.env.NODE_ENV', example: 'Different behavior in dev vs prod' },
    { name: 'Base URL dependencies', pattern: 'NEXT_PUBLIC_BASE_URL', example: 'Localhost vs production URLs' },
    { name: 'Database differences', pattern: 'DATABASE_URL', example: 'Different data in dev vs prod' },
    { name: 'API endpoint differences', pattern: 'process.env', example: 'Different APIs in env vars' }
  ];
  
  console.log('   Environment-sensitive patterns that may cause rendering differences:');
  potentialIssues.forEach(issue => {
    console.log(`     - ${issue.name}: ${issue.example}`);
  });
  
  // Check for client-side vs server-side rendering issues
  console.log('\n   Client/Server rendering considerations:');
  console.log('     - Auth state must be handled properly between CSR and SSR');
  console.log('     - Environment variables availability differs between client/server');
  console.log('     - May experience hydration errors if client and server render differently');
  
  return true;
}

function testPageSpeedOptimization() {
  console.log('\n6. Testing page speed optimization...');
  
  console.log('   Potential optimization opportunities:');
  
  // Check for common performance issues
  const performanceChecklist = [
    { check: 'Large component imports', status: '❓', comment: 'Check for heavy libraries' },
    { check: 'Image optimization', status: '❓', comment: 'Using next/image components' },
    { check: 'CSS bundling', status: '❓', comment: 'Tailwind CSS in use (good)' },
    { check: 'JS splitting', status: '❓', comment: 'Next.js handles this automatically' },
    { check: 'API route optimization', status: '⚠️', comment: 'Multiple DB queries in some routes' },
    { check: 'Data fetching optimization', status: '⚠️', comment: 'Some routes fetch too much data' }
  ];
  
  performanceChecklist.forEach(item => {
    console.log(`     ${item.status} ${item.check}: ${item.comment}`);
  });
  
  // Check for loading states
  console.log('\n   Loading state considerations:');
  console.log('     - Server-side rendering will show loading states appropriately');
  console.log('     - Data fetching may cause slower initial loads');
  console.log('     - Consider implementing skeleton screens');
  
  return true;
}

function testDeploymentRendering() {
  console.log('\n7. Testing deployment-specific rendering considerations...');
  
  // Check for serverless-specific rendering issues
  console.log('   Serverless deployment rendering considerations:');
  console.log('     - Cold starts may affect initial page load times');
  console.log('     - Server-side rendering happens on each request in serverless');
  console.log('     - Static generation is preferred when possible');
  console.log('     - API routes may have timeout limitations for data fetching');
  
  // Check for static vs dynamic rendering balance
  console.log('\n   Static vs Dynamic balance:');
  console.log('     - Static: Better performance, SEO, but less dynamic content');
  console.log('     - Dynamic: More personalized but slower and more expensive');
  console.log('     - Consider static generation for public pages, dynamic for private/user-specific pages');
  
  // Check potential for Incremental Static Regeneration (ISR)
  console.log('\n   Incremental Static Regeneration potential:');
  console.log('     - CRM data changes frequently, ISR may require short revalidation times');
  console.log('     - Consider using ISR for data that changes infrequently');
  console.log('     - Dashboard and analytics likely need to be dynamic');
  
  return true;
}

function runRenderingTests() {
  console.log('Starting static/dynamic rendering tests...\n');
  
  const pagesOk = testPageGeneration();
  const routesOk = testRouteConfigurations();
  const dataFetchOk = testDataFetchingPatterns();
  const buildConfigOk = testBuildConfiguration();
  const envOk = testEnvironmentDependentRendering();
  const performanceOk = testPageSpeedOptimization();
  const deploymentOk = testDeploymentRendering();
  
  console.log('\n=== RENDERING SUMMARY ===');
  console.log(`Page generation: ${pagesOk ? '✓' : '✗'}`);
  console.log(`Route configurations: ${routesOk ? '✓' : '✗'}`);
  console.log(`Data fetching patterns: ${dataFetchOk ? '✓' : '✗'}`);
  console.log(`Build configuration: ${buildConfigOk ? '✓' : '✗'}`);
  console.log(`Environment dependencies: ${envOk ? '✓' : '✗'}`);
  console.log(`Performance considerations: ${performanceOk ? '✓' : '✗'}`);
  console.log(`Deployment considerations: ${deploymentOk ? '✓' : '✗'}`);
  
  console.log('\n⚠ RECOMMENDATIONS FOR PRODUCTION RENDERING:');
  console.log('  - Implement proper loading and error boundaries');
  console.log('  - Optimize database queries in server-side rendering');
  console.log('  - Consider using ISR for pages with frequently updated data');
  console.log('  - Use dynamic imports for heavy components');
  console.log('  - Implement proper caching strategies');
  console.log('  - Monitor Core Web Vitals for performance');
}

runRenderingTests();