const fs = require('fs');
const html = fs.readFileSync('page_dump.html', 'utf8');
const selects = html.match(/<select[^>]*>.*?<\/select>/gs);
if (selects) {
  selects.forEach((s, i) => {
    const selected = s.match(/<option[^>]*selected[^>]*>(.*?)<\/option>/) || s.match(/<option[^>]*value="([^"]*)"[^>]*>/);
    console.log(`Select ${i} Selected Value:`, selected ? selected[1] : 'None');
  });
}
