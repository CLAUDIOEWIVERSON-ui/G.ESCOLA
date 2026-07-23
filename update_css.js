const fs = require('fs');
const file = 'app/(dashboard)/relatorio-avaliacao/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /<style>\{`\s*@media print \{[\s\S]*?`\}<\/style>/;

const replacement = `<style>{\`
        @media print {
          /* 1. Forçar esquema claro (derrota dark modes de navegadores) */
          :root {
            color-scheme: light !important;
          }
          
          /* 2. Forçar fundo totalmente branco para o body e containers estruturais (#FFFFFF) */
          html, body, main, .print\\\\:bg-white { 
            background-color: #FFFFFF !important; 
          }
          
          /* Forçar fundos que normalmente formam o layout para branco puro, eliminando os tons escuros/cinzas */
          .bg-slate-50, .bg-slate-100, .bg-slate-800, .bg-slate-900, .bg-slate-950, .bg-white {
             background-color: #FFFFFF !important;
             background-image: none !important;
             box-shadow: none !important;
          }

          /* Preservar barras de progresso que usam bg-slate-800 (ex: médias institucionais) */
          div.bg-slate-800.rounded-full {
             background-color: #334155 !important;
          }
          
          /* Garantir a visibilidade das bordas nos cards e gráficos */
          #chart-neon-metrics-card, 
          #chart-neon-distribution-card, 
          #chart-pie-satisfaction-card,
          .border-slate-800, .border-slate-200 {
            border-color: #e2e8f0 !important;
          }
          
          /* 3. Ajustar os textos para garantir legibilidade no fundo branco (#FFFFFF) */
          #chart-neon-metrics-card h4, 
          #chart-neon-metrics-card span,
          #chart-neon-metrics-card div,
          #chart-neon-distribution-card h4,
          #chart-neon-distribution-card span,
          #chart-neon-distribution-card div,
          #chart-pie-satisfaction-card h4,
          #chart-pie-satisfaction-card span,
          #chart-pie-satisfaction-card div {
            color: #0f172a !important;
          }
          
          /* Labels e textos de gráficos escuros e claros forçados para cor escura legível */
          text.recharts-text,
          .text-white, .text-slate-200, .text-slate-300, .text-slate-400 {
            fill: #0f172a !important;
            color: #0f172a !important;
            text-shadow: none !important;
          }
          
          .text-slate-500, .text-slate-600, .text-slate-700, .text-slate-800, .text-slate-900 {
            color: #0f172a !important;
          }
          
          /* O card de 'Inscritos na Turma' e outros que precisam sumir o fundo no topo */
          .bg-slate-50.print\\\\:bg-transparent, .bg-slate-100.print\\\\:bg-transparent {
             background-color: transparent !important;
          }
        }
      \`}</style>`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log("Successfully replaced CSS in page.tsx");
} else {
  console.log("Regex not found in page.tsx");
}
