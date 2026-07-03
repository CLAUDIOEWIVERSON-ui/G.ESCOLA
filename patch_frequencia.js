const fs = require('fs');
const file = '/app/applet/app/(dashboard)/frequencia/page.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "const [mapGranularity, setMapGranularity] = useState<'week' | 'month' | 'year'>('month');",
  "const [mapGranularity, setMapGranularity] = useState<'week' | 'month' | 'year' | 'course'>('course');"
);

code = code.replace(
  "const canNavigateLeft = useCallback(() => {\n    if (!effectiveStartDate) return true;",
  "const canNavigateLeft = useCallback(() => {\n    if (mapGranularity === 'course') return false;\n    if (!effectiveStartDate) return true;"
);

code = code.replace(
  "const canNavigateRight = useCallback(() => {\n    if (!effectiveEndDate) return true;",
  "const canNavigateRight = useCallback(() => {\n    if (mapGranularity === 'course') return false;\n    if (!effectiveEndDate) return true;"
);

code = code.replace(
  "if (mapGranularity === 'week') {",
  "if (mapGranularity === 'course') {\n        start = effectiveStartDate || format(startOfMonth(currentMapDate), 'yyyy-MM-dd');\n        end = effectiveEndDate || format(endOfMonth(currentMapDate), 'yyyy-MM-dd');\n      } else if (mapGranularity === 'week') {"
);

code = code.replace(
  /\{mapGranularity === 'week' \?\s*\(\s*`Semana de \$\{format\(startOfWeek\(currentMapDate, \{ weekStartsOn: 1 \}\), 'dd\/MM'\)\}`\s*\)\s*:\s*mapGranularity === 'year' \?/g,
  "{mapGranularity === 'course' ? (\n                      language === 'pt' ? 'Período Completo' : 'Full Course'\n                    ) : mapGranularity === 'week' ? (\n                      `Semana de ${format(startOfWeek(currentMapDate, { weekStartsOn: 1 }), 'dd/MM')}`\n                    ) : mapGranularity === 'year' ?"
);

code = code.replace(
  /<button\s*type="button"\s*onClick=\{\(\) => setMapGranularity\('month'\)\}\s*className=\{cn\(\s*"flex items-center gap-2 px-5 py-2\.5 rounded-xl text-xs font-bold transition-all",\s*mapGranularity === 'month' \? "bg-white text-blue-600 shadow-md" : "text-slate-500 hover:text-slate-700"\s*\)\}\s*>\s*<LayoutGrid size=\{16\} \/>\s*MÊS\s*<\/button>\s*<\/div>/g,
  `<button
                    type="button"
                    onClick={() => setMapGranularity('month')}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all",
                      mapGranularity === 'month' ? "bg-white text-blue-600 shadow-md" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <LayoutGrid size={16} />
                    MÊS
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapGranularity('course')}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all",
                      mapGranularity === 'course' ? "bg-white text-blue-600 shadow-md" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <BookOpen size={16} />
                    COMPLETO
                  </button>
                </div>`
);

code = code.replace(
  /\{mapGranularity === 'week'\s*\?\s*\(language === 'pt' \? 'Folha de Frequência Semanal' : 'Weekly Attendance Sheet'\)\s*: mapGranularity === 'year'/g,
  "{mapGranularity === 'course'\n                        ? (language === 'pt' ? 'Mapa de Frequência Completo' : 'Full Attendance Map')\n                        : mapGranularity === 'week' \n                        ? (language === 'pt' ? 'Folha de Frequência Semanal' : 'Weekly Attendance Sheet')\n                        : mapGranularity === 'year'"
);

code = code.replace(
  /\{mapGranularity === 'week' \?\s*\(\s*`Semana de \$\{format\(startOfWeek\(currentMapDate, \{ weekStartsOn: 1 \}\), 'dd\/MM\/yyyy'\)\} a \$\{format\(endOfWeek\(currentMapDate, \{ weekStartsOn: 1 \}\), 'dd\/MM\/yyyy'\)\}`\s*\)\s*:\s*mapGranularity === 'year' \?/g,
  "{mapGranularity === 'course' ? (\n                        effectiveStartDate && effectiveEndDate \n                          ? `${format(new Date(effectiveStartDate + 'T00:00:00'), 'dd/MM/yyyy')} a ${format(new Date(effectiveEndDate + 'T00:00:00'), 'dd/MM/yyyy')}`\n                          : (language === 'pt' ? 'Período Indeterminado' : 'Indeterminate Period')\n                      ) : mapGranularity === 'week' ? (\n                        `Semana de ${format(startOfWeek(currentMapDate, { weekStartsOn: 1 }), 'dd/MM/yyyy')} a ${format(endOfWeek(currentMapDate, { weekStartsOn: 1 }), 'dd/MM/yyyy')}`\n                      ) : mapGranularity === 'year' ?"
);

code = code.replace(
  /start:\s*mapGranularity === 'week' \? startOfWeek\(currentMapDate, \{ weekStartsOn: 1 \}\) : startOfMonth\(currentMapDate\),/g,
  "start: mapGranularity === 'course' ? (effectiveStartDate ? new Date(effectiveStartDate + 'T00:00:00') : startOfMonth(currentMapDate)) : (mapGranularity === 'week' ? startOfWeek(currentMapDate, { weekStartsOn: 1 }) : startOfMonth(currentMapDate)),"
);

code = code.replace(
  /end:\s*mapGranularity === 'week' \? endOfWeek\(currentMapDate, \{ weekStartsOn: 1 \}\) : endOfMonth\(currentMapDate\)/g,
  "end: mapGranularity === 'course' ? (effectiveEndDate ? new Date(effectiveEndDate + 'T00:00:00') : endOfMonth(currentMapDate)) : (mapGranularity === 'week' ? endOfWeek(currentMapDate, { weekStartsOn: 1 }) : endOfMonth(currentMapDate))"
);

fs.writeFileSync(file, code);
