

import type { Trade, Edge, PositionType, DailyCandlestickData, DailyProfitLossDataPoint, DailyPerformanceStat, CandlestickAggregationLevel, RulesFollowedStatus } from '@/types';
import { format, parseISO, startOfDay, endOfDay, isSameDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addDays, intervalToDuration } from 'date-fns';

export const calculatePnl = (trade: Pick<Trade, 'entryPrice' | 'exitPrice' | 'quantity' | 'positionType'>): number => {
  if (trade.exitPrice === undefined) {
    return 0; // Unrealized P&L for open trades is 0 for now
  }
  if (trade.positionType === 'Short') {
    return (trade.entryPrice - trade.exitPrice) * trade.quantity;
  }
  return (trade.exitPrice - trade.entryPrice) * trade.quantity;
};

export const enrichTrade = (trade: Trade): Trade => {
  const tradeWithSource = { ...trade, source: trade.source || 'manual' }; 
  
  let calculatedRulesFollowed: RulesFollowedStatus;

  const exec = tradeWithSource.executionMode;
  const close = tradeWithSource.closeMode;

  if (exec === 'both' && close === 'both') {
      calculatedRulesFollowed = 'RULES FOLLOW';
  } else if ((exec === 'both' && close === 'real') || (exec === 'real' && close === 'both') || (exec === 'both' && close === 'theoretical') || (exec === 'theoretical' && close === 'both')) {
      calculatedRulesFollowed = 'PARTIALLY FOLLOW';
  } else if (exec === 'real' && close === 'real') {
      calculatedRulesFollowed = 'NOT FOLLOW';
  } else if (exec === 'theoretical' && close === 'theoretical') {
      calculatedRulesFollowed = 'ENTRY MISS';
  } else {
      calculatedRulesFollowed = tradeWithSource.rulesFollowed || 'RULES FOLLOW';
  }

  const tradeWithStatus = { ...tradeWithSource, rulesFollowed: calculatedRulesFollowed };


  if (tradeWithStatus.exitPrice === undefined || tradeWithStatus.exitTime === undefined) {
    return { ...tradeWithStatus, pnl: 0, outcome: 'Open' };
  }
  const pnl = calculatePnl(tradeWithStatus); 
  let outcome: 'Win' | 'Loss' | 'Breakeven' | 'Open' = 'Breakeven';
  if (pnl > 0) outcome = 'Win';
  else if (pnl < 0) outcome = 'Loss';
  return { ...tradeWithStatus, pnl, outcome };
};

export const formatTradeDuration = (entryTime: string, exitTime?: string): string => {
  if (!exitTime) {
    return 'Open';
  }

  try {
    const entry = parseISO(entryTime);
    const exit = parseISO(exitTime);

    if (isNaN(entry.getTime()) || isNaN(exit.getTime())) {
        return '-'; 
    }
    
    if (exit <= entry) {
        return '0s'; 
    }

    const duration = intervalToDuration({ start: entry, end: exit });

    const parts: string[] = [];
    if (duration.days !== undefined && duration.days > 0) parts.push(`${duration.days}d`);
    if (duration.hours !== undefined && duration.hours > 0) parts.push(`${duration.hours}h`);
    if (duration.minutes !== undefined && duration.minutes > 0) parts.push(`${duration.minutes}m`);
    // Only show seconds if duration is less than an hour and days/hours are not present
    if (parts.length < 2 && (duration.seconds !== undefined && duration.seconds > 0) && !(duration.days && duration.days > 0) && !(duration.hours && duration.hours > 0)) {
        parts.push(`${duration.seconds}s`);
    }
    
    if (parts.length === 0) return '0s';

    return parts.slice(0, 2).join(' ') || '0s'; // Show at most 2 significant parts
  } catch (e) {
    return '-'; // Error parsing dates
  }
};

export const calculateTradeCharges = (trade: Trade): number => {
    let orderCount = 0;

    // 1. Every trade has one entry order.
    orderCount += 1;

    // 2. Count partial exits from the log.
    const partialExitCount = trade.log?.filter(l => l.event === 'Partial Exit').length ?? 0;
    orderCount += partialExitCount;

    // 3. If the trade is closed, it had one final exit order.
    // This covers full manual exits, SL hits, Target hits, etc.
    if (trade.outcome !== 'Open' && trade.exitTime) {
        // This check avoids double-counting the final exit if it's also logged as a partial
        const finalExitIsAlsoPartial = (trade.log?.at(-1)?.event === 'Partial Exit');
        if (!finalExitIsAlsoPartial || (trade.log && trade.log.length === 1)) {
           orderCount += 1;
        }
    }
    
    return orderCount * 30;
};


export const calculateDashboardMetrics = (trades: Trade[], edges: Edge[]) => {
  const enrichedTrades = trades.map(enrichTrade).filter(trade => trade.outcome !== 'Open'); 

  const totalPnl = enrichedTrades.reduce((acc, trade) => acc + (trade.pnl ?? 0), 0);
  const totalCharges = enrichedTrades.reduce((acc, trade) => acc + calculateTradeCharges(trade), 0);
  const netPnl = totalPnl - totalCharges;

  const winningTrades = enrichedTrades.filter(trade => (trade.pnl ?? 0) > 0);
  const losingTrades = enrichedTrades.filter(trade => (trade.pnl ?? 0) < 0);

  const winCount = winningTrades.length;
  const lossCount = losingTrades.length;
  
  const winLossRatio = (winCount + lossCount) > 0 ? (winCount / (winCount + lossCount)) * 100 : 0;
  
  const grossProfit = winningTrades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0));
  
  const averageWin = winCount > 0 ? grossProfit / winCount : 0;
  const averageLoss = lossCount > 0 ? grossLoss / lossCount : 0;
  
  const riskRewardRatio = averageLoss > 0 ? averageWin / averageLoss : (averageWin > 0 ? Infinity : 0);

  let profitFactor: number;
  if (grossLoss > 0) {
    profitFactor = grossProfit / grossLoss;
  } else {
    if (grossProfit > 0) {
      profitFactor = Infinity; 
    } else {
      profitFactor = NaN; 
    }
  }

  const edgePerformance: Record<string, { pnl: number; tradeCount: number; name: string }> = {};
  if (Array.isArray(edges)) {
    enrichedTrades.forEach(trade => {
      if (trade.strategyId) {
        const edge = edges.find(s => s.id === trade.strategyId);
        if (edge) {
            if (!edgePerformance[trade.strategyId]) {
              edgePerformance[trade.strategyId] = { pnl: 0, tradeCount: 0, name: edge.name };
            }
            edgePerformance[trade.strategyId].pnl += (trade.pnl ?? 0);
            edgePerformance[trade.strategyId].tradeCount++;
        }
      }
    });
  }


  const edgePerformanceArray = Object.values(edgePerformance).sort((a, b) => b.pnl - a.pnl);
  const mostProfitableEdge = edgePerformanceArray.length > 0 && edgePerformanceArray[0].pnl > 0 ? edgePerformanceArray[0] : null;
  
  return {
    totalPnl,
    netPnl,
    totalCharges,
    grossProfit,
    grossLoss,
    winLossRatio,
    riskRewardRatio,
    profitFactor,
    mostProfitableEdge,
    tradeCount: enrichedTrades.length,
    wins: winCount,
    losses: lossCount,
  };
};

export interface CumulativePnlDataPoint {
  date: string; 
  cumulativePnl: number;
}

export const generateCumulativePnlData = (trades: Trade[]): CumulativePnlDataPoint[] => {
  const closedTrades = trades.filter(trade => trade.outcome !== 'Open' && trade.exitTime)
                           .map(trade => (trade.pnl === undefined || trade.exitTime === undefined) ? enrichTrade(trade) : trade)
                           .sort((a, b) => new Date(a.exitTime!).getTime() - new Date(b.exitTime!).getTime());
  
  if (closedTrades.length === 0) return [];

  let currentCumulativePnl = 0;
  const pnlData: CumulativePnlDataPoint[] = [];
  for (const trade of closedTrades) {
    currentCumulativePnl += trade.pnl ?? 0;
    pnlData.push({
      date: trade.exitTime!,
      cumulativePnl: parseFloat(currentCumulativePnl.toFixed(2)), 
    });
  }
  return pnlData;
};

const getPeriodKey = (date: Date, period: CandlestickAggregationLevel): string => {
    switch (period) {
        case 'day': return format(startOfDay(date), 'yyyy-MM-dd');
        case 'week': return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'); // Monday as start of week
        case 'month': return format(startOfMonth(date), 'yyyy-MM-dd');
        case 'year': return format(startOfYear(date), 'yyyy-MM-dd');
        default: return format(date, 'yyyy-MM-dd HH:mm:ss.SSS'); // For 'trade' or fallback
    }
};

export const generatePnlCandlestickData = (
  trades: Trade[],
  aggregation: CandlestickAggregationLevel
): DailyCandlestickData[] => {
  const closedTradesForAggregation = trades 
    .filter(trade => trade.outcome !== 'Open' && trade.exitTime)
    .map(trade => enrichTrade(trade))
    .sort((a, b) => new Date(a.exitTime!).getTime() - new Date(b.exitTime!).getTime());

  const candlestickData: DailyCandlestickData[] = [];
  let runningCumulativePnl = 0;

  if (closedTradesForAggregation.length === 0 && aggregation !== 'trade') {
      return [];
  }

  if (aggregation === 'trade') {
    for (const trade of closedTradesForAggregation) {
      const openPnl = runningCumulativePnl;
      const pnlContribution = trade.pnl ?? 0;
      const closePnl = openPnl + pnlContribution;
      candlestickData.push({
        date: trade.exitTime!, 
        open: parseFloat(openPnl.toFixed(2)),
        high: parseFloat(Math.max(openPnl, closePnl).toFixed(2)),
        low: parseFloat(Math.min(openPnl, closePnl).toFixed(2)),
        close: parseFloat(closePnl.toFixed(2)),
        rangeForBar: [parseFloat(Math.min(openPnl, closePnl).toFixed(2)), parseFloat(Math.max(openPnl, closePnl).toFixed(2))],
      });
      runningCumulativePnl = closePnl;
    }
  } else {
    const tradesByPeriod: Record<string, Trade[]> = {};
    for (const trade of closedTradesForAggregation) {
      const periodKey = getPeriodKey(new Date(trade.exitTime!), aggregation);
      if (!tradesByPeriod[periodKey]) {
        tradesByPeriod[periodKey] = [];
      }
      tradesByPeriod[periodKey].push(trade);
    }

    const sortedPeriodKeys = Object.keys(tradesByPeriod).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());

    for (const periodKey of sortedPeriodKeys) {
      const periodTrades = tradesByPeriod[periodKey]; 
      
      const periodOpenPnl = runningCumulativePnl;
      let currentPnlInPeriod = periodOpenPnl;
      let periodHighPnl = periodOpenPnl;
      let periodLowPnl = periodOpenPnl;

      for (const trade of periodTrades) {
        currentPnlInPeriod += trade.pnl ?? 0;
        periodHighPnl = Math.max(periodHighPnl, currentPnlInPeriod);
        periodLowPnl = Math.min(periodLowPnl, currentPnlInPeriod);
      }
      const periodClosePnl = currentPnlInPeriod;

      candlestickData.push({
        date: periodKey, 
        open: parseFloat(periodOpenPnl.toFixed(2)),
        high: parseFloat(periodHighPnl.toFixed(2)),
        low: parseFloat(periodLowPnl.toFixed(2)),
        close: parseFloat(periodClosePnl.toFixed(2)),
        rangeForBar: [parseFloat(periodLowPnl.toFixed(2)), parseFloat(periodHighPnl.toFixed(2))],
      });
      runningCumulativePnl = periodClosePnl;
    }
  }

  if (closedTradesForAggregation.length > 0) {
    let totalPnlOfSelectedRange = 0;
    let minPnlWithinRange = 0;
    let maxPnlWithinRange = 0;
    let currentPnlForRangeCalc = 0;

    for (const trade of closedTradesForAggregation) {
      const pnl = trade.pnl ?? 0;
      currentPnlForRangeCalc += pnl;
      minPnlWithinRange = Math.min(minPnlWithinRange, currentPnlForRangeCalc); // Track relative to start of range (0)
      maxPnlWithinRange = Math.max(maxPnlWithinRange, currentPnlForRangeCalc); // Track relative to start of range (0)
    }
    totalPnlOfSelectedRange = currentPnlForRangeCalc; 
    
    const totalBarData: DailyCandlestickData = {
      date: "Total",
      open: 0, 
      high: parseFloat(maxPnlWithinRange.toFixed(2)),
      low: parseFloat(minPnlWithinRange.toFixed(2)),
      close: parseFloat(totalPnlOfSelectedRange.toFixed(2)),
      rangeForBar: [parseFloat(minPnlWithinRange.toFixed(2)), parseFloat(maxPnlWithinRange.toFixed(2))],
    };
    candlestickData.push(totalBarData);
  }
  
  return candlestickData;
};


export const generateDailyProfitLossData = (trades: Trade[]): DailyProfitLossDataPoint[] => {
  const closedTrades = trades.filter(trade => trade.outcome !== 'Open' && trade.exitTime);
  if (!closedTrades || closedTrades.length === 0) {
    return [];
  }
  
  const enrichedTrades = closedTrades.map(trade =>
    (trade.pnl === undefined || trade.outcome === undefined || trade.exitTime === undefined) ? enrichTrade(trade) : trade
  );

  const dailyAggregates: Record<string, { dailyProfit: number; dailyLoss: number }> = {};

  for (const trade of enrichedTrades) {
    if(trade.exitTime) {
        const dayKey = format(startOfDay(new Date(trade.exitTime)), 'yyyy-MM-dd');
        if (!dailyAggregates[dayKey]) {
        dailyAggregates[dayKey] = { dailyProfit: 0, dailyLoss: 0 };
        }

        if (trade.pnl !== undefined) {
        if (trade.pnl > 0) {
            dailyAggregates[dayKey].dailyProfit += trade.pnl;
        } else if (trade.pnl < 0) {
            dailyAggregates[dayKey].dailyLoss += trade.pnl; // Keep it negative
        }
        }
    }
  }

  return Object.entries(dailyAggregates)
    .map(([date, { dailyProfit, dailyLoss }]) => ({
      date,
      dailyProfit: parseFloat(dailyProfit.toFixed(2)),
      dailyLoss: parseFloat(dailyLoss.toFixed(2)), // Will be negative or zero
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const generateDailyPerformanceStats = (trades: Trade[]): Record<string, DailyPerformanceStat> => {
  const stats: Record<string, DailyPerformanceStat> = {};
  if (!trades) {
    return stats;
  }
  const enrichedTrades = trades.map(trade => 
    (trade.pnl === undefined || trade.outcome === undefined || trade.exitTime === undefined) ? enrichTrade(trade) : trade
  );

  for (const trade of enrichedTrades) {
    if (trade.exitTime) { 
        const dayKey = format(startOfDay(new Date(trade.exitTime)), 'yyyy-MM-dd');
        if (!stats[dayKey]) {
        stats[dayKey] = { pnl: 0, tradeCount: 0 };
        }
        stats[dayKey].pnl += trade.pnl ?? 0;
        stats[dayKey].tradeCount++;
    }
  }
  return stats;
};

