
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Zap } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ElementType;
  className?: string;
  valueClassName?: string;
  visualElement?: React.ReactNode;
  size?: 'compact' | 'default';
}

export default function SummaryCard({ title, value, description, icon: Icon, className, valueClassName, visualElement, size = 'default' }: SummaryCardProps) {
  const finalIcon = title === "Risk Reward Ratio" ?
    (<div className="flex flex-col gap-y-1">
        <div className="w-4 h-1.5 bg-green-500 rounded-sm"/>
        <div className="w-4 h-1.5 bg-red-500 rounded-sm"/>
        <div className="w-4 h-1.5 bg-blue-500 rounded-sm"/>
     </div>)
     : (Icon && <Icon className="h-4 w-4 text-muted-foreground" />);

  const displayValue = (typeof value === 'number' && isNaN(value)) ? 'N/A' : value;

  return (
    <Card className={cn("shadow-lg hover:shadow-xl transition-shadow duration-300", className)}>
      <CardHeader className={cn(
        "flex flex-row items-center justify-between space-y-0",
        size === 'compact' ? 'p-3 pb-1' : 'p-6 pb-2'
      )}>
        <CardTitle className={cn(
          "font-medium font-body",
          size === 'compact' ? 'text-xs' : 'text-sm'
        )}>{title}</CardTitle>
        
        {size === 'compact' ? (
          <div className="flex items-center justify-center h-6 w-6"> {/* Standardized slot for icon/visual */}
            {visualElement ? visualElement : finalIcon}
          </div>
        ) : (
          // Original logic for default size cards
          visualElement ? visualElement : finalIcon
        )}
      </CardHeader>
      <CardContent className={cn(size === 'compact' ? 'p-3 pt-1' : 'p-6 pt-0')}>
        <div className={cn(
          "font-bold font-din-numbers", 
          valueClassName,
          size === 'compact' ? 'text-2xl' : 'text-3xl'
        )}>{displayValue}</div>
        {description && <p className={cn(
          "text-muted-foreground font-body",
           size === 'compact' ? "text-[11px] mt-0.5" : "text-xs"
          )}>{description}</p>}
      </CardContent>
    </Card>
  );
}
