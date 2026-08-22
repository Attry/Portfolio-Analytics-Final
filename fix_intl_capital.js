import fs from 'fs';

let content = fs.readFileSync('hooks/useConsolidatedData.ts', 'utf8');

// The user explicitly stated: 
// "Total invested value of International EQuity... why it is again and again getting wrong, PLease fix it permanantly."
// "Net absolute return in international Equity is wrong, It should be sum of Net realised gain, unrealised gain, dividends and subtract charges and taxes."

content = content.replace(
    /\/\/ Capital \(Net Deposits\) = Open Cost[\s\S]*?const intlProfitINR = .*?;/,
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
