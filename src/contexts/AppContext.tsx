
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import type {
  Trade,
  Edge,
  Formula,
  FormulaFormData,
  ExpiryType,
  PsychologyRule,
  PsychologyRuleFormData,
  TradingBookEntry,
  TradingBookEntryFormData,
  EdgeFormData,
  TradingMode,
  TradeLoggingMode,
  AppContextType,
  DayActivity,
  PositionType,
  DayActivityDetails,
  DayType,
  DayTypeFormData,
  EmaStatus,
  EmaStatusFormData,
  Ema5Status,
  Ema5StatusFormData,
  OpeningObservation,
  OpeningObservationFormData,
  CandleConfirmation,
  CandleConfirmationFormData,
  IbClose,
  CprSize,
  First5MinClose,
  IbBreak,
  First15MinClose,
  PriceSensitivity,
  InitialLow,
  TradingFlow,
  TradingFlowFormData,
  DailyPlan,
  TimeBlock,
  PendingPullbackOrder,
  GlobalEvent,
  Btst,
  BtstFormData,
  RulesFollowedStatus,
  LogicalEdgeFlow,
  LogicalEdgeFlowFormData,
  EntryAlert,
  TradeLogEntry,
  TradeFormData,
  LiveOrder,
  LogicalBlocksDailyState,
  LogicalBlocksFormState,
  BreakSide,
  BreakSideFormData,
} from '@/types';
import {
  mockTrades,
  mockEdges,
  mockFormulas,
  mockPsychologyRules,
  mockTradingBookEntries,
  mockDayActivities,
  mockDayTypes,
  mockEmaStatuses,
  mockEma5Statuses,
  mockOpeningObservations,
  mockCandleConfirmations,
  mockIbCloses,
  mockCprSizes,
  mockFirst5MinCloses,
  mockFirst15MinCloses,
  mockIbBreaks,
  mockPriceSensitivities,
  mockInitialLows,
  mockTradingFlows,
  mockRecurringBlocks,
  mockBtsts,
  mockLogicalEdgeFlows,
  mockBreakSides,
} from '@/data/mockData';
import { enrichTrade } from '@/lib/tradeCalculations';
import { format, parseISO, isToday, isSameDay, set, getHours, getMinutes, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultFormValues: LogicalBlocksFormState = {
  optionType: '' as const,
  dayType: '' as const,
  breakTime: '' as const,
  edgeId: '',
  selectedEdgeEntryIndex: '',
  oppositeOptionType: '' as const,
  oppositeEdgeId: '',
  oppositeSelectedEdgeEntryIndex: '',
  e15Status: '' as const,
  e5Status: '' as const,
  currentSideStructure: '',
  oppositeSideStructure: '',
  t3Condition: undefined,
};


export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [tradingMode, setTradingMode] = useState<TradingMode>('real');
  
  const [trades, setTrades] = useState<Record<TradingMode, Trade[]>>({ real: [], theoretical: [] });
  const [openOrders, setOpenOrders] = useState<Record<TradingMode, LiveOrder[]>>({ real: [], theoretical: [] });
  const [edges, setEdges] = useState<Record<TradingMode, Edge[]>>({ real: [], theoretical: [] });
  const [formulas, setFormulas] = useState<Record<TradingMode, Formula[]>>({ real: [], theoretical: [] });
  const [psychologyRules, setPsychologyRules] = useState<Record<TradingMode, PsychologyRule[]>>({ real: [], theoretical: [] });
  const [tradingBookEntries, setTradingBookEntries] = useState<Record<TradingMode, TradingBookEntry[]>>({ real: [], theoretical: [] });
  const [dayActivities, setDayActivities] = useState<Record<TradingMode, DayActivity[]>>({ real: [], theoretical: [] });
  const [dayTypes, setDayTypes] = useState<Record<TradingMode, DayType[]>>({ real: [], theoretical: [] });
  const [breakSides, setBreakSides] = useState<Record<TradingMode, BreakSide[]>>({ real: [], theoretical: [] });
  const [emaStatuses, setEmaStatuses] = useState<Record<TradingMode, EmaStatus[]>>({ real: [], theoretical: [] });
  const [ema5Statuses, setEma5Statuses] = useState<Record<TradingMode, Ema5Status[]>>({ real: [], theoretical: [] });
  const [openingObservations, setOpeningObservations] = useState<Record<TradingMode, OpeningObservation[]>>({ real: [], theoretical: [] });
  const [first5MinCloses, setFirst5MinCloses] = useState<Record<TradingMode, First5MinClose[]>>({ real: [], theoretical: [] });
  const [first15MinCloses, setFirst15MinCloses] = useState<Record<TradingMode, First15MinClose[]>>({ real: [], theoretical: [] });
  const [candleConfirmations, setCandleConfirmations] = useState<Record<TradingMode, CandleConfirmation[]>>({ real: [], theoretical: [] });
  const [ibCloses, setIbCloses] = useState<Record<TradingMode, IbClose[]>>({ real: [], theoretical: [] });
  const [ibBreaks, setIbBreaks] = useState<Record<TradingMode, IbBreak[]>>({ real: [], theoretical: [] });
  const [initialLows, setInitialLows] = useState<Record<TradingMode, InitialLow[]>>({ real: [], theoretical: [] });
  const [cprSizes, setCprSizes] = useState<Record<TradingMode, CprSize[]>>({ real: [], theoretical: [] });
  const [priceSensitivities, setPriceSensitivities] = useState<Record<TradingMode, PriceSensitivity[]>>({ real: [], theoretical: [] });
  const [btsts, setBtsts] = useState<Record<TradingMode, Btst[]>>({ real: [], theoretical: [] });
  const [tradingFlows, setTradingFlows] = useState<Record<TradingMode, TradingFlow[]>>({ real: [], theoretical: [] });
  const [logicalEdgeFlows, setLogicalEdgeFlows] = useState<Record<TradingMode, LogicalEdgeFlow[]>>({ real: [], theoretical: [] });
  const [dailyPlans, setDailyPlans] = useState<Record<TradingMode, DailyPlan[]>>({ real: [], theoretical: [] });
  const [recurringBlocks, setRecurringBlocks] = useState<Record<TradingMode, TimeBlock[]>>({ real: [], theoretical: [] });
  const [pendingPullbackOrders, setPendingPullbackOrders] = useState<Record<TradingMode, PendingPullbackOrder[]>>({ real: [], theoretical: [] });
  const [entryAlerts, setEntryAlerts] = useState<Record<TradingMode, EntryAlert[]>>({ real: [], theoretical: [] });
  const [globalEvents, setGlobalEvents] = useState<Record<TradingMode, GlobalEvent[]>>({ real: [], theoretical: [] });
  const [logicalBlocksState, setLogicalBlocksState] = useState<Record<TradingMode, LogicalBlocksDailyState>>({ real: {}, theoretical: {} });
  const [longTradeLimit, setLongTradeLimit] = useState(10);
  const [shortTradeLimit, setShortTradeLimit] = useState(10);
  
  const [isLoading, setIsLoading] = useState(true);

  // Derived state for easier consumption
  const openPositions = useMemo(() => {
    const combinedTrades = [...trades.real, ...trades.theoretical];
    const uniqueTrades = Array.from(new Map(combinedTrades.map(t => [t.id, t])).values());
    return uniqueTrades.filter(t => t.outcome === 'Open');
  }, [trades]);

  const closedPositionsForJournal = useMemo(() => {
    return {
        real: trades.real.filter(t => t.outcome !== 'Open'),
        theoretical: trades.theoretical.filter(t => t.outcome !== 'Open')
    }
  }, [trades]);

  // Load data from localStorage on initial mount
  useEffect(() => {
    setIsLoading(true);
    try {
      const storedMode = localStorage.getItem('tradeVisionApp_tradingMode');
      const activeMode: TradingMode = (storedMode === 'real' || storedMode === 'theoretical') ? storedMode : 'real';
      
      setTradingMode(activeMode);

      const storedLongLimit = localStorage.getItem(`tradeVisionApp_${activeMode}_longTradeLimit`);
      const storedShortLimit = localStorage.getItem(`tradeVisionApp_${activeMode}_shortTradeLimit`);
      setLongTradeLimit(storedLongLimit ? parseInt(storedLongLimit, 10) : 10);
      setShortTradeLimit(storedShortLimit ? parseInt(storedShortLimit, 10) : 10);

      const enrichAndSanitizeTrade = (t: any): Trade => {
        const sanitized: Partial<Trade> = {...t};
        let finalExpiryType: ExpiryType = 'Non-Expiry';
        if (typeof sanitized.expiryType === 'string') {
          if (sanitized.expiryType.toLowerCase().includes('non')) finalExpiryType = 'Non-Expiry';
          else if (sanitized.expiryType.toLowerCase().includes('expiry')) finalExpiryType = 'Expiry';
        }
        sanitized.expiryType = finalExpiryType;
        if (typeof sanitized.index === 'string') {
          const indexLower = sanitized.index.toLowerCase();
          if (indexLower === 'nifty') sanitized.index = 'NIFTY';
          else if (indexLower === 'sensex') sanitized.index = 'SENSEX';
          else sanitized.index = undefined;
        } else if (sanitized.index !== undefined) {
          sanitized.index = undefined;
        }
        if (!sanitized.source) {
            sanitized.source = 'manual';
        }
        if (sanitized.stopLossFormulaId && !sanitized.stopLossFormulaIds) {
          sanitized.stopLossFormulaIds = [sanitized.stopLossFormulaId];
        }
         if (sanitized.targetFormulaId && !sanitized.targetFormulaIds) {
          sanitized.targetFormulaIds = [sanitized.targetFormulaId];
        }
        if (!sanitized.log) {
            sanitized.log = [];
        }
        if (!sanitized.executionMode) {
            sanitized.executionMode = 'theoretical';
        }
        if (sanitized.exitTime && !sanitized.closeMode) {
            sanitized.closeMode = 'theoretical';
        }
        
        if (typeof sanitized.sourceEdgeEntryIndex === 'string') {
            sanitized.sourceEdgeEntryIndex = parseInt(sanitized.sourceEdgeEntryIndex, 10);
        }

        return enrichTrade(sanitized as Trade);
      };
      const enrichAndSanitizeEdge = (s: any): Edge => {
          const sanitized: Partial<Edge> = { ...s };
          if (!['Trend Side', 'Opposite Side', 'Short Edge'].includes(sanitized.category as string)) {
              sanitized.category = 'Trend Side';
          }
          // Corrected logic: if category is not 'Short Edge', remove the sub-type.
          if (sanitized.category !== 'Short Edge') {
              delete sanitized.shortEdgeSubType; 
          } else if (sanitized.category === 'Short Edge' && !['Trend Side', 'Opposite Side'].includes(sanitized.shortEdgeSubType as string)) {
              // If it IS a short edge but has an invalid sub-type, default it.
              sanitized.shortEdgeSubType = 'Trend Side'; 
          }
          return sanitized as Edge;
      };
      const enrichAndSanitizePsychology = (r: any) => ({ ...r, category: r.category || 'NEW PSYCHOLOGY TIPS' });
      
      const enrichAndSanitizeFormula = (f: any): Formula => {
        const sanitized: Partial<Formula> = { ...f };
        if (!sanitized.positionType || !['Long', 'Short', 'Both'].includes(sanitized.positionType)) {
            sanitized.positionType = 'Both';
        }
        
        if (sanitized.type === 'target-index' || sanitized.type === 'target-option') {
            sanitized.type = 'target';
        }
        
        if (sanitized.type !== 'stop-loss' && sanitized.type !== 'target') {
            delete sanitized.subType;
        } else if (!sanitized.subType) {
            sanitized.subType = 'Regular'; 
        }
        
        return sanitized as Formula;
      };

      const loadData = (newKey: string, oldKey: string | null, mockData: any[], enricher: (item: any) => any, fallbackData?: any[]) => {
        let data: any[] = [];
        const storedNew = localStorage.getItem(newKey);
        
        if (storedNew) {
            try {
              data = JSON.parse(storedNew);
            } catch (e) {
              console.warn(`Failed to parse data for ${newKey}, using mock data.`, e);
              data = mockData;
            }
        } else if (fallbackData) { 
            data = fallbackData;
        } else if (oldKey) { 
            const storedOld = localStorage.getItem(oldKey);
            if (storedOld) {
              try {
                data = JSON.parse(storedOld);
              } catch(e) {
                console.warn(`Failed to parse data for old key ${oldKey}, using mock data.`, e);
                data = mockData;
              }
            } else {
                data = mockData;
            }
        } else {
             data = mockData;
        }
        
        if (!Array.isArray(data) && typeof data !== 'object') {
          console.warn(`Data for key "${newKey}" was not an array or object. Resetting.`);
          data = Array.isArray(mockData) ? [] : {};
        }
        
        if (Array.isArray(data)) {
            const enrichedData = data.map(enricher);

            const seenIds = new Set<string>();
            const uniqueData = enrichedData.filter(item => {
                if (!item || !item.id || seenIds.has(item.id)) {
                    return false;
                }
                seenIds.add(item.id);
                return true;
            });
            return uniqueData;
        }
        
        // Handle object data (for logicalBlocksState)
        return data;
      };

      // Load all data first
      const loadedRealTrades = loadData('tradeVisionApp_real_trades', null, [], enrichAndSanitizeTrade);
      const loadedTheoreticalTrades = loadData('tradeVisionApp_theoretical_trades', 'tradeVisionApp_trades', mockTrades, enrichAndSanitizeTrade);
      
      const theoreticalEdges = loadData('tradeVisionApp_theoretical_edges', 'tradeVisionApp_strategies', mockEdges, enrichAndSanitizeEdge);
      const theoreticalFormulas = loadData('tradeVisionApp_theoretical_formulas', 'tradeVisionApp_formulas', mockFormulas, enrichAndSanitizeFormula);
      const theoreticalPsychology = loadData('tradeVisionApp_theoretical_psychologyRules', 'tradeVisionApp_psychologyRules', mockPsychologyRules, enrichAndSanitizePsychology);
      const theoreticalDiary = loadData('tradeVisionApp_theoretical_tradingBookEntries', 'tradeVisionApp_tradingBookEntries', mockTradingBookEntries, (e) => e);
      const theoreticalActivities = loadData('tradeVisionApp_theoretical_dayActivities', null, mockDayActivities, (a) => a);
      const theoreticalDayTypes = loadData('tradeVisionApp_theoretical_dayTypes', null, mockDayTypes, (e) => e);
      const theoreticalBreakSides = loadData('tradeVisionApp_theoretical_breakSides', null, mockBreakSides, (e) => e);
      const theoreticalEmaStatuses = loadData('tradeVisionApp_theoretical_emaStatuses', null, mockEmaStatuses, (e) => e);
      const theoreticalEma5Statuses = loadData('tradeVisionApp_theoretical_ema5Statuses', null, mockEma5Statuses, (s) => s);
      const theoreticalOpeningObs = loadData('tradeVisionApp_theoretical_openingObservations', null, mockOpeningObservations, (e) => e);
      const theoreticalFirst5MinCloses = loadData('tradeVisionApp_theoretical_first5MinCloses', null, mockFirst5MinCloses, (e) => e);
      const theoreticalFirst15MinCloses = loadData('tradeVisionApp_theoretical_first15MinCloses', null, mockFirst15MinCloses, (e) => e);
      const theoreticalCandleConfirmations = loadData('tradeVisionApp_theoretical_candleConfirmations', null, mockCandleConfirmations, (c) => c);
      const theoreticalIbCloses = loadData('tradeVisionApp_theoretical_ibCloses', null, mockIbCloses, (c) => c);
      const theoreticalIbBreaks = loadData('tradeVisionApp_theoretical_ibBreaks', null, mockIbBreaks, (b) => b);
      const theoreticalInitialLows = loadData('tradeVisionApp_theoretical_initialLows', null, mockInitialLows, (e) => e);
      const theoreticalCprSizes = loadData('tradeVisionApp_theoretical_cprSizes', null, mockCprSizes, (c) => c);
      const theoreticalPriceSensitivities = loadData('tradeVisionApp_theoretical_priceSensitivities', null, mockPriceSensitivities, (p) => p);
      const theoreticalBtsts = loadData('tradeVisionApp_theoretical_btsts', null, mockBtsts, (b) => b);
      const theoreticalTradingFlows = loadData('tradeVisionApp_theoretical_tradingFlows', null, mockTradingFlows, (f) => f);
      const theoreticalLogicalEdgeFlows = loadData('tradeVisionApp_theoretical_logicalEdgeFlows', null, mockLogicalEdgeFlows, (f) => f);
      const theoreticalDailyPlans = loadData('tradeVisionApp_theoretical_dailyPlans', null, [], (p) => p);
      const theoreticalRecurringBlocks = loadData('tradeVisionApp_theoretical_recurringBlocks', null, mockRecurringBlocks, (b) => b);
      const theoreticalPendingPullbacks = loadData('tradeVisionApp_theoretical_pendingPullbackOrders', null, [], (p) => p);
      const theoreticalEntryAlerts = loadData('tradeVisionApp_theoretical_entryAlerts', null, [], (a) => a);
      const theoreticalGlobalEvents = loadData('tradeVisionApp_theoretical_globalEvents', null, [], (e) => e);
      const theoreticalLogicalBlocksState = loadData('tradeVisionApp_theoretical_logicalBlocksState', null, {}, (s) => s);

      const realEdges = loadData('tradeVisionApp_real_edges', null, [], enrichAndSanitizeEdge, theoreticalEdges);
      const realFormulas = loadData('tradeVisionApp_real_formulas', null, [], enrichAndSanitizeFormula, theoreticalFormulas);
      const realPsychology = loadData('tradeVisionApp_real_psychologyRules', null, [], enrichAndSanitizePsychology, theoreticalPsychology);
      const realDiary = loadData('tradeVisionApp_real_tradingBookEntries', null, [], (e) => e, theoreticalDiary);
      const realActivities = loadData('tradeVisionApp_real_dayActivities', null, [], (a) => a, theoreticalActivities);
      const realDayTypes = loadData('tradeVisionApp_real_dayTypes', null, [], (e) => e, theoreticalDayTypes);
      const realBreakSides = loadData('tradeVisionApp_real_breakSides', null, [], (e) => e, theoreticalBreakSides);
      const realEmaStatuses = loadData('tradeVisionApp_real_emaStatuses', null, [], (e) => e, theoreticalEmaStatuses);
      const realEma5Statuses = loadData('tradeVisionApp_real_ema5Statuses', null, [], (s) => s, theoreticalEma5Statuses);
      const realOpeningObs = loadData('tradeVisionApp_real_openingObservations', null, [], (e) => e, theoreticalOpeningObs);
      const realFirst5MinCloses = loadData('tradeVisionApp_real_first5MinCloses', null, [], (e) => e, theoreticalFirst5MinCloses);
      const realFirst15MinCloses = loadData('tradeVisionApp_real_first15MinCloses', null, [], (e) => e, theoreticalFirst15MinCloses);
      const realCandleConfirmations = loadData('tradeVisionApp_real_candleConfirmations', null, [], (c) => c, theoreticalCandleConfirmations);
      const realIbCloses = loadData('tradeVisionApp_real_ibCloses', null, [], (c) => c, theoreticalIbCloses);
      const realIbBreaks = loadData('tradeVisionApp_real_ibBreaks', null, [], (b) => b, theoreticalIbBreaks);
      const realInitialLows = loadData('tradeVisionApp_real_initialLows', null, [], (e) => e, theoreticalInitialLows);
      const realCprSizes = loadData('tradeVisionApp_real_cprSizes', null, [], (c) => c, theoreticalCprSizes);
      const realPriceSensitivities = loadData('tradeVisionApp_real_priceSensitivities', null, [], (p) => p, theoreticalPriceSensitivities);
      const realBtsts = loadData('tradeVisionApp_real_btsts', null, [], (b) => b, theoreticalBtsts);
      const realTradingFlows = loadData('tradeVisionApp_real_tradingFlows', null, [], (f) => f, theoreticalTradingFlows);
      const realLogicalEdgeFlows = loadData('tradeVisionApp_real_logicalEdgeFlows', null, [], (f) => f, theoreticalLogicalEdgeFlows);
      const realDailyPlans = loadData('tradeVisionApp_real_dailyPlans', null, [], (p) => p, theoreticalDailyPlans);
      const realRecurringBlocks = loadData('tradeVisionApp_real_recurringBlocks', null, [], (b) => b, theoreticalRecurringBlocks);
      const realPendingPullbacks = loadData('tradeVisionApp_real_pendingPullbackOrders', null, [], (p) => p, theoreticalPendingPullbacks);
      const realEntryAlerts = loadData('tradeVisionApp_real_entryAlerts', null, [], (a) => a, theoreticalEntryAlerts);
      const realGlobalEvents = loadData('tradeVisionApp_real_globalEvents', null, [], (e) => e, theoreticalGlobalEvents);
      const realLogicalBlocksState = loadData('tradeVisionApp_real_logicalBlocksState', null, {}, (s) => s);
      
      // Set the main state objects
      setTrades({ real: loadedRealTrades, theoretical: loadedTheoreticalTrades });
      setEdges({ real: realEdges, theoretical: theoreticalEdges });
      setFormulas({ real: realFormulas, theoretical: theoreticalFormulas });
      setPsychologyRules({ real: realPsychology, theoretical: theoreticalPsychology });
      setTradingBookEntries({ real: realDiary, theoretical: theoreticalDiary });
      setDayActivities({ real: realActivities, theoretical: theoreticalActivities });
      setDayTypes({ real: realDayTypes, theoretical: theoreticalDayTypes });
      setBreakSides({ real: realBreakSides, theoretical: theoreticalBreakSides });
      setEmaStatuses({ real: realEmaStatuses, theoretical: theoreticalEmaStatuses });
      setEma5Statuses({ real: realEma5Statuses, theoretical: theoreticalEma5Statuses });
      setOpeningObservations({ real: realOpeningObs, theoretical: theoreticalOpeningObs });
      setFirst5MinCloses({ real: realFirst5MinCloses, theoretical: theoreticalFirst5MinCloses });
      setFirst15MinCloses({ real: realFirst15MinCloses, theoretical: theoreticalFirst15MinCloses });
      setCandleConfirmations({ real: realCandleConfirmations, theoretical: theoreticalCandleConfirmations });
      setIbCloses({ real: realIbCloses, theoretical: theoreticalIbCloses });
      setIbBreaks({ real: realIbBreaks, theoretical: theoreticalIbBreaks });
      setInitialLows({ real: realInitialLows, theoretical: theoreticalInitialLows });
      setCprSizes({ real: realCprSizes, theoretical: theoreticalCprSizes });
      setPriceSensitivities({ real: realPriceSensitivities, theoretical: theoreticalPriceSensitivities });
      setBtsts({ real: realBtsts, theoretical: theoreticalBtsts });
      setTradingFlows({ real: realTradingFlows, theoretical: theoreticalTradingFlows });
      setLogicalEdgeFlows({ real: realLogicalEdgeFlows, theoretical: theoreticalLogicalEdgeFlows });
      setDailyPlans({ real: realDailyPlans, theoretical: theoreticalDailyPlans });
      setRecurringBlocks({ real: realRecurringBlocks, theoretical: theoreticalRecurringBlocks });
      setPendingPullbackOrders({ real: realPendingPullbacks, theoretical: theoreticalPendingPullbacks });
      setEntryAlerts({ real: realEntryAlerts, theoretical: theoreticalEntryAlerts });
      setGlobalEvents({ real: realGlobalEvents, theoretical: theoreticalGlobalEvents });
      setLogicalBlocksState({ real: realLogicalBlocksState, theoretical: theoreticalLogicalBlocksState });
      
    } catch (error) {
      console.error("Error loading data from localStorage:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addLiveOrder = useCallback((order: LiveOrder) => {
    setOpenOrders(prev => {
        const updatedOrders = [...prev[tradingMode], order];
        return { ...prev, [tradingMode]: updatedOrders };
    });
  }, [tradingMode]);

  const cancelLiveOrder = useCallback((orderId: string) => {
    setOpenOrders(prev => {
        const updatedOrders = prev[tradingMode].filter(o => o.id !== orderId);
        return { ...prev, [tradingMode]: updatedOrders };
    });
  }, [tradingMode]);

  const getOpenOrders = useCallback(() => {
    return openOrders[tradingMode] || [];
  }, [openOrders, tradingMode]);

  const addDayActivity = useCallback((event: string, category: DayActivity['category'], details?: DayActivityDetails, cancellationData?: DayActivity['cancellationData']) => {
    setDayActivities(prev => {
      const newActivity: DayActivity = {
        id: `da-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
        event,
        category,
        details,
        cancellationData,
        isArchived: false,
        isEdited: false,
      };
      const updatedActivities = [newActivity, ...prev[tradingMode]];
      return { ...prev, [tradingMode]: updatedActivities };
    });
  }, [tradingMode]);

  const setTradeLimits = useCallback((limits: { long: number; short: number }, reason: string) => {
      const details: DayActivityDetails = {
          reason,
          changes: {
              'Long Trade Limit': { before: longTradeLimit, after: limits.long },
              'Short Trade Limit': { before: shortTradeLimit, after: limits.short },
          }
      };
      addDayActivity('Trade Limits Updated', 'Risk', details);
      setLongTradeLimit(limits.long);
      setShortTradeLimit(limits.short);
  }, [longTradeLimit, shortTradeLimit, addDayActivity]);

  React.useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem('tradeVisionApp_tradingMode', tradingMode);
        
        localStorage.setItem('tradeVisionApp_real_trades', JSON.stringify(trades.real));
        localStorage.setItem('tradeVisionApp_real_openOrders', JSON.stringify(openOrders.real));
        localStorage.setItem('tradeVisionApp_real_edges', JSON.stringify(edges.real));
        localStorage.setItem('tradeVisionApp_real_formulas', JSON.stringify(formulas.real));
        localStorage.setItem('tradeVisionApp_real_psychologyRules', JSON.stringify(psychologyRules.real));
        localStorage.setItem('tradeVisionApp_real_tradingBookEntries', JSON.stringify(tradingBookEntries.real));
        localStorage.setItem('tradeVisionApp_real_dayActivities', JSON.stringify(dayActivities.real));
        localStorage.setItem('tradeVisionApp_real_dayTypes', JSON.stringify(dayTypes.real));
        localStorage.setItem('tradeVisionApp_real_breakSides', JSON.stringify(breakSides.real));
        localStorage.setItem('tradeVisionApp_real_emaStatuses', JSON.stringify(emaStatuses.real));
        localStorage.setItem('tradeVisionApp_real_ema5Statuses', JSON.stringify(ema5Statuses.real));
        localStorage.setItem('tradeVisionApp_real_openingObservations', JSON.stringify(openingObservations.real));
        localStorage.setItem('tradeVisionApp_real_first5MinCloses', JSON.stringify(first5MinCloses.real));
        localStorage.setItem('tradeVisionApp_real_first15MinCloses', JSON.stringify(first15MinCloses.real));
        localStorage.setItem('tradeVisionApp_real_candleConfirmations', JSON.stringify(candleConfirmations.real));
        localStorage.setItem('tradeVisionApp_real_ibCloses', JSON.stringify(ibCloses.real));
        localStorage.setItem('tradeVisionApp_real_ibBreaks', JSON.stringify(ibBreaks.real));
        localStorage.setItem('tradeVisionApp_real_initialLows', JSON.stringify(initialLows.real));
        localStorage.setItem('tradeVisionApp_real_cprSizes', JSON.stringify(cprSizes.real));
        localStorage.setItem('tradeVisionApp_real_priceSensitivities', JSON.stringify(priceSensitivities.real));
        localStorage.setItem('tradeVisionApp_real_btsts', JSON.stringify(btsts.real));
        localStorage.setItem('tradeVisionApp_real_tradingFlows', JSON.stringify(tradingFlows.real));
        localStorage.setItem('tradeVisionApp_real_logicalEdgeFlows', JSON.stringify(logicalEdgeFlows.real));
        localStorage.setItem('tradeVisionApp_real_dailyPlans', JSON.stringify(dailyPlans.real));
        localStorage.setItem('tradeVisionApp_real_recurringBlocks', JSON.stringify(recurringBlocks.real));
        localStorage.setItem('tradeVisionApp_real_pendingPullbackOrders', JSON.stringify(pendingPullbackOrders.real));
        localStorage.setItem('tradeVisionApp_real_entryAlerts', JSON.stringify(entryAlerts.real));
        localStorage.setItem('tradeVisionApp_real_globalEvents', JSON.stringify(globalEvents.real));
        localStorage.setItem('tradeVisionApp_real_logicalBlocksState', JSON.stringify(logicalBlocksState.real));
        localStorage.setItem(`tradeVisionApp_real_longTradeLimit`, String(longTradeLimit));
        localStorage.setItem(`tradeVisionApp_real_shortTradeLimit`, String(shortTradeLimit));

        localStorage.setItem('tradeVisionApp_theoretical_trades', JSON.stringify(trades.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_openOrders', JSON.stringify(openOrders.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_edges', JSON.stringify(edges.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_formulas', JSON.stringify(formulas.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_psychologyRules', JSON.stringify(psychologyRules.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_tradingBookEntries', JSON.stringify(tradingBookEntries.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_dayActivities', JSON.stringify(dayActivities.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_dayTypes', JSON.stringify(dayTypes.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_breakSides', JSON.stringify(breakSides.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_emaStatuses', JSON.stringify(emaStatuses.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_ema5Statuses', JSON.stringify(ema5Statuses.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_openingObservations', JSON.stringify(openingObservations.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_first5MinCloses', JSON.stringify(first5MinCloses.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_first15MinCloses', JSON.stringify(first15MinCloses.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_candleConfirmations', JSON.stringify(candleConfirmations.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_ibCloses', JSON.stringify(ibCloses.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_ibBreaks', JSON.stringify(ibBreaks.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_initialLows', JSON.stringify(initialLows.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_cprSizes', JSON.stringify(cprSizes.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_priceSensitivities', JSON.stringify(priceSensitivities.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_btsts', JSON.stringify(btsts.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_tradingFlows', JSON.stringify(tradingFlows.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_logicalEdgeFlows', JSON.stringify(logicalEdgeFlows.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_dailyPlans', JSON.stringify(dailyPlans.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_recurringBlocks', JSON.stringify(recurringBlocks.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_pendingPullbackOrders', JSON.stringify(pendingPullbackOrders.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_entryAlerts', JSON.stringify(entryAlerts.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_globalEvents', JSON.stringify(globalEvents.theoretical));
        localStorage.setItem('tradeVisionApp_theoretical_logicalBlocksState', JSON.stringify(logicalBlocksState.theoretical));
        localStorage.setItem(`tradeVisionApp_theoretical_longTradeLimit`, String(longTradeLimit));
        localStorage.setItem(`tradeVisionApp_theoretical_shortTradeLimit`, String(shortTradeLimit));

      } catch (error) {
        console.error("Error saving data to localStorage:", error);
      }
    }
  }, [trades, openOrders, edges, formulas, psychologyRules, tradingBookEntries, dayActivities, dayTypes, breakSides, emaStatuses, ema5Statuses, openingObservations,
    first5MinCloses, first15MinCloses, candleConfirmations, ibCloses, ibBreaks, initialLows, cprSizes, priceSensitivities, btsts,
    tradingFlows, logicalEdgeFlows, dailyPlans, recurringBlocks, pendingPullbackOrders, entryAlerts, globalEvents, logicalBlocksState, longTradeLimit, shortTradeLimit, tradingMode, isLoading]);
  
  const updateLogicalBlocksState = useCallback((date: string, newState: LogicalBlocksFormState) => {
    setLogicalBlocksState(prev => {
        const updatedModeState = { ...prev[tradingMode], [date]: newState };
        localStorage.setItem(`tradeVisionApp_${tradingMode}_logicalBlocksState`, JSON.stringify(updatedModeState));
        return { ...prev, [tradingMode]: updatedModeState };
    });
  }, [tradingMode]);
  
  const updateTrade = useCallback((updatedTradeData: Trade, modeToUpdate: TradeLoggingMode) => {
    setTrades(prev => {
      const newState = { ...prev };
      const tradeId = updatedTradeData.id;
      const enrichedUpdate = enrichTrade(updatedTradeData);
  
      // This function handles the update for a single mode (real or theoretical)
      const updateModeList = (list: Trade[], trade: Trade): Trade[] => {
        const index = list.findIndex(t => t.id === trade.id);
        if (index > -1) {
          const newList = [...list];
          newList[index] = trade;
          return newList;
        }
        return list;
      };
  
      if (modeToUpdate === 'real') {
        newState.real = updateModeList(newState.real, enrichedUpdate);
        // The theoretical trade remains untouched in this case.
      } else if (modeToUpdate === 'theoretical') {
        newState.theoretical = updateModeList(newState.theoretical, enrichedUpdate);
         // The real trade remains untouched.
      } else if (modeToUpdate === 'both') {
        // If we're updating a 'both' trade (e.g., modifying SL/target), update both.
        newState.real = updateModeList(newState.real, enrichedUpdate);
        newState.theoretical = updateModeList(newState.theoretical, enrichedUpdate);
      }
  
      return newState;
    });
  }, []);

  const addPendingPullbackOrder = useCallback((pullbackData: Omit<PendingPullbackOrder, 'id'>) => {
    const newPullback: PendingPullbackOrder = {
        id: `pullback-${Date.now()}`,
        ...pullbackData
    };
    
    setPendingPullbackOrders(prev => {
        const updatedPullbacks = [...prev[tradingMode], newPullback];
        return { ...prev, [tradingMode]: updatedPullbacks };
    });

    const nextDayKey = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const followUp = pullbackData.edge.entries?.[pullbackData.nextEntryIndex];
    if (pullbackData.edge.id && followUp) {
        const nextDayState = {
            ...defaultFormValues,
            edgeId: pullbackData.edge.id,
            selectedEdgeEntryIndex: String(pullbackData.nextEntryIndex)
        };
        updateLogicalBlocksState(nextDayKey, nextDayState);
    }
  }, [tradingMode, updateLogicalBlocksState]);


  const updateTargetsForOpenPositions = useCallback((flow: LogicalEdgeFlow, followUpType?: 'win' | 'opposite') => {
    let positionsUpdatedCount = 0;
    const formulaMap = new Map(formulas[tradingMode].map(f => [f.id, f.name]));
    
    let targetLogic;
    if (followUpType === 'win') {
      targetLogic = flow.winFollowUp;
    } else if (followUpType === 'opposite') {
      targetLogic = flow.oppositeFollowUp;
    }

    setTrades(prev => {
        const newTrades = { ...prev };
        const modesToUpdate: TradingMode[] = ['real', 'theoretical'];

        for (const mode of modesToUpdate) {
            newTrades[mode] = newTrades[mode].map(pos => {
                if (pos.outcome === 'Open' && pos.sourceFlowId === flow.id) {
                    const newTargetIds = targetLogic?.trendTargetFormulaIds || flow.targetFormulaIds || [];
                    if (JSON.stringify(pos.targetFormulaIds?.sort()) !== JSON.stringify(newTargetIds.sort())) {
                        positionsUpdatedCount++;
                        const newLogEntry: TradeLogEntry = {
                            timestamp: new Date().toISOString(),
                            event: 'Target Updated Automatically',
                            notes: `Logical flow "${flow.name}" matched updated market conditions.`,
                            details: {
                                changes: {
                                    targetFormulas: {
                                        before: pos.targetFormulaIds?.map(id => formulaMap.get(id)).join(', ') || 'None',
                                        after: newTargetIds?.map(id => formulaMap.get(id)).join(', ') || 'None'
                                    }
                                }
                            }
                        };
                        return { ...pos, targetFormulaIds: newTargetIds, log: [...(pos.log || []), newLogEntry] };
                    }
                }
                return pos;
            });
        }
        return newTrades;
    });

    if (positionsUpdatedCount > 0) {
        addDayActivity('Targets Updated by Logic', 'Engine', {
            reason: `Logical Block "${flow.name}" re-evaluated.`,
            notes: `Updated targets for ${positionsUpdatedCount} open position(s).`
        });
    }
  }, [formulas, tradingMode, addDayActivity]);

  const addEntryAlert = useCallback((alertData: Omit<EntryAlert, 'id' | 'createdAt'>) => {
    addDayActivity('Entry Alert Created', 'Engine', { notes: `Alert for ${alertData.edge.name} was created from flow "${alertData.flowId}".` });
    setEntryAlerts(prev => {
        const newAlert: EntryAlert = {
            id: `alert-${Date.now()}`,
            createdAt: new Date().toISOString(),
            ...alertData
        };
        const updatedAlerts = [...prev[tradingMode], newAlert];
        return { ...prev, [tradingMode]: updatedAlerts };
    });
  }, [tradingMode, addDayActivity]);

  const clearEntryAlert = useCallback((alertId: string) => {
    setEntryAlerts(prev => ({
        ...prev,
        [tradingMode]: prev[tradingMode].filter(a => a.id !== alertId)
    }));
  }, [tradingMode]);

  const addRecurringBlock = useCallback((blockData: Omit<TimeBlock, 'id'>) => {
    let newBlock: TimeBlock | null = null;
    setRecurringBlocks(prev => {
        newBlock = {
            id: `block-${Date.now()}-${Math.random()}`,
            ...blockData
        };
        const updatedBlocks = [...prev[tradingMode], newBlock];
        return { ...prev, [tradingMode]: updatedBlocks };
    });
    return newBlock as TimeBlock;
  }, [tradingMode]);

  const updateRecurringBlock = useCallback((updatedBlock: TimeBlock) => {
    setRecurringBlocks(prev => ({
        ...prev,
        [tradingMode]: prev[tradingMode].map(b => b.id === updatedBlock.id ? updatedBlock : b)
    }));
  }, [tradingMode]);

  const updateRecurringBlockOverrides = useCallback((blockId: string, dateKey: string, conditionId: string) => {
    setRecurringBlocks(prev => {
        const updatedBlocks = prev[tradingMode].map(block => {
            if (block.id === blockId) {
                const newOverrides = { ...(block.dailyOverrides || {}), [dateKey]: conditionId };
                return { ...block, dailyOverrides: newOverrides };
            }
            return block;
        });
        return { ...prev, [tradingMode]: updatedBlocks };
    });
  }, [tradingMode]);

  const deleteRecurringBlock = useCallback((blockId: string) => {
    setRecurringBlocks(prev => {
      const updatedBlocks = prev[tradingMode].filter(b => b.id !== blockId);
      return { ...prev, [tradingMode]: updatedBlocks };
    });
    setDailyPlans(prev => {
      const updatedDailyPlans = prev[tradingMode].map(plan => ({
        ...plan,
        blocks: plan.blocks.filter(b => b.id !== blockId)
      }));
      return { ...prev, [tradingMode]: updatedDailyPlans };
    });
  }, [tradingMode]);

  const updateDailyPlan = useCallback((planToUpdate: DailyPlan) => {
    setDailyPlans(prev => {
        const newPlansForMode = [...prev[tradingMode]];
        const planIndex = newPlansForMode.findIndex(p => p.date === planToUpdate.date);
        
        if (planIndex > -1) {
            newPlansForMode[planIndex] = planToUpdate;
        } else {
            newPlansForMode.push(planToUpdate);
        }
        
        return { ...prev, [tradingMode]: newPlansForMode };
    });
  }, [tradingMode]);


  const updateDayActivity = useCallback((activityId: string, updates: { event?: string; notes?: string }) => {
    setDayActivities(prev => {
        const updatedList = prev[tradingMode].map(activity => {
            if (activity.id === activityId) {
                const originalState = activity.originalState ?? {
                    event: activity.event,
                    details: activity.details,
                    cancellationData: activity.cancellationData,
                };
                
                const newActivity = { ...activity };
                
                if (updates.event) {
                    newActivity.event = updates.event;
                }
                
                if (updates.notes !== undefined) {
                    if (newActivity.cancellationData) {
                        newActivity.cancellationData = { ...newActivity.cancellationData, reason: updates.notes };
                    } else {
                        newActivity.details = { ...(newActivity.details || {}), notes: updates.notes };
                    }
                }

                return {
                    ...newActivity,
                    isEdited: true,
                    originalState: originalState
                };
            }
            return activity;
        });
        return { ...prev, [tradingMode]: updatedList };
    });
  }, [tradingMode]);

  const setActivityArchived = useCallback((activityId: string, isArchived: boolean) => {
    setDayActivities(prev => {
        const updatedList = prev[tradingMode].map(activity => 
            activity.id === activityId ? { ...activity, isArchived } : activity
        );
        return { ...prev, [tradingMode]: updatedList };
    });
  }, [tradingMode]);

  const deleteActivityPermanently = useCallback((activityId: string) => {
    setDayActivities(prev => ({
        ...prev,
        [tradingMode]: prev[tradingMode].filter(activity => activity.id !== activityId)
    }));
  }, [tradingMode]);
  
  const addDayType = useCallback((dayTypeData: DayTypeFormData) => {
    setDayTypes(prev => {
      const newEntry: DayType = {
        id: `dt-${Date.now()}-${Math.random()}`,
        ...dayTypeData,
      };
      const updatedEntries = [newEntry, ...prev[tradingMode]];
      return { ...prev, [tradingMode]: updatedEntries };
    });
  }, [tradingMode]);

  const updateDayType = useCallback((updatedDayType: DayType) => {
    setDayTypes(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].map(entry =>
        entry.id === updatedDayType.id ? updatedDayType : entry
      ),
    }));
  }, [tradingMode]);

  const deleteDayType = useCallback((dayTypeId: string) => {
    setDayTypes(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].filter(entry => entry.id !== dayTypeId),
    }));
  }, [tradingMode]);

  const addBreakSide = useCallback((breakSideData: BreakSideFormData) => {
    setBreakSides(prev => {
      const newEntry: BreakSide = {
        id: `bs-${Date.now()}-${Math.random()}`,
        ...breakSideData,
      };
      const updatedEntries = [newEntry, ...prev[tradingMode]];
      return { ...prev, [tradingMode]: updatedEntries };
    });
  }, [tradingMode]);

  const updateBreakSide = useCallback((updatedBreakSide: BreakSide) => {
    setBreakSides(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].map(entry =>
        entry.id === updatedBreakSide.id ? updatedBreakSide : entry
      ),
    }));
  }, [tradingMode]);

  const deleteBreakSide = useCallback((breakSideId: string) => {
    setBreakSides(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].filter(entry => entry.id !== breakSideId),
    }));
  }, [tradingMode]);

  const addEmaStatus = useCallback((emaStatusData: EmaStatusFormData) => {
    setEmaStatuses(prev => {
      const newEntry: EmaStatus = {
        id: `ema-${Date.now()}-${Math.random()}`,
        ...emaStatusData,
      };
      const updatedEntries = [newEntry, ...prev[tradingMode]];
      return { ...prev, [tradingMode]: updatedEntries };
    });
  }, [tradingMode]);

  const updateEmaStatus = useCallback((updatedEmaStatus: EmaStatus) => {
    setEmaStatuses(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].map(entry =>
        entry.id === updatedEmaStatus.id ? updatedEmaStatus : entry
      ),
    }));
  }, [tradingMode]);

  const deleteEmaStatus = useCallback((emaStatusId: string) => {
    setEmaStatuses(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].filter(entry => entry.id !== emaStatusId),
    }));
  }, [tradingMode]);

  const addEma5Status = useCallback((emaStatusData: Ema5StatusFormData) => {
    setEma5Statuses(prev => {
      const newEntry: Ema5Status = {
        id: `ema5-${Date.now()}-${Math.random()}`,
        ...emaStatusData,
      };
      const updatedEntries = [newEntry, ...prev[tradingMode]];
      return { ...prev, [tradingMode]: updatedEntries };
    });
  }, [tradingMode]);

  const updateEma5Status = useCallback((updatedEma5Status: Ema5Status) => {
    setEma5Statuses(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].map(entry =>
        entry.id === updatedEma5Status.id ? updatedEma5Status : entry
      ),
    }));
  }, [tradingMode]);

  const deleteEma5Status = useCallback((ema5StatusId: string) => {
    setEma5Statuses(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].filter(entry => entry.id !== ema5StatusId),
    }));
  }, [tradingMode]);

  const addOpeningObservation = useCallback((data: OpeningObservationFormData) => {
    setOpeningObservations(prev => {
      const newEntry: OpeningObservation = {
        id: `oo-${Date.now()}-${Math.random()}`,
        ...data,
      };
      return { ...prev, [tradingMode]: [newEntry, ...prev[tradingMode]] };
    });
  }, [tradingMode]);

  const updateOpeningObservation = useCallback((updated: OpeningObservation) => {
    setOpeningObservations(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].map(entry => entry.id === updated.id ? updated : entry),
    }));
  }, [tradingMode]);

  const deleteOpeningObservation = useCallback((id: string) => {
    setOpeningObservations(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].filter(entry => entry.id !== id),
    }));
  }, [tradingMode]);

  const addFirst5MinClose = useCallback((data: any) => {
    setFirst5MinCloses(prev => {
      const newEntry: First5MinClose = { id: `f5m-${Date.now()}-${Math.random()}`, ...data };
      return { ...prev, [tradingMode]: [newEntry, ...prev[tradingMode]] };
    });
  }, [tradingMode]);

  const updateFirst5MinClose = useCallback((updated: First5MinClose) => {
    setFirst5MinCloses(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].map(entry => entry.id === updated.id ? updated : entry),
    }));
  }, [tradingMode]);

  const deleteFirst5MinClose = useCallback((id: string) => {
    setFirst5MinCloses(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].filter(entry => entry.id !== id),
    }));
  }, [tradingMode]);

  const addFirst15MinClose = useCallback((data: any) => {
    setFirst15MinCloses(prev => {
      const newEntry: First15MinClose = { id: `f15m-${Date.now()}-${Math.random()}`, ...data };
      return { ...prev, [tradingMode]: [newEntry, ...prev[tradingMode]] };
    });
  }, [tradingMode]);

  const updateFirst15MinClose = useCallback((updated: First15MinClose) => {
    setFirst15MinCloses(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].map(entry => entry.id === updated.id ? updated : entry),
    }));
  }, [tradingMode]);

  const deleteFirst15MinClose = useCallback((id: string) => {
    setFirst15MinCloses(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].filter(entry => entry.id !== id),
    }));
  }, [tradingMode]);

  const addCandleConfirmation = useCallback((data: CandleConfirmationFormData) => {
    setCandleConfirmations(prev => {
      const newEntry: CandleConfirmation = { id: `cc-${Date.now()}-${Math.random()}`, ...data };
      return { ...prev, [tradingMode]: [newEntry, ...prev[tradingMode]] };
    });
  }, [tradingMode]);

  const updateCandleConfirmation = useCallback((updated: CandleConfirmation) => {
    setCandleConfirmations(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].map(entry => entry.id === updated.id ? updated : entry),
    }));
  }, [tradingMode]);

  const deleteCandleConfirmation = useCallback((id: string) => {
    setCandleConfirmations(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].filter(entry => entry.id !== id),
    }));
  }, [tradingMode]);

  const addIbClose = useCallback((data: any) => {
    setIbCloses(prev => {
      const newEntry: IbClose = { id: `ib-${Date.now()}-${Math.random()}`, ...data };
      return { ...prev, [tradingMode]: [newEntry, ...prev[tradingMode]] };
    });
  }, [tradingMode]);

  const updateIbClose = useCallback((updated: IbClose) => {
    setIbCloses(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].map(entry => entry.id === updated.id ? updated : entry),
    }));
  }, [tradingMode]);

  const deleteIbClose = useCallback((id: string) => {
    setIbCloses(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].filter(entry => entry.id !== id),
    }));
  }, [tradingMode]);

  const addIbBreak = useCallback((data: any) => {
    setIbBreaks(prev => {
      const newEntry: IbBreak = { id: `ib-break-${Date.now()}-${Math.random()}`, ...data };
      return { ...prev, [tradingMode]: [newEntry, ...prev[tradingMode]] };
    });
  }, [tradingMode]);

  const updateIbBreak = useCallback((updated: IbBreak) => {
    setIbBreaks(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].map(entry => entry.id === updated.id ? updated : entry),
    }));
  }, [tradingMode]);

  const deleteIbBreak = useCallback((id: string) => {
    setIbBreaks(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].filter(entry => entry.id !== id),
    }));
  }, [tradingMode]);

  const addInitialLow = useCallback((data: any) => {
    setInitialLows(prev => {
      const newEntry: InitialLow = { id: `ilow-${Date.now()}-${Math.random()}`, ...data };
      return { ...prev, [tradingMode]: [newEntry, ...prev[tradingMode]] };
    });
  }, [tradingMode]);

  const updateInitialLow = useCallback((updated: InitialLow) => {
    setInitialLows(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].map(entry => entry.id === updated.id ? updated : entry),
    }));
  }, [tradingMode]);

  const deleteInitialLow = useCallback((id: string) => {
    setInitialLows(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].filter(entry => entry.id !== id),
    }));
  }, [tradingMode]);

  const addCprSize = useCallback((data: any) => {
    setCprSizes(prev => {
      const newEntry: CprSize = { id: `cpr-${Date.now()}-${Math.random()}`, ...data };
      return { ...prev, [tradingMode]: [newEntry, ...prev[tradingMode]] };
    });
  }, [tradingMode]);

  const updateCprSize = useCallback((updated: CprSize) => {
    setCprSizes(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].map(entry => entry.id === updated.id ? updated : entry),
    }));
  }, [tradingMode]);

  const deleteCprSize = useCallback((id: string) => {
    setCprSizes(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].filter(entry => entry.id !== id),
    }));
  }, [tradingMode]);

  const addPriceSensitivity = useCallback((data: any) => {
    setPriceSensitivities(prev => {
      const newEntry: PriceSensitivity = { id: `ps-${Date.now()}-${Math.random()}`, ...data };
      return { ...prev, [tradingMode]: [newEntry, ...prev[tradingMode]] };
    });
  }, [tradingMode]);

  const updatePriceSensitivity = useCallback((updated: PriceSensitivity) => {
    setPriceSensitivities(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].map(entry => entry.id === updated.id ? updated : entry),
    }));
  }, [tradingMode]);

  const deletePriceSensitivity = useCallback((id: string) => {
    setPriceSensitivities(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].filter(entry => entry.id !== id),
    }));
  }, [tradingMode]);
  
  const addBtst = useCallback((data: BtstFormData) => {
    setBtsts(prev => {
      const newEntry: Btst = { id: `btst-${Date.now()}-${Math.random()}`, ...data };
      return { ...prev, [tradingMode]: [newEntry, ...prev[tradingMode]] };
    });
  }, [tradingMode]);

  const updateBtst = useCallback((updated: Btst) => {
    setBtsts(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].map(entry => entry.id === updated.id ? updated : entry),
    }));
  }, [tradingMode]);

  const deleteBtst = useCallback((id: string) => {
    setBtsts(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].filter(entry => entry.id !== id),
    }));
  }, [tradingMode]);

  const addTradingFlow = useCallback((data: TradingFlowFormData) => {
    setTradingFlows(prev => {
      const newEntry: TradingFlow = {
        id: `flow-${Date.now()}-${Math.random()}`,
        ...data,
      };
      const updatedEntries = [newEntry, ...prev[tradingMode]];
      return { ...prev, [tradingMode]: updatedEntries };
    });
  }, [tradingMode]);
  
  const duplicateTradingFlow = useCallback((flowId: string) => {
    setTradingFlows(prev => {
        const sourceFlow = prev[tradingMode].find(f => f.id === flowId);
        if (!sourceFlow) return prev;

        const newFlow: TradingFlow = {
            ...JSON.parse(JSON.stringify(sourceFlow)), // Deep copy
            id: `flow-${Date.now()}-${Math.random()}`,
            name: `${sourceFlow.name} - Copy`,
        };
        const updatedFlows = [...prev[tradingMode], newFlow];
        return { ...prev, [tradingMode]: updatedFlows };
    });
  }, [tradingMode]);

  const updateTradingFlow = useCallback((updatedFlow: TradingFlow) => {
    setTradingFlows(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].map(entry =>
        entry.id === updatedFlow.id ? updatedFlow : entry
      ),
    }));
  }, [tradingMode]);

  const deleteTradingFlow = useCallback((flowId: string) => {
    setTradingFlows(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].filter(entry => entry.id !== flowId),
    }));
  }, [tradingMode]);

  const addLogicalEdgeFlow = useCallback((data: LogicalEdgeFlowFormData) => {
    setLogicalEdgeFlows(prev => {
      const newEntry: LogicalEdgeFlow = { id: `le-flow-${Date.now()}-${Math.random()}`, ...data };
      return { ...prev, [tradingMode]: [...prev[tradingMode], newEntry] };
    });
  }, [tradingMode]);

  const bulkAddLogicalEdgeFlows = useCallback((flows: LogicalEdgeFlow[]) => {
    setLogicalEdgeFlows(prev => {
      const newFlows = flows.map(f => ({ ...f, id: `le-flow-${Date.now()}-${Math.random()}` }));
      return { ...prev, [tradingMode]: [...prev[tradingMode], ...newFlows] };
    });
  }, [tradingMode]);

  const updateLogicalEdgeFlow = useCallback((updatedFlow: LogicalEdgeFlow) => {
    setLogicalEdgeFlows(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].map(flow => (flow.id === updatedFlow.id ? updatedFlow : flow)),
    }));
  }, [tradingMode]);

  const deleteLogicalEdgeFlow = useCallback((flowId: string) => {
    setLogicalEdgeFlows(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].filter(flow => flow.id !== flowId),
    }));
  }, [tradingMode]);

  const clearPendingPullbackOrder = useCallback((pullbackId: string) => {
    setPendingPullbackOrders(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].filter(p => p.id !== pullbackId)
    }))
  }, [tradingMode]);

  const addTrade = useCallback((tradeData: Omit<Trade, 'id' | 'pnl' | 'outcome'>): Trade => {
    const newId = `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newTrade = enrichTrade({ id: newId, ...tradeData, outcome: 'Open' } as Trade);

    setTrades(prev => {
        const newState = { ...prev };
        const modesToUpdate: TradingMode[] = newTrade.executionMode === 'both'
            ? ['real', 'theoretical']
            : newTrade.executionMode ? [newTrade.executionMode] : [];

        modesToUpdate.forEach(mode => {
            const currentTrades = newState[mode] || [];
            if (!currentTrades.some(t => t.id === newTrade.id)) {
                newState[mode] = [...currentTrades, newTrade];
            }
        });

        return newState;
    });
    return newTrade;
  }, []);

  const addHistoricalTrade = useCallback((values: TradeFormData) => {
    const entryDate = values.entryTimeDate;
    entryDate.setHours(parseInt(values.entryTimeHours || "00"), parseInt(values.entryTimeMinutes || "00"), 0, 0);
    const entryDateTime = entryDate.toISOString();

    let exitDateTime: string | undefined = undefined;
    if (values.exitTimeDate) {
        const exitDate = values.exitTimeDate;
        exitDate.setHours(parseInt(values.exitTimeHours || "00"), parseInt(values.exitTimeMinutes || "00"), 0, 0);
        exitDateTime = exitDate.toISOString();
    }
    
    let executionMode: TradeLoggingMode;
    switch (values.rulesFollowed) {
        case 'RULES FOLLOW':
            executionMode = 'both';
            break;
        case 'ENTRY MISS':
            executionMode = 'theoretical';
            break;
        default:
            executionMode = 'real';
            break;
    }
    
    const newTradeData: Omit<Trade, 'id' | 'pnl' | 'outcome'> = {
        positionType: values.positionType,
        index: values.index,
        strikePrice: values.strikePrice,
        quantity: parseFloat(values.quantity),
        entryTime: entryDateTime,
        exitTime: exitDateTime,
        strategyId: values.strategyId,
        rulesFollowed: values.rulesFollowed,
        notes: values.notes,
        expiryType: values.expiryType,
        screenshotDataUri: values.screenshotDataUri,
        source: 'historical',
        entryFormulaId: values.entryFormulaId,
        entryPrice: parseFloat(values.entryPrice),
        stopLossFormulaIds: values.stopLossFormulaIds,
        targetFormulaIds: values.targetFormulaIds,
        sl: parseFloat(values.sl),
        target: parseFloat(values.target),
        result: values.result,
        exitPrice: values.exitPrice ? parseFloat(values.exitPrice) : (values.result === 'Target Hit' ? parseFloat(values.target) : parseFloat(values.sl)),
        executionMode: executionMode,
        closeMode: executionMode, // Assuming close mode mirrors execution mode for historical trades
    };

    const newTrade = enrichTrade({
        id: `t-${Date.now()}-${Math.random()}`,
        ...newTradeData
    } as Trade);

    setTrades(prev => {
      const newState = { ...prev };
      if (newTrade.executionMode === 'both') {
        newState.real.push(newTrade);
        newState.theoretical.push(newTrade);
      } else if (newTrade.executionMode) {
        newState[newTrade.executionMode].push(newTrade);
      }
      return newState;
    });
    return newTrade;
  }, []);
  
  const bulkAddTrades = useCallback((newTradesData: Omit<Trade, 'id' | 'pnl' | 'outcome'>[]) => {
    setTrades(prev => {
        const newEnrichedTrades = newTradesData.map((tradeData, index) => {
            let finalExpiryType: ExpiryType = 'Non-Expiry';
            if (typeof tradeData.expiryType === 'string') {
                if (tradeData.expiryType.toLowerCase().includes('non')) finalExpiryType = 'Non-Expiry';
                else if (tradeData.expiryType.toLowerCase().includes('expiry')) finalExpiryType = 'Expiry';
            }
            const newTradeBase: Omit<Trade, 'pnl' | 'outcome'> = { id: `t-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`, ...tradeData, expiryType: finalExpiryType };
            return enrichTrade(newTradeBase as Trade);
        });
        const combinedTrades = [...newEnrichedTrades, ...prev[tradingMode]];
        combinedTrades.sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime());
        return { ...prev, [tradingMode]: combinedTrades };
    });
  }, [tradingMode]);

  const deleteTrade = useCallback((tradeId: string) => {
    setTrades(prev => {
      const newReal = prev.real.filter(t => t.id !== tradeId && t.id !== `${tradeId}-theo`);
      const newTheoretical = prev.theoretical.filter(t => t.id !== tradeId && t.id !== `${tradeId}-theo`);
      return { real: newReal, theoretical: newTheoretical };
    });
  }, []);

  const bulkDeleteTrades = useCallback((tradeIds: string[]) => {
    const idSet = new Set(tradeIds);
    const theoIdSet = new Set(tradeIds.map(id => `${id}-theo`));
    setTrades(prev => {
      const newReal = prev.real.filter(t => !idSet.has(t.id));
      const newTheoretical = prev.theoretical.filter(t => !idSet.has(t.id) && !theoIdSet.has(t.id));
      return { real: newReal, theoretical: newTheoretical };
    });
  }, []);

  const addEdge = useCallback((edgeData: EdgeFormData) => {
    const finalEdgeData = {
        ...edgeData,
        entries: (edgeData.entries || []).map(entry => ({
            ...entry,
            id: entry.id.startsWith('new-') ? `entry-${Date.now()}-${Math.random()}` : entry.id
        }))
    };
    setEdges(prev => {
        const newEdge: Edge = { id: `s-${Date.now()}`, ...finalEdgeData };
        return { ...prev, [tradingMode]: [newEdge, ...prev[tradingMode]] };
    });
  }, [tradingMode]);

  const duplicateEdge = useCallback((edgeId: string) => {
    setEdges(prev => {
      const sourceEdge = prev[tradingMode].find(e => e.id === edgeId);
      if (!sourceEdge) return prev;

      const newEdge: Edge = {
        ...JSON.parse(JSON.stringify(sourceEdge)), // Deep copy
        id: `s-${Date.now()}`,
        name: `${sourceEdge.name} - Copy`,
      };
      
      const updatedEdges = [...prev[tradingMode], newEdge];
      return { ...prev, [tradingMode]: updatedEdges };
    });
  }, [tradingMode]);

  const updateEdge = useCallback((updatedEdge: Edge) => {
    const finalUpdatedEdge = {
        ...updatedEdge,
        entries: (updatedEdge.entries || []).map(entry => 
            entry.id.startsWith('new-') 
                ? { ...entry, id: `entry-${Date.now()}-${Math.random()}` } 
                : entry
        )
    };
    setEdges(prev => ({ ...prev, [tradingMode]: prev[tradingMode].map(s => s.id === finalUpdatedEdge.id ? finalUpdatedEdge : s) }));
  }, [tradingMode]);

  const deleteEdge = useCallback((edgeId: string) => {
    setEdges(prev => ({ ...prev, [tradingMode]: prev[tradingMode].filter(s => s.id !== edgeId) }));
    setTrades(prev => ({ ...prev, [tradingMode]: prev[tradingMode].map(t => t.strategyId === edgeId ? { ...t, strategyId: undefined } : t) }));
  }, [tradingMode]);

  const addFormula = useCallback((formulaData: FormulaFormData) => {
    setFormulas(prev => {
        const newFormula: Formula = { id: `f-${Date.now()}`, ...formulaData };
        return { ...prev, [tradingMode]: [newFormula, ...prev[tradingMode]] };
    });
  }, [tradingMode]);

  const updateFormula = useCallback((updatedFormula: Formula) => {
    setFormulas(prev => ({ ...prev, [tradingMode]: prev[tradingMode].map(f => f.id === updatedFormula.id ? updatedFormula : f) }));
  }, [tradingMode]);

  const deleteFormula = useCallback((formulaId: string) => {
    setFormulas(prev => ({ ...prev, [tradingMode]: prev[tradingMode].filter(f => f.id !== formulaId) }));
    setTrades(prev => ({ ...prev, [tradingMode]: prev[tradingMode].map(t => {
      const newTrade = { ...t };
      if (newTrade.entryFormulaId === formulaId) newTrade.entryFormulaId = undefined;
      newTrade.stopLossFormulaIds = newTrade.stopLossFormulaIds?.filter(id => id !== formulaId);
      newTrade.targetFormulaIds = newTrade.targetFormulaIds?.filter(id => id !== formulaId);
      return newTrade;
    })}));
  }, [tradingMode]);

  const addPsychologyRule = useCallback((ruleData: PsychologyRuleFormData) => {
    setPsychologyRules(prev => {
        const newRule: PsychologyRule = { id: `p-${Date.now()}`, ...ruleData };
        return { ...prev, [tradingMode]: [newRule, ...prev[tradingMode]] };
    });
  }, [tradingMode]);

  const updatePsychologyRule = useCallback((updatedRule: PsychologyRule) => {
    setPsychologyRules(prev => ({ ...prev, [tradingMode]: prev[tradingMode].map(r => r.id === updatedRule.id ? updatedRule : r) }));
  }, [tradingMode]);

  const deletePsychologyRule = useCallback((ruleId: string) => {
    setPsychologyRules(prev => ({ ...prev, [tradingMode]: prev[tradingMode].filter(r => r.id !== ruleId) }));
  }, [tradingMode]);

  const addTradingBookEntry = useCallback((entryData: Omit<TradingBookEntry, 'id' | 'updatedAt'>) => {
    setTradingBookEntries(prev => {
        const newEntry: TradingBookEntry = { id: `tb-${Date.now()}`, ...entryData, updatedAt: new Date().toISOString() };
        return { ...prev, [tradingMode]: [newEntry, ...prev[tradingMode]] };
    });
  }, [tradingMode]);

  const updateTradingBookEntry = useCallback((updatedEntry: TradingBookEntry) => {
    setTradingBookEntries(prev => ({ ...prev, [tradingMode]: prev[tradingMode].map(entry => entry.id === updatedEntry.id ? { ...updatedEntry, updatedAt: new Date().toISOString() } : entry) }));
  }, [tradingMode]);

  const deleteTradingBookEntry = useCallback((entryId: string) => {
    setTradingBookEntries(prev => ({ ...prev, [tradingMode]: prev[tradingMode].filter(entry => entry.id !== entryId) }));
  }, [tradingMode]);

  const addGlobalEvent = useCallback((eventData: Omit<GlobalEvent, 'id'>) => {
    setGlobalEvents(prev => {
      const newEvent: GlobalEvent = {
        id: `ge-${Date.now()}-${Math.random()}`,
        ...eventData,
      };
      return { ...prev, [tradingMode]: [newEvent, ...prev[tradingMode]] };
    });
  }, [tradingMode]);

  const updateGlobalEvent = useCallback((updatedEvent: GlobalEvent) => {
    setGlobalEvents(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].map(event =>
        event.id === updatedEvent.id ? updatedEvent : event
      ),
    }));
  }, [tradingMode]);

  const deleteGlobalEvent = useCallback((eventId: string) => {
    setGlobalEvents(prev => ({
      ...prev,
      [tradingMode]: prev[tradingMode].filter(event => event.id !== eventId),
    }));
  }, [tradingMode]);

  const getAllDataAsJson = useCallback((): string => {
    const allData = {
      real: {
        trades: trades.real, openOrders: openOrders.real, edges: edges.real, formulas: formulas.real,
        psychologyRules: psychologyRules.real, tradingBookEntries: tradingBookEntries.real, dayActivities: dayActivities.real,
        dayTypes: dayTypes.real, breakSides: breakSides.real, emaStatuses: emaStatuses.real, ema5Statuses: ema5Statuses.real,
        openingObservations: openingObservations.real, first5MinCloses: first5MinCloses.real, first15MinCloses: first15MinCloses.real,
        candleConfirmations: candleConfirmations.real, ibCloses: ibCloses.real, ibBreaks: ibBreaks.real,
        initialLows: initialLows.real, cprSizes: cprSizes.real, priceSensitivities: priceSensitivities.real,
        btsts: btsts.real, tradingFlows: tradingFlows.real, logicalEdgeFlows: logicalEdgeFlows.real,
        dailyPlans: dailyPlans.real, recurringBlocks: recurringBlocks.real, pendingPullbackOrders: pendingPullbackOrders.real,
        entryAlerts: entryAlerts.real, globalEvents: globalEvents.real, logicalBlocksState: logicalBlocksState.real,
      },
      theoretical: {
        trades: trades.theoretical, openOrders: openOrders.theoretical, edges: edges.theoretical, formulas: formulas.theoretical,
        psychologyRules: psychologyRules.theoretical, tradingBookEntries: tradingBookEntries.theoretical, dayActivities: dayActivities.theoretical,
        dayTypes: dayTypes.theoretical, breakSides: breakSides.theoretical, emaStatuses: emaStatuses.theoretical, ema5Statuses: ema5Statuses.theoretical,
        openingObservations: openingObservations.theoretical, first5MinCloses: first5MinCloses.theoretical, first15MinCloses: first15MinCloses.theoretical,
        candleConfirmations: candleConfirmations.theoretical, ibCloses: ibCloses.theoretical, ibBreaks: ibBreaks.theoretical,
        initialLows: initialLows.theoretical, cprSizes: cprSizes.theoretical, priceSensitivities: priceSensitivities.theoretical,
        btsts: btsts.theoretical, tradingFlows: tradingFlows.theoretical, logicalEdgeFlows: logicalEdgeFlows.theoretical,
        dailyPlans: dailyPlans.theoretical, recurringBlocks: recurringBlocks.theoretical, pendingPullbackOrders: pendingPullbackOrders.theoretical,
        entryAlerts: entryAlerts.theoretical, globalEvents: globalEvents.theoretical, logicalBlocksState: logicalBlocksState.theoretical,
      },
      // Shared settings can be here
      longTradeLimit,
      shortTradeLimit,
    };
    return JSON.stringify(allData, null, 2);
  }, [
    trades, openOrders, edges, formulas, psychologyRules, tradingBookEntries, dayActivities, dayTypes, breakSides, emaStatuses, ema5Statuses, openingObservations,
    first5MinCloses, first15MinCloses, candleConfirmations, ibCloses, ibBreaks, initialLows, cprSizes, priceSensitivities, btsts,
    tradingFlows, logicalEdgeFlows, dailyPlans, recurringBlocks, pendingPullbackOrders, entryAlerts, globalEvents, logicalBlocksState, longTradeLimit, shortTradeLimit
  ]);
  
  const importBackup = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target?.result as string);
            
            // --- This is where the magic happens ---
            // We'll restore both real and theoretical data from the backup.
            
            // Restore 'real' data
            setTrades(prev => ({...prev, real: json.real?.trades || []}));
            setOpenOrders(prev => ({...prev, real: json.real?.openOrders || []}));
            setEdges(prev => ({...prev, real: json.real?.edges || []}));
            setFormulas(prev => ({...prev, real: json.real?.formulas || []}));
            setPsychologyRules(prev => ({...prev, real: json.real?.psychologyRules || []}));
            setTradingBookEntries(prev => ({...prev, real: json.real?.tradingBookEntries || []}));
            setDayActivities(prev => ({...prev, real: json.real?.dayActivities || []}));
            setDayTypes(prev => ({...prev, real: json.real?.dayTypes || []}));
            setBreakSides(prev => ({...prev, real: json.real?.breakSides || []}));
            setEmaStatuses(prev => ({...prev, real: json.real?.emaStatuses || []}));
            setEma5Statuses(prev => ({...prev, real: json.real?.ema5Statuses || []}));
            setOpeningObservations(prev => ({...prev, real: json.real?.openingObservations || []}));
            setFirst5MinCloses(prev => ({...prev, real: json.real?.first5MinCloses || []}));
            setFirst15MinCloses(prev => ({...prev, real: json.real?.first15MinCloses || []}));
            setCandleConfirmations(prev => ({...prev, real: json.real?.candleConfirmations || []}));
            setIbCloses(prev => ({...prev, real: json.real?.ibCloses || []}));
            setIbBreaks(prev => ({...prev, real: json.real?.ibBreaks || []}));
            setInitialLows(prev => ({...prev, real: json.real?.initialLows || []}));
            setCprSizes(prev => ({...prev, real: json.real?.cprSizes || []}));
            setPriceSensitivities(prev => ({...prev, real: json.real?.priceSensitivities || []}));
            setBtsts(prev => ({...prev, real: json.real?.btsts || []}));
            setTradingFlows(prev => ({...prev, real: json.real?.tradingFlows || []}));
            setLogicalEdgeFlows(prev => ({...prev, real: json.real?.logicalEdgeFlows || []}));
            setDailyPlans(prev => ({...prev, real: json.real?.dailyPlans || []}));
            setRecurringBlocks(prev => ({...prev, real: json.real?.recurringBlocks || []}));
            setPendingPullbackOrders(prev => ({...prev, real: json.real?.pendingPullbackOrders || []}));
            setEntryAlerts(prev => ({...prev, real: json.real?.entryAlerts || []}));
            setGlobalEvents(prev => ({...prev, real: json.real?.globalEvents || []}));
            setLogicalBlocksState(prev => ({...prev, real: json.real?.logicalBlocksState || {}}));

            // Restore 'theoretical' data
            setTrades(prev => ({...prev, theoretical: json.theoretical?.trades || []}));
            setOpenOrders(prev => ({...prev, theoretical: json.theoretical?.openOrders || []}));
            setEdges(prev => ({...prev, theoretical: json.theoretical?.edges || []}));
            setFormulas(prev => ({...prev, theoretical: json.theoretical?.formulas || []}));
            setPsychologyRules(prev => ({...prev, theoretical: json.theoretical?.psychologyRules || []}));
            setTradingBookEntries(prev => ({...prev, theoretical: json.theoretical?.tradingBookEntries || []}));
            setDayActivities(prev => ({...prev, theoretical: json.theoretical?.dayActivities || []}));
            setDayTypes(prev => ({...prev, theoretical: json.theoretical?.dayTypes || []}));
            setBreakSides(prev => ({...prev, theoretical: json.theoretical?.breakSides || []}));
            setEmaStatuses(prev => ({...prev, theoretical: json.theoretical?.emaStatuses || []}));
            setEma5Statuses(prev => ({...prev, theoretical: json.theoretical?.ema5Statuses || []}));
            setOpeningObservations(prev => ({...prev, theoretical: json.theoretical?.openingObservations || []}));
            setFirst5MinCloses(prev => ({...prev, theoretical: json.theoretical?.first5MinCloses || []}));
            setFirst15MinCloses(prev => ({...prev, theoretical: json.theoretical?.first15MinCloses || []}));
            setCandleConfirmations(prev => ({...prev, theoretical: json.theoretical?.candleConfirmations || []}));
            setIbCloses(prev => ({...prev, theoretical: json.theoretical?.ibCloses || []}));
            setIbBreaks(prev => ({...prev, theoretical: json.theoretical?.ibBreaks || []}));
            setInitialLows(prev => ({...prev, theoretical: json.theoretical?.initialLows || []}));
            setCprSizes(prev => ({...prev, theoretical: json.theoretical?.cprSizes || []}));
            setPriceSensitivities(prev => ({...prev, theoretical: json.theoretical?.priceSensitivities || []}));
            setBtsts(prev => ({...prev, theoretical: json.theoretical?.btsts || []}));
            setTradingFlows(prev => ({...prev, theoretical: json.theoretical?.tradingFlows || []}));
            setLogicalEdgeFlows(prev => ({...prev, theoretical: json.theoretical?.logicalEdgeFlows || []}));
            setDailyPlans(prev => ({...prev, theoretical: json.theoretical?.dailyPlans || []}));
            setRecurringBlocks(prev => ({...prev, theoretical: json.theoretical?.recurringBlocks || []}));
            setPendingPullbackOrders(prev => ({...prev, theoretical: json.theoretical?.pendingPullbackOrders || []}));
            setEntryAlerts(prev => ({...prev, theoretical: json.theoretical?.entryAlerts || []}));
            setGlobalEvents(prev => ({...prev, theoretical: json.theoretical?.globalEvents || []}));
            setLogicalBlocksState(prev => ({...prev, theoretical: json.theoretical?.logicalBlocksState || {}}));
            
            // Restore shared settings
            setLongTradeLimit(json.longTradeLimit ?? 10);
            setShortTradeLimit(json.shortTradeLimit ?? 10);

            toast({
                title: 'Import Successful',
                description: 'Your data has been restored from the backup file.',
            });
            
            // Force a re-render/reload to ensure all components have the new data
            setTimeout(() => window.location.reload(), 1000);

        } catch (error) {
            console.error('Error parsing or applying backup file:', error);
            toast({
                variant: 'destructive',
                title: 'Import Failed',
                description: 'The selected file is not a valid backup file or is corrupted.',
            });
        }
    };
    reader.readAsText(file);
  }, [toast]);

  const contextValue: AppContextType = {
      tradingMode,
      setTradingMode,
      trades: trades[tradingMode],
      allTrades: trades,
      openPositions,
      closedPositionsForJournal: closedPositionsForJournal[tradingMode],
      getOpenOrders,
      addLiveOrder,
      cancelLiveOrder,
      edges: edges, // Pass the full object
      formulas: formulas, // Pass the full object
      psychologyRules: psychologyRules[tradingMode],
      tradingBookEntries: tradingBookEntries[tradingMode],
      dayActivities: dayActivities[tradingMode],
      dayTypes: dayTypes[tradingMode],
      breakSides: breakSides[tradingMode],
      addBreakSide,
      updateBreakSide,
      deleteBreakSide,
      emaStatuses: emaStatuses[tradingMode],
      ema5Statuses: ema5Statuses[tradingMode],
      addEma5Status,
      updateEma5Status,
      deleteEma5Status,
      openingObservations: openingObservations[tradingMode],
      first5MinCloses: first5MinCloses[tradingMode],
      first15MinCloses: first15MinCloses[tradingMode],
      candleConfirmations: candleConfirmations[tradingMode],
      ibCloses: ibCloses[tradingMode],
      ibBreaks: ibBreaks[tradingMode],
      initialLows: initialLows[tradingMode],
      addInitialLow,
      updateInitialLow,
      deleteInitialLow,
      cprSizes: cprSizes[tradingMode],
      priceSensitivities: priceSensitivities[tradingMode],
      btsts: btsts[tradingMode],
      addBtst,
      updateBtst,
      deleteBtst,
      tradingFlows: tradingFlows[tradingMode],
      addTradingFlow,
      updateTradingFlow,
      deleteTradingFlow,
      duplicateTradingFlow,
      logicalEdgeFlows: logicalEdgeFlows[tradingMode],
      addLogicalEdgeFlow,
      updateLogicalEdgeFlow,
      deleteLogicalEdgeFlow,
      bulkAddLogicalEdgeFlows,
      pendingPullbackOrders: pendingPullbackOrders[tradingMode],
      addPendingPullbackOrder,
      clearPendingPullbackOrder,
      entryAlerts: entryAlerts[tradingMode],
      addEntryAlert,
      clearEntryAlert,
      addPriceSensitivity,
      updatePriceSensitivity,
      deletePriceSensitivity,
      addFirst5MinClose,
      updateFirst5MinClose,
      deleteFirst5MinClose,
      addFirst15MinClose,
      updateFirst15MinClose,
      deleteFirst15MinClose,
      addCprSize,
      updateCprSize,
      deleteCprSize,
      addIbClose,
      updateIbClose,
      deleteIbClose,
      addIbBreak,
      updateIbBreak,
      deleteIbBreak,
      addCandleConfirmation,
      updateCandleConfirmation,
      deleteCandleConfirmation,
      addOpeningObservation,
      updateOpeningObservation,
      deleteOpeningObservation,
      addEmaStatus,
      updateEmaStatus,
      deleteEmaStatus,
      addDayType,
      updateDayType,
      deleteDayType,
      longTradeLimit,
      shortTradeLimit,
      setTradeLimits,
      addDayActivity,
      updateDayActivity,
      setActivityArchived,
      deleteActivityPermanently,
      addTrade, 
      addHistoricalTrade,
      updateTrade, 
      deleteTrade,
      bulkDeleteTrades,
      bulkAddTrades,
      addEdge,
      duplicateEdge,
      updateEdge, 
      deleteEdge,
      addFormula, updateFormula, deleteFormula,
      addPsychologyRule, updatePsychologyRule, deletePsychologyRule,
      addTradingBookEntry, updateTradingBookEntry, deleteTradingBookEntry,
      isLoading,
      getAllDataAsJson,
      importBackup,
      dailyPlans: dailyPlans[tradingMode],
      updateDailyPlan,
      recurringBlocks: recurringBlocks[tradingMode],
      addRecurringBlock,
      updateRecurringBlock,
      deleteRecurringBlock,
      updateRecurringBlockOverrides,
      globalEvents: globalEvents[tradingMode],
      addGlobalEvent,
      updateGlobalEvent,
      deleteGlobalEvent,
      updateTargetsForOpenPositions,
      logicalBlocksState: logicalBlocksState[tradingMode],
      updateLogicalBlocksState,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = React.useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
