
'use client';
import type { Trade, CumulativePnlDataPoint } from '@/types';
import { parseISO, format, intervalToDuration } from 'date-fns';
import { calculateTradeCharges } from './tradeCalculations';

export interface PeriodicPerformance {
  period: string; // e.g., "2023-Jan"
  grossPnl: number;
  totalCharges: number;
  netPnl: number;
  winRate: number;
  tradeCount: number;
  wins: number;
  losses: number;
  profitFactor: number;
  riskRewardRatio: number;
  grossProfit: number; // Added for win amount
  grossLoss: number; // Added for loss amount
}

export const calculatePeriodicPerformance = (trades: Trade[], period: 'daily' | 'monthly' | 'yearly'): PeriodicPerformance[] => {
  const performance: Record<string, { 
      trades: Trade[];
      pnl: number; 
      wins: number; 
      losses: number; 
      tradeCount: number; 
      grossProfit: number; 
      grossLoss: number; 
      totalCharges: number;
  }> = {};

  trades.forEach(trade => {
    if (trade.outcome === 'Open' || !trade.exitTime || typeof trade.pnl !== 'number') return;
    
    const exitDate = parseISO(trade.exitTime);
    let periodKey: string;
    if (period === 'daily') {
      periodKey = format(exitDate, 'yyyy-MM-dd');
    } else if (period === 'monthly') {
      periodKey = format(exitDate, 'yyyy-MM');
    } else {
      periodKey = format(exitDate, 'yyyy');
    }

    if (!performance[periodKey]) {
      performance[periodKey] = { trades: [], pnl: 0, wins: 0, losses: 0, tradeCount: 0, grossProfit: 0, grossLoss: 0, totalCharges: 0 };
    }
    
    performance[periodKey].trades.push(trade);
    performance[periodKey].pnl += trade.pnl;
    performance[periodKey].tradeCount++;
    performance[periodKey].totalCharges += calculateTradeCharges(trade);

    if (trade.pnl > 0) {
      performance[periodKey].wins++;
      performance[periodKey].grossProfit += trade.pnl;
    } else if (trade.pnl < 0) {
      performance[periodKey].losses++;
      performance[periodKey].grossLoss += Math.abs(trade.pnl);
    }
  });

  return Object.entries(performance)
    .map(([period, data]) => {
      const averageWin = data.wins > 0 ? data.grossProfit / data.wins : 0;
      const averageLoss = data.losses > 0 ? data.grossLoss / data.losses : 0;
      const riskRewardRatio = averageLoss > 0 ? averageWin / averageLoss : Infinity;

      return {
        period,
        grossPnl: data.pnl,
        totalCharges: data.totalCharges,
        netPnl: data.pnl - data.totalCharges,
        winRate: data.tradeCount > 0 ? (data.wins / data.tradeCount) * 100 : 0,
        tradeCount: data.tradeCount,
        wins: data.wins,
        losses: data.losses,
        profitFactor: data.grossLoss > 0 ? data.grossProfit / data.grossLoss : Infinity,
        riskRewardRatio,
        grossProfit: data.grossProfit,
        grossLoss: data.grossLoss,
      };
    })
    .sort((a, b) => b.period.localeCompare(a.period)); // Sort descending by period
};

export interface HoldingTimeStats {
    avgWinHoldTime: string; // formatted string
    avgLossHoldTime: string; // formatted string
}

const formatDuration = (totalMilliseconds: number, count: number): string => {
    if (count === 0 || totalMilliseconds <= 0) return 'N/A';
    
    const avgMilliseconds = totalMilliseconds / count;
    const duration = intervalToDuration({ start: 0, end: avgMilliseconds });
    
    const parts: string[] = [];
    if (duration.days && duration.days > 0) parts.push(`${duration.days}d`);
    if (duration.hours && duration.hours > 0) parts.push(`${duration.hours}h`);
    if (duration.minutes && duration.minutes > 0) parts.push(`${duration.minutes}m`);
    if (duration.seconds && duration.seconds > 0) parts.push(`${duration.seconds}s`);

    return parts.join(' ') || '0s';
};

export const calculateHoldingTimeStats = (trades: Trade[]): HoldingTimeStats => {
    let totalWinHoldTimeMs = 0;
    let winCount = 0;
    let totalLossHoldTimeMs = 0;
    let lossCount = 0;

    trades.forEach(trade => {
        if (trade.outcome === 'Open' || !trade.exitTime || !trade.pnl) return;
        
        const durationMs = parseISO(trade.exitTime).getTime() - parseISO(trade.entryTime).getTime();
        
        if (trade.pnl > 0) {
            totalWinHoldTimeMs += durationMs;
            winCount++;
        } else if (trade.pnl < 0) {
            totalLossHoldTimeMs += durationMs;
            lossCount++;
        }
    });

    return {
        avgWinHoldTime: formatDuration(totalWinHoldTimeMs, winCount),
        avgLossHoldTime: formatDuration(totalLossHoldTimeMs, lossCount),
    };
};


export interface StreakStats {
    longestWinStreak: number;
    longestLossStreak: number;
    currentStreak: number;
    currentStreakType: 'Win' | 'Loss' | 'None';
}

export const calculateStreakStats = (trades: Trade[]): StreakStats => {
    const sortedTrades = [...trades]
        .filter(t => t.outcome !== 'Open' && t.exitTime)
        .sort((a, b) => parseISO(a.exitTime!).getTime() - parseISO(b.exitTime!).getTime());

    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let currentStreak = 0;
    let currentStreakType: 'Win' | 'Loss' | 'None' = 'None';
    
    if (sortedTrades.length > 0) {
        const lastTradeOutcome = sortedTrades[sortedTrades.length - 1].pnl ?? 0;
        if (lastTradeOutcome > 0) currentStreakType = 'Win';
        else if (lastTradeOutcome < 0) currentStreakType = 'Loss';
    }


    for (const trade of sortedTrades) {
        if ((trade.pnl ?? 0) > 0) {
            currentWinStreak++;
            currentLossStreak = 0;
            if (currentWinStreak > longestWinStreak) {
                longestWinStreak = currentWinStreak;
            }
        } else if ((trade.pnl ?? 0) < 0) {
            currentLossStreak++;
            currentWinStreak = 0;
            if (currentLossStreak > longestLossStreak) {
                longestLossStreak = currentLossStreak;
            }
        } else {
            currentWinStreak = 0;
            currentLossStreak = 0;
        }
    }
    
    if (currentStreakType === 'Win') currentStreak = currentWinStreak;
    if (currentStreakType === 'Loss') currentStreak = currentLossStreak;


    return { longestWinStreak, longestLossStreak, currentStreak, currentStreakType };
};


export interface DrawdownInfo {
    maxDrawdown: number;
    maxDrawdownPercent: number;
    peak: number;
    trough: number;
}

export const calculateMaxDrawdown = (pnlData: CumulativePnlDataPoint[]): DrawdownInfo => {
    let peak = 0;
    let maxDrawdown = 0;
    let trough = 0;

    pnlData.forEach(dataPoint => {
        if (dataPoint.cumulativePnl > peak) {
            peak = dataPoint.cumulativePnl;
        }
        
        const drawdown = peak - dataPoint.cumulativePnl;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
            trough = dataPoint.cumulativePnl;
        }
    });
    
    const maxDrawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0;

    return { maxDrawdown, maxDrawdownPercent, peak, trough };
};
