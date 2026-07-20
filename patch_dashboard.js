const fs = require('fs');
const path = '/app/applet/app/(dashboard)/dashboard/page.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /value: stats\.turmasPreInscritas,\s*icon: Users,\s*color: 'bg-cyan-600',/g,
  `value: stats.studentsPreInscritos,
      icon: Users,
      color: 'bg-cyan-600',`
);

code = code.replace(
  /shouldShow: true/g,
  `shouldShow: stats.studentsPreInscritos > 0 || stats.turmasPreInscritas > 0`
);

fs.writeFileSync(path, code);
