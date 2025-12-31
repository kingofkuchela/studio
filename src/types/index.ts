
"use client";

import type { UseFormReturn } from "react-hook-form";

export type TradingMode = 'real' | 'theoretical';
export type TradeLoggingMode = 'both' | 'real' | 'theoretical';

export interface LogicalBlocksFormState {
  optionType: 'CE' | 'PE' | '';
  dayType: 'Range' | 'Trend' | '';
  breakTime: 'Before 12' | 'After 12' | 'NO BREAK' | '';
  edgeId: string;
  selectedEdgeEntryIndex?: string;
  oppositeOptionType: 'CE' | 'PE' | '';
  oppositeEdgeId: string;
  oppositeSelectedEdgeEntryIndex?: string;
  e15Status: 'Positive' | 'Negative' | '';
  e5Status: 'Positive' | 'Negative' | '';
  currentSideStructure: string;
  oppositeSideStructure: string;
  t3Condition?: 'T(3) >= S(15)' | 'S(15) > T(3)' | '';
}

export type LogicalBlocksDailyState = Record<string, LogicalBlocksFormState>;

export interface EntryAlert {
  id: string;
  edge: Edge;
  entryIndex: number;
  primaryTargetFormulaId?: string;
  primaryTargetFormulaName?: string;
  flowId?: string; // To trace back to the flow
}

export interface LogicalEdgeFlow {
  id: string;
  name: string;
  edgeId?: string;
  optionTypes?: ('CE' | 'PE')[];
  dayTypes?: ('Range' | 'Trend')[];
  breakTimes?: ('Before 12' | 'After 12' | 'NO BREAK')[];
  e15Statuses?: ('Positive' | 'Negative')[];
  e5Statuses?: ('Positive' | 'Negative')[];
  selectedEdgeEntryIndex?: number;
  // Optional Opposite fields
  oppositeOptionTypes?: ('CE' | 'PE')[];
  oppositeEdgeId?: string;
  oppositeSelectedEdgeEntryIndex?: number;
  // --- Initial Condition ---
  resultType: 'Win' | 'Loss';
  currentSideStructure: string[];
  oppositeSideStructure: string[];
  targetFormulaIds?: string[];
  parameters?: Array<{ key: string; value: string; }>;
  notes?: string;
  // --- Follow-up Actions (Conditional) ---
  winFollowUp?: {
    notes?: string;
    nextEdgeId?: string;
    selectedEdgeEntryIndex?: number;
    trendTargetStatus?: string;
    trendTargetFormulaIds?: string[];
    trendTargetParameters?: Array<{ key: string; value: string; }>;
    trendTarget2Status?: string;
    trendTarget2FormulaIds?: string[];
    trendTarget2Parameters?: Array<{ key: string; value: string; }>;
  };
  lossFollowUp?: {
    nextEdgeId?: string;
    selectedEdgeEntryIndex?: number;
  };
  oppositeFollowUp?: { // New field for opposite follow-up
    notes?: string;
    nextEdgeId?: string;
    selectedEdgeEntryIndex?: number;
    trendTargetStatus?: string;
    trendTargetFormulaIds?: string[];
    trendTargetParameters?: Array<{ key: string; value: string; }>;
  };
  t3Condition?: 'T(3) >= S(15)' | 'S(15) > T(3)';
}

export interface LogicalEdgeFlowFormData extends Omit<LogicalEdgeFlow, 'id' | 'selectedEdgeEntryIndex' | 'oppositeSelectedEdgeEntryIndex'> {
    selectedEdgeEntryIndex?: string;
    oppositeSelectedEdgeEntryIndex?: string;
    winFollowUp?: Omit<NonNullable<LogicalEdgeFlow['winFollowUp']>, 'selectedEdgeEntryIndex'> & {
        selectedEdgeEntryIndex?: string;
    };
    lossFollowUp?: Omit<NonNullable<LogicalEdgeFlow['lossFollowUp']>, 'selectedEdgeEntryIndex'> & {
        selectedEdgeEntryIndex?: string;
    };
    oppositeFollowUp?: Omit<NonNullable<LogicalEdgeFlow['oppositeFollowUp']>, 'selectedEdgeEntryIndex'> & {
      selectedEdgeEntryIndex?: string;
    };
}


export interface DayActivityDetails {
  reason?: string;
  changes?: Record<string, { before: any; after: any }>;
  notes?: string;
  [key: string]: any;
}

export interface DayActivity {
  id: string;
  timestamp: string; // ISO string
  event: string;
  category: 'Engine' | 'Risk' | 'Settings' | 'Bulk Action';
  details?: DayActivityDetails;
  cancellationData?: {
    order: LiveOrder;
    reason: string;
  };
  isArchived?: boolean;
  isEdited?: boolean;
  originalState?: {
    event: string;
    details?: DayActivityDetails;
    cancellationData?: {
        order: LiveOrder;
        reason: string;
    };
  };
}

export interface DayType {
  id: string;
  name: string;
  conditions: string[];
}

export interface DayTypeFormData {
  name: string;
  conditions: string[];
}

export interface BreakSide {
  id: string;
  name: string;
}
export interface BreakSideFormData {
    name: string;
}

export interface EmaStatus {
  id: string;
  name: string;
}
export interface EmaStatusFormData {
  name: string;
}
export interface Ema5Status {
  id: string;
  name: string;
}
export interface Ema5StatusFormData {
  name: string;
}


export interface OpeningObservation {
  id: string;
  name: string;
}

export interface OpeningObservationFormData {
  name: string;
}

export interface First5MinClose {
  id: string;
  name: string;
}
export interface First5MinCloseFormData {
    name: string;
}

export interface First15MinClose {
  id: string;
  name: string;
}
export interface First15MinCloseFormData {
  name: string;
}


export interface CandleConfirmation {
  id: string;
  name: string;
}

export interface CandleConfirmationFormData {
  name: string;
}

export interface IbClose {
  id: string;
  name: string;
}

export interface IbCloseFormData extends Omit<IbClose, 'id'> {}

export interface IbBreak {
  id: string;
  name: string;
}

export interface IbBreakFormData extends Omit<IbBreak, 'id'> {}

export interface InitialLow {
  id: string;
  name: string;
}
export interface InitialLowFormData extends Omit<InitialLow, 'id'> {}

export interface CprSize {
  id: string;
  name: string;
}

export interface CprSizeFormData {
  name: string;
}

export interface PriceSensitivity {
  id: string;
  name: string;
}
export interface PriceSensitivityFormData extends Omit<PriceSensitivity, 'id'> {}

export interface Btst {
  id: string;
  name: string;
}
export interface BtstFormData extends Omit<Btst, 'id'> {}

export type LinkEntryConditionType =
  | 'Day Type'
  | 'E(15)'
  | 'E(5)'
  | '1st 15 Min Open'
  | '1st 5 Min Close'
  | '1st 15 Min Close'
  | 'Candle Confirmation'
  | 'IB Close'
  | 'IB Break'
  | 'CPR Size'
  | 'Price Sensitivity'
  | 'Initial Low'
  | 'BTST'
  | 'BREAK SIDE'
  | 'Custom';


export interface TradingFlow {
  id: string;
  name: string;
  conditions: Array<{
    conditionType: Exclude<LinkEntryConditionType, 'Custom'>;
    selectedConditionId: string;
  }>;
  trendEdgeIds?: string[];
  oppositeEdgeIds?: string[];
  
  trendTargetStatus?: string;
  trendTargetFormulaIds?: string[];
  trendTargetParameters?: Array<{key: string; value: string;}>;
  
  trendTarget2Status?: string;
  trendTarget2FormulaIds?: string[];
  trendTarget2Parameters?: Array<{key: string; value: string;}>;
  
  oppositeTargetStatus?: string;
  oppositeTargetFormulaIds?: string[];
  oppositeTargetParameters?: Array<{key: string; value: string;}>;

  oppositeTarget2Status?: string;
  oppositeTarget2FormulaIds?: string[];
  oppositeTarget2Parameters?: Array<{key: string; value: string;}>;
}

export interface TradingFlowFormData extends Omit<TradingFlow, 'id'> {}


export interface TradeLogEntry {
  timestamp: string; // ISO string
  event: string;
  notes?: string;
  details?: {
    changes?: Record<string, { before: any; after: any }>;
    [key: string]: any;
  };
}

export interface EdgeEntry {
  id: string;
  name: string;
  entryFormulaIds?: string[];
  stopLossFormulaIds?: string[];
  targetFormulaIds?: string[];
}

export type EdgeCategory = 'Trend Side' | 'Opposite Side' | 'Short Edge';

export interface Edge {
  id: string;
  name: string;
  category: EdgeCategory;
  shortEdgeSubType?: 'Trend Side' | 'Opposite Side';
  description?: string;
  rules?: string[];
  entries?: EdgeEntry[];
  // Condition Mappings
  dayTypeIds?: string[];
  emaStatusIds?: string[];
  ema5StatusIds?: string[];
  openingObservationIds?: string[];
  first5MinCloseIds?: string[];
  first15MinCloseIds?: string[];
  candleConfirmationIds?: string[];
  ibCloseIds?: string[];
  ibBreaks?: string[];
  initialLowIds?: string[];
  cprSizeIds?: string[];
  priceSensitivities?: string[];
  btstIds?: string[];
  breakSideIds?: string[];
}

export type ExpiryType = 'Expiry' | 'Non-Expiry';
export type IndexType = 'NIFTY' | 'SENSEX';
export type PositionType = 'Long' | 'Short';
export type RulesFollowedStatus = "RULES FOLLOW" | "PARTIALLY FOLLOW" | "NOT FOLLOW" | "MISS THE ENTRY" | "Divergence Flow";

export interface Formula {
  id: string;
  name: string;
  type: 'normal-entry' | 'breakout-entry' | 'stop-loss' | 'target';
  subType?: 'Regular' | 'Structure Change';
  positionType: 'Long' | 'Short' | 'Both';
  description?: string;
}

export type PsychologyRuleCategory = 'DAILY' | 'FUNDAMENTAL RULES' | 'NEW PSYCHOLOGY TIPS' | 'TECHNICAL ERRORS' | 'EMOTIONS';

export interface PsychologyRule {
  id: string;
  text: string;
  category: PsychologyRuleCategory;
}

export interface PsychologyRuleFormData {
  text: string;
  category: PsychologyRuleCategory;
}

export interface TradingBookEntry {
  id: string;
  title: string;
  content: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface TradingBookEntryFormData {
  title: string;
  content: string;
  createdAtDate: Date;
  createdAtHours: string;
  createdAtMinutes: string;
}

export interface Trade {
  id: string;
  parentId?: string;
  positionType: PositionType;
  index: IndexType; 
  strikePrice: string; 
  entryPrice: number;
  exitPrice?: number; 
  quantity: number;
  entryTime: string; // ISO string
  exitTime?: string; // ISO string
  strategyId: string; 
  rulesFollowed?: RulesFollowedStatus;
  notes?: string;
  expiryType: ExpiryType;
  entryFormulaId: string;
  stopLossFormulaIds: string[];
  targetFormulaIds: string[];
  exitFormulaId?: string; // ID of the formula that triggered the exit
  screenshotDataUri?: string;
  sl: number;
  target: number;
  result: 'Target Hit' | 'SL Hit' | 'Manual Exit - Profit Taken' | 'Manual Exit - Loss Taken' | 'Booked in the Middle';
  source: 'manual' | 'automated' | 'historical';
  log?: TradeLogEntry[];
  executionMode?: TradeLoggingMode;
  closeMode?: TradeLoggingMode;
  sourceEdgeEntryIndex?: number;
  isPartialModified?: boolean;
  technicalErrorIds?: string[];
  emotionIds?: string[];
  // Kept for legacy data, but new data should use index/strikePrice
  symbol?: string; 
  // Calculated fields
  pnl?: number;
  outcome?: 'Win' | 'Loss' | 'Breakeven' | 'Open';
  sourceFlowId?: string;
}

interface BaseTradeFormData {
  entryFormulaId: string;
  entryPrice: string;
  stopLossFormulaIds: string[];
  targetFormulaIds: string[];
  sl: string;
  target: string;
  result: 'Target Hit' | 'SL Hit';
  exitPrice?: string; 
}

export interface TradeFormData extends BaseTradeFormData {
  positionType: PositionType;
  index: IndexType; 
  strikePrice: string; 
  quantity: string;
  entryTime: string; // Stored from initialData for edits
  entryTimeDate: Date;
  entryTimeHours?: string;
  entryTimeMinutes?: string;
  exitTimeDate?: Date; 
  exitTimeHours?: string; 
  exitTimeMinutes?: string; 
  strategyId: string;
  rulesFollowed?: RulesFollowedStatus;
  notes?: string;
  expiryType: ExpiryType;
  screenshotDataUri?: string; 
}

export interface EdgeFormData extends Omit<Edge, 'id'> {
  // All fields from Edge are included, no need to redefine
}

export interface FormulaFormData {
  name: string;
  type: 'normal-entry' | 'breakout-entry' | 'stop-loss' | 'target';
  subType?: 'Regular' | 'Structure Change';
  positionType: 'Long' | 'Short' | 'Both';
  description?: string;
}

export interface DailyCandlestickData {
  date: string; 
  open: number;
  high: number;
  low: number;
  close: number;
  rangeForBar: [number, number]; 
}

export interface DailyProfitLossDataPoint {
  date: string;
  dailyProfit: number;
  dailyLoss: number; 
}

export interface DailyPerformanceStat {
  pnl: number;
  tradeCount: number;
}

export type CandlestickAggregationLevel = 'trade' | 'day' | 'week' | 'month' | 'year';

// Sorting types
export type SortDirection = 'asc' | 'desc';

export type SortableTradeKeys = 
  | keyof Pick<Trade, 'positionType' | 'index' | 'strikePrice' | 'entryPrice' | 'exitPrice' | 'quantity' | 'pnl' | 'entryTime' | 'exitTime' | 'expiryType' | 'rulesFollowed' | 'screenshotDataUri' | 'outcome' | 'sl' | 'result' | 'target' | 'source' | 'entryFormulaId' | 'log' | 'stopLossFormulaIds' | 'targetFormulaIds'>
  | 'strategyName' 
  | 'entryFormulaName' 
  | 'stopLossFormulaName'
  | 'targetFormulaName'
  | 'durationValue'
  | 'symbol'; // keep symbol for sorting legacy data

export interface SortConfigItem {
  key: SortableTradeKeys;
  direction: SortDirection;
}

export type SortConfig = SortConfigItem[];

// Automation Types
export type AutomationEngineStatus = 'IDLE' | 'RUNNING' | 'STOPPING';
export type OrderStatus = 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'REJECTED' | 'CANCELLED_BY_BROKER';
export type PositionStatus = 'OPEN' | 'CLOSED';

export type LiveOrderType = 'LIMIT' | 'MARKET' | 'SL-LMT';

export interface LiveOrder {
  id: string;
  symbol: string;
  index: IndexType;
  strikePrice: string;
  type: LiveOrderType;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  triggerPrice?: number;
  status: OrderStatus;
  createdAt: string; // ISO string
  edgeName: string;
  slPrice?: number;
  tpPrice?: number;
  strategyId?: string;
  entryFormulaIds?: string[];
  stopLossFormulaIds?: string[];
  targetFormulaIds?: string[];
  expiryType?: ExpiryType;
  source: 'manual' | 'automated';
  log?: TradeLogEntry[];
  sourceEdgeEntryIndex?: number;
  sourceFlowId?: string;
}

export interface PendingPullbackOrder {
  id: string;
  originalTrade: Trade;
  nextEntryIndex: number;
  edge: Edge;
}

export interface TimeBlock {
  id: string;
  time: string; // HH:mm format
  conditionType: LinkEntryConditionType | '';
  conditionId: string;
  customConditionName?: string;
  isRecurring: boolean;
  isAlarmOn: boolean;
  isFrozen: boolean;
  dailyOverrides?: { [date: string]: string }; // E.g., { '2023-10-27': 'condId123' }
}

export interface DailyPlan {
  date: string; // YYYY-MM-DD format
  blocks: TimeBlock[];
}

export type GlobalEventType = 'High Impact' | 'Medium Impact' | 'Low Impact' | 'Holiday';

export interface GlobalEvent {
  id: string;
  name: string;
  type: GlobalEventType;
  date: string; // YYYY-MM-DD format
  time?: string; // HH:mm format, optional
}

export interface ComparisonMetrics {
  totalPnl: number;
  winLossRatio: number;
  riskRewardRatio: number;
  profitFactor: number;
  tradeCount: number;
  wins: number;
  losses: number;
  grossProfit: number;
  grossLoss: number;
}


export interface AppContextType {
  tradingMode: TradingMode;
  setTradingMode: (mode: TradingMode) => void;
  trades: Trade[];
  allTrades: Record<TradingMode, Trade[]>;
  openPositions: Trade[];
  closedPositionsForJournal: Trade[];
  getOpenOrders: () => LiveOrder[];
  addLiveOrder: (order: LiveOrder) => void;
  cancelLiveOrder: (orderId: string) => void;
  edges: Record<TradingMode, Edge[]>;
  formulas: Record<TradingMode, Formula[]>;
  psychologyRules: PsychologyRule[];
  tradingBookEntries: TradingBookEntry[];
  dayActivities: DayActivity[];
  dayTypes: DayType[];
  breakSides: BreakSide[];
  addBreakSide: (data: BreakSideFormData) => void;
  updateBreakSide: (entry: BreakSide) => void;
  deleteBreakSide: (entryId: string) => void;
  emaStatuses: EmaStatus[];
  ema5Statuses: Ema5Status[];
  addEma5Status: (data: Ema5StatusFormData) => void;
  updateEma5Status: (entry: Ema5Status) => void;
  deleteEma5Status: (entryId: string) => void;
  openingObservations: OpeningObservation[];
  first5MinCloses: First5MinClose[];
  first15MinCloses: First15MinClose[];
  candleConfirmations: CandleConfirmation[];
  ibCloses: IbClose[];
  ibBreaks: IbBreak[];
  initialLows: InitialLow[];
  addInitialLow: (data: InitialLowFormData) => void;
  updateInitialLow: (entry: InitialLow) => void;
  deleteInitialLow: (entryId: string) => void;
  cprSizes: CprSize[];
  priceSensitivities: PriceSensitivity[];
  btsts: Btst[];
  addBtst: (data: BtstFormData) => void;
  updateBtst: (entry: Btst) => void;
  deleteBtst: (entryId: string) => void;
  tradingFlows: TradingFlow[];
  addTradingFlow: (data: TradingFlowFormData) => void;
  updateTradingFlow: (flow: TradingFlow) => void;
  deleteTradingFlow: (flowId: string) => void;
  duplicateTradingFlow: (flowId: string) => void;
  logicalEdgeFlows: LogicalEdgeFlow[];
  addLogicalEdgeFlow: (data: LogicalEdgeFlowFormData) => void;
  updateLogicalEdgeFlow: (flow: LogicalEdgeFlow) => void;
  deleteLogicalEdgeFlow: (flowId: string) => void;
  bulkAddLogicalEdgeFlows: (flows: LogicalEdgeFlow[]) => void;
  pendingPullbackOrders: PendingPullbackOrder[];
  addPendingPullbackOrder: (pullbackData: Omit<PendingPullbackOrder, 'id'>) => void;
  clearPendingPullbackOrder: (pullbackId: string) => void;
  entryAlerts: EntryAlert[];
  addEntryAlert: (alert: Omit<EntryAlert, 'id'>) => void;
  clearEntryAlert: (alertId: string) => void;
  addPriceSensitivity: (data: PriceSensitivityFormData) => void;
  updatePriceSensitivity: (entry: PriceSensitivity) => void;
  deletePriceSensitivity: (entryId: string) => void;
  addFirst5MinClose: (data: First5MinCloseFormData) => void;
  updateFirst5MinClose: (entry: First5MinClose) => void;
  deleteFirst5MinClose: (entryId: string) => void;
  addFirst15MinClose: (data: First15MinCloseFormData) => void;
  updateFirst15MinClose: (entry: First15MinClose) => void;
  deleteFirst15MinClose: (entryId: string) => void;
  addCprSize: (data: CprSizeFormData) => void;
  updateCprSize: (cprSize: CprSize) => void;
  deleteCprSize: (cprSizeId: string) => void;
  addIbClose: (data: IbCloseFormData) => void;
  updateIbClose: (ibClose: IbClose) => void;
  deleteIbClose: (ibCloseId: string) => void;
  addIbBreak: (data: IbBreakFormData) => void;
  updateIbBreak: (ibBreak: IbBreak) => void;
  deleteIbBreak: (ibBreakId: string) => void;
  addCandleConfirmation: (data: CandleConfirmationFormData) => void;
  updateCandleConfirmation: (confirmation: CandleConfirmation) => void;
  deleteCandleConfirmation: (confirmationId: string) => void;
  addOpeningObservation: (data: OpeningObservationFormData) => void;
  updateOpeningObservation: (observation: OpeningObservation) => void;
  deleteOpeningObservation: (observationId: string) => void;
  addEmaStatus: (emaStatusData: EmaStatusFormData) => void;
  updateEmaStatus: (emaStatus: EmaStatus) => void;
  deleteEmaStatus: (emaStatusId: string) => void;
  addDayType: (dayTypeData: DayTypeFormData) => void;
  updateDayType: (dayType: DayType) => void;
  deleteDayType: (dayTypeId: string) => void;
  longTradeLimit: number;
  shortTradeLimit: number;
  setTradeLimits: (limits: { long: number; short: number }, reason: string) => void;
  addDayActivity: (event: string, category: DayActivity['category'], details?: DayActivityDetails, cancellationData?: DayActivity['cancellationData']) => void;
  updateDayActivity: (activityId: string, updates: { event?: string; notes?: string }) => void;
  setActivityArchived: (activityId: string, isArchived: boolean) => void;
  deleteActivityPermanently: (activityId: string) => void;
  addTrade: (tradeData: Omit<Trade, 'id' | 'pnl' | 'outcome'>) => Trade;
  addHistoricalTrade: (values: TradeFormData) => void;
  updateTrade: (updatedTradeData: Trade, mode?: TradeLoggingMode) => void;
  deleteTrade: (tradeId: string) => void;
  bulkDeleteTrades: (tradeIds: string[]) => void;
  bulkAddTrades: (trades: Omit<Trade, 'id' | 'pnl' | 'outcome'>[]) => void;
  addEdge: (edge: EdgeFormData) => void;
  duplicateEdge: (edgeId: string) => void;
  updateEdge: (edge: Edge) => void;
  deleteEdge: (edgeId: string) => void;
  addFormula: (formulaData: FormulaFormData) => void;
  updateFormula: (formula: Formula) => void;
  deleteFormula: (formulaId: string) => void;
  addPsychologyRule: (ruleData: PsychologyRuleFormData) => void;
  updatePsychologyRule: (rule: PsychologyRule) => void;
  deletePsychologyRule: (ruleId: string) => void;
  addTradingBookEntry: (entryData: Omit<TradingBookEntry, 'id' | 'updatedAt'>) => void;
  updateTradingBookEntry: (entry: TradingBookEntry) => void;
  deleteTradingBookEntry: (entryId: string) => void;
  isLoading: boolean;
  getAllDataAsJson: () => string;
  importBackup: (file: File) => void;
  dailyPlans: DailyPlan[];
  updateDailyPlan: (plan: DailyPlan) => void;
  recurringBlocks: TimeBlock[];
  addRecurringBlock: (block: Omit<TimeBlock, 'id'>) => TimeBlock;
  updateRecurringBlock: (block: TimeBlock) => void;
  deleteRecurringBlock: (blockId: string) => void;
  updateRecurringBlockOverrides: (blockId: string, dateKey: string, conditionId: string) => void;
  globalEvents: GlobalEvent[];
  addGlobalEvent: (eventData: Omit<GlobalEvent, 'id' | 'time'> & { time?: string }) => void;
  updateGlobalEvent: (updatedEvent: GlobalEvent) => void;
  deleteGlobalEvent: (eventId: string) => void;
  updateTargetsForOpenPositions: (flow: LogicalEdgeFlow, followUpType?: 'win' | 'opposite') => void;
  logicalBlocksState: LogicalBlocksDailyState;
  updateLogicalBlocksState: (date: string, newState: LogicalBlocksFormState) => void;
}
