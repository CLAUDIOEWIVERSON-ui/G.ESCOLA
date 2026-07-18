const fs = require('fs');
let content = fs.readFileSync('app/(dashboard)/dashboard/page.tsx', 'utf8');

content = content.replace(
  "const [selectedCard, setSelectedCard] = useState<string>('exterior');",
  "const [selectedCard, setSelectedCard] = useState<string>('pre_inscritos');"
);

content = content.replace(
`      const cardDataMap: Record<string, number> = {
        'exterior': stats.alunosExterior,
        'expedito': stats.turmasExpedito,
        'carreira': stats.turmasCarreira,
        'especial': stats.turmasEspeciais,
        'pre_inscritos': stats.turmasPreInscritas
      };`,
`      const cardDataMap: Record<string, number> = {
        'pre_inscritos': stats.turmasPreInscritas,
        'exterior': stats.alunosExterior,
        'expedito': stats.turmasExpedito,
        'carreira': stats.turmasCarreira,
        'especial': stats.turmasEspeciais,
      };`
);

fs.writeFileSync('app/(dashboard)/dashboard/page.tsx', content);
