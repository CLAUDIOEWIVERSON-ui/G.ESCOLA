const fs = require('fs');

// 1. Dashboard Page
const dashboardFile = 'app/(dashboard)/dashboard/page.tsx';
let dashboardContent = fs.readFileSync(dashboardFile, 'utf8');

// Use toLowerCase() for isPreInscrito checks
dashboardContent = dashboardContent.replace(
  "const isPreInscrito = turma.status === 'pré-inscrito';",
  "const isPreInscrito = turma.status?.toLowerCase() === 'pré-inscrito';"
);

dashboardContent = dashboardContent.replace(
  "const isPreInscrito = turmaData?.status === 'pré-inscrito';",
  "const isPreInscrito = turmaData?.status?.toLowerCase() === 'pré-inscrito';"
);
dashboardContent = dashboardContent.replace(
  "const isPreInscrito = turmaData?.status === 'pré-inscrito';",
  "const isPreInscrito = turmaData?.status?.toLowerCase() === 'pré-inscrito';"
);
dashboardContent = dashboardContent.replace(
  "const isPreInscrito = turmaData?.status === 'pré-inscrito';",
  "const isPreInscrito = turmaData?.status?.toLowerCase() === 'pré-inscrito';"
);

fs.writeFileSync(dashboardFile, dashboardContent);

// 2. Turmas Page
const turmasFile = 'app/(dashboard)/turmas/page.tsx';
let turmasContent = fs.readFileSync(turmasFile, 'utf8');

// Replace exact checks with toLowerCase()
turmasContent = turmasContent.replace(/turma\.status === 'pré-inscrito'/g, "turma.status?.toLowerCase() === 'pré-inscrito'");
turmasContent = turmasContent.replace(/turma\.status === 'cancelada'/g, "turma.status?.toLowerCase() === 'cancelada'");
turmasContent = turmasContent.replace(/turma\.status === 'concluída'/g, "turma.status?.toLowerCase() === 'concluída'");

// Fix Visualizar Turma modal
turmasContent = turmasContent.replace(
  "viewingTurma?.status === 'pré-inscrito'\n                      ? \"bg-blue-50 text-blue-700 border border-blue-200\"",
  "viewingTurma?.status?.toLowerCase() === 'pré-inscrito'\n                      ? \"bg-red-50 text-red-600 border border-red-200\""
);

// Fix Carteirinhas QR (Crachá)
turmasContent = turmasContent.replace(
  "const cardsHtml = data.map((codeObj: any) => {",
  "const cardsHtml = data.map((codeObj: any) => {\n      const isPreInscrito = turmaNome.toLowerCase().includes('pré-inscrito') || (viewingTurma?.status?.toLowerCase() === 'pré-inscrito') || (selectedTurmaData?.status?.toLowerCase() === 'pré-inscrito');\n      const nameColor = isPreInscrito ? '#dc2626' : '#1e3a8a';"
);

turmasContent = turmasContent.replace(
  "h3 { margin: 0 0 8px 0; color: #1e3a8a; font-size: 13px;",
  "h3 { margin: 0 0 8px 0; font-size: 13px;"
);

turmasContent = turmasContent.replace(
  "<h3>${nomeCompleto}</h3>",
  "<h3 style=\"color: ${nameColor};\">${nomeCompleto}</h3>"
);

fs.writeFileSync(turmasFile, turmasContent);
console.log('Done fix_dashboard_pre_inscrito');
