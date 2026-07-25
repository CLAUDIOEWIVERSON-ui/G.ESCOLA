const fs = require('fs');

async function run() {
  const html = await fetch('http://localhost:3000/turmas').then(res => res.text());
  // Let's use JSDOM
  const { JSDOM } = require("jsdom");
  const dom = new JSDOM(html);
  const selector = "div:nth-of-type(2) > div:nth-of-type(2) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(4) > button:nth-of-type(1)";
  const el = dom.window.document.querySelector(selector);
  if (el) {
    console.log("FOUND ON /turmas:", el.outerHTML);
  } else {
    console.log("Not found on /turmas");
  }
}
run().catch(console.error);
