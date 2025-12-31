
"use client";

import React, { useMemo, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { History, Zap, ShieldAlert, Settings, Trash2, XCircle, ArrowRight, MoreHorizontal, Edit, Archive, ArchiveRestore } from 'lucide-react';
import type { DayActivity, DayActivityDetails } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import AdvancedDateRangePicker from '@/components/shared/AdvancedDateRangePicker';
import type { DateRange } from 'react-day-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import EditActivityDialog from '@/components/activity/EditActivityDialog';
import DeleteConfirmationDialog from '@/components/shared/DeleteConfirmationDialog';

const CategoryDisplay = ({ category }: { category: DayActivity['category'] }) => {
    const categoryMap = {
        Engine: { icon: Zap, color: 'text-cyan-600', bgColor: 'bg-cyan-100 dark:bg-cyan-900/50' },
        Risk: { icon: ShieldAlert, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/50' },
        Settings: { icon: Settings, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/50' },
        'Bulk Action': { icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/50' },
    };
    const { icon: Icon, color, bgColor } = categoryMap[category] || { icon: History, color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-700' };

    return (
        <Badge variant="outline" className={cn("gap-1.5", bgColor, color, "border-current/30")}>
            <Icon className="h-3.5 w-3.5" />
            <span className="font-semibold">{category}</span>
        </Badge>
    );
};

const ActivityDetails = ({ details }: { details: DayActivity['details'] }) => {
    if (!details) return null;

    if (typeof details === 'string') {
        return <p className="text-muted-foreground">{details}</p>;
    }

    const { changes, reason, notes } = details as DayActivityDetails;

    const formatKey = (key: string) => {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    };
    
    const formatValue = (key: string, value: any) => {
        const moneyKeys = ['pnl', 'risk', 'funds', 'amount'];
        if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)))) {
            if (moneyKeys.some(k => key.toLowerCase().includes(k))) {
                return formatCurrency(parseFloat(value));
            }
        }
        return String(value);
    }

    return (
        <div className="text-sm space-y-1">
            {notes && <p className="text-muted-foreground">{notes}</p>}
            {changes && (
                <div className="space-y-1 pt-1">
                    {Object.entries(changes).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                           <span className="font-semibold text-foreground">{formatKey(key)}:</span>
                           <span className="text-muted-foreground line-through">{formatValue(key, value.before)}</span>
                           <ArrowRight className="h-3 w-3 text-muted-foreground" />
                           <span className="font-medium text-foreground">{formatValue(key, value.after)}</span>
                        </div>
                    ))}
                </div>
            )}
            {reason && <p className="text-muted-foreground italic mt-2">Reason: "{reason}"</p>}
        </div>
    );
};


export default function ActivityPage() {
    const { dayActivities, isLoading, edges: allEdges, formulas: allFormulas, updateDayActivity, setActivityArchived, deleteActivityPermanently } = useAppContext();
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    // Dialog states
    const [activityToEdit, setActivityToEdit] = useState<DayActivity | null>(null);
    const [activityToArchive, setActivityToArchive] = useState<DayActivity | null>(null);
    const [activityToRestore, setActivityToRestore] = useState<DayActivity | null>(null);
    const [activityToDelete, setActivityToDelete] = useState<DayActivity | null>(null);

    const formulaMap = useMemo(() => new Map([...(allFormulas.real || []), ...(allFormulas.theoretical || [])].map(f => [f.id, f.name])), [allFormulas]);
    const edgeMap = useMemo(() => new Map([...(allEdges.real || []), ...(allEdges.theoretical || [])].map(e => [e.id, e.name])), [allEdges]);

    const filteredByDateActivities = useMemo(() => {
        if (!dayActivities) return [];
        if (dateRange && (dateRange.from || dateRange.to)) {
             return dayActivities.filter(activity => {
                try {
                    const activityDate = parseISO(activity.timestamp);
                    const fromOk = dateRange.from ? !isBefore(activityDate, startOfDay(dateRange.from)) : true;
                    const toOk = dateRange.to ? !isAfter(activityDate, endOfDay(dateRange.to)) : true;
                    return fromOk && toOk;
                } catch (e) {
                    return false;
                }
            });
        }
        return dayActivities;
    }, [dayActivities, dateRange]);


    const { activeRegular, activeCancelled, archived } = useMemo(() => {
        const active = filteredByDateActivities.filter(a => !a.isArchived);
        const archived = filteredByDateActivities.filter(a => a.isArchived).sort((a,b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());
        
        const regular: DayActivity[] = [];
        const cancelled: DayActivity[] = [];

        for (const activity of active) {
            if (activity.event.toLowerCase().includes('cancel') && activity.cancellationData) {
                cancelled.push(activity);
            } else {
                regular.push(activity);
            }
        }
        
        cancelled.sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());

        return { activeRegular: regular, activeCancelled: cancelled, archived };
    }, [filteredByDateActivities]);


    const groupedActivities = useMemo(() => {
        if (!activeRegular || activeRegular.length === 0) return {};
        return activeRegular.reduce((acc, activity) => {
            const dateKey = format(parseISO(activity.timestamp), 'yyyy-MM-dd');
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(activity);
            return acc;
        }, {} as Record<string, DayActivity[]>);
    }, [activeRegular]);

    const sortedDates = useMemo(() => {
        return Object.keys(groupedActivities).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }, [groupedActivities]);

    const handleUpdateActivity = (activityId: string, updates: { event?: string; notes?: string }) => {
        updateDayActivity(activityId, updates);
        setActivityToEdit(null);
    };

    const confirmArchive = () => {
        if (activityToArchive) {
            setActivityArchived(activityToArchive.id, true);
            setActivityToArchive(null);
        }
    };
    
    const confirmRestore = () => {
        if (activityToRestore) {
            setActivityArchived(activityToRestore.id, false);
            setActivityToRestore(null);
        }
    };

    const confirmDelete = () => {
        if (activityToDelete) {
            deleteActivityPermanently(activityToDelete.id);
            setActivityToDelete(null);
        }
    };

    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex justify-between items-center mb-6">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-9 w-full sm:w-[300px]" />
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-[300px] w-full" />
                    <Skeleton className="h-[200px] w-full" />
                </div>
            </MainLayout>
        );
    }
    
    const hasAnyActivity = sortedDates.length > 0 || activeCancelled.length > 0;
    const hasArchivedActivity = archived.length > 0;

    return (
        <MainLayout>
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-headline font-bold flex items-center gap-3">
                            <History className="h-8 w-8 text-primary" />
                            Day's Activity Log
                        </h2>
                        <p className="text-muted-foreground">
                            A historical log of crucial settings changes and actions, organized by date.
                        </p>
                    </div>
                    <AdvancedDateRangePicker value={dateRange} onValueChange={setDateRange} />
                </div>
                
                <Tabs defaultValue="active" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="active">Active Log</TabsTrigger>
                        <TabsTrigger value="archived">Archived Log</TabsTrigger>
                    </TabsList>
                    <TabsContent value="active" className="mt-6">
                        {!hasAnyActivity ? (
                            <Card className="shadow-lg">
                                <CardContent className="p-10 text-center">
                                    <p className="text-muted-foreground">No active logs for the selected period.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                {/* Main Activity Log */}
                                <div className="space-y-6">
                                    {sortedDates.length > 0 ? (
                                        sortedDates.map(date => (
                                            <Card key={date} className="shadow-lg">
                                                <CardHeader>
                                                    <CardTitle>{format(parseISO(date), "PPP")}</CardTitle>
                                                    <CardDescription>A log of actions performed on this day.</CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="rounded-md border">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead className="w-[180px]">Timestamp</TableHead>
                                                                    <TableHead className="w-[150px]">Category</TableHead>
                                                                    <TableHead>Event</TableHead>
                                                                    <TableHead>Details</TableHead>
                                                                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {groupedActivities[date].map(activity => (
                                                                    <TableRow key={activity.id}>
                                                                        <TableCell className="font-mono text-xs">{format(parseISO(activity.timestamp), "p")}</TableCell>
                                                                        <TableCell><CategoryDisplay category={activity.category} /></TableCell>
                                                                        <TableCell className="font-medium">
                                                                            {activity.event}
                                                                            {activity.isEdited && <Badge variant="outline" className="ml-2 font-normal text-xs border-amber-400 text-amber-600">Edited</Badge>}
                                                                        </TableCell>
                                                                        <TableCell><ActivityDetails details={activity.details} /></TableCell>
                                                                        <TableCell className="text-right">
                                                                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={()=>setActivityToEdit(activity)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem><DropdownMenuItem onClick={()=>setActivityToArchive(activity)}><Archive className="mr-2 h-4 w-4"/>Archive</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))
                                    ) : (
                                        <Card className="shadow-lg"><CardContent className="p-10 text-center"><p className="text-muted-foreground">No main activity has been logged for the selected period.</p></CardContent></Card>
                                    )}
                                </div>

                                {/* Cancelled Order Log */}
                                {activeCancelled.length > 0 && (
                                    <div className="space-y-6 pt-8">
                                        <Card className="shadow-lg">
                                            <CardHeader><CardTitle className="font-headline text-xl flex items-center gap-3"><XCircle className="h-6 w-6 text-destructive" />Cancelled Order Log</CardTitle><CardDescription>A historical log of all manually cancelled orders, with detailed context.</CardDescription></CardHeader>
                                            <CardContent>
                                                <div className="rounded-md border">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow><TableHead>Order & Timestamps</TableHead><TableHead>Configuration</TableHead><TableHead>Reason for Cancellation</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {activeCancelled.map(activity => {
                                                                const order = activity.cancellationData!.order;
                                                                const reason = activity.cancellationData!.reason;
                                                                const entryNames = order.entryFormulaIds?.map(id => formulaMap.get(id)).filter(Boolean).join(' / ') || 'N/A';
                                                                const slNames = order.stopLossFormulaIds?.map(id => formulaMap.get(id)).filter(Boolean).join(' / ') || 'N/A';
                                                                const targetNames = order.targetFormulaIds?.map(id => formulaMap.get(id)).filter(Boolean).join(' / ') || 'N/A';
                                                                const edgeName = edgeMap.get(order.strategyId || '') || 'N/A';
                                                                
                                                                return (
                                                                <TableRow key={activity.id}>
                                                                    <TableCell className="align-top"><div className="font-bold text-base">{order.symbol}</div><div className="text-sm text-muted-foreground">{order.side} {order.quantity} lots @ {formatCurrency(order.price)}</div><div className="text-xs text-muted-foreground mt-2">Placed: {format(parseISO(order.createdAt), "PP, p")}</div><div className="text-xs text-destructive/80">Cancelled: {format(parseISO(activity.timestamp), "PP, p")}</div></TableCell>
                                                                    <TableCell className="space-y-2 align-top"><div className="flex items-center gap-2 text-xs"><Badge variant="outline" className="bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200 border-violet-300 dark:border-violet-700">{edgeName}</Badge></div><div className="flex items-center gap-2 text-xs"><span className="font-semibold text-foreground w-12 shrink-0">Entry:</span><span className="font-mono">{formatCurrency(order.price)}</span><Badge variant="outline" className="bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200 border-sky-300 dark:border-sky-700 font-normal">{entryNames}</Badge></div><div className="flex items-center gap-2 text-xs"><span className="font-semibold text-foreground w-12 shrink-0">SL:</span><span className="font-mono">{order.slPrice ? formatCurrency(order.slPrice) : 'N/A'}</span><Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-300 dark:border-red-700 font-normal">{slNames}</Badge></div><div className="flex items-center gap-2 text-xs"><span className="font-semibold text-foreground w-12 shrink-0">Target:</span><span className="font-mono">{order.tpPrice ? formatCurrency(order.tpPrice) : 'N/A'}</span><Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-300 dark:border-green-700 font-normal">{targetNames}</Badge></div></TableCell>
                                                                    <TableCell className="text-sm text-muted-foreground italic align-top">"{reason}"</TableCell>
                                                                    <TableCell className="text-right align-top"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={()=>setActivityToEdit(activity)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem><DropdownMenuItem onClick={()=>setActivityToArchive(activity)}><Archive className="mr-2 h-4 w-4"/>Archive</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                                                                </TableRow>
                                                                )
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                            </>
                        )}
                    </TabsContent>
                    <TabsContent value="archived" className="mt-6">
                         {!hasArchivedActivity ? (
                            <Card className="shadow-lg"><CardContent className="p-10 text-center"><p className="text-muted-foreground">No archived logs.</p></CardContent></Card>
                         ) : (
                            <Card className="shadow-lg">
                                <CardHeader><CardTitle>Archived Log</CardTitle><CardDescription>Archived activity entries. These can be restored or permanently deleted.</CardDescription></CardHeader>
                                <CardContent>
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader><TableRow><TableHead className="w-[180px]">Timestamp</TableHead><TableHead>Event</TableHead><TableHead className="w-[80px] text-right">Actions</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {archived.map(activity => (
                                                    <TableRow key={activity.id}>
                                                        <TableCell className="font-mono text-xs">{format(parseISO(activity.timestamp), "p, PPP")}</TableCell>
                                                        <TableCell className="font-medium">{activity.event}</TableCell>
                                                        <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={()=>setActivityToRestore(activity)}><ArchiveRestore className="mr-2 h-4 w-4"/>Restore</DropdownMenuItem><DropdownMenuItem onClick={()=>setActivityToDelete(activity)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4"/>Delete Permanently</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                         )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Dialogs */}
            <EditActivityDialog isOpen={!!activityToEdit} onClose={() => setActivityToEdit(null)} onSave={handleUpdateActivity} activity={activityToEdit} />
            <DeleteConfirmationDialog isOpen={!!activityToArchive} onClose={() => setActivityToArchive(null)} onConfirm={confirmArchive} itemName={`log entry "${activityToArchive?.event}"`} />
            <DeleteConfirmationDialog isOpen={!!activityToRestore} onClose={() => setActivityToRestore(null)} onConfirm={confirmRestore} itemName={`log entry "${activityToRestore?.event}"`} />
            <DeleteConfirmationDialog isOpen={!!activityToDelete} onClose={() => setActivityToDelete(null)} onConfirm={confirmDelete} itemName={`log entry "${activityToDelete?.event}" permanently`} />
        </MainLayout>
    );
}
