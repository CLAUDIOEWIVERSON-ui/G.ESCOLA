const fs = require('fs');
const path = './app/(dashboard)/avaliacao/page.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import Image from "next/image"')) {
  content = content.replace(
    "import { toast } from 'sonner';",
    "import { toast } from 'sonner';\nimport Image from 'next/image';\nimport navalMissionLogo from '@/src/assets/images/regenerated_image_1782409801823.png';"
  );
  fs.writeFileSync(path, content, 'utf8');
  console.log("Imports added!");
}
