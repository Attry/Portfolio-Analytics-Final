import { calculateFIFO } from './utils/financials.js';
const trades = [
  { id: '1', date: '2023-01-01', ticker: 'AAPL', type: 'BUY', quantity: 10, price: 100, netAmount: -1000, status: 'TRADED' },
  { id: '2', date: '2023-02-01', ticker: 'AAPL', type: 'SELL', quantity: 5, price: 150, netAmount: 750, status: 'TRADED' },
];
const { totalInvested, holdings } = calculateFIFO(trades);
let overriddenTotalInvested = 0;
Object.entries(holdings).filter(([_, data]) => data.qty > 0).forEach(([_, data]) => {
    overriddenTotalInvested += data.invested;
});
console.log({ totalInvested, overriddenTotalInvested });
