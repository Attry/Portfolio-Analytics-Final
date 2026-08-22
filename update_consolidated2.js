import fs from 'fs';

let content = fs.readFileSync('hooks/useConsolidatedData.ts', 'utf8');

// Replace everything between Profit Components and INTERNATIONAL EQUITY
content = content.replace(
    /\/\/ Profit Components[\s\S]*?\/\/ --- 2\. INTERNATIONAL EQUITY \(EUR\) ---/,
    `// Profit Components
        const indRealized = indFifo.grossRealizedPnL; // Gross from FIFO
        const currentDivs = indianDividends.reduce((acc, d) => acc + d.amount, 0);
        const indTotalDivs = Math.max(currentDivs, indianSummaryObj.dividends || 0) + (indianBaseSummaryObj.dividends || 0);
        const indFees = indianSummary.charges || 0;

        // Formula: Capital (Net Deposits) = Open Cost + Cash - Realized Gains - Dividends
        const indCapital = indFifo.totalInvested + indCash - indRealized - indTotalDivs;

        // Formula: Profit = Current Value + Cash - Capital
        const indProfit = (indCurrentVal + indGoldEtfVal + indCash) - indCapital;

        // --- 2. INTERNATIONAL EQUITY (EUR) ---`
);

fs.writeFileSync('hooks/useConsolidatedData.ts', content);
