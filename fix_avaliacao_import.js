const fs = require('fs');
const path = './app/(dashboard)/avaliacao/page.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import navalMissionLogo')) {
  content = content.replace(
    "import { cn } from '@/lib/utils';",
    "import { cn } from '@/lib/utils';\nimport Image from 'next/image';\nimport navalMissionLogo from '@/src/assets/images/regenerated_image_1782409801823.png';"
  );
  fs.writeFileSync(path, content, 'utf8');
  console.log("Added import to avaliacao/page.tsx");
}
