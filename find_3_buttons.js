const fs = require('fs');
const glob = require('glob');

glob("app/(dashboard)/**/*.tsx", (err, files) => {
  if (err) throw err;
  files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    // regex to find a div containing at least 3 buttons directly or mostly directly
    // This is hard to do with regex, but we can just split by "<div" and count "<button" inside before next "</div>"
    let divs = content.split(/<div/g);
    for(let d of divs) {
      if (d.includes('</div')) {
        let inner = d.substring(0, d.indexOf('</div'));
        let buttons = inner.match(/<button/g);
        if (buttons && buttons.length >= 3) {
          console.log(`Found ${buttons.length} buttons in ${f}:\n<div ${inner.substring(0, 100)}...`);
        }
      }
    }
  });
});
