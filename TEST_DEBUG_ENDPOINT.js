// Use the apiClient which handles token refresh automatically
// This should work even if your token is close to expiring

// First, check if you're logged in
console.log('Checking auth status...');
console.log('Access Token exists:', !!localStorage.getItem('accessToken'));

// Import the apiClient (if available in console context)
// Otherwise, just use fetch with error handling

fetch('/api/debug/raw-mqtt', {
  headers: {
    Authorization: 'Bearer ' + localStorage.getItem('accessToken'),
    'Content-Type': 'application/json',
  },
})
  .then(async r => {
    console.log('Response status:', r.status);

    if (r.status === 401) {
      const errorData = await r.json().catch(() => ({}));
      console.error('❌ Authentication failed!');
      console.log('Error details:', errorData);
      console.log('');
      console.log('💡 SOLUTION:');
      console.log('   1. Go to the app (localhost:5173)');
      console.log('   2. Click "Sign out" in the sidebar');
      console.log('   3. Log in again');
      console.log('   4. Then run this command again');
      throw new Error('Authentication required - please log in again');
    }

    if (!r.ok) {
      throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    }

    return r.json();
  })
  .then(d => {
    if (!d.data) {
      console.log('⚠️ No data received:', d.message || d);
      return d;
    }

    console.log('');
    console.log('✅ SUCCESS! Raw MQTT data retrieved');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 SUMMARY:');
    console.log('  Total Root Keys:', d.data.summary?.totalRootKeys);
    console.log('  Total Print Keys:', d.data.summary?.totalPrintKeys);
    console.log('  Has AMS:', d.data.summary?.hasAMS);
    console.log('');
    console.log('🔍 ALL PRINT KEYS (look for chamber/humidity fields):');
    console.log(d.data.allKeys?.print);
    console.log('');
    console.log('🌡️ TEMPERATURE FIELD SEARCH:');
    if (d.data.fieldSearch?.chamberFields?.length > 0) {
      console.log(
        '  ✅ Chamber fields found:',
        d.data.fieldSearch.chamberFields
      );
    } else {
      console.log('  ❌ No chamber fields found');
    }
    console.log('');
    if (d.data.fieldSearch?.humidityFields?.length > 0) {
      console.log(
        '  ✅ Humidity fields found:',
        d.data.fieldSearch.humidityFields
      );
    } else {
      console.log('  ❌ No humidity fields found');
    }
    console.log('');
    if (d.data.fieldSearch?.nozzleFields?.length > 0) {
      console.log('  ✅ Nozzle fields found:', d.data.fieldSearch.nozzleFields);
    } else {
      console.log('  ⚠️ Limited nozzle fields found');
    }
    console.log('');
    console.log('📦 SAMPLE VALUES:');
    console.log(JSON.stringify(d.data.samples, null, 2));
    console.log('');
    console.log(
      '📄 FULL RAW MESSAGE (expand the object below to see all fields):'
    );
    console.log(d.data.rawMessage);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');

    return d;
  })
  .catch(err => {
    console.error('❌ Error:', err.message || err);
  });
