import fs from 'fs';

let content = fs.readFileSync('utils/financials.ts', 'utf8');

content = content.replace(
    /export const getTrueInvested = [\s\S]*?};/,
    `export const getTrueInvested = (metrics: any, context: string): number => {
    if (context === 'INDIAN_EQUITY' || context === 'INTERNATIONAL_EQUITY') {
        return metrics.totalInvested + metrics.cashBalance - metrics.netRealizedPnL - metrics.totalDividends + (metrics.charges || 0);
    }
    return metrics.totalInvested;
};

export const getNetReturns = (metrics: any, context: string): number => {
    if (context === 'INDIAN_EQUITY' || context === 'INTERNATIONAL_EQUITY') {
        return metrics.unrealizedPnL + metrics.netRealizedPnL + metrics.totalDividends - (metrics.charges || 0);
    }
    return metrics.currentValue - metrics.totalInvested;
};`
);

fs.writeFileSync('utils/financials.ts', content);
