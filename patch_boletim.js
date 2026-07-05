const fs = require('fs');
const path = './app/(dashboard)/boletim/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const target1 = "        const studentGrades = (grades || []).filter((g: any) => g.aluno_id === student.id);\n        const existingGrade = studentGrades[0];";

const replacement1 = `        const studentGrades = (grades || []).filter((g: any) => g.aluno_id === student.id);
        
        // Find the first discipline alphabetically to match notas/page.tsx default behavior
        const alphabeticalDisciplines = [...(turmaDisciplines || [])].sort((a: any, b: any) => 
          (a.nome || '').localeCompare(b.nome || '', 'pt-BR')
        );
        const mainDiscId = alphabeticalDisciplines[0]?.id;
        
        // Prefer the grade row of the main discipline
        let existingGrade = studentGrades.find((g: any) => g.disciplina_id === mainDiscId) || studentGrades[0];
`;

content = content.replace(target1, replacement1);

fs.writeFileSync(path, content, 'utf8');
