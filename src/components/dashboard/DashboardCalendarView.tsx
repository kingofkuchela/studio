
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import type { DayPicker, DayProps } from 'react-day-picker';
import { useAppContext } from '@/contexts/AppContext';
import { generateDailyPerformanceStats } from '@/lib/tradeCalculations';
import type { DailyPerformanceStat } from '@/types';
import { format, startOfDay, parseISO } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';

interface DashboardCalendarViewProps {
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
}

export default function DashboardCalendarView({ isExpanded, onToggleExpand, className: classNameProp }: DashboardCalendarViewProps) {
  const { allTrades, isLoading: appContextIsLoading, tradingMode } = useAppContext();
  const [dailyStats, setDailyStats] = useState<Record<string, DailyPerformanceStat>>({});
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfDay(new Date()));
  const [isLoading, setIsLoading] = useState(true);

  const trades = React.useMemo(() => {
    if (tradingMode === 'both') {
      return [...(allTrades.real || []), ...(allTrades.theoretical || [])];
    }
    return allTrades[tradingMode] || [];
  }, [allTrades, tradingMode]);

  useEffect(() => {
    if (!appContextIsLoading && trades) { // Guard clause added here
      const stats = generateDailyPerformanceStats(trades);
      setDailyStats(stats);
      setIsLoading(false);
    }
  }, [trades, appContextIsLoading]);

  function CustomDayContent(props: DayProps) {
    if (!props.displayMonth) {
      return <div />;
    }
    const isOutsideMonth = props.displayMonth.getMonth() !== props.date.getMonth();
    
    if (isOutsideMonth) {
      return <div className="flex flex-col items-start justify-start text-left w-full h-full rounded-md bg-transparent" />;
    }

    const buttonProps = (props as any).buttonProps || {} as React.ButtonHTMLAttributes<HTMLButtonElement>;
    const dateStr = format(props.date, 'yyyy-MM-dd');
    const stat = dailyStats[dateStr];

    // Determine base styling
    let dayBaseBackground = "bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200/70 dark:hover:bg-slate-700/50";
    let pnlTextEffectiveColor = "text-slate-700 dark:text-slate-300";
    let dateNumberEffectiveColor = "text-slate-700 dark:text-slate-300";
    let tradeCountEffectiveColor = "text-slate-600 dark:text-slate-400";
    
    // Apply conditional styles
    if (!props.disabled) {
      if (stat) { // Day has trades
        if (stat.pnl > 0) {
          dayBaseBackground = "bg-green-300 dark:bg-green-800/70 hover:bg-green-400/80 dark:hover:bg-green-700/80";
          pnlTextEffectiveColor = "text-green-900 dark:text-green-100";
          dateNumberEffectiveColor = "text-green-800 dark:text-green-100";
          tradeCountEffectiveColor = "text-green-800 dark:text-green-100";
        } else if (stat.pnl < 0) {
          dayBaseBackground = "bg-red-300 dark:bg-red-800/70 hover:bg-red-400/80 dark:hover:bg-red-700/80";
          pnlTextEffectiveColor = "text-red-900 dark:text-red-100";
          dateNumberEffectiveColor = "text-red-800 dark:text-red-100";
          tradeCountEffectiveColor = "text-red-800 dark:text-red-100";
        } else { // PnL is 0
          dayBaseBackground = "bg-gray-300 dark:bg-gray-600/70 hover:bg-gray-400/80 dark:hover:bg-gray-500/80";
          pnlTextEffectiveColor = "text-gray-900 dark:text-gray-100";
          dateNumberEffectiveColor = "text-gray-800 dark:text-gray-200";
          tradeCountEffectiveColor = "text-gray-800 dark:text-gray-200";
        }
      } else { // No trades, check for weekend
        const dayOfWeek = props.date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
          dayBaseBackground = "bg-sky-100 dark:bg-sky-900/60 hover:bg-sky-200/80 dark:hover:bg-sky-800/70";
          dateNumberEffectiveColor = "text-sky-800 dark:text-sky-200";
        }
      }
    } else { // Disabled days
      dayBaseBackground = "bg-muted/30 dark:bg-muted/20 opacity-60";
      dateNumberEffectiveColor = "text-muted-foreground opacity-60";
    }

    return (
      <button
        {...buttonProps}
        type="button"
        className={cn(
          buttonProps.className,
          "flex flex-col items-start justify-start text-left px-2 py-1 focus:outline-none w-full h-full rounded-md transition-colors duration-150",
          dayBaseBackground
        )}
        disabled={props.disabled}
      >
        {/* Date Number */}
        <div className={cn("text-xs sm:text-sm", dateNumberEffectiveColor)}>
          {format(props.date, 'd')}
        </div>
        
        {/* P&L Info or Placeholder */}
        {stat ? (
          <div className="mt-1 leading-tight text-left">
            <p className={cn("text-lg sm:text-xl font-semibold", pnlTextEffectiveColor)}>
              {formatCurrency(stat.pnl, { maximumFractionDigits: 0 })}
            </p>
            <p className={cn(tradeCountEffectiveColor, "text-xs sm:text-sm")}>
              {stat.tradeCount} {stat.tradeCount === 1 ? 'Trade' : 'Trades'}
            </p>
          </div>
        ) : (
          <div className="opacity-0 mt-1 leading-tight text-left select-none pointer-events-none">
            {/* Invisible placeholder to maintain cell height */}
            <p className="text-lg sm:text-xl font-semibold">
              {formatCurrency(0, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs sm:text-sm">0 Trades</p>
          </div>
        )}
      </button>
    );
  }

  if (isLoading) {
    return (
      <Card className={cn("shadow-lg w-full", classNameProp)}>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent className="p-0">
          <Skeleton className="h-[600px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "shadow-lg",
      isExpanded
        ? "fixed inset-x-0 bottom-0 top-[60px] z-40 lg:left-[280px] rounded-none border-none overflow-y-auto flex flex-col bg-background" 
        : "w-full relative",
      classNameProp
    )}>
      <CardHeader className={cn("flex flex-row items-center justify-between", isExpanded && "sticky top-0 bg-background z-10 border-b pb-2")}>
        <CardTitle className="font-headline text-xl">Trading Calendar</CardTitle>
        {onToggleExpand && (
          <Button variant="ghost" size="icon" onClick={onToggleExpand} className="h-8 w-8">
            {isExpanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            <span className="sr-only">{isExpanded ? "Hide Calendar" : "Expand Calendar"}</span>
          </Button>
        )}
      </CardHeader>
      <CardContent className={cn("p-2", isExpanded && "flex-grow")}>
        <Calendar
          mode="default"
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          formatters={{
            formatWeekdayName: (date) => format(date, 'EEE') 
          }}
          components={{
            IconLeft: () => <ChevronLeft className="h-5 w-5" />,
            IconRight: () => <ChevronRight className="h-5 w-5" />,
            Day: CustomDayContent,
          }}
          numberOfMonths={isExpanded ? 2 : 1}
          className={cn("p-0", isExpanded && "w-full")}
          classNames={{
            months: cn("flex flex-row gap-x-8 gap-y-4 justify-center", isExpanded && "flex-wrap"),
            table: "w-full border-separate border-spacing-1 table-fixed", 
            caption: "flex justify-center pt-1 pb-3 relative items-center",
            caption_label: "font-headline text-xl",
            nav: "space-x-1 flex items-center",
            nav_button: cn(
              "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 focus-visible:ring-1 focus-visible:ring-ring rounded-md"
            ),
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            head_row: "w-full", 
            head_cell: "text-center text-muted-foreground rounded-md border border-border bg-card dark:bg-muted/20 font-semibold text-sm p-2",
            row: "w-full", 
            cell: cn("p-0 relative border border-border rounded-md"), 
            day: cn(
              isExpanded ? "h-32 sm:h-36 md:h-40" : "h-28 sm:h-32 md:h-36",
              "rounded-md", 
              "focus-visible:ring-1 focus-visible:ring-ring" 
            ),
            day_selected: "!bg-primary !text-primary-foreground !border-primary-foreground dark:!border-primary", 
            day_today: "ring-2 ring-primary dark:ring-primary-foreground ring-offset-background dark:ring-offset-2",
            day_disabled: "pointer-events-none text-muted-foreground opacity-50",
            day_outside: "invisible", 
          }}
          showOutsideDays={false}
          fixedWeeks
        />
      </CardContent>
    </Card>
  );
}
