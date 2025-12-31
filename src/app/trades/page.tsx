
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import TradeList from '@/components/trade/TradeList';
import TradeForm from '@/components/trade/TradeForm';
import DeleteConfirmationDialog from '@/components/shared/DeleteConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, Download, CalendarIcon, RotateCcw, Upload, Trash2, Camera } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import type { Trade, Edge, Formula, IndexType, PositionType, ExpiryType, RulesFollowedStatus, SortConfig, SortableTradeKeys, SortDirection, TradeLogEntry, TradeFormData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { exportTradesToCsv } from '@/lib/csvExporter';
import { Skeleton } from '@/components/ui/skeleton';
import MultiSelectFilterDropdown from '@/components/shared/MultiSelectFilterDropdown';
import type { DateRange } from 'react-day-picker';
import { format, parseISO, min as dateMin, max as dateMax, startOfDay, endOfDay, isBefore, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TradeImportDialog from '@/components/trade/TradeImportDialog';
import TradeLogDialog from '@/components/trade/TradeLogDialog';
import { Badge } from '@/components/ui/badge';
import AdvancedDateRangePicker from '@/components/shared/AdvancedDateRangePicker';


const indexTypeOptions: { id: IndexType; name: IndexType }[] = [
  { id: 'NIFTY', name: 'NIFTY' },
  { id: 'SENSEX', name: 'SENSEX' },
];
const positionTypeOptions: { id: PositionType; name: PositionType }[] = [
  { id: 'Long', name: 'Long' },
  { id: 'Short', name: 'Short' },
];
const expiryTypeOptions: { id: ExpiryType; name: ExpiryType }[] = [
  { id: 'Expiry', name: 'Expiry' },
  { id: 'Non-Expiry', name: 'Non-Expiry' },
];

export default function TradesPage() {
  const { allTrades, tradingMode, edges, formulas: allFormulas, addHistoricalTrade, updateTrade, deleteTrade: contextDeleteTrade, bulkDeleteTrades, isLoading } = useAppContext();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | undefined>(undefined);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tradeToDelete, setTradeToDelete] = useState<Trade | null>(null);

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [viewingLogForTrade, setViewingLogForTrade] = useState<Trade | null>(null);


  // Filter states
  const [globalDateRange, setGlobalDateRange] = useState<DateRange | undefined>(undefined);
  const [filteredTradesToDisplay, setFilteredTradesToDisplay] = useState<Trade[]>([]);
  
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
  const [selectedRulesFollowedStatusIds, setSelectedRulesFollowedStatusIds] = useState<RulesFollowedStatus[]>([]);
  const [selectedEntryFormulaIds, setSelectedEntryFormulaIds] = useState<string[]>([]);
  const [selectedExitFormulaIds, setSelectedExitFormulaIds] = useState<string[]>([]);
  const [selectedIndexTypeIds, setSelectedIndexTypeIds] = useState<IndexType[]>([]);
  const [selectedPositionTypeIds, setSelectedPositionTypeIds] = useState<PositionType[]>([]);
  const [selectedExpiryTypeIds, setSelectedExpiryTypeIds] = useState<ExpiryType[]>([]);

  // Bulk action state
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);


  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig>([{ key: 'entryTime', direction: 'desc' }]);

  const formulas = useMemo(() => allFormulas[tradingMode] || [], [allFormulas, tradingMode]);

  const entryFormulas = useMemo(() => formulas.filter(f => f.type === 'normal-entry' || f.type === 'breakout-entry'), [formulas]);
  const stopLossFormulas = useMemo(() => formulas.filter(f => f.type === 'stop-loss'), [formulas]);
  const targetFormulas = useMemo(() => formulas.filter(f => f.type === 'target-index' || f.type === 'target-option'), [formulas]);
  const optionEdges = useMemo(() => edges[tradingMode] || [], [edges, tradingMode]);

  // Determine the base set of trades based on the trading mode
  const baseTradesForMode = useMemo(() => {
    if (tradingMode === 'both') {
      const combinedTrades = [...allTrades.real, ...allTrades.theoretical];
      const uniqueTrades = Array.from(new Map(combinedTrades.map(t => [t.id, t])).values());
      return uniqueTrades;
    }
    return allTrades[tradingMode];
  }, [allTrades, tradingMode]);

  const rulesFollowedFilterOptions = useMemo(() => {
    let options: RulesFollowedStatus[] = [];
    if (tradingMode === 'real') {
        options = ["RULES FOLLOW", "PARTIALLY FOLLOW", "NOT FOLLOW", "Divergence Flow"];
    } else if (tradingMode === 'theoretical') {
        options = ["RULES FOLLOW", "PARTIALLY FOLLOW", "ENTRY MISS", "Divergence Flow"];
    } else { // 'both' mode
        options = ["RULES FOLLOW", "PARTIALLY FOLLOW", "NOT FOLLOW", "ENTRY MISS", "Divergence Flow"];
    }
    return options.map(r => ({ id: r, name: r }));
  }, [tradingMode]);


  const cascadingFilters = useMemo(() => {
    if (isLoading) {
      return {
        optionEdgesWithCount: [],
        rulesFollowedFilterOptionsWithCount: [],
        entryFormulasWithCount: [],
        exitFormulaGroups: [],
        indexTypeOptionsWithCount: [],
        positionTypeOptionsWithCount: [],
        expiryTypeOptionsWithCount: [],
        preDateFilteredTrades: []
      };
    }

    const applyFilters = (tradesToFilter: Trade[], exclude: string[] = []) => {
      let tempTrades = [...tradesToFilter];
      if (selectedStrategyIds.length > 0 && !exclude.includes('strategyId'))
        tempTrades = tempTrades.filter(t => t.strategyId && selectedStrategyIds.includes(t.strategyId));
      if (selectedRulesFollowedStatusIds.length > 0 && !exclude.includes('rulesFollowed'))
        tempTrades = tempTrades.filter(t => t.rulesFollowed && selectedRulesFollowedStatusIds.includes(t.rulesFollowed));
      if (selectedEntryFormulaIds.length > 0 && !exclude.includes('entryFormulaId'))
        tempTrades = tempTrades.filter(t => t.entryFormulaId && selectedEntryFormulaIds.includes(t.entryFormulaId));
      if (selectedExitFormulaIds.length > 0 && !exclude.includes('exitFormulas'))
        tempTrades = tempTrades.filter(t => 
            t.exitFormulaId && selectedExitFormulaIds.includes(t.exitFormulaId) ||
            t.stopLossFormulaIds?.some(id => selectedExitFormulaIds.includes(id)) ||
            t.targetFormulaIds?.some(id => selectedExitFormulaIds.includes(id))
        );
      if (selectedIndexTypeIds.length > 0 && !exclude.includes('index'))
        tempTrades = tempTrades.filter(t => t.index && selectedIndexTypeIds.includes(t.index));
      if (selectedPositionTypeIds.length > 0 && !exclude.includes('positionType'))
        tempTrades = tempTrades.filter(t => selectedPositionTypeIds.includes(t.positionType));
      if (selectedExpiryTypeIds.length > 0 && !exclude.includes('expiryType'))
        tempTrades = tempTrades.filter(t => selectedExpiryTypeIds.includes(t.expiryType));
      return tempTrades;
    };

    const createOptions = (baseTrades: Trade[], key: keyof Trade, allOptions: { id: string, name: string }[], exclude: string[]) => {
      const filtered = applyFilters(baseTrades, exclude);
      const availableIds = new Set(filtered.map(t => t[key]).filter(Boolean));
      return allOptions.filter(opt => availableIds.has(opt.id)).map(opt => ({
        id: opt.id,
        name: `${opt.name} (${filtered.filter(t => t[key] === opt.id).length})`
      }));
    };

    const createExitFormulaOptions = (baseTrades: Trade[], exclude: string[]) => {
        const filtered = applyFilters(baseTrades, exclude);
        const availableSlIds = new Set(filtered.flatMap(t => t.stopLossFormulaIds || []));
        const availableTargetIds = new Set(filtered.flatMap(t => t.targetFormulaIds || []));
        const availableExitFormulaIds = new Set(filtered.map(t => t.exitFormulaId).filter(Boolean));
        
        const slOpts = stopLossFormulas
            .filter(f => availableSlIds.has(f.id) || availableExitFormulaIds.has(f.id))
            .map(f => ({ id: f.id, name: `${f.name} (${filtered.filter(t => t.stopLossFormulaIds?.includes(f.id) || t.exitFormulaId === f.id).length})` }));
        
        const targetOpts = targetFormulas
            .filter(f => availableTargetIds.has(f.id) || availableExitFormulaIds.has(f.id))
            .map(f => ({ id: f.id, name: `${f.name} (${filtered.filter(t => t.targetFormulaIds?.includes(f.id) || t.exitFormulaId === f.id).length})` }));

        return [
            { label: 'Stop Loss Formulas', options: slOpts },
            { label: 'Target Formulas', options: targetOpts },
        ].filter(g => g.options.length > 0);
    };

    return {
      optionEdgesWithCount: createOptions(baseTradesForMode, 'strategyId', optionEdges, ['strategyId']),
      rulesFollowedFilterOptionsWithCount: createOptions(baseTradesForMode, 'rulesFollowed', rulesFollowedFilterOptions, ['rulesFollowed']),
      entryFormulasWithCount: createOptions(baseTradesForMode, 'entryFormulaId', entryFormulas, ['entryFormulaId']),
      indexTypeOptionsWithCount: createOptions(baseTradesForMode, 'index', indexTypeOptions, ['index']),
      positionTypeOptionsWithCount: createOptions(baseTradesForMode, 'positionType', positionTypeOptions, ['positionType']),
      expiryTypeOptionsWithCount: createOptions(baseTradesForMode, 'expiryType', expiryTypeOptions, ['expiryType']),
      exitFormulaGroups: createExitFormulaOptions(baseTradesForMode, ['exitFormulas']),
      preDateFilteredTrades: applyFilters(baseTradesForMode)
    };
  }, [baseTradesForMode, isLoading, edges, formulas, selectedStrategyIds, selectedRulesFollowedStatusIds, selectedEntryFormulaIds, selectedExitFormulaIds, selectedIndexTypeIds, selectedPositionTypeIds, selectedExpiryTypeIds, rulesFollowedFilterOptions, optionEdges, entryFormulas, stopLossFormulas, targetFormulas]);

  // Effect to initialize date range
  useEffect(() => {
    if (!isLoading && baseTradesForMode.length > 0 && globalDateRange === undefined) {
      const validEntryTimes = baseTradesForMode.map(t => parseISO(t.entryTime)).filter(d => !isNaN(d.getTime()));
      const validExitTimes = baseTradesForMode
        .map(t => t.exitTime ? parseISO(t.exitTime) : null)
        .filter((d): d is Date => d !== null && !isNaN(d.getTime()));

      const allRelevantDates = [...validEntryTimes, ...validExitTimes];

      if (allRelevantDates.length > 0) {
        const fromDate = dateMin(allRelevantDates);
        const toDate = dateMax(allRelevantDates);
        setGlobalDateRange({ from: fromDate, to: toDate });
      } else if (baseTradesForMode.length > 0 && validEntryTimes.length > 0) { 
        const fromDate = dateMin(validEntryTimes);
        const toDate = dateMax(validEntryTimes);
        setGlobalDateRange({ from: fromDate, to: toDate});
      }
    }
  }, [isLoading, baseTradesForMode, globalDateRange]);

  // Effect to apply date filter
  useEffect(() => {
    let trades = [...cascadingFilters.preDateFilteredTrades];
    if (globalDateRange?.from || globalDateRange?.to) {
        trades = trades.filter(trade => {
            if (trade.outcome === 'Open') {
                const entryDate = parseISO(trade.entryTime);
                const fromOk = globalDateRange.from ? !isBefore(entryDate, startOfDay(globalDateRange.from)) : true;
                const toOk = globalDateRange.to ? !isAfter(entryDate, endOfDay(globalDateRange.to)) : true;
                return fromOk && toOk;
            } else if (trade.exitTime) { 
                const exitDate = parseISO(trade.exitTime);
                const fromOkExit = globalDateRange.from ? !isBefore(exitDate, startOfDay(globalDateRange.from)) : true;
                const toOkExit = globalDateRange.to ? !isAfter(exitDate, endOfDay(globalDateRange.to)) : true;
                return fromOkExit && toOkExit;
            }
            return trade.outcome === 'Open'; 
        });
    }
    setFilteredTradesToDisplay(trades);
  }, [cascadingFilters.preDateFilteredTrades, globalDateRange]);

  // Effect to clear selection when filters change
  useEffect(() => {
    setSelectedTradeIds([]);
  }, [filteredTradesToDisplay]);


  const handleSort = (key: SortableTradeKeys) => {
    setSortConfig(currentSortConfig => {
      const keyIndex = currentSortConfig.findIndex(sc => sc.key === key);
      let newSortConfig = [...currentSortConfig];

      if (keyIndex > -1) { // Key already in sortConfig
        if (newSortConfig[keyIndex].direction === 'asc') {
          newSortConfig[keyIndex].direction = 'desc'; // Toggle to desc
        } else {
          newSortConfig.splice(keyIndex, 1); // Remove if it was desc
        }
      } else { // New key, add it as ascending
        newSortConfig.push({ key, direction: 'asc' });
      }
      return newSortConfig;
    });
  };

  const sortedTrades = useMemo(() => {
    if (!sortConfig.length) return filteredTradesToDisplay;

    // Helper to get value, handling derived properties
    const getValue = (trade: Trade, sortKey: SortableTradeKeys, direction: SortDirection) => {
      if (sortKey === 'strategyName') return edges[tradingMode].find(s => s.id === trade.strategyId)?.name;
      if (sortKey === 'entryFormulaName') return formulas.find(f => f.id === trade.entryFormulaId)?.name;
      if (sortKey === 'stopLossFormulaName') {
        const exitFormula = trade.exitFormulaId ? formulas.find(f => f.id === trade.exitFormulaId) : undefined;
        if (exitFormula && exitFormula.type === 'stop-loss') return exitFormula.name;
        return trade.stopLossFormulaIds?.map(id => formulas.find(f => f.id === id)?.name).filter(Boolean).join(', ');
      }
      if (sortKey === 'targetFormulaName') {
        const exitFormula = trade.exitFormulaId ? formulas.find(f => f.id === trade.exitFormulaId) : undefined;
        if (exitFormula && exitFormula.type.startsWith('target-')) return exitFormula.name;
        return trade.targetFormulaIds?.map(id => formulas.find(f => f.id === id)?.name).filter(Boolean).join(', ');
      }
      if (sortKey === 'durationValue') {
        if (!trade.exitTime || trade.outcome === 'Open') return direction === 'asc' ? Infinity : -Infinity;
        try {
          return parseISO(trade.exitTime).getTime() - parseISO(trade.entryTime).getTime();
        } catch { return direction === 'asc' ? Infinity : -Infinity; }
      }
      if (sortKey === 'pnl') return trade.pnl ?? (trade.outcome === 'Open' ? (direction === 'asc' ? Infinity : -Infinity) : 0);
      if (sortKey === 'exitTime' && trade.outcome === 'Open') return direction === 'asc' ? Infinity : -Infinity;
      if (sortKey === 'screenshotDataUri') return trade.screenshotDataUri ? 1 : 0;
      if (sortKey === 'outcome') return trade.outcome ?? 'Open';

      return trade[sortKey as keyof Trade];
    };
    
    return [...filteredTradesToDisplay].sort((a, b) => {
      for (const { key, direction } of sortConfig) {
        let valA = getValue(a, key, direction);
        let valB = getValue(b, key, direction);

        // Consistent null/undefined handling: place them at the end for asc, start for desc
        const nullSortVal = direction === 'asc' ? 1 : -1;
        if (valA == null && valB != null) return nullSortVal;
        if (valA != null && valB == null) return -nullSortVal;
        if (valA == null && valB == null) continue;

        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else if ((key === 'entryTime' || key === 'exitTime') && valA !== Infinity && valA !== -Infinity && valB !== Infinity && valB !== -Infinity) {
          try {
            comparison = parseISO(valA as string).getTime() - parseISO(valB as string).getTime();
          } catch { comparison = 0; }
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        }
  
        if (comparison !== 0) {
          return direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }, [filteredTradesToDisplay, sortConfig, edges, formulas, tradingMode]);


  const handleAddTrade = () => {
    setEditingTrade(undefined);
    setIsFormOpen(true);
  };

  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setIsFormOpen(true);
  };

  const handleDeleteTrade = (trade: Trade) => {
    setTradeToDelete(trade);
    setIsDeleteDialogOpen(true);
  };
  
  const handleBulkDelete = () => {
    if (selectedTradeIds.length > 0) {
      setIsBulkDeleteDialogOpen(true);
    }
  };

  const confirmDeleteTrade = () => {
    if (tradeToDelete) {
      contextDeleteTrade(tradeToDelete.id);
      const description = tradeToDelete.symbol 
        ? `Trade ${tradeToDelete.symbol} deleted successfully.` 
        : "Trade deleted successfully.";
      toast({ title: "Success", description });
      setTradeToDelete(null);
    }
    setIsDeleteDialogOpen(false);
  };

  const confirmBulkDelete = () => {
    bulkDeleteTrades(selectedTradeIds);
    toast({
      title: "Success",
      description: `${selectedTradeIds.length} trade(s) deleted successfully.`,
    });
    setSelectedTradeIds([]);
    setIsBulkDeleteDialogOpen(false);
  };

  const handleFormSubmit = (values: TradeFormData) => {
    if (editingTrade) {
        const newLogEntry: TradeLogEntry = {
            timestamp: new Date().toISOString(),
            event: 'Trade Edited',
            notes: 'Manual correction of trade details.',
        };
        const updatedTradeObject: Trade = {
            ...editingTrade,
            ...values,
            log: [...(editingTrade.log || []), newLogEntry],
            screenshotDataUri: values.screenshotDataUri,
        };
        updateTrade(updatedTradeObject);
        toast({ title: "Success", description: "Trade updated successfully." });
    } else {
        addHistoricalTrade(values);
        toast({ title: "Success", description: "Historical trade added successfully." });
    }
    setIsFormOpen(false);
    setEditingTrade(undefined);
  };

  const handleExportCsv = () => {
    if(sortedTrades.length === 0) {
        toast({ title: "No Data", description: "There are no trades to export based on current filters.", variant: "destructive" });
        return;
    }
    exportTradesToCsv(sortedTrades, optionEdges, formulas);
    toast({ title: "Exported", description: "Filtered trades exported to CSV successfully." });
  };

  const handleResetAllFilters = () => {
    setGlobalDateRange(undefined); 
    setSelectedStrategyIds([]);
    setSelectedRulesFollowedStatusIds([]);
    setSelectedEntryFormulaIds([]);
    setSelectedExitFormulaIds([]);
    setSelectedIndexTypeIds([]);
    setSelectedPositionTypeIds([]);
    setSelectedExpiryTypeIds([]);
    setSortConfig([{ key: 'entryTime', direction: 'desc' }]); // Reset sort to default
  };

  const ResetButton = () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            onClick={handleResetAllFilters} 
            className="h-9 px-3 bg-accent text-accent-foreground border border-input hover:bg-accent/90">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Reset All Filters & Sorting</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
  
  const filterBarContent = (
    <div className="flex items-center justify-end gap-2">
      <MultiSelectFilterDropdown
        filterNameSingular="Edge"
        filterNamePlural="Edges"
        options={cascadingFilters.optionEdgesWithCount}
        selectedIds={selectedStrategyIds}
        onSelectionChange={setSelectedStrategyIds}
      />
      <MultiSelectFilterDropdown
        filterNameSingular="Rule Status"
        filterNamePlural="Rule Statuses"
        options={cascadingFilters.rulesFollowedFilterOptionsWithCount}
        selectedIds={selectedRulesFollowedStatusIds}
        onSelectionChange={setSelectedRulesFollowedStatusIds as (ids: string[]) => void}
      />
      <MultiSelectFilterDropdown
        filterNameSingular="Entry Formula"
        filterNamePlural="Entry Formulas"
        options={cascadingFilters.entryFormulasWithCount}
        selectedIds={selectedEntryFormulaIds}
        onSelectionChange={setSelectedEntryFormulaIds}
      />
      <MultiSelectFilterDropdown
        filterNameSingular="Exit Formula"
        filterNamePlural="Exit Formulas"
        optionGroups={cascadingFilters.exitFormulaGroups}
        selectedIds={selectedExitFormulaIds}
        onSelectionChange={setSelectedExitFormulaIds}
      />
      <MultiSelectFilterDropdown
        filterNameSingular="Index Type"
        filterNamePlural="Index Types"
        options={cascadingFilters.indexTypeOptionsWithCount}
        selectedIds={selectedIndexTypeIds}
        onSelectionChange={setSelectedIndexTypeIds as (ids: string[]) => void}
      />
      <MultiSelectFilterDropdown
        filterNameSingular="Expiry Type"
        filterNamePlural="Expiry Types"
        options={cascadingFilters.expiryTypeOptionsWithCount}
        selectedIds={selectedExpiryTypeIds}
        onSelectionChange={setSelectedExpiryTypeIds as (ids: string[]) => void}
      />
      <MultiSelectFilterDropdown
        filterNameSingular="Position Type"
        filterNamePlural="Position Types"
        options={cascadingFilters.positionTypeOptionsWithCount}
        selectedIds={selectedPositionTypeIds}
        onSelectionChange={setSelectedPositionTypeIds as (ids: string[]) => void}
      />
      <AdvancedDateRangePicker value={globalDateRange} onValueChange={setGlobalDateRange} />
    </div>
  );

  const loadingFilterBarContent = (
    <div className="flex items-center justify-end gap-2">
      {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-9 w-[110px]" />)}
      <Skeleton className="h-9 w-full sm:w-[300px]" /> 
    </div>
  );


  if (isLoading) {
    return (
      <MainLayout headerCenterContent={<Skeleton className="h-9 w-24" />} headerRightContent={loadingFilterBarContent}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-12" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        <Skeleton className="h-[300px] w-full" />
      </MainLayout>
    );
  }

  return (
    <MainLayout headerCenterContent={<ResetButton />} headerRightContent={filterBarContent}>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <h2 className="text-2xl font-headline font-semibold">My Trades</h2>
        <div className="flex gap-2">
           <Button onClick={handleBulkDelete} variant="destructive" disabled={selectedTradeIds.length === 0}>
             <Trash2 className="mr-2 h-4 w-4" />
             Delete Selected ({selectedTradeIds.length})
           </Button>
          <Button onClick={() => setIsImportDialogOpen(true)} variant="outline">
            <Upload className="mr-2 h-4 w-4" /> Import CSV
          </Button>
          <Button onClick={handleExportCsv} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={handleAddTrade} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="mr-2 h-4 w-4" /> Log New Trade
          </Button>
        </div>
      </div>

      <TradeList 
        trades={sortedTrades} 
        edges={optionEdges} 
        formulas={formulas}
        onEdit={handleEditTrade} 
        onDelete={(tradeId) => {
            const trade = baseTradesForMode.find(t => t.id === tradeId); 
            if (trade) handleDeleteTrade(trade);
        }}
        onViewLog={setViewingLogForTrade}
        sortConfig={sortConfig}
        onSort={handleSort}
        totalRecords={sortedTrades.length}
        selectedTradeIds={selectedTradeIds}
        onSelectedTradeIdsChange={setSelectedTradeIds}
        tradingMode={tradingMode}
      />
      
      <TradeLogDialog 
        isOpen={!!viewingLogForTrade} 
        onClose={() => setViewingLogForTrade(null)}
        trade={viewingLogForTrade}
      />

      <TradeImportDialog 
        isOpen={isImportDialogOpen} 
        onClose={() => setIsImportDialogOpen(false)} 
      />

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
              setEditingTrade(undefined);
              setIsFormOpen(false);
          } else {
              setIsFormOpen(true);
          }
      }}>
        <DialogContent className="sm:max-w-[600px] md:max-w-[750px] lg:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingTrade ? 'Edit Trade' : 'Log New Trade'}</DialogTitle>
            <DialogDescription>
              {editingTrade ? 'Update the details of your trade.' : 'Enter the details for your new trade.'}
            </DialogDescription>
          </DialogHeader>
          <TradeForm
            edges={optionEdges}
            formulas={formulas}
            onSubmit={handleFormSubmit}
            onCancel={() => {
                setIsFormOpen(false);
                setEditingTrade(undefined);
            }}
            initialData={editingTrade}
            tradingMode={tradingMode}
          />
        </DialogContent>
      </Dialog>

      {tradeToDelete && (
        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setTradeToDelete(null)}
          onConfirm={confirmDeleteTrade}
          itemName={tradeToDelete.symbol ? `trade for ${tradeToDelete.symbol}` : 'this trade'}
        />
      )}
      <DeleteConfirmationDialog
          isOpen={isBulkDeleteDialogOpen}
          onClose={() => setIsBulkDeleteDialogOpen(false)}
          onConfirm={confirmBulkDelete}
          itemName={`${selectedTradeIds.length} trade(s)`}
        />
    </MainLayout>
  );
}
