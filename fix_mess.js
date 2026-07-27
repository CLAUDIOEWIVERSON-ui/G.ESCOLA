const fs = require('fs');
let file = 'app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// The appended block was:
// </div>\n      \n      {/* PRINT LAYOUT FOR ALUNOS EXTERIOR */}
// All the way to </>\n    }
const printStart = '      {/* PRINT LAYOUT FOR ALUNOS EXTERIOR */}';
const printStartIndex = content.lastIndexOf(printStart);

if (printStartIndex !== -1) {
  // We want to extract this block and put it at the end of DashboardPage
  const printBlockStr = content.substring(printStartIndex - 7, content.indexOf('    </>', printStartIndex) + 7);
  
  // Remove from the bottom
  content = content.replace(printBlockStr, '</div>');
  
  // Now place it at the end of DashboardPage, right before `    </div>\n  );`
  // Wait, DashboardPage ends around line 1121 with:
  //         )}
  //       </AnimatePresence>
  //     </div>
  //   );
  // }
  
  const dashboardEndMatch = /        \)}\n      <\/AnimatePresence>\n    <\/div>\n  \);\n}/;
  
  content = content.replace(dashboardEndMatch, (match) => {
    return '        )}\n      </AnimatePresence>\n' + printBlockStr.replace(/^/gm, '  ') + '\n    </div>\n  );\n}';
  });
  
  // Also fix the first occurrence where I replaced '<div className="space-y-6">' with '<>\n      <div className="space-y-6 print:hidden">'
  // Wait, I did that to the root of DashboardPage, so the component now returns `<>` instead of `<div className="max-w-6xl...">`.
  // Wait, let's check what it currently returns.
}
fs.writeFileSync(file, content);
