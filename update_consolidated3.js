import fs from 'fs';

let content = fs.readFileSync('hooks/useConsolidatedData.ts', 'utf8');

// Update Indian Equity Capital
content = content.replace(
    /const indCapital = indFifo\.totalInvested \+ indCash - indRealized - indTotalDivs;/,
    'const indCapital = indFifo.totalInvested + indCash - indRealized - indTotalDivs + indFees;'
);

// Update International Equity Capital and Profit
content = content.replace(
    /\/\/ Capital \(Net Deposits\) = Open Cost[\s\S]*?const intlProfitINR = .*?;/,
    `// Capital (Net Deposits) = Open Cost + Cash - Realized Gains - Dividends + Charges
        const intlCapitalEUR = intlFifo.totalInvested + intlCashEUR - intlRealizedEUR - intlTotalDivsEUR + intlFeesEUR;
        const intlCapitalINR = intlCapitalEUR * fixedEurRate;
        const intlCurrentValINR = intlCurrentValEUR * conversionRate;
        const intlCashINR = intlCashEUR * conversionRate;

        // Calculations in INR
        // Profit = Current Value + Cash - Capital
        const intlProfitINR = (intlCurrentValINR + intlCashINR) - intlCapitalINR;`
);

fs.writeFileSync('hooks/useConsolidatedData.ts', content);
