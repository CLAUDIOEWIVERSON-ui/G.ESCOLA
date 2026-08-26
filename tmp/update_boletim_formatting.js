const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/boletim/page.tsx', 'utf8');

// 1. Add formatGradePT
const targetAfterReportT = `const reportT = {
  pt: {`;

if (!code.includes('const formatGradePT =')) {
  const helper = `const formatGradePT = (val: number | string | null | undefined, fallback = '-'): string => {
  if (val === null || val === undefined || val === '') return fallback;
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return fallback;
  return num.toFixed(2).replace('.', ',');
};

const reportT = {
  pt: {`;
  code = code.replace(targetAfterReportT, helper);
}

// 2. Line 1378: toFixed(2)
code = code.replace(
  'finalGrades.length).toFixed(4)',
  'finalGrades.length).toFixed(2)'
);

// 3. Line 2118: finalGradeFormatted
code = code.replace(
  "const finalGradeFormatted = finalGradeValue !== null ? finalGradeValue.toFixed(4) : '-';",
  "const finalGradeFormatted = finalGradeValue !== null ? formatGradePT(finalGradeValue) : '-';"
);
code = code.replace(
  "const finalGradeFormatted = finalGradeValue !== null ? finalGradeValue.toFixed(2) : '-';",
  "const finalGradeFormatted = finalGradeValue !== null ? formatGradePT(finalGradeValue) : '-';"
);

// 4. Line 2394: averageGrade in preview
code = code.replace(
  "{averageGrade !== null ? averageGrade.toFixed(4) : '-'}",
  "{averageGrade !== null ? formatGradePT(averageGrade) : '-'}"
);
code = code.replace(
  "{averageGrade !== null ? averageGrade.toFixed(2) : '-'}",
  "{averageGrade !== null ? formatGradePT(averageGrade) : '-'}"
);

// 5. Line 2416-2417: settings.media_aprovacao
code = code.replace(
  'settings.media_aprovacao.toFixed(1)',
  'formatGradePT(settings.media_aprovacao)'
);
code = code.replace(
  'settings.media_aprovacao.toFixed(1)',
  'formatGradePT(settings.media_aprovacao)'
);

// 6. Line 3469: finalGradeFormatted in print single
code = code.replace(
  "const finalGradeFormatted = finalGradeValue !== null ? finalGradeValue.toFixed(4) : '-';",
  "const finalGradeFormatted = finalGradeValue !== null ? formatGradePT(finalGradeValue) : '-';"
);
code = code.replace(
  "const finalGradeFormatted = finalGradeValue !== null ? finalGradeValue.toFixed(2) : '-';",
  "const finalGradeFormatted = finalGradeValue !== null ? formatGradePT(finalGradeValue) : '-';"
);

// 7. Line 3722: averageGrade in print single
code = code.replace(
  "{averageGrade !== null ? averageGrade.toFixed(4) : '-'}",
  "{averageGrade !== null ? formatGradePT(averageGrade) : '-'}"
);
code = code.replace(
  "{averageGrade !== null ? averageGrade.toFixed(2) : '-'}",
  "{averageGrade !== null ? formatGradePT(averageGrade) : '-'}"
);

// 8. Line 4112 & 4117 & 4138: batch print table
code = code.replace(
  "{notaValue !== null && notaValue !== undefined ? Number(notaValue).toFixed(4) : '-'}",
  "{notaValue !== null && notaValue !== undefined ? formatGradePT(notaValue) : '-'}"
);
code = code.replace(
  "{notaValue !== null && notaValue !== undefined ? Number(notaValue).toFixed(2) : '-'}",
  "{notaValue !== null && notaValue !== undefined ? formatGradePT(notaValue) : '-'}"
);

code = code.replace(
  "{row.nota_final !== null && row.nota_final !== undefined ? Number(row.nota_final).toFixed(4) : '-'}",
  "{row.nota_final !== null && row.nota_final !== undefined ? formatGradePT(row.nota_final) : '-'}"
);
code = code.replace(
  "{row.nota_final !== null && row.nota_final !== undefined ? Number(row.nota_final).toFixed(2) : '-'}",
  "{row.nota_final !== null && row.nota_final !== undefined ? formatGradePT(row.nota_final) : '-'}"
);

code = code.replace(
  "{classStats.avg ? Number(classStats.avg).toFixed(4) : '-'}",
  "{classStats.avg ? formatGradePT(classStats.avg) : '-'}"
);
code = code.replace(
  "{classStats.avg ? Number(classStats.avg).toFixed(2) : '-'}",
  "{classStats.avg ? formatGradePT(classStats.avg) : '-'}"
);

fs.writeFileSync('app/(dashboard)/boletim/page.tsx', code, 'utf8');
console.log('Done!');
