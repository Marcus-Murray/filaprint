/**
 * Backend API Test Script
 * Tests filament management endpoints
 */

const BASE_URL = 'http://localhost:3000';

async function test() {
  console.log('🧪 Testing Filament Management Backend API...\n');

  let token = null;

  // Step 1: Test health endpoint (no auth required)
  console.log('1. Testing Health Endpoint...');
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    if (healthRes.ok) {
      console.log('   ✅ Server is healthy\n');
    } else {
      throw new Error('Health check failed');
    }
  } catch (error) {
    console.error('   ❌ Server not reachable:', error.message);
    console.error('   💡 Make sure the server is running on port 3000');
    process.exit(1);
  }

  // Step 2: Try to login to get token (if test user exists)
  console.log('2. Attempting authentication...');
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpassword123',
      }),
    });

    if (loginRes.ok) {
      const loginData = await loginRes.json();
      token = loginData.data?.accessToken;
      if (token) {
        console.log('   ✅ Authentication successful\n');
      } else {
        console.log('   ⚠️  Login response ok but no token found');
        console.log('   💡 You may need to create a test user first\n');
      }
    } else {
      const errorData = await loginRes.json();
      console.log('   ⚠️  Login failed:', errorData.error?.message || 'Unknown error');
      console.log('   💡 Endpoints require authentication - testing will be limited\n');
    }
  } catch (error) {
    console.log('   ⚠️  Login attempt failed:', error.message);
    console.log('   💡 You may need to login through the UI first\n');
  }

  const headers = token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };

  // Step 3: Test manufacturers catalog (requires auth, but let's try)
  console.log('3. Testing Manufacturers Catalog...');
  try {
    const mfrRes = await fetch(`${BASE_URL}/api/filaments/catalog/manufacturers`, {
      headers,
    });

    if (mfrRes.ok) {
      const mfrData = await mfrRes.json();
      const count = mfrData.data?.length || 0;
      if (count > 0) {
        console.log(`   ✅ Found ${count} manufacturers`);
        if (count >= 40) {
          console.log('   ✅ Seed data populated correctly!');
        }
        if (mfrData.data[0]) {
          console.log(`   Sample: ${mfrData.data[0].name} (${mfrData.data[0].country || 'N/A'})`);
        }
        console.log('');
      } else {
        console.log('   ⚠️  No manufacturers found - seed data may not have run');
        console.log('   💡 Check server logs for seeding errors\n');
      }
    } else if (mfrRes.status === 401) {
      console.log('   ⚠️  Requires authentication');
      console.log('   💡 Login first to test this endpoint\n');
    } else {
      const errorData = await mfrRes.json();
      console.log('   ❌ Error:', errorData.error?.message || `HTTP ${mfrRes.status}\n`);
    }
  } catch (error) {
    console.log('   ❌ Request failed:', error.message, '\n');
  }

  // Step 4: Test products catalog
  console.log('4. Testing Products Catalog...');
  try {
    const prodRes = await fetch(`${BASE_URL}/api/filaments/catalog/products?limit=5`, {
      headers,
    });

    if (prodRes.ok) {
      const prodData = await prodRes.json();
      const count = prodData.data?.length || 0;
      if (count > 0) {
        console.log(`   ✅ Found products (showing ${count} of many)`);
        if (prodData.data[0]) {
          const sample = prodData.data[0];
          console.log(`   Sample: ${sample.name}`);
          console.log(`           Material: ${sample.material}, Color: ${sample.color}`);
          console.log(`           Price: $${sample.nzdPrice} NZD`);
          console.log(`           Optimal Humidity: ${sample.optimalHumidityRecommended}%`);
        }
        console.log('');
      } else {
        console.log('   ⚠️  No products found - seed data may not have run\n');
      }
    } else if (prodRes.status === 401) {
      console.log('   ⚠️  Requires authentication');
      console.log('   💡 Login first to test this endpoint\n');
    } else {
      const errorData = await prodRes.json();
      console.log('   ❌ Error:', errorData.error?.message || `HTTP ${prodRes.status}\n`);
    }
  } catch (error) {
    console.log('   ❌ Request failed:', error.message, '\n');
  }

  // Step 5: Test user filaments (if authenticated)
  if (token) {
    console.log('5. Testing User Filaments Endpoint...');
    try {
      const filamentsRes = await fetch(`${BASE_URL}/api/filaments`, {
        headers,
      });

      if (filamentsRes.ok) {
        const filamentsData = await filamentsRes.json();
        const count = filamentsData.data?.length || 0;
        console.log(`   ✅ User has ${count} filaments in inventory`);
        if (count > 0) {
          const sample = filamentsData.data[0];
          console.log(`   Sample: ${sample.name} (${sample.material} ${sample.color})`);
          console.log(`           Remaining: ${sample.remainingWeight}g / ${sample.weight}g`);
          console.log(`           Status: ${sample.status}`);
        }
        console.log('');
      } else {
        const errorData = await filamentsRes.json();
        console.log('   ❌ Error:', errorData.error?.message || `HTTP ${filamentsRes.status}\n`);
      }
    } catch (error) {
      console.log('   ❌ Request failed:', error.message, '\n');
    }

    // Step 6: Test low filament alerts
    console.log('6. Testing Low Filament Alerts...');
    try {
      const alertsRes = await fetch(`${BASE_URL}/api/filaments/alerts`, {
        headers,
      });

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        const count = alertsData.data?.length || 0;
        console.log(`   ✅ Found ${count} low filament alerts`);
        console.log('');
      } else {
        const errorData = await alertsRes.json();
        console.log('   ❌ Error:', errorData.error?.message || `HTTP ${alertsRes.status}\n`);
      }
    } catch (error) {
      console.log('   ❌ Request failed:', error.message, '\n');
    }
  } else {
    console.log('5. Skipping authenticated endpoints (no token)\n');
  }

  console.log('✅ Backend API Test Complete!');
  console.log('\n💡 Summary:');
  console.log('   - Server is running');
  if (token) {
    console.log('   - Authentication working');
  } else {
    console.log('   - Authentication needed for full testing');
  }
  console.log('   - Check server logs for seeding confirmation');
  console.log('   - See TEST_FILAMENT_API.md for more test examples');
}

test().catch((error) => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});

