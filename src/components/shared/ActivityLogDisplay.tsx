
"use client";

import React from 'react';
import type { DayActivity, DayActivityDetails } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Bot, Check, Edit, Info, Settings, ShieldAlert, Trash2, User, Zap, GitCompareArrows } from 'lucide-react';

const CategoryDisplay = ({ category }: { category: DayActivity['category'] }) => {
    const categoryMap = {
        Engine: { icon: Zap, color: 'text-cyan-600', bgColor: 'bg-cyan-100 dark:bg-cyan-900/50' },
        Risk: { icon: ShieldAlert, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/50' },
        Settings: { icon: Settings, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/50' },
        'Bulk Action': { icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/50' },
    };
    const { icon: Icon, color, bgColor } = categoryMap[category] || { icon: Info, color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-700' };

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
        if (value === null || value === undefined) return 'N/A';
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

export default function ActivityLogDisplay({ activities }: { activities: DayActivity[] }) {
    if (activities.length === 0) {
        return (
            <Card className="shadow-sm border-dashed">
                <CardContent className="p-10 text-center text-muted-foreground">
                    No log entries for the selected day.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[180px]">Timestamp</TableHead>
                        <TableHead className="w-[150px]">Category</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Details</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {activities.map(activity => (
                        <TableRow key={activity.id}>
                            <TableCell className="font-mono text-xs">{format(parseISO(activity.timestamp), "p")}</TableCell>
                            <TableCell><CategoryDisplay category={activity.category} /></TableCell>
                            <TableCell className="font-medium">
                                {activity.event}
                                {activity.isEdited && <Badge variant="outline" className="ml-2 font-normal text-xs border-amber-400 text-amber-600">Edited</Badge>}
                            </TableCell>
                            <TableCell><ActivityDetails details={activity.details} /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

