
import { useState, useEffect, useMemo } from 'react';
import { Trade, TradeType, CashHolding, LedgerRecord, DividendRecord, PnLRecord, PortfolioSnapshot } from '../types';
import { calculateFIFO, calculateXIRR } from '../utils/financials';
import { getRateToEuro } from '../utils/currency';

export const useConsolidatedData = () => {
    const [conversionRate, setConversionRate] = useState<number>(() => {
        try {
            const saved = localStorage.getItem('eur_to_inr_rate');
            return saved ? parseFloat(saved) : 90;
        } catch { return 90; }
    }); // Initial value from storage or fallback
    
    const [fixedEurRate, setFixedEurRate] = useState<number>(() => {
        try {
            const saved = localStorage.getItem('fixed_eur_buy_rate');
            return saved ? parseFloat(saved) : 90;
        } catch { return 90; }
    });

    const updateFixedEurRate = (rate: number) => {
        setFixedEurRate(rate);
        localStorage.setItem('fixed_eur_buy_rate', rate.toString());
    };

    const [isLoading, setIsLoading] = useState(true);

    // --- READ DATA FROM LOCAL STORAGE ---
    const getLocal = (key: string) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch { return null; }
    };

    // Indian Equity Data
    const rawIndianTrades: Trade[] = [...(getLocal('dhan_base_trades') || []), ...(getLocal('dhan_trades') || [])];
    const indianTrades = Array.from(new Map(rawIndianTrades.map(t => [t.id, t])).values());
    const indianPrices: Record<string, number> = getLocal('dhan_prices') || {};
    const indianSummaryObj = getLocal('dhan_summary') || {};
    const indianBaseSummaryObj = getLocal('dhan_base_summary') || {};
    const indianSummary = {
        cash: indianSummaryObj.cash !== undefined ? indianSummaryObj.cash : 0,
        charges: (indianSummaryObj.charges || 0) + (indianBaseSummaryObj.charges || 0),
        dividends: (indianSummaryObj.dividends || 0) + (indianBaseSummaryObj.dividends || 0),
    };
    const indianLedger: LedgerRecord[] = getLocal('dhan_ledger') || [];
    const indianDividends: DividendRecord[] = getLocal('dhan_dividends') || [];
    
    // International Equity Data
    const rawIntlTrades: Trade[] = [...(getLocal('intl_base_trades') || []), ...(getLocal('intl_trades') || [])];
    const intlTrades = Array.from(new Map(rawIntlTrades.map(t => [t.id, t])).values());
    const intlPrices: Record<string, number> = getLocal('intl_prices') || {};
    const intlSummaryObj = getLocal('intl_summary') || {};
    const intlBaseSummaryObj = getLocal('intl_base_summary') || {};
    const intlSummary = {
        cash: intlSummaryObj.cash !== undefined ? intlSummaryObj.cash : 0,
        charges: (intlSummaryObj.charges || 0) + (intlBaseSummaryObj.charges || 0),
        dividends: (intlSummaryObj.dividends || 0) + (intlBaseSummaryObj.dividends || 0),
    };
    const intlDividends: DividendRecord[] = getLocal('intl_dividends') || [];
    
    // Mutual Funds
    const mfHoldings: any[] = getLocal('mf_holdings') || [];
    
    // Gold ETF
    const goldHoldings: any[] = getLocal('gold_holdings') || [];
    
    // Cash Equivalents
    const cashHoldings: CashHolding[] = getLocal('cash_holdings') || [];

    // --- FETCH CURRENCY ---
    useEffect(() => {
        const fetchRate = async () => {
            try {
                const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSiV0YXsSJGbeTvvuxX2u1_6br8R9JDDzXe-eH03Fj29gt43Z2cTgjiDxYt7jBRs_LG74bF4pTZmebz/pub?gid=0&single=true&output=csv');
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const text = await response.text();
                // Assuming cell A1 is the first value
                const val = parseFloat(text.split(',')[0]);
                if (!isNaN(val) && val > 0) {
                    setConversionRate(val);
                    try {
                        localStorage.setItem('eur_to_inr_rate', val.toString());
                    } catch {}
                }
            } catch (e) {
                console.warn("Failed to fetch EUR rate, falling back to cache.", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRate();
    }, []);

    // --- CALCULATE METRICS ---
    const metrics = useMemo(() => {
        // --- 1. INDIAN EQUITY ---
        const indFifo = calculateFIFO(indianTrades);
        
        // Cash: Prefer summary, fallback to ledger
        let indCash = indianSummary.cash !== undefined ? indianSummary.cash : 0;
        if (indianSummary.cash === undefined && indianLedger.length > 0) {
            const sorted = [...indianLedger].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
            indCash = sorted[0].balance;
        }

        // Calculate Market Value & Unrealized P&L using Price Data
        let indCurrentVal = 0;
        let indUnrealized = 0;
        let indCommodityVal = 0;
        let indCommodityInvested = 0;
        
        Object.entries(indFifo.holdings).forEach(([ticker, data]) => {
            if (data.qty > 0) {
                const price = indianPrices[ticker.toUpperCase()] || (data.invested / data.qty); // Fallback to cost if no price
                const marketVal = data.qty * price;
                
                const COMMODITY_PATTERNS = ['GOLDBEES', 'SILVERBEES'];
                if (COMMODITY_PATTERNS.some(p => ticker.toUpperCase().includes(p))) {
                    indCommodityVal += marketVal;
                    indCommodityInvested += data.invested;
                } else {
                    indCurrentVal += marketVal;
                }
                indUnrealized += (marketVal - data.invested);
            }
        });

        // Profit Components
        const indRealized = indFifo.grossRealizedPnL; // Gross from FIFO
        const currentDivs = indianDividends.reduce((acc, d) => acc + d.amount, 0);
        const indTotalDivs = Math.max(currentDivs, indianSummaryObj.dividends || 0) + (indianBaseSummaryObj.dividends || 0);
        const indFees = indianSummary.charges || 0;

        // Formula: Capital (Net Deposits) = Open Cost + Cash - Realized Gains - Dividends
        const indCapital = (indFifo.totalInvested - indCommodityInvested) + indCash - indRealized - indTotalDivs + indFees;

        // Formula: Profit = Current Value + Cash - Capital
        const indProfit = (indCurrentVal + indCash) - indCapital;

        // --- 2. INTERNATIONAL EQUITY (EUR) ---
        const intlFifo = calculateFIFO(intlTrades);
        
        let intlCashEUR = intlSummary.cash !== undefined ? intlSummary.cash : 0;
        if (intlSummary.cash === undefined && intlDividends.length > 0) {
            // we don't have general ledger for intl so we just keep 0
            intlCashEUR = 0;
        }
        
        let intlCurrentValEUR = 0;
        let intlUnrealizedEUR = 0;

        Object.entries(intlFifo.holdings).forEach(([ticker, data]) => {
            if (data.qty > 0) {
                // Fuzzy Match for Intl Prices
                let price = intlPrices[ticker.toUpperCase()];
                if (!price) {
                     const key = Object.keys(intlPrices).find(k => k.startsWith(ticker.toUpperCase()) || ticker.toUpperCase().startsWith(k));
                     if (key) price = intlPrices[key];
                }
                const finalPrice = price || (data.invested / data.qty);
                let marketVal = data.qty * finalPrice;
                
                // Fetch the exchange rates to convert to EUR properly if needed
                let intlCurrencies: Record<string, string> = {};
                let intlRates: Record<string, number> = {};
                try {
                    intlCurrencies = JSON.parse(localStorage.getItem('intl_prices_currencies') || localStorage.getItem('international_equity_prices_currencies') || '{}');
                    intlRates = JSON.parse(localStorage.getItem('intl_prices_rates') || localStorage.getItem('international_equity_prices_rates') || '{}');
                } catch(e) {}
                
                const nativeCurrency = intlCurrencies[ticker.toUpperCase()];
                const rate = getRateToEuro(nativeCurrency, intlRates);
                if (rate && rate !== 1.0) {
                    marketVal = marketVal * rate;
                }
                
                intlCurrentValEUR += marketVal;
                intlUnrealizedEUR += (marketVal - data.invested);
            }
        });

        const intlRealizedEUR = intlFifo.grossRealizedPnL;
        const currentIntlDivs = intlDividends.reduce((acc, d) => acc + d.amount, 0);
        const intlTotalDivsEUR = Math.max(currentIntlDivs, intlSummaryObj.dividends || 0) + (intlBaseSummaryObj?.dividends || 0);
        const intlFeesEUR = intlSummary.charges || 0;

        // Capital (Net Deposits) = Open Cost
        const intlCapitalEUR = intlFifo.totalInvested;
        const intlCapitalINR = intlCapitalEUR * conversionRate;
        const intlCurrentValINR = intlCurrentValEUR * conversionRate;
        const intlCashINR = intlCashEUR * conversionRate;

        // Calculations in INR
        // Profit = Realized + Unrealized + Dividends - Charges
        const intlProfitINR = (intlRealizedEUR + intlTotalDivsEUR - intlFeesEUR + intlUnrealizedEUR) * conversionRate;


        // --- 3. MUTUAL FUNDS ---
        const mfInvested = mfHoldings.reduce((acc, h) => acc + h.invested, 0);
        const mfCurrentVal = mfHoldings.reduce((acc, h) => acc + h.marketValue, 0);
        
        // Formula: Profit = Unrealized Gain
        const mfProfit = mfCurrentVal - mfInvested;
        // Formula: Capital = Total Invested
        const mfCapital = mfInvested;


        // --- 4. COMMODITY BUCKET (Standalone Gold + Embedded Commodities) ---
        const goldInvested = goldHoldings.reduce((acc, h) => acc + h.invested, 0);
        const goldCurrentVal = goldHoldings.reduce((acc, h) => acc + h.marketValue, 0);
        
        const commodityCurrentVal = indCommodityVal + goldCurrentVal;
        const commodityInvested = indCommodityInvested + goldInvested;
        const commodityProfit = commodityCurrentVal - commodityInvested;
        const commodityCapital = commodityInvested;


        // --- 5. CASH EQUIVALENTS ---
        const cashEqVal = cashHoldings.reduce((acc, c) => acc + c.value, 0);
        // Treated as pure capital, no profit component for calculation structure provided
        const cashEqProfit = 0; 


        // --- AGGREGATES ---

        // Net Returns Absolute = Sum of Profits
        const netReturnAbs = indProfit + intlProfitINR + mfProfit + commodityProfit + cashEqProfit;

        // Denominator: Capital (Ind) + Capital (Intl) + Capital (MF) + Capital (Commodity) + CashEq Value
        const totalCapitalBase = indCapital + intlCapitalINR + mfCapital + commodityCapital + cashEqVal;

        // Net Returns %
        const netReturnPct = totalCapitalBase > 0 ? (netReturnAbs / totalCapitalBase) * 100 : 0;

        // Net Asset Value (NAV) = Sum of all current Assets + cash
        // Assets = (Ind Stock Val) + (Ind Cash) + (Intl Stock Val) + (Intl Cash) + (MF Val) + (Commodity Val) + (Cash Eq)
        const netAssetValue = indCurrentVal + indCash + intlCurrentValINR + intlCashINR + mfCurrentVal + commodityCurrentVal + cashEqVal;
        
        // Net Cash (for display)
        const netCash = indCash + intlCashINR + cashEqVal;


        // --- ALLOCATIONS FOR PIE CHART ---
        // Indian Equity: (Current Value - Cash) in Indian Equity + Current Value Mutual Fund
        // Note: indCurrentVal is just the stock value (Market Value of holdings), so it excludes cash already.
        const allocIndianEquity = indCurrentVal + mfCurrentVal;
        
        // International Equity: (Current Value - Cash)
        // intlCurrentValINR is just the stock value.
        const allocIntlEquity = intlCurrentValINR;

        // Commodity
        const allocCommodity = commodityCurrentVal;

        // Cash (Net Cash)
        const allocCash = netCash;


        // --- CONSOLIDATED XIRR ---
        let xirr = 0;
        try {
            const flows: { amount: number; date: Date }[] = [];
            
            // 1. Indian Equity Trades
            indianTrades.forEach(t => {
                flows.push({ amount: t.netAmount, date: new Date(t.date) });
            });
            
            // 2. International Equity Trades (converted to INR at average buy price)
            intlTrades.forEach(t => {
                flows.push({ amount: t.netAmount * fixedEurRate, date: new Date(t.date) });
            });
            
            // Helper to determine purchase date for Mutual Funds and Gold ETFs
            const getSafeDate = (dateStr: string | null | undefined): Date => {
                if (dateStr) {
                    const d = new Date(dateStr);
                    if (!isNaN(d.getTime())) return d;
                }
                
                // Fallback: try to find the earliest trade date from Indian/Intl trades
                let earliest = new Date();
                let foundTrade = false;
                indianTrades.forEach(t => {
                    const d = new Date(t.date);
                    if (!isNaN(d.getTime()) && d < earliest) {
                        earliest = d;
                        foundTrade = true;
                    }
                });
                intlTrades.forEach(t => {
                    const d = new Date(t.date);
                    if (!isNaN(d.getTime()) && d < earliest) {
                        earliest = d;
                        foundTrade = true;
                    }
                });
                
                if (foundTrade) {
                    return earliest;
                }
                
                // Absolute fallback: 180 days ago
                const fallback = new Date();
                fallback.setDate(fallback.getDate() - 180);
                return fallback;
            };

            // 3. Mutual Funds Outflows
            mfHoldings.forEach(h => {
                if (h.invested > 0) {
                    flows.push({ amount: -h.invested, date: getSafeDate(h.latestBuyDate) });
                }
            });

            // 4. Gold ETF Outflows
            goldHoldings.forEach(h => {
                if (h.invested > 0) {
                    flows.push({ amount: -h.invested, date: getSafeDate(h.latestBuyDate) });
                }
            });
            
            // Terminal value = value of all invested assets (excluding cash, exactly like individual equity views)
            const terminalValue = indCurrentVal + indCommodityVal + intlCurrentValINR + mfCurrentVal + goldCurrentVal;
            
            if (flows.length > 0 && terminalValue > 0) {
                const val = calculateXIRR(flows, terminalValue);
                if (!isNaN(val) && isFinite(val)) {
                    xirr = val * 100;
                }
            }
        } catch (e) {
            console.error("Consolidated XIRR calculation failed", e);
        }

        return {
            netAssetValue,
            netCash,
            netReturnAbs,
            netReturnPct,
            totalCapitalBase,
            xirr,
            allocations: [
                { name: 'Indian Equity & MF', value: allocIndianEquity, color: '#7042f8' }, 
                { name: 'International Equity', value: allocIntlEquity, color: '#00e5ff' }, 
                { name: 'Commodity', value: allocCommodity, color: '#facc15' }, 
                { name: 'Net Cash', value: allocCash, color: '#00ffa3' }, 
            ],
            conversionRate
        };

    }, [indianTrades, indianPrices, indianSummary, indianLedger, indianDividends, intlTrades, intlPrices, intlSummary, intlDividends, mfHoldings, goldHoldings, cashHoldings, conversionRate, fixedEurRate]);

    return { 
        ...metrics, 
        isLoading,
        conversionRate,
        fixedEurRate,
        updateFixedEurRate
    };
};
