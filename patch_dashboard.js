const fs = require('fs');
let file = 'app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('Printer')) {
  content = content.replace("  Trash2\n}", "  Trash2,\n  Printer\n}");
}

if (!content.includes('navalMissionLogo')) {
  content = content.replace("import Image from 'next/image';", "import Image from 'next/image';\nimport navalMissionLogo from '@/src/assets/images/regenerated_image_1782409801823.png';");
}

fs.writeFileSync(file, content);
