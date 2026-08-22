import fs from 'fs';

let content = fs.readFileSync('hooks/useConsolidatedData.ts', 'utf8');

content = content.replace(
    /const finalPrice = price \|\| \(data\.invested \/ data\.qty\);\s*const marketVal = data\.qty \* finalPrice;\s*intlCurrentValEUR \+= marketVal;\s*intlUnrealizedEUR \+= \(marketVal - data\.invested\);/,
    `const finalPrice = price || (data.invested / data.qty);
                let marketVal = data.qty * finalPrice;
                
                // Fetch the exchange rates to convert to EUR properly if needed
                let intlCurrencies = {};
                let intlRates = {};
                try {
                    intlCurrencies = JSON.parse(localStorage.getItem('international_equity_prices_currencies') || '{}');
                    intlRates = JSON.parse(localStorage.getItem('international_equity_prices_rates') || '{}');
                } catch(e) {}
                
                const nativeCurrency = intlCurrencies[ticker.toUpperCase()];
                if (nativeCurrency && nativeCurrency !== 'EUR' && intlRates[nativeCurrency]) {
                    marketVal = marketVal * intlRates[nativeCurrency];
                }
                
                intlCurrentValEUR += marketVal;
                intlUnrealizedEUR += (marketVal - data.invested);`
);

fs.writeFileSync('hooks/useConsolidatedData.ts', content);
