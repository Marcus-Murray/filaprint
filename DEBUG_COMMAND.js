// Copy and paste this entire block into your browser DevTools Console (F12)

fetch('/api/debug/raw-mqtt', {
  headers: { Authorization: 'Bearer ' + localStorage.getItem('accessToken') },
})
  .then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    return r.json();
  })
  .then(d => {
    if (!d.data) {
      console.log('No data received:', d);
      return d;
    }

    console.log('=== RAW MQTT STRUCTURE ===');
    console.log('');
    console.log('Summary:', d.data.summary);
    console.log('');
    console.log('All Root Keys:', d.data.allKeys?.root);
    console.log('');
    console.log('All Print Keys:', d.data.allKeys?.print);
    console.log('');
    console.log('=== FIELD SEARCH RESULTS ===');
    console.log('Chamber Fields Found:', d.data.fieldSearch?.chamberFields);
    console.log('');
    console.log('Humidity Fields Found:', d.data.fieldSearch?.humidityFields);
    console.log('');
    console.log('Nozzle Fields Found:', d.data.fieldSearch?.nozzleFields);
    console.log('');
    console.log('=== SAMPLE VALUES ===');
    console.log('Samples:', d.data.samples);
    console.log('');
    console.log('=== FULL RAW MESSAGE (expand to see all fields) ===');
    console.log(d.data.rawMessage);

    return d;
  })
  .catch(err => {
    console.error('❌ Error:', err);
    if (err.message.includes('401')) {
      console.log(
        '💡 Tip: You may need to log in again. Your token might have expired.'
      );
    }
  });
