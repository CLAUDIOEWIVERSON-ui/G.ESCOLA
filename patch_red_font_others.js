const fs = require('fs');
const dashboardFile = 'app/(dashboard)/dashboard/page.tsx';
let dashboardContent = fs.readFileSync(dashboardFile, 'utf8');

dashboardContent = dashboardContent.replace(
  '<div className="text-slate-600">{curso?.nome || \'-\'}</div>',
  '<div className={cn("", isPreInscrito ? "text-red-500" : "text-slate-600")}>{curso?.nome || \'-\'}</div>'
);

dashboardContent = dashboardContent.replace(
  '<span className="text-slate-800 font-bold whitespace-nowrap">',
  '<span className={cn("font-bold whitespace-nowrap", isPreInscrito ? "text-red-600" : "text-slate-800")}>'
);
// replace multiple times
dashboardContent = dashboardContent.replace(
  '<span className="text-slate-800 font-bold whitespace-nowrap">',
  '<span className={cn("font-bold whitespace-nowrap", isPreInscrito ? "text-red-600" : "text-slate-800")}>'
);
dashboardContent = dashboardContent.replace(
  '<span className="text-slate-800 font-bold whitespace-nowrap">',
  '<span className={cn("font-bold whitespace-nowrap", isPreInscrito ? "text-red-600" : "text-slate-800")}>'
);
dashboardContent = dashboardContent.replace(
  '<span className="text-slate-800 font-bold whitespace-nowrap">',
  '<span className={cn("font-bold whitespace-nowrap", isPreInscrito ? "text-red-600" : "text-slate-800")}>'
);

fs.writeFileSync(dashboardFile, dashboardContent);
console.log('Done patch_red_font_others');
