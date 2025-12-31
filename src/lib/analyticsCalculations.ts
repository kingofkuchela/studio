
'use client';

import type { Trade } from '@/types';
import { parseISO, getDay } from 'date-fns';

export interface PerformanceMetric {
    name: string;
    totalPnl: number;
    winRate: number;
    tradeCount: number;
    avgPnl: number;
    profitFactor: number;
}

type TradeDimension = 'strategyId' | 'entryFormulaId' | 'stopLossFormulaIds' | 'targetFormulaIds';

export const calculatePerformanceByDimension = (
    trades: Trade[],
    dimensionKey: TradeDimension,
    dimensionMap: Map<string, string>
): PerformanceMetric[] => {
    const performance: Record<string, { pnl: number, wins: number, count: number, tradeIds: Set<string> }> = {};

    trades.forEach(trade => {
        if (trade.outcome === 'Open' || !trade.pnl) return;

        const keysOrKey = trade[dimensionKey as keyof Trade];
        const keys = Array.isArray(keysOrKey) ? keysOrKey : [keysOrKey];

        keys.forEach(key => {
            if (key && dimensionMap.has(key)) {
                if (!performance[key]) {
                    performance[key] = { pnl: 0, wins: 0, count: 0, tradeIds: new Set() };
                }

                // If this trade has already been counted for this dimension (e.g., from another formula in the same array), skip
                if (!performance[key].tradeIds.has(trade.id)) {
                    performance[key].pnl += trade.pnl ?? 0;
                    performance[key].count++;
                    if ((trade.pnl ?? 0) > 0) {
                        performance[key].wins++;
                    }
                    performance[key].tradeIds.add(trade.id);
                }
            }
        });
    });

    return Object.entries(performance).map(([id, data]) => {
        const relevantTrades = trades.filter(t => {
            const keys = t[dimensionKey as keyof Trade];
            return Array.isArray(keys) ? keys.includes(id) : keys === id;
        });

        const sumOfWins = relevantTrades
            .filter(t => t.pnl != null && t.pnl > 0)
            .reduce((acc, t) => acc + (t.pnl || 0), 0);
        
        const sumOfLosses = Math.abs(relevantTrades
            .filter(t => t.pnl != null && t.pnl < 0)
            .reduce((acc, t) => acc + (t.pnl || 0), 0)
        );

        return {
            name: dimensionMap.get(id) || 'Unknown',
            totalPnl: data.pnl,
            winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
            tradeCount: data.count,
            avgPnl: data.count > 0 ? data.pnl / data.count : 0,
            profitFactor: sumOfLosses > 0 ? sumOfWins / sumOfLosses : Infinity,
        };
    }).sort((a, b) => b.totalPnl - a.totalPnl);
};

export interface RMultipleDistributionData {
    name: string; 
    count: number;
}

export const calculateRMultipleDistribution = (trades: Trade[]): RMultipleDistributionData[] => {
    const bins: Record<string, number> = {
        "<-3R": 0,
        "-3R to -2R": 0,
        "-2R to -1R": 0,
        "-1R to 0R": 0,
        "0R to 1R": 0,
        "1R to 2R": 0,
        "2R to 3R": 0,
        ">3R": 0,
        "No SL": 0,
    };

    trades.forEach(trade => {
        if (trade.outcome === 'Open' || typeof trade.pnl !== 'number' || typeof trade.sl !== 'number') {
            if (typeof trade.sl !== 'number' && trade.outcome !== 'Open') {
                 bins["No SL"]++;
            }
            return;
        }

        const risk = Math.abs(trade.entryPrice - trade.sl) * trade.quantity;
        if (risk === 0) {
            bins["No SL"]++; // Treat 0 risk as no SL set
            return;
        }

        const rMultiple = trade.pnl / risk;

        if (rMultiple < -3) bins["<-3R"]++;
        else if (rMultiple <= -2) bins["-3R to -2R"]++;
        else if (rMultiple <= -1) bins["-2R to -1R"]++;
        else if (rMultiple < 0) bins["-1R to 0R"]++;
        else if (rMultiple < 1) bins["0R to 1R"]++;
        else if (rMultiple < 2) bins["1R to 2R"]++;
        else if (rMultiple < 3) bins["2R to 3R"]++;
        else bins[">3R"]++;
    });

    return Object.entries(bins).map(([name, count]) => ({ name, count }));
};

export interface DayOfWeekPerformance {
  name: string;
  pnl: number;
  trades: number;
}

export const calculatePerformanceByDayOfWeek = (trades: Trade[]): DayOfWeekPerformance[] => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const performance: DayOfWeekPerformance[] = days.map(day => ({ name: day, pnl: 0, trades: 0 }));

  trades.forEach(trade => {
    if (trade.outcome === 'Open' || !trade.exitTime || typeof trade.pnl !== 'number') return;
    
    try {
        const dayIndex = getDay(parseISO(trade.exitTime));
        performance[dayIndex].pnl += trade.pnl;
        performance[dayIndex].trades++;
    } catch(e) {
        console.error(`Could not parse date for trade ${trade.id}: ${trade.exitTime}`);
    }
  });

  // Ensure pnl is a number with max 2 decimal places for consistency in charts
  return performance.map(day => ({...day, pnl: parseFloat(day.pnl.toFixed(2))}));
}
