
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Trade, TradeLogEntry } from '@/types';
import { format, parseISO } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';
import { AlertCircle, ArrowRight, Bot, CheckCircle, Edit, Info, PowerOff, ShieldAlert, SlidersHorizontal, User } from 'lucide-react';

interface TradeLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  trade: Trade | null;
}

const getEventIcon = (event: string) => {
    const lowerEvent = event.toLowerCase();
    if (lowerEvent.includes('opened')) return <Info className="text-blue-500" />;
    if (lowerEvent.includes('modified')) return <SlidersHorizontal className="text-amber-500" />;
    if (lowerEvent.includes('sl hit')) return <ShieldAlert className="text-red-500" />;
    if (lowerEvent.includes('target hit')) return <CheckCircle className="text-green-500" />;
    if (lowerEvent.includes('manually')) return <User className="text-gray-500" />;
    if (lowerEvent.includes('edited')) return <Edit className="text-purple-500" />;
    if (lowerEvent.includes('automated') || lowerEvent.includes('engine')) return <Bot className="text-cyan-500" />;
    return <AlertCircle className="text-muted-foreground" />;
};


const DetailChange = ({ label, before, after }: { label: string, before: any, after: any }) => (
    <div className="flex items-center text-xs">
        <span className="font-medium mr-1">{label}:</span>
        <span className="text-muted-foreground line-through">{String(before ?? 'N/A')}</span>
        <ArrowRight className="h-3 w-3 mx-1 text-muted-foreground" />
        <span className="font-semibold">{String(after ?? 'N/A')}</span>
    </div>
);

const renderDetails = (entry: TradeLogEntry) => {
    if (!entry.details) return null;
    const { changes, ...otherDetails } = entry.details;
    
    // Function to format the key for display
    const formatKey = (key: string) => {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    };

    return (
        <div className="pl-5 pt-1 space-y-1">
            {changes && Object.entries(changes).map(([key, value]: [string, any]) => (
                <DetailChange key={key} label={formatKey(key)} before={value.before} after={value.after} />
            ))}
            {Object.entries(otherDetails).map(([key, value]) => (
                <div key={key} className="text-xs">
                    <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>{' '}
                    <span className="text-muted-foreground">{formatCurrency(value as number, { maximumFractionDigits: 2 })}</span>
                </div>
            ))}
        </div>
    );
};

export default function TradeLogDialog({ isOpen, onClose, trade }: TradeLogDialogProps) {
  if (!trade) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline">Trade Journey: {trade.symbol || 'N/A'}</DialogTitle>
          <DialogDescription>
            A complete log of all events for this trade from start to finish.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ScrollArea className="h-96 rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[180px]">Timestamp</TableHead>
                        <TableHead>Event</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(trade.log || []).map((entry, index) => (
                        <TableRow key={index}>
                            <TableCell className="font-mono text-xs">{format(parseISO(entry.timestamp), "MMM d, yyyy 'at' HH:mm:ss")}</TableCell>
                            <TableCell>
                                <div className="flex items-start gap-2">
                                    <div className="pt-0.5">{getEventIcon(entry.event)}</div>
                                    <div className="flex-grow">
                                        <p className="font-semibold">{entry.event}</p>
                                        {entry.notes && <p className="text-sm text-muted-foreground italic">"{entry.notes}"</p>}
                                        {renderDetails(entry)}
                                    </div>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {(!trade.log || trade.log.length === 0) && (
                        <TableRow>
                            <TableCell colSpan={2} className="h-24 text-center">No log entries found for this trade.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
