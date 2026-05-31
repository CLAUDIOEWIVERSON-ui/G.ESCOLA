import { jsPDF } from 'jspdf';

export function generateQuestionnairePDF(): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const totalPages = 2;

  // PAGE 1
  drawPage1(doc);
  addFooter(doc, 1, totalPages);

  // PAGE 2
  doc.addPage();
  drawPage2(doc);
  addFooter(doc, 2, totalPages);

  // Save the PDF
  doc.save('questionario_avaliacao_pos_curso.pdf');
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number): void {
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text(`Página ${pageNum} de ${totalPages}`, 195, 287, { align: 'right' });
}

function drawPage1(doc: jsPDF): void {
  // Title Header
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(10, 37, 102); // Deep navy blue
  doc.text('MISSÃO DE ASSESSORIA NAVAL DO BRASIL EM SÃO TOMÉ E PRÍNCIPE', 105, 18, { align: 'center' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text('QUESTIONÁRIO DE AVALIAÇÃO PÓS-CURSO', 105, 25, { align: 'center' });

  // Divider Line
  doc.setLineWidth(0.6);
  doc.setDrawColor(10, 37, 102);
  doc.line(15, 30, 195, 30);

  // Metadata Fields (Curso, Turma, Data)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text('Curso:', 15, 38);
  doc.text('Turma:', 110, 38);
  doc.text('Data:', 160, 38);

  // Field underline paths
  doc.setLineWidth(0.2);
  doc.setDrawColor(180, 180, 180);
  doc.line(27, 38, 105, 38);
  doc.line(122, 38, 155, 38);
  doc.line(170, 38, 195, 38);

  // Score Criteria Box
  doc.setDrawColor(220, 225, 235);
  doc.setFillColor(248, 250, 252);
  doc.rect(15, 45, 180, 18, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(10, 37, 102);
  doc.text('Escala de Avaliação / Critério de Pontuação:', 18, 50);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);
  doc.text('CP = ', 18, 57);
  doc.setFont('Helvetica', 'normal');
  doc.text('Concordo Plenamente (5 pts)', 26, 57);

  doc.setFont('Helvetica', 'bold');
  doc.text('CPa = ', 77, 57);
  doc.setFont('Helvetica', 'normal');
  doc.text('Concordo Parcialmente (3 pts)', 87, 57);

  doc.setFont('Helvetica', 'bold');
  doc.text('NC/NA = ', 138, 57);
  doc.setFont('Helvetica', 'normal');
  doc.text('Não Concordo / Não se Aplica (1 pt)', 151, 57);

  let currentY = 70;

  // I. AVALIAÇÃO DO CURSO
  currentY = drawSectionHeader(doc, 'I. AVALIAÇÃO DO CURSO', currentY);
  const itemsSection1 = [
    '1. O conteúdo atendeu aos objetivos propostos.',
    '2. O conteúdo foi relevante para minha atividade profissional.',
    '3. A carga horária foi adequada.',
    '4. O material didático foi satisfatório.',
    '5. As atividades práticas contribuíram para a aprendizagem.',
    '6. O curso atendeu às minhas expectativas.'
  ];
  currentY = drawRatingItems(doc, itemsSection1, currentY);

  // II. AVALIAÇÃO DO INSTRUTOR
  currentY += 4;
  currentY = drawSectionHeader(doc, 'II. AVALIAÇÃO DO INSTRUTOR', currentY);
  const itemsSection2 = [
    '1. Demonstrou domínio do conteúdo.',
    '2. Apresentou clareza nas explicações.',
    '3. Demonstrou boa didática.',
    '4. Manteve pontualidade e assiduidade.',
    '5. Solucionou dúvidas adequadamente.',
    '6. Manteve bom relacionamento com a turma.',
    '7. Conduziu adequadamente as atividades práticas.'
  ];
  currentY = drawRatingItems(doc, itemsSection2, currentY);

  // III. AUTOAVALIAÇÃO DO ALUNO
  currentY += 4;
  currentY = drawSectionHeader(doc, 'III. AUTOAVALIAÇÃO DO ALUNO', currentY);
  const itemsSection3 = [
    '1. Minha participação nas aulas foi satisfatória.',
    '2. Demonstrei interesse pelo conteúdo ministrado.',
    '3. Mantive frequência adequada.',
    '4. Dediquei-me às atividades propostas.',
    '5. Aproveitei adequadamente os conhecimentos transmitidos.'
  ];
  drawRatingItems(doc, itemsSection3, currentY);
}

function drawPage2(doc: jsPDF): void {
  // Title at top of second page (smaller to save space)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(10, 37, 102);
  doc.text('MISSÃO DE ASSESSORIA NAVAL DO BRASIL EM SÃO TOMÉ E PRÍNCIPE', 15, 15);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('QUESTIONÁRIO DE AVALIAÇÃO PÓS-CURSO', 15, 19);

  doc.setLineWidth(0.3);
  doc.setDrawColor(200, 200, 200);
  doc.line(15, 22, 195, 22);

  let currentY = 28;

  // IV. INFRAESTRUTURA E APOIO ADMINISTRATIVO
  currentY = drawSectionHeader(doc, 'IV. INFRAESTRUTURA E APOIO ADMINISTRATIVO', currentY);
  const itemsSection4 = [
    '1. A sala de aula foi adequada para a realização do curso.',
    '2. Os equipamentos disponíveis atenderam às necessidades do curso.',
    '3. Os recursos audiovisuais foram satisfatórios.',
    '4. A organização administrativa do curso foi eficiente.',
    '5. O ambiente de ensino favoreceu a aprendizagem.'
  ];
  currentY = drawRatingItems(doc, itemsSection4, currentY);

  // V. IMPACTO DO CURSO
  currentY += 4;
  currentY = drawSectionHeader(doc, 'V. IMPACTO DO CURSO', currentY);
  const itemsSection5 = [
    '1. O curso contribuirá para meu desempenho profissional.',
    '2. Aplicarei os conhecimentos adquiridos em minhas atividades.',
    '3. Recomendaria este curso a outros profissionais.'
  ];
  currentY = drawRatingItems(doc, itemsSection5, currentY);

  // VI. COMENTÁRIOS, ELOGIOS E SUGESTÕES
  currentY += 4;
  currentY = drawSectionHeader(doc, 'VI. COMENTÁRIOS, ELOGIOS E SUGESTÕES', currentY);

  const commentSections = [
    { title: 'Pontos fortes do curso:', lines: 3 },
    { title: 'Sugestões de melhoria:', lines: 3 },
    { title: 'Elogios ao instrutor ou à organização do curso:', lines: 3 },
    { title: 'Outros comentários:', lines: 3 }
  ];

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);

  for (const s of commentSections) {
    if (currentY > 265) break; 
    doc.setFont('Helvetica', 'bold');
    doc.text(s.title, 15, currentY);
    currentY += 6;

    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.15);
    for (let i = 0; i < s.lines; i++) {
        doc.line(15, currentY, 195, currentY);
        currentY += 7;
    }
    currentY += 1;
  }
}

function drawSectionHeader(doc: jsPDF, title: string, y: number): number {
  // Height is 7.5mm
  doc.setFillColor(10, 37, 102); // Deep navy blue matching Portuguese/Brazilian Armed Forces
  doc.rect(15, y, 180, 7.5, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(title, 18, y + 5);

  return y + 7.5 + 4; // Return the text line offset
}

function drawRatingItems(doc: jsPDF, items: string[], startY: number): number {
  let y = startY;
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);

  for (const item of items) {
    // Write Item Text
    doc.text(item, 15, y + 4.5);

    // Draw Column options
    // Format: [ ] CP   [ ] CPa   [ ] NC/NA
    // Grid horizontal positions
    const xCP = 145;
    const xCPa = 161;
    const xNC = 177;

    // Draw square checkboxes
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.2);
    doc.rect(xCP, y + 1.5, 3, 3);
    doc.rect(xCPa, y + 1.5, 3, 3);
    doc.rect(xNC, y + 1.5, 3, 3);

    // Labels
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    doc.text('CP', xCP + 4.5, y + 4);
    doc.text('CPa', xCPa + 4.5, y + 4);
    doc.text('NC/NA', xNC + 4.5, y + 4);
    
    // Reset font for body and line styling
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);

    // Subtle horizontal divider between items
    doc.setDrawColor(240, 240, 240);
    doc.line(15, y + 6.5, 195, y + 6.5);

    y += 7.5;
  }

  return y + 1.5;
}
