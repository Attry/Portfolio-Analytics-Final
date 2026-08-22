import fs from 'fs';

let content = fs.readFileSync('hooks/useConsolidatedData.ts', 'utf8');

// Update Indian Equity Profit
content = content.replace(
    /const indProfit = indRealized \+ indUnrealized \+ indTotalDivs;/,
    '// Formula: Profit = Current Value + Cash - Capital\n        const indProfit = (indCurrentVal + indCash) - indCapital;'
);

// Update International Equity Profit
content = content.replace(
    /const intlProfitINR = \(intlRealizedEUR \+ intlTotalDivsEUR\) \* fixedEurRate \+ \(intlUnrealizedEUR \* conversionRate\);/,
    'const intlProfitINR = (intlCurrentValINR + intlCashINR) - intlCapitalINR;'
);

fs.writeFileSync('hooks/useConsolidatedData.ts', content);
