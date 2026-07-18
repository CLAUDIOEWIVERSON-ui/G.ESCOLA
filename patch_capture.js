const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/turmas/page.tsx', 'utf8');

const target = `                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors pointer-events-none">
                      <Camera size={24} strokeWidth={1.5} />
                      <span className="text-[8px] font-bold uppercase mt-1">{t.students.photo}</span>
                    </div>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />`;

const replacement = `                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors pointer-events-none">
                      <Camera size={24} strokeWidth={1.5} />
                      <span className="text-[8px] font-bold uppercase mt-1">{t.students.photo}</span>
                    </div>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />`;

content = content.replace(target, replacement);
fs.writeFileSync('app/(dashboard)/turmas/page.tsx', content);
