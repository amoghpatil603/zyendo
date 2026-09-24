const https = require('https');

console.log("Testing TMDB connection...");
const req = https.get('https://api.themoviedb.org/3/movie/155?api_key=cc37b5ca7813bc13281c4e7334a68178', (res) => {
  console.log('STATUS:', res.statusCode);
  res.on('data', (d) => {
    process.stdout.write("Success! Data received.\n");
  });
}).on('error', (e) => {
  console.error("TMDB Connection Error:");
  console.error(e);
});
