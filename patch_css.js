const fs = require('fs');
let content = fs.readFileSync('app/globals.css', 'utf8');

const strToRemove = `@media print {
  /* Force all slate backgrounds to white/transparent to avoid halftone muddy grey on physical printers */
  .bg-slate-50, .bg-slate-100, .bg-slate-50\\/50, .bg-slate-100\\/50 {
    background-color: white !important;
  }
}`;

if (content.includes(strToRemove)) {
  content = content.replace(strToRemove, '');
  fs.writeFileSync('app/globals.css', content, 'utf8');
  console.log("globals.css cleaned");
} else {
  console.log("string not found in globals.css");
}
