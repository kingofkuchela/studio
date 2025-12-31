
"use client";

import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis, Legend, Tooltip } from 'recharts';
import { startOfDay, endOfDay, isBefore, parseISO, eachDayOfInterval, startOfToday, subDays, format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import MainLayout from '@/components/layout/MainLayout';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardSignature, CheckCircle, Percent } from 'lucide-react';
import AdvancedDateRangePicker from '@/components/shared/AdvancedDateRangePicker';
import { ChartConfig, ChartContainer } from '@/components/ui/chart';

type ConditionType = 'Day Type' | 'E(15)' | 'E(5)' | '1st 15 Min Open' | '1st 5 Min Close' | '1st 15 Min Close' | 'Candle Confirmation' | 'IB Close' | 'IB Break' | 'CPR Size' | 'Price Sensitivity' | 'Initial Low' | 'BTST' | 'BREAK SIDE' | 'Custom' | '';

interface AbstractReportStats {
  totalDueBlocks: number;
  totalConfirmedBlocks: number;
  overallConfirmationRate: number;
  byType: Record<ConditionType, { due: number; confirmed: number; rate: number }>;
}

const calculateAbstractReport = (
  blocksToAnalyze: any[],
  dateRange: DateRange | undefined,
): AbstractReportStats => {
  const today = startOfToday();
  const range: Date[] = dateRange?.from ? eachDayOfInterval({
    start: startOfDay(dateRange.from),
    end: endOfDay(dateRange.to || dateRange.from),
  }) : [];

  const pastDaysInRange = range.filter(day => isBefore(day, today));
  
  let totalDueBlocks = 0;
  let totalConfirmedBlocks = 0;
  const byType: Record<string, { due: number; confirmed: number }> = {};

  for (const day of pastDaysInRange) {
    const dateKey = format(day, 'yyyy-MM-dd');
    for (const block of blocksToAnalyze) {
      const conditionType = block.conditionType || 'Custom';
      if (!byType[conditionType]) {
        byType[conditionType] = { due: 0, confirmed: 0 };
      }
      
      byType[conditionType].due++;
      totalDueBlocks++;

      if (block.dailyOverrides && block.dailyOverrides[dateKey]) {
        byType[conditionType].confirmed++;
        totalConfirmedBlocks++;
      }
    }
  }

  const finalByType: Record<string, { due: number, confirmed: number, rate: number }> = {};
  for (const type in byType) {
    const { due, confirmed } = byType[type];
    finalByType[type] = {
      due,
      confirmed,
      rate: due > 0 ? (confirmed / due) * 100 : 0,
    };
  }

  return {
    totalDueBlocks,
    totalConfirmedBlocks,
    overallConfirmationRate: totalDueBlocks > 0 ? (totalConfirmedBlocks / totalDueBlocks) * 100 : 0,
    byType: finalByType as Record<ConditionType, { due: number; confirmed: number; rate: number }>,
  };
};

const RadialChartCard = ({ title, percentage, description }: { title: string; percentage: number; description: string }) => {
    const chartData = [{ name: title, value: percentage, fill: 'hsl(var(--primary))' }];
    return (
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col items-center justify-center">
            <CardHeader className="items-center pb-2">
                <CardTitle className="font-headline text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center p-4">
                <ResponsiveContainer width={200} height={150}>
                    <RadialBarChart
                        innerRadius="70%"
                        outerRadius="100%"
                        barSize={12}
                        data={chartData}
                        startAngle={90}
                        endAngle={-270}
                    >
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar
                            background={{ fill: 'hsl(var(--muted))' }}
                            dataKey="value"
                            cornerRadius={10}
                        />
                        <Tooltip
                            content={({ payload }) => {
                                if (payload && payload.length) {
                                    return (
                                        <div className="p-2 bg-background/90 border rounded-md shadow-lg">
                                            <p className="font-bold">{`${payload[0].value?.toFixed(1)}%`}</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-4xl font-bold font-din-numbers">
                            {`${Math.round(percentage)}%`}
                        </text>
                    </RadialBarChart>
                </ResponsiveContainer>
                <p className="text-sm text-muted-foreground text-center mt-2">{description}</p>
            </CardContent>
        </Card>
    );
};

export default function AbstractReportPage() {
    const { recurringBlocks, isLoading, tradingMode } = useAppContext();
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    const reportStats = useMemo(() => {
        const blocksToAnalyze = recurringBlocks || [];
        if (!dateRange) {
             const today = new Date();
             const defaultRange = { from: startOfDay(subDays(today, 29)), to: endOfDay(today) };
             return calculateAbstractReport(blocksToAnalyze, defaultRange);
        }
        return calculateAbstractReport(blocksToAnalyze, dateRange);
    }, [recurringBlocks, dateRange]);
    
    const conditionTypeStats = useMemo(() => 
        Object.entries(reportStats.byType)
            .map(([type, data]) => ({ type: type as ConditionType, ...data }))
            .filter(item => item.due > 0)
            .sort((a,b) => b.rate - a.rate),
    [reportStats.byType]);

    if (isLoading) {
        return (
            <MainLayout>
                <Skeleton className="h-10 w-3/4 mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64" />)}
                </div>
            </MainLayout>
        );
    }
    
    return (
        <MainLayout>
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-headline font-bold flex items-center gap-3">
                            <ClipboardSignature className="h-8 w-8 text-primary" />
                            Abstract Report
                        </h2>
                        <p className="text-muted-foreground mt-1">
                            An overview of your discipline in confirming daily time blocks.
                        </p>
                    </div>
                    <AdvancedDateRangePicker value={dateRange} onValueChange={setDateRange} />
                </div>

                <Card className="shadow-2xl bg-gradient-to-br from-card to-muted/30">
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">Overall Confirmation Rate</CardTitle>
                        <CardDescription>The percentage of recurring blocks that were confirmed in the selected period (excluding today).</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center p-6">
                        <RadialChartCard
                            title="Discipline Score"
                            percentage={reportStats.overallConfirmationRate}
                            description={`${reportStats.totalConfirmedBlocks} of ${reportStats.totalDueBlocks} past blocks confirmed.`}
                        />
                    </CardContent>
                </Card>

                <div>
                    <h3 className="text-2xl font-headline font-semibold mb-4">Confirmation by Condition Type</h3>
                    {conditionTypeStats.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                            {conditionTypeStats.map(({ type, rate, due, confirmed }) => (
                                <RadialChartCard
                                    key={type}
                                    title={type}
                                    percentage={rate}
                                    description={`${confirmed} of ${due} confirmed`}
                                />
                            ))}
                        </div>
                    ) : (
                         <Card className="shadow-lg">
                            <CardContent className="p-10 text-center">
                                <p className="text-muted-foreground">No recurring blocks were due in the selected past date range.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
