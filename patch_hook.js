const fs = require('fs');
let content = fs.readFileSync('hooks/useCachedData.ts', 'utf8');
content = content.replace(
  "if (!dbData) return [];\n\n      let filteredData = dbData;",
  `if (!dbData) return [];\n\n      const mappedData = dbData.map((t: any) => {\n        if (t.status === 'ativa' && t.ativa === false) {\n          return { ...t, status: 'pré-inscrito(a)(s)' };\n        }\n        return t;\n      });\n\n      let filteredData = mappedData;`
);
fs.writeFileSync('hooks/useCachedData.ts', content);
