(()=>{var e={};e.id=479,e.ids=[479],e.modules={10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19121:e=>{"use strict";e.exports=require("next/dist/server/app-render/action-async-storage.external.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},33873:e=>{"use strict";e.exports=require("path")},72723:(e,t,a)=>{"use strict";a.r(t),a.d(t,{GlobalError:()=>o.a,__next_app__:()=>c,pages:()=>p,routeModule:()=>m,tree:()=>l});var r=a(70260),n=a(28203),i=a(25155),o=a.n(i),s=a(67292),d={};for(let e in s)0>["default","tree","pages","GlobalError","__next_app__","routeModule"].indexOf(e)&&(d[e]=()=>s[e]);a.d(t,d);let l=["",{children:["(dashboard)",{children:["horario",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(a.bind(a,37577)),"/app/applet/app/(dashboard)/horario/page.tsx"]}]},{}]},{layout:[()=>Promise.resolve().then(a.bind(a,71975)),"/app/applet/app/(dashboard)/layout.tsx"],forbidden:[()=>Promise.resolve().then(a.t.bind(a,69116,23)),"next/dist/client/components/forbidden-error"],unauthorized:[()=>Promise.resolve().then(a.t.bind(a,41485,23)),"next/dist/client/components/unauthorized-error"]}]},{layout:[()=>Promise.resolve().then(a.bind(a,19611)),"/app/applet/app/layout.tsx"],"not-found":[()=>Promise.resolve().then(a.bind(a,61129)),"/app/applet/app/not-found.tsx"],forbidden:[()=>Promise.resolve().then(a.t.bind(a,69116,23)),"next/dist/client/components/forbidden-error"],unauthorized:[()=>Promise.resolve().then(a.t.bind(a,41485,23)),"next/dist/client/components/unauthorized-error"]}],p=["/app/applet/app/(dashboard)/horario/page.tsx"],c={require:a,loadChunk:()=>Promise.resolve()},m=new r.AppPageRouteModule({definition:{kind:n.RouteKind.APP_PAGE,page:"/(dashboard)/horario/page",pathname:"/horario",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:l}})},2943:(e,t,a)=>{Promise.resolve().then(a.bind(a,37577))},39895:(e,t,a)=>{Promise.resolve().then(a.bind(a,38285))},38285:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>T});var r=a(45512),n=a(58009),i=a(24559),o=a(59667),s=a(45723),d=a(44269),l=a(86235),p=a(24849),c=a(50385),m=a(82565),u=a(4269),x=a(4643),h=a(52706),b=a(98755),f=a(99905),g=a(41680);let y=(0,g.A)("Coffee",[["path",{d:"M10 2v2",key:"7u0qdc"}],["path",{d:"M14 2v2",key:"6buw04"}],["path",{d:"M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1",key:"pwadti"}],["path",{d:"M6 2v2",key:"colzsn"}]]);var v=a(67418),j=a(94667),k=a(87798),w=a(48857);let N=(0,g.A)("Book",[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20",key:"k3hazp"}]]);var M=a(70384),S=a(68531),A=a(84693),C=a(59462),P=a(12366),_=a(83139),z=a(46509),I=a(4711),$=a(91542),D=a(40912);let q=[{date:"2026-01-01",name:"Confraterniza\xe7\xe3o Universal"},{date:"2026-02-17",name:"Carnaval"},{date:"2026-04-03",name:"Sexta-feira Santa"},{date:"2026-04-21",name:"Tiradentes"},{date:"2026-05-01",name:"Dia do Trabalho"},{date:"2026-06-04",name:"Corpus Christi"},{date:"2026-09-07",name:"Independ\xeancia do Brasil"},{date:"2026-10-12",name:"Nossa Senhora Aparecida"},{date:"2026-11-02",name:"Finados"},{date:"2026-11-15",name:"Proclama\xe7\xe3o da Rep\xfablica"},{date:"2026-12-25",name:"Natal"}];function T(){let{t:e,language:t}=(0,o.s)(),{profile:a}=(0,D.J)(),g=a?.role==="aluno"&&a?.isNifStudent,[T,W]=(0,n.useState)([]),[G,E]=(0,n.useState)([]),[H,R]=(0,n.useState)([]),[O,L]=(0,n.useState)([]),[F,X]=(0,n.useState)([]),[V,B]=(0,n.useState)(""),[Y,J]=(0,n.useState)(""),[U,K]=(0,n.useState)(!1),[Q,Z]=(0,n.useState)("landscape"),ee=(0,n.useRef)(null),[et,ea]=(0,n.useState)({}),[er,en]=(0,n.useState)(!1),ei=G.find(e=>e.id===Y),eo=T.find(e=>e.id===V);async function es(){if(Y){en(!0);try{let{error:e}=await i.ND.from("horarios").upsert({turma_id:Y,data:et,updated_at:new Date().toISOString()},{onConflict:"turma_id"});e?(console.error("Save error:",e),$.toast.error("pt"===t?"Erro ao salvar o hor\xe1rio.":"Error saving schedule.")):($.toast.success("pt"===t?"Hor\xe1rio salvo com sucesso!":"Schedule saved successfully!"),K(!1))}catch(e){console.error("Failed to save schedule:",e)}finally{en(!1)}}}(0,n.useMemo)(()=>async e=>{if(!e){ea({});return}try{let{data:t}=await i.ND.from("horarios").select("data").eq("turma_id",e).single();t?ea(t.data||{}):ea({})}catch(e){console.error("Error fetching schedule:",e),ea({})}},[]);let[ed,el]=(0,n.useState)({}),[ep,ec]=(0,n.useState)(new Date),em=(0,n.useMemo)(()=>(0,P.k)(ep,{weekStartsOn:1}),[ep]),eu=(0,n.useMemo)(()=>(0,_.f)(em,4),[em]),ex=(0,n.useMemo)(()=>`${(0,z.GP)(em,"dd/MM")} a ${(0,z.GP)(eu,"dd/MM/yyyy")}`,[em,eu]),eh=(0,n.useMemo)(()=>{let e=[],a=ei?.data_inicio?new Date(ei.data_inicio+"T00:00:00"):new Date,r=ei?.data_fim?new Date(ei.data_fim+"T00:00:00"):null;isNaN(a.getTime())&&(a=new Date);let n=(0,P.k)(a,{weekStartsOn:1});if(r&&!isNaN(r.getTime())){let a=(0,P.k)(r,{weekStartsOn:1}),i=new Date(n),o=1;for(;i<=a&&o<=60;){let a=new Date(i),r=(0,_.f)(a,4),n=`${(0,z.GP)(a,"dd/MM")} a ${(0,z.GP)(r,"dd/MM/yyyy")}`;e.push({date:a,label:`${"pt"===t?"Semana":"Week"} ${o} (${n})`,isCurrent:(0,z.GP)(ep,"yyyy-MM-dd")===(0,z.GP)(a,"yyyy-MM-dd")}),i.setDate(i.getDate()+7),o++}}else for(let a=-4;a<=12;a++){let r=(0,_.f)(n,7*a),i=(0,_.f)(r,4),o=`${(0,z.GP)(r,"dd/MM")} a ${(0,z.GP)(i,"dd/MM/yyyy")}`;e.push({date:r,label:0===a?`${o} (${"pt"===t?"Semana Atual":"Current Week"})`:o,isCurrent:0===a})}return e},[ei,t,ep]),eb=(0,n.useMemo)(()=>{let e=[],t=8,a=0;for(;t<16;){let r=`${t.toString().padStart(2,"0")}:${a.toString().padStart(2,"0")}`;(a+=50)>=60&&(t+=Math.floor(a/60),a%=60);let n=`${t.toString().padStart(2,"0")}:${a.toString().padStart(2,"0")}`;if(e.push({id:`class-${r}`,time:`${r} - ${n}`,type:"class"}),t<16){(a+=10)>=60&&(t+=Math.floor(a/60),a%=60);let r=`${t.toString().padStart(2,"0")}:${a.toString().padStart(2,"0")}`;e.push({id:`break-${n}`,time:`${n} - ${r}`,type:"interval"})}}return e},[]),ef=[{key:"monday",label:e.schedule.monday,date:em},{key:"tuesday",label:e.schedule.tuesday,date:(0,_.f)(em,1)},{key:"wednesday",label:e.schedule.wednesday,date:(0,_.f)(em,2)},{key:"thursday",label:e.schedule.thursday,date:(0,_.f)(em,3)},{key:"friday",label:e.schedule.friday,date:(0,_.f)(em,4)}],eg=(e,t,a,r)=>{let n=(0,z.GP)(em,"yyyy-MM-dd");ea(i=>({...i,[`${n}_${e}-${t}`]:{...i[`${n}_${e}-${t}`]||i[`${e}-${t}`]||{},[a]:r}}))},ey=(e,t)=>{let a=(0,z.GP)(em,"yyyy-MM-dd");return et[`${a}_${e}-${t}`]||et[`${e}-${t}`]||{subjectId:"",instructorId:"",room:"",courseId:""}},ev=(0,n.useMemo)(()=>V?H.filter(e=>e.curso_id===V):H,[H,V]),ej=e=>{let t=(0,z.GP)(e,"yyyy-MM-dd");return q.find(e=>e.date===t)};return(0,r.jsxs)("div",{className:"space-y-6 col-print-style",children:[(0,r.jsx)("style",{dangerouslySetInnerHTML:{__html:`
        @media print {
          /* Setup page size and margin to 0 for maximum control of margins via container */
          @page { 
            size: A4 ${Q}; 
            margin: 0 !important;
          }
          
          /* Force color printing across standard browsers */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-shadow: none !important;
          }

          /* Hide absolutely everything that is not the print container or one of its descendants using fully standard non-has rules */
          body * {
            visibility: hidden !important;
          }
          .print-container, .print-container * {
            visibility: visible !important;
          }

          /* Collapse all elements except the printable area and its descendants */
          *:not(.print-container):not(.print-container *) {
            height: 0 !important;
            min-height: 0 !important;
            max-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }

          /* Reset html, body and ancestors of .print-container to be clean block structures with no padding/margin/flex/box-shadow/transforms */
          html, body {
            background: white !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            position: relative !important;
            display: block !important;
          }

          .col-print-style {
            margin: 0 !important;
            margin-top: 0 !important;
            padding: 0 !important;
            padding-top: 0 !important;
            top: 0 !important;
            transform: none !important;
            perspective: none !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            box-shadow: none !important;
            border: none !important;
            display: block !important;
            overflow: visible !important;
          }

          /* Ensure .print-container fits perfectly in normal flow without absolute shifts */
          .print-container {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            transform: none !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            display: flex !important;
            flex-direction: column !important;
            background: white !important;
            box-sizing: border-box !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            page-break-after: auto !important;
            page-break-before: auto !important;
            page-break-inside: auto !important;
          }

          /* Avoid dividing individual rows weirdly across pages but allow the table itself to split */
          tr { 
            page-break-inside: avoid !important; 
            page-break-after: auto !important;
          }
          table {
            page-break-inside: auto !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }

          .print-container, .print-container * {
            border-radius: 0 !important;
          }

          /* Differentiate top header and bottom footer block elements */
          .print-header-top {
            border-bottom: 2px solid #cbd5e1 !important;
          }
          .print-header-bottom {
            border-top: 2px solid #cbd5e1 !important;
            border-bottom: none !important;
          }

          /* Portrait or Landscape specific layout scaling */
          ${"landscape"===Q?`
            /* LANDSCAPE PRESENTATION */
            .print-container {
              padding: 6mm 8mm !important;
              height: auto !important;
              min-height: auto !important;
              max-height: none !important;
              justify-content: flex-start !important;
            }
            .print-header-top {
              padding: 8px 14px 10px 14px !important;
              background-color: #ffffff !important;
              color: #000000 !important;
            }
            .print-header-bottom {
              padding: 8px 14px !important;
              background-color: #ffffff !important;
              color: #000000 !important;
            }
            .print-header h2 {
              font-size: 22px !important;
              line-height: 1.1 !important;
            }
            .print-header-grid {
              gap: 12px !important;
            }
            .print-header-title-container > * + * {
              margin-top: 2px !important;
            }
            .print-period-badge {
              padding: 4px 10px !important;
              border-radius: 8px !important;
              border-color: #cbd5e1 !important;
            }
            .print-period-badge span:first-child {
              font-size: 13px !important;
            }
            .print-period-badge span:last-child {
              font-size: 7px !important;
              margin-top: 1px !important;
            }
            .print-content {
              padding: 0 !important;
              background: white !important;
              margin-top: 4px !important;
              margin-bottom: 4px !important;
            }
            .print-content th {
              padding: 4px 2px !important;
              background-color: #f8fafc !important;
              border-bottom: 2px solid #cbd5e1 !important;
            }
            .print-content th span {
              font-size: 8px !important;
            }
            .print-content td {
              padding: 1.5px !important;
              height: auto !important;
            }
            /* First/Time column scaling */
            .print-content td:first-child {
              padding: 1.5px !important;
              width: 60px !important;
            }
            .print-content td:first-child div {
              font-size: 9px !important;
            }
            /* Grid schedule cards inside td elements */
            .print-content .min-h-\\[140px\\] {
              min-height: 48px !important;
              height: auto !important;
              padding: 3px 5px !important;
              border-radius: 4px !important;
              background-color: #f8fafc !important;
              border: 1px solid #e2e8f0 !important;
              display: flex !important;
              flex-direction: column !important;
              overflow: visible !important;
            }
            .print-content .min-h-\\[140px\\] span,
            .print-content .min-h-\\[140px\\] p,
            .print-content .min-h-\\[140px\\] div {
              font-size: 8px !important;
              line-height: 1.05 !important;
              white-space: normal !important;
              word-break: break-word !important;
              overflow: visible !important;
              text-overflow: clip !important;
              display: block !important;
              -webkit-line-clamp: unset !important;
              line-clamp: unset !important;
            }
            .print-content .min-h-\\[140px\\] svg {
              width: 8px !important;
              height: 8px !important;
            }
            /* Interval/Lunch slot compact presentation */
            .print-content tr[class*="bg-slate-50"] td {
              padding: 2px !important;
            }
            .print-content tr[class*="bg-slate-50"] span {
              font-size: 8px !important;
              letter-spacing: 0.25em !important;
            }
          `:`
            /* PORTRAIT PRESENTATION */
            .print-container {
              padding: 8mm 10mm !important;
              height: auto !important;
              min-height: auto !important;
              max-height: none !important;
              justify-content: flex-start !important;
            }
            .print-header-top {
              padding: 10px 18px 12px 18px !important;
              background-color: #ffffff !important;
              color: #000000 !important;
            }
            .print-header-bottom {
              padding: 10px 18px !important;
              background-color: #ffffff !important;
              color: #000000 !important;
            }
            .print-header h2 {
              font-size: 26px !important;
              line-height: 1.1 !important;
            }
            .print-header-grid {
              gap: 16px !important;
            }
            .print-header-title-container > * + * {
              margin-top: 3px !important;
            }
            .print-period-badge {
              padding: 6px 12px !important;
              border-radius: 8px !important;
              border-color: #cbd5e1 !important;
            }
            .print-period-badge span:first-child {
              font-size: 15px !important;
            }
            .print-period-badge span:last-child {
              font-size: 8px !important;
              margin-top: 1.5px !important;
            }
            .print-content {
              padding: 0 !important;
              background: white !important;
              margin-top: 6px !important;
              margin-bottom: 6px !important;
            }
            .print-content th {
              padding: 6px 3px !important;
              background-color: #f8fafc !important;
              border-bottom: 2px solid #cbd5e1 !important;
            }
            .print-content th span {
              font-size: 10px !important;
            }
            .print-content td {
              padding: 2.5px !important;
              height: auto !important;
            }
            /* First/Time column scaling */
            .print-content td:first-child {
              padding: 2.5px !important;
              width: 75px !important;
            }
            .print-content td:first-child div {
              font-size: 10px !important;
            }
            /* Grid schedule cards inside td elements */
            .print-content .min-h-\\[140px\\] {
              min-height: 70px !important;
              height: auto !important;
              padding: 5px 6px !important;
              border-radius: 4px !important;
              background-color: #f8fafc !important;
              border: 1px solid #e2e8f0 !important;
              display: flex !important;
              flex-direction: column !important;
              overflow: visible !important;
            }
            .print-content .min-h-\\[140px\\] span,
            .print-content .min-h-\\[140px\\] p,
            .print-content .min-h-\\[140px\\] div {
              font-size: 8.5px !important;
              line-height: 1.15 !important;
              white-space: normal !important;
              word-break: break-word !important;
              overflow: visible !important;
              text-overflow: clip !important;
              display: block !important;
              -webkit-line-clamp: unset !important;
              line-clamp: unset !important;
            }
            .print-content .min-h-\\[140px\\] svg {
              width: 9px !important;
              height: 9px !important;
            }
            /* Interval/Lunch slot compact presentation */
            .print-content tr[class*="bg-slate-50"] td {
              padding: 3px !important;
            }
            .print-content tr[class*="bg-slate-50"] span {
              font-size: 8.5px !important;
              letter-spacing: 0.3em !important;
            }
          `}

          /* White header/footer block elements */
          .print-header, .print-header * {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .print-header span, .print-header p, .print-header h2 {
            color: #000000 !important;
          }

          /* Ensure layout fonts look crisp and color adjustments are accurate */
          .print-content .text-neutral-950,
          .print-content .text-slate-800 {
            color: #000000 !important;
            font-weight: 800 !important;
          }
          .print-content .text-neutral-500,
          .print-content .text-slate-600 {
            color: #334155 !important;
            font-weight: 600 !important;
          }
          .print-content .text-neutral-400,
          .print-content .text-slate-400 {
            color: #64748b !important;
          }
        }
      `}}),(0,r.jsxs)("div",{className:"flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden",children:[(0,r.jsxs)("div",{children:[(0,r.jsxs)("h1",{className:"text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3",children:[(0,r.jsx)(s.A,{className:"text-blue-600",size:32}),e.schedule.weeklySchedule]}),(0,r.jsx)("p",{className:"text-slate-500 font-medium ml-11",children:e.reportCard.subtitle})]}),a?.role!=="aluno"&&a?.role!=="convidado"&&(0,r.jsxs)("div",{className:"flex items-center gap-3",children:[!g&&(0,r.jsxs)("div",{className:"flex items-center gap-2",children:[U&&(0,r.jsxs)("button",{onClick:()=>{ea(ed),K(!1),$.toast.info("pt"===t?"Edi\xe7\xe3o cancelada. As altera\xe7\xf5es foram descartadas.":"Editing canceled. Changes discarded.")},disabled:er,type:"button",className:"flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 shadow-md cursor-pointer disabled:opacity-50",children:[(0,r.jsx)(d.A,{size:18}),"pt"===t?"Cancelar":"Cancel"]}),(0,r.jsxs)("button",{onClick:()=>{U?es():(el(JSON.parse(JSON.stringify(et))),K(!0))},disabled:er||!Y,className:(0,C.cn)("flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 cursor-pointer",U?"bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700":"bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shadow-slate-100"),children:[er?(0,r.jsx)(l.A,{size:18,className:"animate-spin"}):U?(0,r.jsx)(p.A,{size:18}):(0,r.jsx)(c.A,{size:18}),U?"pt"===t?"Salvar":"Save":"pt"===t?"Editar":"Edit"]})]}),Y&&!U&&(0,r.jsxs)("div",{className:"flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner",children:[(0,r.jsx)("button",{type:"button",onClick:()=>Z("portrait"),className:(0,C.cn)("px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer select-none","portrait"===Q?"bg-neutral-950 text-white shadow-sm":"text-slate-500 hover:text-slate-800"),children:"pt"===t?"Retrato":"Portrait"}),(0,r.jsx)("button",{type:"button",onClick:()=>Z("landscape"),className:(0,C.cn)("px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer select-none","landscape"===Q?"bg-neutral-950 text-white shadow-sm":"text-slate-500 hover:text-slate-800"),children:"pt"===t?"Paisagem":"Landscape"})]}),(0,r.jsxs)("button",{onClick:()=>{if(Y)try{window.print()}catch(e){console.error("Failed to open native print dialog:",e),$.toast.error("pt"===t?"N\xe3o foi poss\xedvel abrir a janela de impress\xe3o.":"Could not open print window.")}},disabled:U||!Y,className:"flex items-center gap-2 bg-[#0f172a] text-white px-5 py-2.5 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:grayscale",children:[(0,r.jsx)(m.A,{size:18}),e.schedule.print]})]})]}),(0,r.jsxs)("div",{className:"bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden",children:[g?(0,r.jsxs)("div",{className:"space-y-2 col-span-1 md:col-span-2 flex flex-col justify-center",children:[(0,r.jsx)("span",{className:"text-[10px] font-black text-slate-400 uppercase tracking-widest px-1",children:"pt"===t?"Sua Matr\xedcula e Turma":"Your Registration & Class"}),(0,r.jsxs)("div",{className:"flex flex-wrap gap-3 items-center mt-1",children:[(0,r.jsx)("span",{className:"px-4 py-2 bg-blue-50 text-blue-700 font-extrabold text-xs md:text-sm rounded-2xl border border-blue-100 uppercase tracking-wider",children:eo?.nome?eo.nome.toLowerCase().startsWith("curso")?eo.nome:`Curso: ${eo.nome}`:"..."}),(0,r.jsx)("span",{className:"px-4 py-2 bg-emerald-50 text-emerald-700 font-extrabold text-xs md:text-sm rounded-2xl border border-emerald-100 uppercase tracking-wider",children:ei?.nome?ei.nome.toLowerCase().startsWith("turma")?ei.nome:`Turma: ${ei.nome}`:"..."})]})]}):(0,r.jsxs)(r.Fragment,{children:[(0,r.jsxs)("div",{className:"space-y-2",children:[(0,r.jsxs)("label",{className:"text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2",children:[(0,r.jsx)(u.A,{size:12})," ",e.nav.courses]}),(0,r.jsxs)("select",{value:V,onChange:e=>{B(e.target.value),J("")},className:"w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-bold text-slate-800 appearance-none cursor-pointer",children:[(0,r.jsx)("option",{value:"",children:e.courses.selectCourse}),T.map(e=>(0,r.jsx)("option",{value:e.id,children:e.nome},e.id))]})]}),(0,r.jsxs)("div",{className:"space-y-2",children:[(0,r.jsxs)("label",{className:"text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2",children:[(0,r.jsx)(s.A,{size:12})," ",e.nav.classes]}),(0,r.jsxs)("select",{value:Y,onChange:e=>J(e.target.value),disabled:!V,className:"w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-bold text-slate-800 appearance-none cursor-pointer disabled:opacity-50",children:[(0,r.jsx)("option",{value:"",children:e.attendance.selectClass}),G.filter(e=>e.curso_id===V||!V).map(e=>(0,r.jsx)("option",{value:e.id,children:e.nome},e.id))]})]})]}),(0,r.jsxs)("div",{className:"space-y-2",children:[(0,r.jsxs)("label",{className:"text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2 flex-wrap",children:[(0,r.jsx)(x.A,{size:12,className:"text-blue-500"})," ","pt"===t?"Semana":"Week"]}),(0,r.jsxs)("div",{className:"flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-2xl p-1 h-[56px]",children:[(0,r.jsx)("button",{type:"button",onClick:()=>{ec(e=>(0,_.f)(e,-7))},disabled:!Y,className:"text-slate-405 hover:text-slate-800 hover:bg-white rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0 flex items-center justify-center h-11 w-11 shadow-sm border border-transparent hover:border-slate-100",title:"pt"===t?"Semana anterior":"Previous week",children:(0,r.jsx)(h.A,{size:16})}),(0,r.jsxs)("div",{className:"relative flex-1",children:[(0,r.jsx)("select",{value:(0,z.GP)(em,"yyyy-MM-dd"),onChange:e=>{ec(new Date(e.target.value+"T00:00:00"))},disabled:!Y,className:"w-full px-1 py-2.5 bg-transparent outline-none text-xs font-bold text-slate-800 appearance-none cursor-pointer disabled:opacity-30 text-center",children:eh.map(e=>(0,r.jsx)("option",{value:(0,z.GP)(e.date,"yyyy-MM-dd"),children:e.label},(0,z.GP)(e.date,"yyyy-MM-dd")))}),(0,r.jsx)(b.A,{size:12,className:"absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"})]}),(0,r.jsx)("button",{type:"button",onClick:()=>{ec(e=>(0,_.f)(e,7))},disabled:!Y,className:"text-slate-405 hover:text-slate-800 hover:bg-white rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0 flex items-center justify-center h-11 w-11 shadow-sm border border-transparent hover:border-slate-100",title:"pt"===t?"Pr\xf3xima semana":"Next week",children:(0,r.jsx)(f.A,{size:16})})]})]})]}),(0,r.jsx)(S.N,{mode:"wait",children:Y?(0,r.jsx)(A.P.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},className:"flex flex-col items-center",children:(0,r.jsxs)("div",{ref:ee,className:"w-full max-w-[1200px] bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col font-sans mb-10 print-container",children:[(0,r.jsx)("div",{className:"bg-white p-12 text-slate-800 relative overflow-hidden print-header print-header-top border-b border-slate-200",children:(0,r.jsxs)("div",{className:"relative z-10 grid grid-cols-1 md:grid-cols-3 gap-12 print-header-grid",children:[(0,r.jsxs)("div",{className:"col-span-2 space-y-3 print-header-title-container",children:[(0,r.jsx)("div",{className:"flex items-center",children:(0,r.jsx)("span",{className:"text-xs font-black text-blue-600 uppercase tracking-widest",children:eo?.nome})}),(0,r.jsx)("h2",{className:"text-4xl md:text-5xl font-black tracking-tighter leading-none text-slate-900 animate-fade-in",children:ei?.nome})]}),(0,r.jsxs)("div",{className:"flex flex-col md:items-end justify-center",children:[(0,r.jsx)("p",{className:"text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2",children:e.schedule.period.toUpperCase()}),(0,r.jsxs)("div",{className:"bg-slate-50 border border-slate-200 px-6 py-3 rounded-2xl flex flex-col md:items-end shadow-sm print-period-badge",children:[(0,r.jsx)("span",{className:"text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-none",children:ex}),(0,r.jsx)("span",{className:"text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 leading-none",children:(0,z.GP)(em,"MMMM yyyy",{locale:I.F})})]})]})]})}),(0,r.jsxs)("div",{className:"p-6 bg-slate-50 flex-1 print-content",children:[(0,r.jsx)("div",{className:"bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm",children:(0,r.jsxs)("table",{className:"w-full border-collapse table-fixed",children:[(0,r.jsx)("thead",{children:(0,r.jsxs)("tr",{className:"bg-slate-50/50 border-b border-slate-200",children:[(0,r.jsx)("th",{className:"w-32 px-4 py-6 border-r border-slate-200",children:(0,r.jsx)("span",{className:"text-[10px] font-black text-slate-400 uppercase tracking-widest",children:e.schedule.time})}),ef.map(e=>{let t=ej(e.date);return(0,r.jsx)("th",{className:(0,C.cn)("px-4 py-6 border-r border-slate-200 last:border-r-0",t?"bg-neutral-100/50":""),children:(0,r.jsxs)("div",{className:"flex flex-col gap-1",children:[(0,r.jsx)("span",{className:(0,C.cn)("text-[10px] font-black uppercase tracking-widest",t?"text-neutral-500":"text-neutral-900"),children:e.label}),(0,r.jsx)("span",{className:"text-[11px] font-bold text-neutral-400",children:(0,z.GP)(e.date,"dd/MM")})]})},e.key)})]})}),(0,r.jsx)("tbody",{children:eb.map((a,n)=>{let i=e=>ef.some(t=>!!ey(e,t.key).subjectId),o="";if("class"===a.type)i(a.id)||(o="print:hidden no-print");else if("interval"===a.type){let e=eb[n-1],t=eb[n+1],a=!!e&&i(e.id),r=!!t&&i(t.id);a||r||(o="print:hidden no-print")}return"interval"===a.type?(0,r.jsxs)("tr",{className:(0,C.cn)("bg-slate-50/50 border-b border-slate-100",o),children:[(0,r.jsx)("td",{className:"px-4 py-1.5 text-center border-r border-slate-200",children:(0,r.jsx)("span",{className:"text-[9px] font-black text-slate-300 italic",children:a.time})}),(0,r.jsx)("td",{colSpan:5,className:"px-4 py-1.5 text-center",children:(0,r.jsxs)("div",{className:"flex items-center justify-center gap-2 opacity-30",children:[(0,r.jsx)(y,{size:10,className:"text-slate-400"}),(0,r.jsx)("span",{className:"text-[9px] font-black text-slate-400 uppercase tracking-[0.8em]",children:e.schedule.interval})]})})]},a.id):(0,r.jsxs)("tr",{className:(0,C.cn)("border-b border-slate-100 last:border-b-0 print-row",o),children:[(0,r.jsx)("td",{className:"px-4 py-8 text-center border-r border-slate-200 bg-slate-50/20",children:(0,r.jsx)("div",{className:"text-xs font-black text-slate-800 leading-none",children:a.time})}),ef.map(n=>{let i=ey(a.id,n.key),o=ej(n.date),s=i.turmaId||Y,d=G.find(e=>e.id===s),l=d?T.find(e=>e.id===d.curso_id):void 0,p=l?.grupo_responsavel||d?.grupo_responsavel,c=O.filter(e=>!!i.instructorId&&String(e.id)===String(i.instructorId)||!p||("MAN"===p?"MAN"===e.grupo_responsavel||"AMBOS"===e.grupo_responsavel:"GAT"!==p||"GAT"===e.grupo_responsavel||"AMBOS"===e.grupo_responsavel)),m=c.length>0?c:O;return(V&&G.filter(e=>e.curso_id===V),i.subjectId&&F.filter(e=>e.disciplina_id===i.subjectId),o)?(0,r.jsx)("td",{className:"px-3 py-3 border-r border-slate-100 last:border-r-0 bg-neutral-50",children:(0,r.jsxs)("div",{className:"h-full flex flex-col items-center justify-center opacity-40",children:[(0,r.jsx)(v.A,{size:14,className:"text-neutral-500 mb-1"}),(0,r.jsx)("span",{className:"text-[8px] font-black text-neutral-600 uppercase tracking-widest",children:o.name})]})},n.key):(0,r.jsx)("td",{className:"px-3 py-3 border-r border-slate-100 last:border-r-0",children:(0,r.jsx)("div",{className:(0,C.cn)("rounded-2xl p-4 h-full flex flex-col transition-all min-h-[140px]",U?"bg-white border-2 border-dashed border-neutral-300":i.subjectId?"bg-slate-50 border border-slate-200/80 shadow-sm":"hover:bg-slate-50/40 border border-transparent"),children:(()=>{let o=H.find(e=>e.id===i.subjectId),s=F.find(e=>e.id===i.topicId),d=i.modulo||(o?.modulo_index?String(o.modulo_index):"1"),l="PROVAS"===d?"pt"===t?"PROVAS":"EXAMS":isNaN(Number(d))?d:"pt"===t?`M\xf3dulo ${d}`:`Module ${d}`;return U?(0,r.jsxs)("div",{className:"space-y-1.5 flex flex-col h-full justify-between",children:[(0,r.jsxs)("div",{className:"space-y-1.5",children:[(0,r.jsxs)("div",{className:"flex items-center gap-1.5 text-blue-600",children:[(0,r.jsx)(j.A,{size:9,className:"shrink-0 text-blue-500"}),"true"===i.moduloIsCustom||i.modulo&&isNaN(Number(i.modulo))&&"PROVAS"!==i.modulo?(0,r.jsxs)("div",{className:"flex items-center gap-1 w-full",children:[(0,r.jsx)("input",{type:"text",value:i.modulo||"",onChange:e=>eg(a.id,n.key,"modulo",e.target.value),placeholder:"pt"===t?"M\xf3dulo":"Module",className:"w-full text-[9px] font-black text-blue-600 bg-transparent border-none focus:ring-0 p-0 uppercase",autoFocus:!0}),(0,r.jsx)("button",{type:"button",onClick:()=>{eg(a.id,n.key,"modulo",""),eg(a.id,n.key,"moduloIsCustom","")},className:"text-blue-500 hover:text-blue-700 font-bold text-[9px] px-1",title:"Select",children:"✕"})]}):(0,r.jsxs)("select",{value:i.modulo||"",onChange:e=>{"__custom__"===e.target.value?(eg(a.id,n.key,"moduloIsCustom","true"),eg(a.id,n.key,"modulo","")):(eg(a.id,n.key,"modulo",e.target.value),eg(a.id,n.key,"moduloIsCustom",""))},className:"w-full text-[9px] font-black text-blue-600 bg-transparent border-none focus:ring-0 p-0 cursor-pointer block truncate uppercase",children:[(0,r.jsx)("option",{value:"",children:"pt"===t?"M\xf3dulo Padr\xe3o":"Default Module"}),Array.from({length:eo?.qtd_modulos||4}).map((e,a)=>(0,r.jsx)("option",{value:String(a+1),children:"pt"===t?`M\xf3dulo ${a+1}`:`Module ${a+1}`},a+1)),(0,r.jsx)("option",{value:"PROVAS",children:"pt"===t?"PROVAS":"EXAMS"}),(0,r.jsx)("option",{value:"__custom__",children:"pt"===t?"✍️ Digitar...":"✍️ Custom..."})]})]}),(0,r.jsxs)("div",{className:"flex items-center gap-1.5 text-neutral-950",children:[(0,r.jsx)(u.A,{size:9,className:"shrink-0 text-neutral-400"}),"true"===i.subjectIsCustom||i.customSubject&&!i.subjectId?(0,r.jsxs)("div",{className:"flex items-center gap-1 w-full",children:[(0,r.jsx)("input",{type:"text",value:i.customSubject||"",onChange:e=>eg(a.id,n.key,"customSubject",e.target.value),placeholder:"pt"===t?"Disciplina":"Subject",className:"w-full text-[9px] font-black text-neutral-950 bg-transparent border-none focus:ring-0 p-0 uppercase",autoFocus:!0}),(0,r.jsx)("button",{type:"button",onClick:()=>{eg(a.id,n.key,"customSubject",""),eg(a.id,n.key,"subjectIsCustom",""),eg(a.id,n.key,"subjectId","")},className:"text-neutral-500 hover:text-neutral-700 font-bold text-[9px] px-1",title:"Select",children:"✕"})]}):(0,r.jsxs)("select",{value:i.subjectId||"",onChange:e=>{"__custom__"===e.target.value?(eg(a.id,n.key,"subjectIsCustom","true"),eg(a.id,n.key,"subjectId","")):(eg(a.id,n.key,"subjectId",e.target.value),eg(a.id,n.key,"topicId",""),eg(a.id,n.key,"topic",""),eg(a.id,n.key,"modulo",""),eg(a.id,n.key,"subjectIsCustom","")),eg(a.id,n.key,"customSubject","")},className:"w-full text-[9px] font-black text-neutral-950 bg-transparent border-none focus:ring-0 p-0 cursor-pointer block truncate",children:[(0,r.jsx)("option",{value:"",children:e.schedule.subject}),ev.map(e=>(0,r.jsx)("option",{value:e.id,children:e.nome},e.id)),(0,r.jsx)("option",{value:"__custom__",children:"pt"===t?"✍️ Digitar...":"✍️ Custom..."})]})]}),(0,r.jsxs)("div",{className:"flex items-center gap-1.5 text-neutral-500",children:[(0,r.jsx)(k.A,{size:9,className:"shrink-0 text-slate-400"}),"true"===i.instructorIsCustom||i.customInstructor&&!i.instructorId?(0,r.jsxs)("div",{className:"flex items-center gap-1 w-full",children:[(0,r.jsx)("input",{type:"text",value:i.customInstructor||"",onChange:e=>eg(a.id,n.key,"customInstructor",e.target.value),placeholder:"pt"===t?"Instrutor":"Instructor",className:"w-full text-[9px] font-bold text-slate-600 bg-transparent border-none focus:ring-0 p-0",autoFocus:!0}),(0,r.jsx)("button",{type:"button",onClick:()=>{eg(a.id,n.key,"customInstructor",""),eg(a.id,n.key,"instructorIsCustom",""),eg(a.id,n.key,"instructorId","")},className:"text-slate-500 hover:text-slate-700 font-bold text-[9px] px-1",title:"Select",children:"✕"})]}):(0,r.jsxs)("select",{value:i.instructorId||"",onChange:e=>{"__custom__"===e.target.value?(eg(a.id,n.key,"instructorIsCustom","true"),eg(a.id,n.key,"instructorId","")):(eg(a.id,n.key,"instructorId",e.target.value),eg(a.id,n.key,"instructorIsCustom","")),eg(a.id,n.key,"customInstructor","")},className:"w-full text-[9px] font-bold text-slate-600 bg-transparent border-none focus:ring-0 p-0 cursor-pointer block truncate",children:[(0,r.jsx)("option",{value:"",children:e.schedule.instructor}),m.map(e=>(0,r.jsx)("option",{value:e.id,children:e.full_name},e.id)),(0,r.jsx)("option",{value:"__custom__",children:"pt"===t?"✍️ Digitar...":"✍️ Custom..."})]})]})]}),(0,r.jsxs)("div",{className:"flex items-center gap-1.5 pt-1.5 border-t border-slate-100 mt-auto",children:[(0,r.jsx)(w.A,{size:9,className:"text-slate-400 shrink-0"}),(0,r.jsx)("input",{value:i.room||"",onChange:e=>eg(a.id,n.key,"room",e.target.value),placeholder:"Sala",className:"w-full text-[9px] font-bold text-slate-500 bg-transparent border-none focus:ring-0 p-0 placeholder:text-slate-200 uppercase"})]})]}):i.subjectId||i.customSubject?(0,r.jsxs)("div",{className:"space-y-1.5 flex-1 flex flex-col justify-between",children:[(0,r.jsxs)("div",{className:"space-y-1.5",children:[(0,r.jsxs)("div",{className:"flex items-center gap-1.5 text-blue-600",children:[(0,r.jsx)(j.A,{size:10,className:"shrink-0"}),(0,r.jsx)("span",{className:"text-[9px] font-black uppercase tracking-wider leading-none",children:l})]}),(0,r.jsxs)("div",{className:"flex items-center gap-1.5 text-neutral-950",children:[(0,r.jsx)(u.A,{size:10,className:"shrink-0"}),(0,r.jsx)("span",{className:"text-[11px] font-black leading-tight uppercase tracking-tight",children:i.customSubject||o?.nome||"Disciplina"})]}),(i.topic||i.topicId)&&(0,r.jsxs)("div",{className:"flex items-start gap-1.5 text-slate-600 pl-0.5",children:[(0,r.jsx)(N,{size:10,className:"text-slate-400 shrink-0 mt-0.5"}),(0,r.jsx)("span",{className:"text-[10px] font-bold leading-tight uppercase tracking-tight text-slate-600 line-clamp-2",children:i.topic||s?.nome||""})]}),(0,r.jsxs)("div",{className:"flex items-center gap-1.5 text-neutral-500",children:[(0,r.jsx)(k.A,{size:10,className:"shrink-0"}),(0,r.jsx)("span",{className:"text-[10px] font-bold leading-none",children:i.customInstructor||O.find(e=>e.id===i.instructorId)?.full_name||i.instructorId||"Instrutor"})]})]}),(0,r.jsx)("div",{className:"pt-1.5 flex flex-col gap-1 border-t border-slate-100 mt-auto",children:(0,r.jsxs)("div",{className:"flex items-center gap-1.5 text-neutral-400",children:[(0,r.jsx)(w.A,{size:10}),(0,r.jsxs)("span",{className:"text-[9px] font-black uppercase tracking-tight leading-none",children:["pt"===t?"Sala: ":"Room: ",i.room||"N/A"]})]})})]}):(0,r.jsx)("div",{className:"flex-1 flex items-center justify-center opacity-10",children:(0,r.jsx)(M.A,{size:16})})})()})},n.key)})]},a.id)})})]})}),(0,r.jsxs)("div",{className:"px-12 py-8 bg-white flex items-center justify-between print-header print-header-bottom border-t border-slate-200",children:[(0,r.jsxs)("div",{className:"flex items-center gap-4",children:[(0,r.jsx)("div",{className:"w-10 h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center",children:(0,r.jsx)(M.A,{size:20,className:"text-slate-700"})}),(0,r.jsx)("div",{children:(0,r.jsx)("p",{className:"text-[8px] font-black text-slate-400 uppercase tracking-widest",children:e.schedule.footerVersion})})]}),(0,r.jsxs)("div",{className:"text-right",children:[(0,r.jsx)("p",{className:"text-[10px] font-black text-slate-400 uppercase tracking-widest",children:e.schedule.footerDocGenerated}),(0,r.jsx)("p",{className:"text-xs font-black text-slate-800",children:(0,z.GP)(new Date,"dd/MM/yyyy • HH:mm")})]})]})," "]})]})}):(0,r.jsxs)("div",{className:"py-32 flex flex-col items-center justify-center bg-white rounded-[4rem] border border-slate-100 shadow-sm",children:[(0,r.jsx)("div",{className:"w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8 text-slate-200",children:(0,r.jsx)(s.A,{size:48,strokeWidth:1})}),(0,r.jsx)("h3",{className:"text-xl font-black text-slate-800 uppercase tracking-tight mb-2",children:"Selecione uma Turma"}),(0,r.jsx)("p",{className:"text-slate-400 text-sm font-medium",children:"Use os filtros acima para carregar o quadro de hor\xe1rios."})]})})]})}},24849:(e,t,a)=>{"use strict";a.d(t,{A:()=>r});let r=(0,a(41680).A)("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]])},98755:(e,t,a)=>{"use strict";a.d(t,{A:()=>r});let r=(0,a(41680).A)("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]])},52706:(e,t,a)=>{"use strict";a.d(t,{A:()=>r});let r=(0,a(41680).A)("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]])},67418:(e,t,a)=>{"use strict";a.d(t,{A:()=>r});let r=(0,a(41680).A)("CircleAlert",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]])},94667:(e,t,a)=>{"use strict";a.d(t,{A:()=>r});let r=(0,a(41680).A)("Layers",[["path",{d:"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",key:"8b97xw"}],["path",{d:"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65",key:"dd6zsq"}],["path",{d:"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65",key:"ep9fru"}]])},48857:(e,t,a)=>{"use strict";a.d(t,{A:()=>r});let r=(0,a(41680).A)("MapPin",[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]])},50385:(e,t,a)=>{"use strict";a.d(t,{A:()=>r});let r=(0,a(41680).A)("PenLine",[["path",{d:"M12 20h9",key:"t2du7b"}],["path",{d:"M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z",key:"1ykcvy"}]])},82565:(e,t,a)=>{"use strict";a.d(t,{A:()=>r});let r=(0,a(41680).A)("Printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]])},37577:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>r});let r=(0,a(46760).registerClientReference)(function(){throw Error("Attempted to call the default export of \"/app/applet/app/(dashboard)/horario/page.tsx\" from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"/app/applet/app/(dashboard)/horario/page.tsx","default")},83139:(e,t,a)=>{"use strict";a.d(t,{f:()=>i});var r=a(23790),n=a(93422);function i(e,t,a){let i=(0,n.a)(e,a?.in);return isNaN(t)?(0,r.w)(a?.in||e,NaN):(t&&i.setDate(i.getDate()+t),i)}},4711:(e,t,a)=>{"use strict";a.d(t,{F:()=>p});let r={lessThanXSeconds:{one:"menos de um segundo",other:"menos de {{count}} segundos"},xSeconds:{one:"1 segundo",other:"{{count}} segundos"},halfAMinute:"meio minuto",lessThanXMinutes:{one:"menos de um minuto",other:"menos de {{count}} minutos"},xMinutes:{one:"1 minuto",other:"{{count}} minutos"},aboutXHours:{one:"cerca de 1 hora",other:"cerca de {{count}} horas"},xHours:{one:"1 hora",other:"{{count}} horas"},xDays:{one:"1 dia",other:"{{count}} dias"},aboutXWeeks:{one:"cerca de 1 semana",other:"cerca de {{count}} semanas"},xWeeks:{one:"1 semana",other:"{{count}} semanas"},aboutXMonths:{one:"cerca de 1 m\xeas",other:"cerca de {{count}} meses"},xMonths:{one:"1 m\xeas",other:"{{count}} meses"},aboutXYears:{one:"cerca de 1 ano",other:"cerca de {{count}} anos"},xYears:{one:"1 ano",other:"{{count}} anos"},overXYears:{one:"mais de 1 ano",other:"mais de {{count}} anos"},almostXYears:{one:"quase 1 ano",other:"quase {{count}} anos"}};var n=a(20582);let i={date:(0,n.k)({formats:{full:"EEEE, d 'de' MMMM 'de' y",long:"d 'de' MMMM 'de' y",medium:"d MMM y",short:"dd/MM/yyyy"},defaultWidth:"full"}),time:(0,n.k)({formats:{full:"HH:mm:ss zzzz",long:"HH:mm:ss z",medium:"HH:mm:ss",short:"HH:mm"},defaultWidth:"full"}),dateTime:(0,n.k)({formats:{full:"{{date}} '\xe0s' {{time}}",long:"{{date}} '\xe0s' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},defaultWidth:"full"})},o={lastWeek:e=>{let t=e.getDay();return"'"+(0===t||6===t?"\xfaltimo":"\xfaltima")+"' eeee '\xe0s' p"},yesterday:"'ontem \xe0s' p",today:"'hoje \xe0s' p",tomorrow:"'amanh\xe3 \xe0s' p",nextWeek:"eeee '\xe0s' p",other:"P"};var s=a(11612);let d={ordinalNumber:(e,t)=>{let a=Number(e);return t?.unit==="week"?a+"\xaa":a+"\xba"},era:(0,s.o)({values:{narrow:["AC","DC"],abbreviated:["AC","DC"],wide:["antes de cristo","depois de cristo"]},defaultWidth:"wide"}),quarter:(0,s.o)({values:{narrow:["1","2","3","4"],abbreviated:["T1","T2","T3","T4"],wide:["1\xba trimestre","2\xba trimestre","3\xba trimestre","4\xba trimestre"]},defaultWidth:"wide",argumentCallback:e=>e-1}),month:(0,s.o)({values:{narrow:["j","f","m","a","m","j","j","a","s","o","n","d"],abbreviated:["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"],wide:["janeiro","fevereiro","mar\xe7o","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"]},defaultWidth:"wide"}),day:(0,s.o)({values:{narrow:["D","S","T","Q","Q","S","S"],short:["dom","seg","ter","qua","qui","sex","sab"],abbreviated:["domingo","segunda","ter\xe7a","quarta","quinta","sexta","s\xe1bado"],wide:["domingo","segunda-feira","ter\xe7a-feira","quarta-feira","quinta-feira","sexta-feira","s\xe1bado"]},defaultWidth:"wide"}),dayPeriod:(0,s.o)({values:{narrow:{am:"a",pm:"p",midnight:"mn",noon:"md",morning:"manh\xe3",afternoon:"tarde",evening:"tarde",night:"noite"},abbreviated:{am:"AM",pm:"PM",midnight:"meia-noite",noon:"meio-dia",morning:"manh\xe3",afternoon:"tarde",evening:"tarde",night:"noite"},wide:{am:"a.m.",pm:"p.m.",midnight:"meia-noite",noon:"meio-dia",morning:"manh\xe3",afternoon:"tarde",evening:"tarde",night:"noite"}},defaultWidth:"wide",formattingValues:{narrow:{am:"a",pm:"p",midnight:"mn",noon:"md",morning:"da manh\xe3",afternoon:"da tarde",evening:"da tarde",night:"da noite"},abbreviated:{am:"AM",pm:"PM",midnight:"meia-noite",noon:"meio-dia",morning:"da manh\xe3",afternoon:"da tarde",evening:"da tarde",night:"da noite"},wide:{am:"a.m.",pm:"p.m.",midnight:"meia-noite",noon:"meio-dia",morning:"da manh\xe3",afternoon:"da tarde",evening:"da tarde",night:"da noite"}},defaultFormattingWidth:"wide"})};var l=a(94682);let p={code:"pt-BR",formatDistance:(e,t,a)=>{let n;let i=r[e];return(n="string"==typeof i?i:1===t?i.one:i.other.replace("{{count}}",String(t)),a?.addSuffix)?a.comparison&&a.comparison>0?"em "+n:"h\xe1 "+n:n},formatLong:i,formatRelative:(e,t,a,r)=>{let n=o[e];return"function"==typeof n?n(t):n},localize:d,match:{ordinalNumber:(0,a(16054).K)({matchPattern:/^(\d+)[ºªo]?/i,parsePattern:/\d+/i,valueCallback:e=>parseInt(e,10)}),era:(0,l.A)({matchPatterns:{narrow:/^(ac|dc|a|d)/i,abbreviated:/^(a\.?\s?c\.?|d\.?\s?c\.?)/i,wide:/^(antes de cristo|depois de cristo)/i},defaultMatchWidth:"wide",parsePatterns:{any:[/^ac/i,/^dc/i],wide:[/^antes de cristo/i,/^depois de cristo/i]},defaultParseWidth:"any"}),quarter:(0,l.A)({matchPatterns:{narrow:/^[1234]/i,abbreviated:/^T[1234]/i,wide:/^[1234](º)? trimestre/i},defaultMatchWidth:"wide",parsePatterns:{any:[/1/i,/2/i,/3/i,/4/i]},defaultParseWidth:"any",valueCallback:e=>e+1}),month:(0,l.A)({matchPatterns:{narrow:/^[jfmajsond]/i,abbreviated:/^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i,wide:/^(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i},defaultMatchWidth:"wide",parsePatterns:{narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^fev/i,/^mar/i,/^abr/i,/^mai/i,/^jun/i,/^jul/i,/^ago/i,/^set/i,/^out/i,/^nov/i,/^dez/i]},defaultParseWidth:"any"}),day:(0,l.A)({matchPatterns:{narrow:/^(dom|[23456]ª?|s[aá]b)/i,short:/^(dom|[23456]ª?|s[aá]b)/i,abbreviated:/^(dom|seg|ter|qua|qui|sex|s[aá]b)/i,wide:/^(domingo|(segunda|ter[cç]a|quarta|quinta|sexta)([- ]feira)?|s[aá]bado)/i},defaultMatchWidth:"wide",parsePatterns:{short:[/^d/i,/^2/i,/^3/i,/^4/i,/^5/i,/^6/i,/^s[aá]/i],narrow:[/^d/i,/^2/i,/^3/i,/^4/i,/^5/i,/^6/i,/^s[aá]/i],any:[/^d/i,/^seg/i,/^t/i,/^qua/i,/^qui/i,/^sex/i,/^s[aá]b/i]},defaultParseWidth:"any"}),dayPeriod:(0,l.A)({matchPatterns:{narrow:/^(a|p|mn|md|(da) (manhã|tarde|noite))/i,any:/^([ap]\.?\s?m\.?|meia[-\s]noite|meio[-\s]dia|(da) (manhã|tarde|noite))/i},defaultMatchWidth:"any",parsePatterns:{any:{am:/^a/i,pm:/^p/i,midnight:/^mn|^meia[-\s]noite/i,noon:/^md|^meio[-\s]dia/i,morning:/manhã/i,afternoon:/tarde/i,evening:/tarde/i,night:/noite/i}},defaultParseWidth:"any"})},options:{weekStartsOn:0,firstWeekContainsDate:1}}}};var t=require("../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),r=t.X(0,[638,1531,4741,967,6509,1513,4617],()=>a(72723));module.exports=r})();