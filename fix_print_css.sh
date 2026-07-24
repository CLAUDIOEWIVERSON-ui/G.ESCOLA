#!/bin/bash
cat << 'CSS' >> app/globals.css

@media print {
  body, html, main, #__next, .flex.min-h-screen, .bg-slate-50, .print\:bg-white, .bg-slate-100, .bg-slate-900, .bg-slate-950, .card, .grid {
    background-color: #FFFFFF !important;
    background: #FFFFFF !important;
    color: #000000 !important;
  }
  
  * {
    color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  
  /* Buttons and unnecessary ui */
  .print\:hidden, .no-print {
    display: none !important;
  }
}
CSS
