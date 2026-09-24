const fs = require('fs');
const html = fs.readFileSync('page_dump.html', 'utf8');
const selects = html.match(/<select[^>]*>.*?<\/select>/gs);
if (selects) {
  selects.forEach((s, i) => {
    console.log(Select :, s.replace(/<option/g, '\n  <option'));
  });
}
