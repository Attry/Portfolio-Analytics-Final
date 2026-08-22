import fs from 'fs';

let content = fs.readFileSync('services/csvParsers.ts', 'utf8');

content = content.replace(
    /let netAmount = 0;\s*if \(idxNetEUR !== -1 && row\[idxNetEUR\]\) \{\s*netAmount = parseNum\(row\[idxNetEUR\]\);\s*\} else \{\s*netAmount = tradeType === TradeType\.BUY \? -\(qty \* price\) : \(qty \* price\);\s*\}/,
    `let netAmount = 0;
              if (idxNetEUR !== -1 && row[idxNetEUR]) {
                  const rawNetAmount = parseNum(row[idxNetEUR]);
                  // Revert the fees to get the Gross Amount in EUR
                  netAmount = rawNetAmount + (autoFXFee + brokerageFee);
              } else {
                  netAmount = tradeType === TradeType.BUY ? -(qty * price) : (qty * price);
              }`
);

fs.writeFileSync('services/csvParsers.ts', content);
