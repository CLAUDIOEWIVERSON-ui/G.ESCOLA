const fs = require('fs');
const path = './app/(dashboard)/cursos/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import { useState, useEffect, useCallback } from 'react';",
  "import { useState, useEffect, useCallback, Suspense } from 'react';"
);

content = content.replace(
  "export default function CursosPage() {",
  "function CursosContent() {"
);

const suspenseWrapper = `
export default function CursosPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CursosContent />
    </Suspense>
  );
}
`;

content += suspenseWrapper;

fs.writeFileSync(path, content, 'utf8');
console.log("Successfully fixed cursos/page.tsx");
