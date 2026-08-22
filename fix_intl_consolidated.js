import fs from 'fs';

let content = fs.readFileSync('hooks/useConsolidatedData.ts', 'utf8');

content = content.replace(
    /const finalPrice = price \|\| \(data\.invested \/ data\.qty\);\s*let marketVal = data\.qty \* finalPrice;[\s\S]*?\/\/ We actually don't have assetCurrencies easily available here\.[\s\S]*?\/\/ Wait, useConsolidatedData has access to assetCurrencies\?/,
    `const finalPrice = price || (data.invested / data.qty);
                let marketVal = data.qty * finalPrice;
                
                const intlCurrencies: Record<string, string> = JSON.parse(localStorage.getItem('international_equity_prices_currencies') || '{}');
                const intlRates: Record<string, number> = JSON.parse(localStorage.getItem('international_equity_prices_rates') || '{}');
                
                const nativeCurrency = intlCurrencies[ticker.toUpperCase()];
                if (nativeCurrency && nativeCurrency !== 'EUR' && intlRates[nativeCurrency]) {
                    marketVal = marketVal * intlRates[nativeCurrency];
                }
                
                intlCurrentValEUR += marketVal;
                intlUnrealizedEUR += (marketVal - data.invested);`
);

fs.writeFileSync('hooks/useConsolidatedData.ts', content);
