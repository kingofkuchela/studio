
"use client";

import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Trade } from '@/types';
import { format, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, Minus, Hourglass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const ActivityItem: React.FC<{ trade: Trade; dateType: 'entry' | 'exit' }> = ({ trade, dateType }) => {
  const dateToShow = dateType === 'entry' || !trade.exitTime ? trade.entryTime : trade.exitTime;
  const formattedDate = format(parseISO(dateToShow), "MMM d");
  
  const pnl = trade.pnl ?? 0;
  let pnlColor = 'text-muted-foreground';
  let PnlIcon = Minus;

  if (trade.outcome === 'Open') {
    pnlColor = 'text-blue-500'; 
    PnlIcon = Hourglass; 
  } else if (pnl > 0) {
    pnlColor = 'text-green-600';
    PnlIcon = TrendingUp;
  } else if (pnl < 0) {
    pnlColor = 'text-red-600';
    PnlIcon = TrendingDown;
  }

  let detailsText = "";
  const hasIndex = !!trade.index;
  const hasSymbol = !!trade.symbol;
  const hasStrike = !!trade.strikePrice;

  if (hasIndex) {
      detailsText = trade.index!;
      if (hasSymbol && trade.symbol !== trade.index) {
          detailsText += ` / ${trade.symbol}`;
      }
  } else if (hasSymbol) {
      detailsText = trade.symbol!;
  }

  if (hasStrike) {
      if (detailsText) {
          detailsText += ` @ ${trade.strikePrice}`;
      } else {
          detailsText = String(trade.strikePrice!); 
      }
  }
  
  if (!detailsText && hasSymbol) { 
    detailsText = trade.symbol!;
  } else if (!detailsText) {
    detailsText = "Trade Details N/A"; // More descriptive if symbol is also missing
  }


  return (
    <div className="flex items-center py-3 border-b border-border last:border-b-0 text-xs sm:text-sm">
      {/* Column 1: Date */}
      <div className="w-[70px] flex-shrink-0 text-muted-foreground pr-2">
        {formattedDate}
      </div>

      {/* Column 2: Details */}
      <div className="flex-1 min-w-0 px-1">
        <p className="font-medium text-foreground truncate" title={detailsText}>
          {detailsText}
        </p>
      </div>

      {/* Column 3: P&L */}
      <div className={cn("w-[75px] flex-shrink-0 font-semibold flex items-center justify-end pl-2", pnlColor)}>
        <PnlIcon className="mr-1 h-4 w-4 flex-shrink-0" />
        <span>{trade.outcome === 'Open' ? 'Open' : pnl.toFixed(2)}</span>
      </div>
    </div>
  );
};


export default function DashboardActivityFeed() {
  const { trades, isLoading } = useAppContext();
  const [activeTab, setActiveTab] = useState("recent");

  const recentTrades = useMemo(() => {
    return [...trades]
      .filter(trade => trade.outcome !== 'Open' && trade.exitTime)
      .sort((a, b) => parseISO(b.exitTime!).getTime() - parseISO(a.exitTime!).getTime())
      .slice(0, 9);
  }, [trades]);

  const openPositions = useMemo(() => {
    return trades
      .filter(trade => trade.outcome === 'Open')
      .sort((a, b) => parseISO(b.entryTime).getTime() - parseISO(a.entryTime).getTime())
      .slice(0, 9);
  }, [trades]);


  if (isLoading) {
    return (
      <Card className="shadow-lg h-full">
        <CardHeader className="pb-2">
           <Skeleton className="h-7 w-1/3 mb-3" />
           <div className="flex space-x-2">
             <Skeleton className="h-9 w-24" />
             <Skeleton className="h-9 w-28" />
           </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-1">
            {[...Array(9)].map((_, i) => (
              <div key={`sk-item-${i}`} className="flex items-center py-3 border-b border-border last:border-b-0 text-xs sm:text-sm">
                <div className="w-[70px] flex-shrink-0 pr-2">
                  <Skeleton className="h-4 w-full" />
                </div>
                <div className="flex-1 min-w-0 px-1">
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="w-[75px] flex-shrink-0 pl-2 flex justify-end">
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-headline font-semibold">Trade Activity</CardTitle>
          <TabsList className="grid w-full grid-cols-2 mt-2">
            <TabsTrigger value="recent">Recent Trades</TabsTrigger>
            <TabsTrigger value="open">Open Positions</TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent className="pt-0 flex-grow overflow-hidden">
          <TabsContent value="recent" className="h-full overflow-y-auto pt-2">
            {recentTrades.length > 0 ? (
              recentTrades.map(trade => <ActivityItem key={`recent-${trade.id}`} trade={trade} dateType="exit" />)
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center h-full flex items-center justify-center">No recent trades.</p>
            )}
          </TabsContent>
          <TabsContent value="open" className="h-full overflow-y-auto pt-2">
            {openPositions.length > 0 ? (
              openPositions.map(trade => <ActivityItem key={`open-${trade.id}`} trade={trade} dateType="entry" />)
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center h-full flex items-center justify-center">No open positions.</p>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
