import fs from 'fs';

let content = fs.readFileSync('hooks/useConsolidatedData.ts', 'utf8');

// Update International Equity Capital and Profit
content = content.replace(
    /\/\/ Capital \(Net Deposits\) = Open Cost \+ Cash[\s\S]*?const intlProfitINR = .*?;/,
    `// Capital (Net Deposits) = Open Cost
        const intlCapitalEUR = intlFifo.totalInvested;
        const intlCapitalINR = intlCapitalEUR * fixedEurRate;
        const intlCurrentValINR = intlCurrentValEUR * conversionRate;
        const intlCashINR = intlCashEUR * conversionRate;

        // Calculations in INR
        // Profit = Realized + Unrealized + Dividends - Charges
        const intlProfitINR = (intlRealizedEUR + intlTotalDivsEUR - intlFeesEUR) * fixedEurRate + (intlUnrealizedEUR * conversionRate);`
);

fs.writeFileSync('hooks/useConsolidatedData.ts', content);
