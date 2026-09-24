const https = require('https');

function test(host, family) {
  console.log(`Testing ${host} with IPv${family || 'default'}...`);
  const req = https.get({
    hostname: host,
    path: '/3/movie/155?api_key=cc37b5ca7813bc13281c4e7334a68178',
    family: family
  }, (res) => {
    console.log(`IPv${family || 'default'} SUCCESS:`, res.statusCode);
  }).on('error', (e) => {
    console.log(`IPv${family || 'default'} ERROR:`, e.message);
  });
  
  // Set a hard timeout to prevent hanging
  req.setTimeout(5000, () => {
    console.log(`IPv${family || 'default'} TIMEOUT`);
    req.destroy();
  });
}

test('api.themoviedb.org', 4);
setTimeout(() => test('api.themoviedb.org', 6), 2000);
setTimeout(() => test('api.themoviedb.org', undefined), 4000);
