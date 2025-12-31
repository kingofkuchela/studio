

import type { Trade, Edge, Formula, IndexType, PositionType, RulesFollowedStatus, PsychologyRule, TradingBookEntry, DayActivity, DayType, EmaStatus, Ema5Status, OpeningObservation, CandleConfirmation, IbClose, CprSize, First5MinClose, First15MinClose, IbBreak, PriceSensitivity, InitialLow, TradingFlow, Btst, TimeBlock, LogicalEdgeFlow, BreakSide } from '@/types';
import { format } from 'date-fns';

export const mockLogicalEdgeFlows: LogicalEdgeFlow[] = [
  {
    id: 'le-flow-1',
    name: 'Bullish Morning Breakout',
    edgeId: 's3', // Corresponds to Trend Following
    optionTypes: ['CE'],
    dayTypes: ['Trend'],
    breakTimes: ['Before 12'],
    e15Statuses: ['Positive'],
    e5Statuses: ['Positive'],
    selectedEdgeEntryIndex: 0,
    resultType: 'Win',
    currentSideStructure: [' S(3) , S(5) & S(15) RESPECTS '],
    oppositeSideStructure: ['S(3) FORMED ONLY'],
    targetFormulaIds: ['xf1'],
    parameters: [{ key: 'Min Volume', value: '1M' }],
    notes: 'Primary bullish scenario for morning session.',
    t3Condition: 'T(3) >= S(15)',
    winFollowUp: {
      nextEdgeId: 's2',
      trendTargetStatus: 'Second entry target',
      trendTargetFormulaIds: ['xf4'],
      notes: 'Take second entry on confirmation.'
    },
    lossFollowUp: {
      nextEdgeId: 's1',
      selectedEdgeEntryIndex: 0,
      notes: 'Re-assess on this loss condition.'
    }
  },
  {
    id: 'le-flow-2',
    name: 'Example Flow for BTST',
    edgeId: 's4', // BTST
    optionTypes: ['CE'],
    dayTypes: ['Range'], // Changed to Range to match user's later request
    breakTimes: ['Before 12'],
    e15Statuses: ['Positive'],
    e5Statuses: ['Positive'],
    // No selectedEdgeEntryIndex to match a general selection
    resultType: 'Win',
    currentSideStructure: [' S(3) , S(5) & S(15) RESPECTS '],
    oppositeSideStructure: ['S(3) FORMED ONLY'],
    targetFormulaIds: ['xf1', 'xf4'],
    parameters: [],
    notes: 'This is the sample flow to test matching based on user feedback.'
  },
];

export const mockTradingFlows: TradingFlow[] = [];

export const mockRecurringBlocks: TimeBlock[] = [
  { id: 'block-1', time: '09:30', conditionType: '1st 15 Min Open', conditionId: 'oo1', isRecurring: true, isAlarmOn: true, isFrozen: false },
  { id: 'block-2', time: '10:00', conditionType: 'E(15)', conditionId: 'ema1', isRecurring: true, isAlarmOn: true, isFrozen: false },
  { id: 'block-3', time: '11:00', conditionType: 'IB Close', conditionId: 'ib1', isRecurring: true, isAlarmOn: false, isFrozen: false },
  { id: 'block-4', time: '14:30', conditionType: 'Candle Confirmation', conditionId: 'cc2', isRecurring: true, isAlarmOn: true, isFrozen: false },
];

export const mockCprSizes: CprSize[] = [
  { id: 'cpr1', name: 'Narrow CPR' },
  { id: 'cpr2', name: 'Wide CPR' },
  { id: 'cpr3', name: 'Average CPR' },
  { id: 'cpr4', name: 'Above CPR' },
  { id: 'cpr5', name: 'Below CPR' },
];

export const mockBreakSides: BreakSide[] = [
    { id: 'bs1', name: 'Break Up' },
    { id: 'bs2', name: 'Break Down' },
];

export const mockPriceSensitivities: PriceSensitivity[] = [
  { id: 'ps1', name: 'Sensitive' },
  { id: 'ps2', name: 'Normal' },
  { id: 'ps3', name: 'Not Sensitive' },
];

export const mockBtsts: Btst[] = [];

export const mockIbCloses: IbClose[] = [
  { id: 'ib1', name: 'IB close above high' },
  { id: 'ib2', name: 'IB close below low' },
  { id: 'ib3', name: 'IB close inside range' },
];

export const mockIbBreaks: IbBreak[] = [];

export const mockInitialLows: InitialLow[] = [
  { id: 'ilow1', name: 'Open = Low' },
  { id: 'ilow2', name: 'Price near Initial Low' },
];

export const mockCandleConfirmations: CandleConfirmation[] = [
  { id: 'cc1', name: 'Bullish Engulfing on 5min' },
  { id: 'cc2', name: 'Pinbar rejection at 20 EMA' },
  { id: 'cc3', name: 'Bearish Harami on 15min chart' },
];

export const mockOpeningObservations: OpeningObservation[] = [
  { id: 'oo1', name: '1st 15m open > PDH' },
  { id: 'oo2', name: '1st 15m open < PDL' },
  { id: 'oo3', name: '1st 15m open inside value' },
];

export const mockFirst5MinCloses: First5MinClose[] = [
  { id: 'f5m1', name: 'Open > High' },
  { id: 'f5m2', name: 'Open < Low' },
  { id: 'f5m3', name: 'Closes near High' },
  { id: 'f5m4', name: 'Closed beyond PDH' },
  { id: 'f5m5', name: 'Closed beyond PDL' },
  { id: 'f5m6', name: 'Above CPR' },
  { id: 'f5m7', name: 'Below CPR' },
];

export const mockFirst15MinCloses: First15MinClose[] = [
  { id: 'f15m1', name: 'Closed near 15m high' },
  { id: 'f15m2', name: 'Closed near 15m low' },
  { id: 'f15m3', name: 'Closed in middle of 15m range' },
  { id: 'f15m4', name: 'Closed beyond PDH' },
  { id: 'f15m5', name: 'Closed beyond PDL' },
  { id: 'f15m6', name: 'Above CPR' },
  { id: 'f15m7', name: 'Below CPR' },
];


export const mockEmaStatuses: EmaStatus[] = [
  { id: 'ema1', name: 'Price > 20 EMA' },
  { id: 'ema2', name: 'Price < 20 EMA' },
  { id: 'ema3', name: 'Bullish EMA Cross (5/20)' },
  { id: 'ema4', name: 'Bearish EMA Cross (5/20)' },
];

export const mockEma5Statuses: Ema5Status[] = [
  { id: 'ema5-1', name: 'Price > 5 EMA' },
  { id: 'ema5-2', name: 'Price < 5 EMA' },
];

export const mockDayTypes: DayType[] = [
  {
    id: 'dt1',
    name: 'Bullish Trend Day',
    conditions: ['Opens above PDH', 'IB closes near high', 'VIX is low']
  },
  {
    id: 'dt2',
    name: 'Bearish Trend Day',
    conditions: ['Opens below PDL', 'IB closes near low']
  },
  {
    id: 'dt3',
    name: 'Range-Bound Day',
    conditions: ['Opens within PDH/PDL', 'Alternating red/green 15m candles']
  }
];

export const mockDayActivities: DayActivity[] = [];

export const mockTradingBookEntries: TradingBookEntry[] = [
  {
    id: 'tb1',
    title: 'Market Open Observations',
    content: 'The market showed unusual volatility at the open today. The VIX spiked, but settled down within the first 30 minutes. This might be a pattern to watch for on Fridays. Need to back-test this hypothesis.',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tb2',
    title: 'Idea: New Hedging Strategy',
    content: 'Consider using out-of-the-money puts on SPY as a hedge during high-impact news events. The cost might be justifiable if it protects against significant drawdowns. I should calculate the cost vs. potential savings over the last 5 major FOMC announcements.',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tb3',
    title: 'Reflection on Yesterday\'s Loss',
    content: 'I broke my rule of not entering a trade within the first 15 minutes of market open. The setup looked perfect, but it was a classic fakeout. The loss was a direct result of impatience. Must stick to the plan. "The plan is the plan."',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export const mockPsychologyRules: PsychologyRule[] = [
  { id: 'p1', text: 'Managing money is more important than earning money.', category: 'FUNDAMENTAL RULES' },
  { id: 'p2', text: 'I will not chase losses. A small loss is better than a big one.', category: 'FUNDAMENTAL RULES' },
  { id: 'p3', text: 'I will stick to my trading plan, no matter what my emotions tell me.', category: 'DAILY' },
  { id: 'p4', text: 'Patience is a virtue. I will wait for the high-probability setups.', category: 'DAILY' },
  { id: 'p5', text: 'A good trade is one that follows the plan, regardless of outcome.', category: 'NEW PSYCHOLOGY TIPS' },
];

export const mockEdges: Edge[] = [
  { 
    id: 's1', name: 'Scalping', category: 'Trend Side', description: 'Quick in-and-out trades', 
    rules: ['Enter on high volume spike', 'Target 1.5R, SL 1R', 'Avoid trading during news events'], 
    entries: [
      {
        id: 'e1-s1',
        entryFormulaIds: ['ef2'],
        stopLossFormulaIds: ['xf2'],
        targetFormulaIds: ['xf1']
      }
    ] 
  },
  { id: 's2', name: 'Swing Trading', category: 'Opposite Side', description: 'Holding for a few days/weeks', entries: [
      {
        id: 'e1-s2',
        entryFormulaIds: ['ef1', 'ef3'],
        stopLossFormulaIds: ['xf3'],
        targetFormulaIds: ['xf1']
      }
  ] },
  { id: 's3', name: 'Trend Following', category: 'Trend Side', description: 'Riding the trend', entries: [
      {
        id: 'e1-s3',
        entryFormulaIds: ['ef1'],
        stopLossFormulaIds: ['xf2'],
        targetFormulaIds: ['xf1']
      }
  ] },
  {
    id: 's4',
    name: 'BTST',
    category: 'Trend Side',
    description: 'Buy Today, Sell Tomorrow.',
    entries: [
        {
            id: 'e1-s4',
            entryFormulaIds: ['ef1'],
            stopLossFormulaIds: ['xf2'],
            targetFormulaIds: ['xf1', 'xf4']
        }
    ]
  }
];

export const mockFormulas: Formula[] = [
  { id: 'ef1', name: 'Breakout Above Resistance', type: 'breakout-entry', description: 'Enter when price breaks above a key resistance level.' },
  { id: 'ef2', name: 'EMA Crossover (5/10)', type: 'normal-entry', description: 'Enter on 5 EMA crossing above 10 EMA.' },
  { id: 'xf1', name: 'Target Profit 2R', type: 'target', subType: 'Regular', description: 'Exit when profit reaches twice the risked amount.' },
  { id: 'xf2', name: 'Stop Loss 1%', type: 'stop-loss', subType: 'Regular', description: 'Exit if price drops 1% below entry.' },
  { id: 'ef3', name: 'MACD Bullish Crossover', type: 'normal-entry', description: 'Enter when MACD line crosses above signal line on bullish momentum.'},
  { id: 'xf3', name: 'Trailing Stop 2%', type: 'stop-loss', subType: 'Structure Change', description: 'Use a 2% trailing stop loss to lock in profits.'},
  { id: 'xf4', name: 'Inverse S(15)', type: 'target', subType: 'Structure Change', description: 'Target based on inverse S(15) level.' }
];

export const mockTrades: Trade[] = [
  {
    id: 't1',
    symbol: 'AAPL',
    positionType: 'Long',
    index: 'NIFTY',
    strikePrice: '145.00',
    entryPrice: 150.00,
    exitPrice: 155.00,
    quantity: 10,
    entryTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), 
    exitTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), 
    strategyId: 's2',
    rulesFollowed: "RULES FOLLOW",
    notes: 'Good earnings report expectation',
    expiryType: 'Non-Expiry',
    entryFormulaId: 'ef1',
    targetFormulaIds: ['xf1'],
    screenshotDataUri: undefined,
    sl: 148.00,
    target: 155.00,
    result: 'Target Hit',
    source: 'manual',
  },
  {
    id: 't2',
    symbol: 'GOOGL',
    positionType: 'Short',
    index: 'SENSEX',
    strikePrice: 'GOOG24SEP2650CE', 
    entryPrice: 2700.00,
    exitPrice: 2680.00,
    quantity: 5,
    entryTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), 
    exitTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), 
    strategyId: 's1',
    rulesFollowed: "NOT FOLLOW",
    notes: 'Quick scalp, hit stop loss',
    expiryType: 'Expiry',
    entryFormulaId: 'ef2',
    stopLossFormulaIds: ['xf2'],
    screenshotDataUri: undefined,
    sl: 2710.00,
    target: 2670.00,
    result: 'SL Hit',
    source: 'manual',
  },
  {
    id: 't3',
    symbol: 'TSLA',
    positionType: 'Long',
    index: 'NIFTY',
    strikePrice: '680.00',
    entryPrice: 700.00,
    exitPrice: 750.00,
    quantity: 2,
    entryTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), 
    exitTime: new Date().toISOString(), 
    strategyId: 's3',
    rulesFollowed: "PARTIALLY FOLLOW",
    notes: 'Strong upward trend',
    expiryType: 'Non-Expiry',
    entryFormulaId: 'ef3',
    stopLossFormulaIds: ['xf3'],
    screenshotDataUri: undefined,
    sl: 690.00,
    target: 760.00,
    result: 'Manual Exit - Profit Taken',
    source: 'manual',
  },
  {
    id: 't4',
    symbol: 'MSFT',
    positionType: 'Long',
    index: undefined, 
    strikePrice: undefined, 
    entryPrice: 300.00,
    exitPrice: 310.00,
    quantity: 8,
    entryTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    exitTime: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    strategyId: 's2',
    rulesFollowed: "RULES FOLLOW",
    notes: 'Testing optional fields',
    expiryType: 'Non-Expiry',
    entryFormulaId: 'ef1',
    targetFormulaIds: ['xf1'],
    screenshotDataUri: undefined,
    target: 312.00,
    source: 'manual',
  }
];

  
