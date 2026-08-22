import React, { useState, useEffect } from 'react';
import { Download, Upload, RefreshCw, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { usePortfolioData } from '../hooks/usePortfolioData';
import { useConsolidatedData } from '../hooks/useConsolidatedData';
import { useSnapshotData } from '../hooks/useSnapshotData';
import { getTrueInvested } from '../utils/financials';

export const TopBookmark: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [statusLines, setStatusLines] = useState<string[]>([]);
    const [showConfirmErase, setShowConfirmErase] = useState(false);
    
    // We instantiate the hooks to access their fetch and log methods
    const indianData = usePortfolioData('INDIAN_EQUITY');
    const intlData = usePortfolioData('INTERNATIONAL_EQUITY');
    const consolidatedData = useConsolidatedData();

    const indSnapshot = useSnapshotData('INDIAN_EQUITY', indianData.metrics.currentValue, indianData.metrics.totalInvested, indianData.metrics.xirr);
    const intlSnapshot = useSnapshotData('INTERNATIONAL_EQUITY', intlData.metrics.currentValue, intlData.metrics.totalInvested, intlData.metrics.xirr);
    const consSnapshot = useSnapshotData('CONSOLIDATED', consolidatedData.netAssetValue, consolidatedData.totalCapitalBase || 0, consolidatedData.xirr || 0);

    const latestData = React.useRef({ indianData, intlData, consolidatedData, indSnapshot, intlSnapshot, consSnapshot });
    latestData.current = { indianData, intlData, consolidatedData, indSnapshot, intlSnapshot, consSnapshot };

    useEffect(() => {
        const handleTrigger = () => {
            if (!isSyncing) {
                runMasterSync();
            }
        };
        window.addEventListener('TRIGGER_MASTER_SYNC', handleTrigger);
        return () => window.removeEventListener('TRIGGER_MASTER_SYNC', handleTrigger);
    }, [isSyncing]);

    const runMasterSync = async () => {
        setIsSyncing(true);
        setIsOpen(true);
        setStatusLines(['Starting Master Sync Sequence...']);

        try {
            const formatVal = (val: number) => val.toLocaleString('en-IN', { maximumFractionDigits: 0 });

            // Helper function to read from local storage directly for previous snapshot value
            const getPrevVal = (ctx: string) => {
                const key = ctx === 'CONSOLIDATED' ? 'portfolio_snapshots' : `portfolio_snapshots_${ctx.toLowerCase()}`;
                const saved = localStorage.getItem(key);
                if (saved) {
                    const list = JSON.parse(saved);
                    if (list.length > 0) return list[list.length - 1].currentValue;
                }
                return 0;
            };

            let prevInd = getPrevVal('INDIAN_EQUITY');
            let prevIntl = getPrevVal('INTERNATIONAL_EQUITY');
            let prevCons = getPrevVal('CONSOLIDATED');

            // Step 1: Indian Equity
            const indSheetId = localStorage.getItem('dhan_sheet_id') || "1htAAZP9eWVH0sq1BHbiS-dKJNzcP-uoBEW6GXp4N3HI";
            try {
                const indUrl = `https://docs.google.com/spreadsheets/d/${indSheetId}/gviz/tq?tqx=out:csv`;
                const indRes = await fetch(indUrl);
                if (indRes.ok) {
                    const csvText = await indRes.text();
                    indianData.processFile(csvText, 'MARKET_DATA', indianData.globalMarketDate, true);
                    setStatusLines(prev => [...prev, `✅ Indian Equity: Fetched successfully`]);
                } else {
                    setStatusLines(prev => [...prev, `❌ Indian Equity: Fetch failed`]);
                }
            } catch (e) {
                 setStatusLines(prev => [...prev, `❌ Indian Equity: Fetch error`]);
            }

            // Step 2: International Equity
            const intlSheetId = localStorage.getItem('intl_sheet_id') || "1zQFW9FHFoyvw4uZR4z3klFeoCIGJPUlq7QuDYwz4lEY";
            try {
                const intlUrl = `https://docs.google.com/spreadsheets/d/${intlSheetId}/gviz/tq?tqx=out:csv`;
                const intlRes = await fetch(intlUrl);
                if (intlRes.ok) {
                    const csvText = await intlRes.text();
                    intlData.processFile(csvText, 'MARKET_DATA', intlData.globalMarketDate, true);
                    setStatusLines(prev => [...prev, `✅ International Equity: Fetched successfully`]);
                } else {
                    setStatusLines(prev => [...prev, `❌ International Equity: Fetch failed`]);
                }
            } catch (e) {
                 setStatusLines(prev => [...prev, `❌ International Equity: Fetch error`]);
            }

            // Step 3: Fetch EUR INR rate
            let rate = parseFloat(localStorage.getItem('eur_to_inr_rate') || '90');
            try {
                const fxRes = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSiV0YXsSJGbeTvvuxX2u1_6br8R9JDDzXe-eH03Fj29gt43Z2cTgjiDxYt7jBRs_LG74bF4pTZmebz/pub?gid=0&single=true&output=csv');
                if (fxRes.ok) {
                    const text = await fxRes.text();
                    const val = parseFloat(text.split(',')[0]);
                    if (!isNaN(val) && val > 0) {
                        rate = val;
                        localStorage.setItem('eur_to_inr_rate', val.toString());
                        setStatusLines(prev => [...prev, `✅ EUR to INR: 1 EUR = ${val.toFixed(2)} INR`]);
                    }
                }
            } catch (e) {
                setStatusLines(prev => [...prev, `⚠️ EUR to INR: Using cached rate ${rate}`]);
            }

            // Let React update the calculations before logging
            setTimeout(() => {
                const { indianData: ind, intlData: intl, consolidatedData: cons, indSnapshot: indSnap, intlSnapshot: intlSnap, consSnapshot: consSnap } = latestData.current;

                const trueIndInvested = getTrueInvested(ind.metrics, 'INDIAN_EQUITY');
                const trueIntlInvested = getTrueInvested(intl.metrics, 'INTERNATIONAL_EQUITY');

                indSnap.takeSnapshotNow(ind.metrics.currentValue, trueIndInvested, ind.metrics.xirr);
                intlSnap.takeSnapshotNow(intl.metrics.currentValue, trueIntlInvested, intl.metrics.xirr);
                consSnap.takeSnapshotNow(cons.netAssetValue, cons.totalCapitalBase, cons.xirr);

                const newInd = getPrevVal('INDIAN_EQUITY');
                const newIntl = getPrevVal('INTERNATIONAL_EQUITY');
                const newCons = getPrevVal('CONSOLIDATED');

                setStatusLines(prev => [
                    ...prev, 
                    `✅ Indian Equity: Previous Value ${formatVal(prevInd)} ➔ New Value ${formatVal(newInd)}`,
                    `✅ International Equity: Previous Value ${formatVal(prevIntl)} ➔ New Value ${formatVal(newIntl)}`,
                    `✅ Consolidated: Previous Value ${formatVal(prevCons)} ➔ New Value ${formatVal(newCons)}`,
                    `✅ Master Sync Complete.`
                ]);
                
                setIsSyncing(false);
                setTimeout(() => setIsOpen(false), 5000);
            }, 2000); // 2 second delay to ensure React state and hooks have recalculated metrics based on new local storage

        } catch (e: any) {
            setStatusLines(prev => [...prev, `❌ Error: ${e.message}`]);
            setIsSyncing(false);
        }
    };

    const handleExport = () => {
        const allData: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                try {
                    allData[key] = JSON.parse(localStorage.getItem(key) || '""');
                } catch {
                    allData[key] = localStorage.getItem(key);
                }
            }
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allData));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `finfolio_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = JSON.parse(e.target?.result as string);
                for (const key in content) {
                    if (typeof content[key] === 'object') {
                        localStorage.setItem(key, JSON.stringify(content[key]));
                    } else {
                        localStorage.setItem(key, content[key]);
                    }
                }
                window.location.reload();
            } catch (err) {
                console.error("Invalid backup file.", err);
            }
        };
        reader.readAsText(file);
    };

    const handleEraseData = () => {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('portfolio_snapshots')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        window.location.reload();
    };

    return (
        <>
            {isOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-white/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
                    onClick={() => {
                        setIsOpen(false);
                        setShowConfirmErase(false);
                    }}
                />
            )}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
                <div 
                    className={`bg-white text-gray-900 shadow-2xl rounded-b-2xl overflow-hidden transition-all duration-300 ease-in-out border border-t-0 border-gray-200
                        ${isOpen ? 'max-h-[500px] w-96 p-4' : 'max-h-0 w-32 p-0 opacity-0'}
                    `}
                >
                    <div className="flex flex-col gap-4">
                        <div className="text-center font-bold border-b border-gray-100 pb-2">Master Sync Control</div>
                        
                        <button 
                            onClick={runMasterSync}
                            disabled={isSyncing}
                            className={`w-full py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 
                                ${isSyncing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-dim text-white shadow-sm'}`}
                        >
                            <RefreshCw className={isSyncing ? 'animate-spin' : ''} size={16} />
                            {isSyncing ? 'Syncing...' : 'Run Master Sync'}
                        </button>

                        <div className="text-xs font-mono space-y-1 bg-gray-50 border border-gray-100 p-2 rounded max-h-48 overflow-y-auto">
                            {statusLines.map((line, i) => <div key={i}>{line}</div>)}
                            {statusLines.length === 0 && <div className="text-gray-400">Ready.</div>}
                        </div>

                        <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
                            <div className="flex gap-2">
                                <button onClick={handleExport} className="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 py-2 rounded flex justify-center items-center gap-2 text-xs font-semibold transition-colors">
                                    <Download size={14} /> Export
                                </button>
                                <label className="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 py-2 rounded flex justify-center items-center gap-2 text-xs font-semibold cursor-pointer transition-colors">
                                    <Upload size={14} /> Import
                                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                                </label>
                            </div>
                            
                            {showConfirmErase ? (
                                <div className="flex flex-col gap-2 p-2 bg-rose-50 border border-rose-100 rounded-lg">
                                    <div className="text-xs text-rose-700 font-medium text-center">Erase graph snapshots? This cannot be undone.</div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowConfirmErase(false)} className="flex-1 bg-white border border-gray-200 text-gray-600 py-1.5 rounded text-xs font-semibold hover:bg-gray-50">Cancel</button>
                                        <button onClick={handleEraseData} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-1.5 rounded text-xs font-semibold transition-colors shadow-sm">Yes, Erase</button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => setShowConfirmErase(true)} className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 py-2 rounded flex justify-center items-center gap-2 text-xs font-semibold transition-colors">
                                    <Trash2 size={14} /> Erase Snapshot Data
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50 px-6 py-1.5 rounded-b-xl border border-t-0 border-gray-200 shadow-md flex items-center justify-center cursor-pointer transition-colors relative z-50"
                    title="Master Sync & Backup"
                >
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>
        </>
    );
};
