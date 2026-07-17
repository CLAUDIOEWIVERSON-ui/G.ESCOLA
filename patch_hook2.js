const fs = require('fs');
let content = fs.readFileSync('hooks/useCachedData.ts', 'utf8');

// revert the first occurrence
content = content.replace(
  `if (!dbData) return [];\n\n      const mappedData = dbData.map((t: any) => {\n        if (t.status === 'ativa' && t.ativa === false) {\n          return { ...t, status: 'pré-inscrito(a)(s)' };\n        }\n        return t;\n      });\n\n      let filteredData = mappedData;`,
  "if (!dbData) return [];\n\n      let filteredData = dbData;"
);

// find the second occurrence which is in useTurmas
content = content.replace(
  /\.order\('nome'\);\n\n      if \(dbError\) throw dbError;\n      if \(!dbData\) return \[\];\n\n      let filteredData = dbData;/g,
  `.order('nome');\n\n      if (dbError) throw dbError;\n      if (!dbData) return [];\n\n      const mappedData = dbData.map((t: any) => {\n        if (t.status === 'ativa' && t.ativa === false) {\n          return { ...t, status: 'pré-inscrito(a)(s)' };\n        }\n        return t;\n      });\n\n      let filteredData = mappedData;`
);

fs.writeFileSync('hooks/useCachedData.ts', content);
