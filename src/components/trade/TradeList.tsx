
"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, Edit2, Trash2, TrendingUp, TrendingDown, Minus, 
  Hourglass, Camera, ChevronsUpDown, ArrowUp, ArrowDown,
  CheckCircle, XCircle, AlertTriangle, Bot, History, Pencil, Check, GitCompareArrows
} from 'lucide-react';
import type { Trade, Edge, Formula, SortConfig, SortableTradeKeys, TradingMode } from '@/types';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import { formatTradeDuration } from '@/lib/tradeCalculations';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


interface SortableTableHeadProps {
  sortKey: SortableTradeKeys;
  currentSortConfig: SortConfig;
  onSort: (key: SortableTradeKeys) => void;
  children: React.ReactNode;
  className?: string;
  isNumeric?: boolean;
}

const SortableTableHead: React.FC<SortableTableHeadProps> = ({ sortKey, currentSortConfig, onSort, children, className, isNumeric }) => {
  const sortItem = currentSortConfig.find(item => item.key === sortKey);
  const isActiveSort = !!sortItem;
  const sortIndex = isActiveSort ? currentSortConfig.findIndex(item => item.key === sortKey) + 1 : null;
  
  let IconToShow;
  if (sortItem) {
    IconToShow = sortItem.direction === 'asc' ? ArrowUp : ArrowDown;
  } else {
    IconToShow = ChevronsUpDown;
  }

  const iconDisplay = (
    <IconToShow className={cn(
      "h-3.5 w-3.5 shrink-0",
      isActiveSort ? "text-primary opacity-100" : "opacity-70"
    )} />
  );

  const badgeDisplay = sortIndex && (
    <Badge 
      variant={isActiveSort ? "default" : "secondary"} 
      className="text-xs h-4 px-1.5 tabular-nums"
    >
      {sortIndex}
    </Badge>
  );

  const textDisplay = (
    <span className={cn(isActiveSort && "text-primary font-semibold")}>
      {children}
    </span>
  );
  
  const contentOrder = isNumeric ? (
    <>
      <div className={cn("flex items-center gap-1", "shrink-0")}>
        {badgeDisplay}
        {iconDisplay}
      </div>
      {textDisplay}
    </>
  ) : (
    <>
      {textDisplay}
      <div className={cn("flex items-center gap-1 ml-auto shrink-0")}>
        {badgeDisplay}
        {iconDisplay}
      </div>
    </>
  );
  
  return (
    <TableHead 
      className={cn(
        "cursor-pointer select-none hover:bg-muted/20 p-0", 
        className,
        isActiveSort && "bg-primary/5 dark:bg-primary/10" // Subtle background for active sorted header
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className={cn(
        "flex items-center h-full w-full px-4",
         isNumeric ? "justify-end" : "justify-start"
      )}>
        {contentOrder}
      </div>
    </TableHead>
  );
};


interface TradeListProps {
  trades: Trade[];
  edges: Edge[];
  formulas: Formula[];
  onEdit: (trade: Trade) => void;
  onDelete: (tradeId: string) => void;
  onViewLog: (trade: Trade) => void;
  sortConfig: SortConfig;
  onSort: (key: SortableTradeKeys) => void;
  totalRecords: number;
  selectedTradeIds: string[];
  onSelectedTradeIdsChange: (ids: string[]) => void;
  tradingMode: TradingMode;
}

export default function TradeList({ trades, edges, formulas, onEdit, onDelete, onViewLog, sortConfig, onSort, totalRecords, selectedTradeIds, onSelectedTradeIdsChange, tradingMode }: TradeListProps) {
  const getEdgeName = (strategyId?: string) => {
    if (!strategyId) return 'N/A';
    const edge = edges.find(s => s.id === strategyId);
    return edge ? edge.name : 'Unknown Edge';
  };

  const getFormula = (formulaId?: string): Formula | undefined => {
    if (!formulaId) return undefined;
    return formulas.find(f => f.id === formulaId);
  };
  
  const getFormulaName = (formulaId?: string) => {
    return getFormula(formulaId)?.name ?? 'Unknown Formula';
  };
  
  const getFormulaNames = (formulaIds?: string[]) => {
    if (!formulaIds || formulaIds.length === 0) return '-';
    return formulaIds.map(id => getFormulaName(id)).join(', ');
  };

  const getOutcomeIcon = (trade: Trade) => {
    if (trade.outcome === 'Open') return <Hourglass className="h-4 w-4 text-blue-500" />;
    if (trade.pnl === undefined) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (trade.pnl > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trade.pnl < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };
  
  const getRulesFollowedDisplay = (trade: Trade) => {
    const baseClasses = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize";

    if (trade.rulesFollowed) {
        switch (trade.rulesFollowed) {
            case "RULES FOLLOW":
                return <div className={cn(baseClasses, "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200")}><CheckCircle className="h-3.5 w-3.5" /> <span>Followed</span></div>;
            case "NOT FOLLOW":
                return <div className={cn(baseClasses, "bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100")}><XCircle className="h-3.5 w-3.5" /> <span>Not</span></div>;
            case "PARTIALLY FOLLOW":
                return <div className={cn(baseClasses, "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200")}><AlertTriangle className="h-3.5 w-3.5" /> <span>Partial</span></div>;
            case "MISS THE ENTRY":
                 return <div className={cn(baseClasses, "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200")}><Bot className="h-3.5 w-3.5" /> <span>Entry Miss</span></div>;
            case "Divergence Flow":
                 return <div className={cn(baseClasses, "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200")}><GitCompareArrows className="h-3.5 w-3.5" /> <span>Divergence</span></div>;
        }
    }
    
    return <div className={cn(baseClasses, "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 normal-case")}>N/A</div>;
  };

  const isAllSelected = trades.length > 0 && selectedTradeIds.length === trades.length;
  const isSomeSelected = selectedTradeIds.length > 0 && !isAllSelected;

  return (
    <div className="rounded-lg border shadow-sm">
      <div className="px-4 pt-3 pb-2">
        <p className="text-sm text-muted-foreground">Total Records = {totalRecords}</p>
      </div>
      <Table>
        <TableCaption className="py-4">A list of your recent trades. Click column headers to sort.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px] px-2">
                <Checkbox
                    checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                    onCheckedChange={() => onSelectedTradeIdsChange(isAllSelected ? [] : trades.map(t => t.id))}
                    aria-label="Select all rows"
                />
            </TableHead>
            <TableHead className="w-[50px]">S.No.</TableHead>
            <SortableTableHead sortKey="source" currentSortConfig={sortConfig} onSort={onSort} className="w-[80px]">Source</SortableTableHead>
            <SortableTableHead sortKey="index" currentSortConfig={sortConfig} onSort={onSort}>Index</SortableTableHead>
            <SortableTableHead sortKey="strikePrice" currentSortConfig={sortConfig} onSort={onSort} className="text-right" isNumeric>Strike Price</SortableTableHead>
            <SortableTableHead sortKey="positionType" currentSortConfig={sortConfig} onSort={onSort}>Type</SortableTableHead>
            <SortableTableHead sortKey="strategyName" currentSortConfig={sortConfig} onSort={onSort}>Edge</SortableTableHead>
            <SortableTableHead sortKey="entryPrice" currentSortConfig={sortConfig} onSort={onSort} className="text-right" isNumeric>Entry Price</SortableTableHead>
            <SortableTableHead sortKey="exitPrice" currentSortConfig={sortConfig} onSort={onSort} className="text-right" isNumeric>Exit Price</SortableTableHead>
            <SortableTableHead sortKey="quantity" currentSortConfig={sortConfig} onSort={onSort} className="text-right" isNumeric>Qty</SortableTableHead>
            <SortableTableHead sortKey="pnl" currentSortConfig={sortConfig} onSort={onSort} className="text-right" isNumeric>P&amp;L</SortableTableHead>
            <SortableTableHead sortKey="entryTime" currentSortConfig={sortConfig} onSort={onSort}>Entry Time</SortableTableHead>
            <SortableTableHead sortKey="exitTime" currentSortConfig={sortConfig} onSort={onSort}>Exit Time</SortableTableHead>
            <SortableTableHead sortKey="durationValue" currentSortConfig={sortConfig} onSort={onSort}>Duration</SortableTableHead>
            <SortableTableHead sortKey="expiryType" currentSortConfig={sortConfig} onSort={onSort}>Expiry Type</SortableTableHead>
            <SortableTableHead sortKey="entryFormulaName" currentSortConfig={sortConfig} onSort={onSort}>Entry Formula</SortableTableHead>
            <SortableTableHead sortKey="stopLossFormulaName" currentSortConfig={sortConfig} onSort={onSort}>Stop Loss Formula</SortableTableHead>
            <SortableTableHead sortKey="targetFormulaName" currentSortConfig={sortConfig} onSort={onSort}>Target Formula</SortableTableHead>
            <SortableTableHead sortKey="rulesFollowed" currentSortConfig={sortConfig} onSort={onSort}>RULES FOLLOW</SortableTableHead>
            <SortableTableHead sortKey="sl" currentSortConfig={sortConfig} onSort={onSort} className="text-right" isNumeric>SL</SortableTableHead>
            <SortableTableHead sortKey="target" currentSortConfig={sortConfig} onSort={onSort} className="text-right" isNumeric>Target</SortableTableHead>
            <SortableTableHead sortKey="result" currentSortConfig={sortConfig} onSort={onSort}>Result</SortableTableHead>
            <TableHead className="text-center">Trade Journey</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.length === 0 && (
            <TableRow>
              <TableCell colSpan={26} className="h-24 text-center">
                No trades logged yet.
              </TableCell>
            </TableRow>
          )}
          {trades.map((trade, index) => {
            const exitFormula = getFormula(trade.exitFormulaId);
            const isExitedBySL = exitFormula?.type === 'stop-loss';
            const isExitedByTarget = exitFormula?.type.startsWith('target-');
            const manualChangesCount = trade.log?.filter(entry => entry.event.toLowerCase().includes('manual')).length ?? 0;
            const isFullyAutomated = manualChangesCount === 0 && (trade.log?.length ?? 0) > 0 && trade.source === 'automated';
            
            return (
              <TableRow key={trade.id} data-state={selectedTradeIds.includes(trade.id) ? "selected" : ""}>
                <TableCell className="px-2">
                  <Checkbox
                      checked={selectedTradeIds.includes(trade.id)}
                      onCheckedChange={(checked) => onSelectedTradeIdsChange(
                          checked
                          ? [...selectedTradeIds, trade.id]
                          : selectedTradeIds.filter((id) => id !== trade.id)
                      )}
                      aria-label={`Select trade ${trade.symbol || trade.id}`}
                  />
                </TableCell>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5" title={`Source: ${trade.source}`}>
                    {trade.source === 'automated' && <Bot className="h-4 w-4 text-primary" />}
                    <span>{trade.source === 'automated' ? 'Auto' : 'Manual'}</span>
                  </div>
                </TableCell>
                 <TableCell>{trade.index ?? 'N/A'}</TableCell>
                <TableCell className="text-right">{trade.strikePrice ?? 'N/A'}</TableCell>
                <TableCell>
                    <Badge variant="outline" className={cn(
                        trade.positionType === 'Long'
                        ? 'border-green-300 bg-green-100 text-green-800 dark:border-green-700 dark:bg-green-900/50 dark:text-green-200'
                        : 'border-red-300 bg-red-100 text-red-800 dark:border-red-700 dark:bg-red-900/50 dark:text-red-200'
                    )}>
                        {trade.positionType}
                    </Badge>
                </TableCell>
                <TableCell className="font-code">{getEdgeName(trade.strategyId)}</TableCell>
                <TableCell className="text-right">{formatCurrency(trade.entryPrice)}</TableCell>
                <TableCell className="text-right">{typeof trade.exitPrice === 'number' ? formatCurrency(trade.exitPrice) : 'N/A'}</TableCell>
                <TableCell className="text-right">{trade.quantity}</TableCell>
                <TableCell 
                  className={cn(
                    "text-right font-semibold", 
                    trade.outcome === 'Open' ? 'text-blue-500' : 
                    (trade.pnl ?? 0) > 0 ? 'text-green-600' : 
                    (trade.pnl ?? 0) < 0 ? 'text-red-600' : 'text-muted-foreground'
                  )}
                >
                  <div className="flex items-center justify-end">
                    {getOutcomeIcon(trade)}
                    <span className="ml-1">
                      {trade.outcome === 'Open' ? 'Open' : formatCurrency(trade.pnl)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{trade.entryTime ? format(parseISO(trade.entryTime), 'MMM d, yyyy HH:mm') : 'N/A'}</TableCell>
                <TableCell>{trade.exitTime ? format(parseISO(trade.exitTime), 'MMM d, yyyy HH:mm') : <span className="text-blue-500">Open</span>}</TableCell>
                <TableCell>{formatTradeDuration(trade.entryTime, trade.exitTime)}</TableCell>
                <TableCell>
                  <Badge variant={trade.expiryType === 'Expiry' ? 'default' : 'secondary'}>
                    {trade.expiryType}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[150px] truncate" title={getFormulaName(trade.entryFormulaId)}>{getFormulaName(trade.entryFormulaId)}</TableCell>
                
                <TableCell className="max-w-[150px] truncate">
                  <div className="flex flex-wrap gap-1">
                    {(trade.stopLossFormulaIds || []).length > 0 ? (
                      (trade.stopLossFormulaIds || []).map(id => (
                        <Badge
                          key={id}
                          variant={isExitedBySL && trade.exitFormulaId === id ? "destructive" : "secondary"}
                          className={cn(isExitedBySL && trade.exitFormulaId === id && "bg-red-600 text-white hover:bg-red-600/80")}
                          title={getFormulaName(id)}
                        >
                          {getFormulaName(id)}
                        </Badge>
                      ))
                    ) : (
                      "-"
                    )}
                  </div>
                </TableCell>
                
                <TableCell className="max-w-[150px] truncate">
                  <div className="flex flex-wrap gap-1">
                    {(trade.targetFormulaIds || []).length > 0 ? (
                      (trade.targetFormulaIds || []).map(id => (
                        <Badge
                          key={id}
                          variant={isExitedByTarget && trade.exitFormulaId === id ? "default" : "secondary"}
                          className={cn(isExitedByTarget && trade.exitFormulaId === id && "bg-green-600 text-white hover:bg-green-600/80")}
                          title={getFormulaName(id)}
                        >
                          {getFormulaName(id)}
                        </Badge>
                      ))
                    ) : (
                      "-"
                    )}
                  </div>
                </TableCell>

                <TableCell>{getRulesFollowedDisplay(trade)}</TableCell>
                <TableCell className="text-right">{formatCurrency(trade.sl)}</TableCell>
                <TableCell className="text-right">{formatCurrency(trade.target)}</TableCell>
                <TableCell className="max-w-[150px] truncate">
                  {trade.result ?? 'N/A'}
                </TableCell>
                <TableCell className="text-center">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => onViewLog(trade)}>
                                    {isFullyAutomated ? (
                                        <Bot className="h-4 w-4 text-green-500" />
                                    ) : manualChangesCount > 0 ? (
                                        <Badge variant="destructive" className="h-5">{manualChangesCount}</Badge>
                                    ) : (
                                        <History className="h-4 w-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {isFullyAutomated ? <p>Fully Automated</p> : <p>{manualChangesCount} manual change(s). Click to view log.</p>}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </TableCell>
                <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                        {trade.screenshotDataUri && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8"
                                            onClick={() => window.open(trade.screenshotDataUri!, '_blank')}
                                            aria-label="View screenshot"
                                        >
                                            <Camera className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>View Screenshot</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(trade)}>
                                <Edit2 className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(trade.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  );
}
