const fs = require('fs');
let file = 'app/(dashboard)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const printContainerHtml = content.substring(content.indexOf('            {/* PRINT LAYOUT FOR ALUNOS EXTERIOR */}'), content.indexOf('          </motion.div>\n        )}\n\n        {selectedCard === \'expedito\''));
content = content.replace(printContainerHtml, '');
content = content.replace("          </motion.div>\n        )}\n\n        {selectedCard === 'expedito'", "          </motion.div>\n        )}\n" + printContainerHtml + "\n        {selectedCard === 'expedito'");

// Remove the `overflow-hidden` from the motion.div just in case, wait, I can just leave it since the print container is now outside!

fs.writeFileSync(file, content);
