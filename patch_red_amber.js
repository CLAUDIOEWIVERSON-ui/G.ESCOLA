const fs = require('fs');
const dashboardFile = 'app/(dashboard)/dashboard/page.tsx';
let dashboardContent = fs.readFileSync(dashboardFile, 'utf8');

dashboardContent = dashboardContent.replace(
  'isPreInscrito ? "bg-amber-50 hover:bg-amber-100/80" : "hover:bg-slate-50"',
  'isPreInscrito ? "bg-red-50 hover:bg-red-100/80" : "hover:bg-slate-50"'
);

dashboardContent = dashboardContent.replace(
  'isPreInscrito ? "bg-amber-50 hover:bg-amber-100/80" : "hover:bg-slate-50"',
  'isPreInscrito ? "bg-red-50 hover:bg-red-100/80" : "hover:bg-slate-50"'
);

dashboardContent = dashboardContent.replace(
  'isPreInscrito ? "text-amber-600" : "text-green-600"',
  'isPreInscrito ? "text-red-600" : "text-green-600"'
);

dashboardContent = dashboardContent.replace(
  'isPreInscrito ? "bg-amber-500" : "bg-green-500"',
  'isPreInscrito ? "bg-red-500" : "bg-green-500"'
);

fs.writeFileSync(dashboardFile, dashboardContent);
console.log('Done patch_red_amber');
