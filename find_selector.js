const fs = require('fs');
const glob = require('glob');
const cheerio = require('cheerio');

// Quick and dirty way to parse TSX like HTML:
glob("app/(dashboard)/**/*.tsx", (err, files) => {
  if (err) throw err;
  let matches = [];
  files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    // Using simple grep to see where button:nth-of-type(3) might exist inside a div:nth-of-type(2)
  });
});
