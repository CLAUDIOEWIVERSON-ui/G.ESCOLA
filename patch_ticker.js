const fs = require('fs');
let content = fs.readFileSync('components/ExchangeRateTicker.tsx', 'utf8');

// The free API returns BRL, EUR, STN based on USD base.
// 1 USD = X BRL, Y EUR, Z STN.
// The user asks for "COTAÇÃO DO DÓLAR EM RELAÇÃO AO REAL, EURO E DOBRAS", which is exactly 1 USD = X BRL, etc.
