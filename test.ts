import { calculateFIFO } from './utils/financials';
import { TradeType } from './types';
const trades = [
  { id: '1', date: '2023-01-01', ticker: 'AAPL', type: TradeType.BUY, quantity: 10, price: 100, netAmount: -1000, status: 'TRADED' },
  { id: '2', date: '2023-02-01', ticker: 'AAPL', type: TradeType.SELL, quantity: 5, price: 150, netAmount: 750, status: 'TRADED' },
];
const { totalInvested, holdings } = calculateFIFO(trades as any);
let overriddenTotalInvested = 0;
Object.entries(holdings).filter(([_, data]: any) => data.qty > 0).forEach(([_, data]: any) => {
    overriddenTotalInvested += data.invested;
});
console.log({ totalInvested, overriddenTotalInvested });
