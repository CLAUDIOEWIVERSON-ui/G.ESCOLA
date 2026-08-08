const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/avaliacao/page.tsx', 'utf8');

const oldHandlePrev = `  const handlePrev = () => {
    if (qrTurmaId && currentStep <= 2) return;
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };`;

const newHandlePrev = `  const handlePrev = () => {
    const isFirstPage = qrTurmaId ? currentStep === 2 : currentStep === 1;
    if (isFirstPage) {
      window.location.href = '/';
      return;
    }
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };`;

if (code.includes(oldHandlePrev)) {
  code = code.replace(oldHandlePrev, newHandlePrev);
  fs.writeFileSync('app/(dashboard)/avaliacao/page.tsx', code);
  console.log("Patched handlePrev successfully.");
} else {
  console.log("Could not find old handlePrev.");
}
