import fs from 'fs';

let lines = fs.readFileSync('utils/financials.ts', 'utf8').split('\n');

// find the first occurrence of export const getNetReturns
let idx = lines.findIndex(l => l.startsWith('export const getNetReturns'));
if (idx !== -1) {
    let nextIdx = lines.findIndex((l, i) => i > idx && l.startsWith('export const getNetReturns'));
    if (nextIdx !== -1) {
        lines.splice(nextIdx, lines.length - nextIdx);
    }
}

fs.writeFileSync('utils/financials.ts', lines.join('\n'));
