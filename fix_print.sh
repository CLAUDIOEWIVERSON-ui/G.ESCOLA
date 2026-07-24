#!/bin/bash
sed -i '/<style>{`/a \
        @media print {\
          * {\
            background-color: transparent !important;\
            color-adjust: exact !important;\
            -webkit-print-color-adjust: exact !important;\
            print-color-adjust: exact !important;\
          }\
          html, body, main, #__next, .min-h-screen, .flex-1, .bg-slate-50, .bg-white, .bg-slate-100, .bg-slate-900, .bg-slate-950, .card, .grid {\
            background-color: #FFFFFF !important;\
            background: #FFFFFF !important;\
            color: #000000 !important;\
          }\
          /* Preserve colors for charts and progress bars */\
          .bg-emerald-500 { background-color: #10b981 !important; }\
          .bg-purple-500 { background-color: #a855f7 !important; }\
          .bg-cyan-500 { background-color: #06b6d4 !important; }\
          .bg-rose-500 { background-color: #f43f5e !important; }\
          .bg-amber-500 { background-color: #f59e0b !important; }\
          .bg-blue-500 { background-color: #3b82f6 !important; }\
          .bg-slate-800 { background-color: #1e293b !important; }\
          .text-emerald-500 { color: #10b981 !important; }\
          .text-purple-500 { color: #a855f7 !important; }\
          .text-cyan-500 { color: #06b6d4 !important; }\
          .text-rose-500 { color: #f43f5e !important; }\
          .text-amber-500 { color: #f59e0b !important; }\
          .text-blue-500 { color: #3b82f6 !important; }\
        }\
' app/\(dashboard\)/relatorio-avaliacao/page.tsx
