
import type { Trade, Edge, Formula } from '@/types';
import { enrichTrade, formatTradeDuration } from './tradeCalculations'; // Import for accurate P&L, outcome and duration

export const exportTradesToCsv = (trades: Trade[], edges: Edge[], formulas: Formula[]): void => {
  const edgeMap = new Map(edges.map(s => [s.id, s.name]));
  const formulaMap = new Map(formulas.map(f => [f.id, f.name]));

  const headers = ['S.No.', 'ID', 'Symbol', 'Position Type', 'Index', 'Strike Price', 'Entry Price', 'Exit Price', 'Quantity', 'Entry Time', 'Exit Time', 'Duration', 'P&L', 'Outcome', 'Edge', 'RULES FOLLOW', 'Expiry Type', 'Entry Formula', 'Stop Loss Formulas', 'Target Formulas', 'SL', 'Target', 'Result', 'Screenshot Data URI', 'Notes'];
  
  const rows = trades.map((tradeInput, index) => {
    const trade = tradeInput.pnl === undefined || tradeInput.outcome === undefined ? enrichTrade(tradeInput) : tradeInput;
    
    // Ensure numeric fields are numbers before calling .toFixed()
    const entryPrice = Number(trade.entryPrice);
    const exitPrice = trade.exitPrice !== undefined ? Number(trade.exitPrice) : undefined;
    const pnl = trade.pnl !== undefined ? Number(trade.pnl) : 0;
    const quantity = Number(trade.quantity);
    const sl = trade.sl !== undefined ? Number(trade.sl) : undefined;
    const target = trade.target !== undefined ? Number(trade.target) : undefined;
    
    return [
      index + 1, // Serial Number
      trade.id,
      trade.symbol ?? '', 
      trade.positionType,
      trade.index ?? '', 
      trade.strikePrice ?? '', 
      entryPrice.toFixed(2),
      exitPrice !== undefined ? exitPrice.toFixed(2) : '',
      quantity,
      new Date(trade.entryTime).toLocaleString(),
      trade.exitTime ? new Date(trade.exitTime).toLocaleString() : '',
      formatTradeDuration(trade.entryTime, trade.exitTime),
      pnl.toFixed(2),
      trade.outcome ?? '',
      trade.strategyId ? (edgeMap.get(trade.strategyId) ?? 'Unknown Edge') : '',
      trade.rulesFollowed ?? '',
      trade.expiryType,
      trade.entryFormulaId ? (formulaMap.get(trade.entryFormulaId) ?? 'Unknown Formula') : '',
      trade.stopLossFormulaIds?.map(id => formulaMap.get(id) || 'Unknown').join(' | ') ?? '',
      trade.targetFormulaIds?.map(id => formulaMap.get(id) || 'Unknown').join(' | ') ?? '',
      sl ?? '',
      target ?? '',
      trade.result ?? '',
      trade.screenshotDataUri ?? '', 
      trade.notes ?? '',
    ];
  });

  let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n"
    + rows.map(e => e.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(",")).join("\n");


  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "tradevision_trades.csv");
  document.body.appendChild(link); 
  link.click();
  document.body.removeChild(link);
};
