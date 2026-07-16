const fs = require('fs');
const file = 'app/(dashboard)/boletim/page.tsx';
let content = fs.readFileSync(file, 'utf8');
const search = `                                                    <Fragment key={\`print-row-mod-\${row.moduleNum}-\${rIdx}\`}>
                                                      {row.disciplines.map((disc: any, dIdx: number) => {
                                                        const isLastDisc = dIdx === row.disciplines.length - 1;
                                                        const midIdx = Math.floor((row.disciplines.length - 1) / 2);
                                                        return (
                                                          <tr key={\`print-disc-\${disc.id || dIdx}\`} className="bg-white">
                                                            <td className={cn("px-3.5 py-2 font-black text-slate-900 border-r border-slate-250 bg-slate-50/70 align-middle whitespace-nowrap text-center", isLastDisc ? "border-b border-slate-200" : "")}>
                                                              {dIdx === midIdx ? row.modulo : null}
                                                            </td>
                                                            <td className={cn("px-3.5 py-2 font-bold text-slate-800 border-r border-slate-200 bg-transparent align-middle", isLastDisc ? "border-b border-slate-200" : "border-b border-slate-100/80")}>
                                                              <div className="flex items-center gap-1.5 text-[10px] leading-tight break-words">
                                                                <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                                                                <span>{disc.nome}</span>
                                                              </div>
                                                            </td>
                                                            <td className={cn("px-3.5 py-2 text-center font-mono text-[9px] text-slate-500 border-r border-slate-200 bg-transparent align-middle", isLastDisc ? "border-b border-slate-200" : "border-b border-slate-100/80")}>
                                                              {disc.carga_horaria ? \`\${disc.carga_horaria}h\` : '-'}
                                                            </td>
                                                            <td className={cn("px-3.5 py-2 text-center font-black font-mono text-xs border-r border-slate-200 text-slate-900 bg-white align-middle", isLastDisc ? "border-b border-slate-200" : "")}>
                                                              {dIdx === midIdx ? row.nota : null}
                                                            </td>
                                                            <td className={cn("px-3.5 py-2 text-right bg-white align-middle break-words whitespace-normal leading-tight font-black", row.statusClass, isLastDisc ? "border-b border-slate-200" : "")}>
                                                              {dIdx === midIdx ? row.situacao : null}
                                                            </td>
                                                          </tr>
                                                        );
                                                      })}
                                                    </Fragment>`;

const replace = `                                                    <Fragment key={\`print-row-mod-\${row.moduleNum}-\${rIdx}\`}>
                                                      {row.disciplines.map((disc: any, dIdx: number) => {
                                                        const isLastDisc = dIdx === row.disciplines.length - 1;
                                                        return (
                                                          <tr key={\`print-disc-\${disc.id || dIdx}\`} className="bg-white">
                                                            {dIdx === 0 && (
                                                              <td rowSpan={row.disciplines.length} className="px-3.5 py-2 font-black text-slate-900 border-r border-slate-250 bg-slate-50/70 align-middle whitespace-nowrap text-center border-b border-slate-200">
                                                                {row.modulo}
                                                              </td>
                                                            )}
                                                            <td className={cn("px-3.5 py-2 font-bold text-slate-800 border-r border-slate-200 bg-transparent align-middle", isLastDisc ? "border-b border-slate-200" : "border-b border-slate-100/80")}>
                                                              <div className="flex items-center gap-1.5 text-[10px] leading-tight break-words">
                                                                <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                                                                <span>{disc.nome}</span>
                                                              </div>
                                                            </td>
                                                            <td className={cn("px-3.5 py-2 text-center font-mono text-[9px] text-slate-500 border-r border-slate-200 bg-transparent align-middle", isLastDisc ? "border-b border-slate-200" : "border-b border-slate-100/80")}>
                                                              {disc.carga_horaria ? \`\${disc.carga_horaria}h\` : '-'}
                                                            </td>
                                                            {dIdx === 0 && (
                                                              <td rowSpan={row.disciplines.length} className="px-3.5 py-2 text-center font-black font-mono text-xs border-r border-slate-200 text-slate-900 bg-white align-middle border-b border-slate-200">
                                                                {row.nota}
                                                              </td>
                                                            )}
                                                            {dIdx === 0 && (
                                                              <td rowSpan={row.disciplines.length} className={cn("px-3.5 py-2 text-right bg-white align-middle break-words whitespace-normal leading-tight font-black border-b border-slate-200", row.statusClass)}>
                                                                {row.situacao}
                                                              </td>
                                                            )}
                                                          </tr>
                                                        );
                                                      })}
                                                    </Fragment>`;
                                                    
content = content.replace(search, replace);
fs.writeFileSync(file, content, 'utf8');
console.log('Patched');
