const db = require('../src/services/database.js');
db.getSchools().then(s => {
  console.log('isDataReady:', db.isDataReady());
  console.log('schools:', s.length);
  console.log('first:', s[0].name, '/', s[0].region, '/', s[0].majors.length + ' majors');
  console.log('last:', s[s.length - 1].name);
  const total = s.reduce((a, x) => a + x.majors.length, 0);
  console.log('total majors:', total);
  const regions = new Set(s.map(x => x.region));
  console.log('regions:', regions.size);
  const bad = s.filter(x => !x.name || !x.region || !Array.isArray(x.majors) || x.majors.some(m => typeof m.difficulty !== 'number' || m.difficulty < 0 || m.difficulty > 100));
  console.log('invalid schools:', bad.length);
});