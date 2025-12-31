"use client";

import React from 'react';
import { DailyCandlestickData } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

// Custom Candlestick Shape Component
export const CandlestickShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  const { open, high, low, close, date: barDate } = payload as DailyCandlestickData;

  if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number' || high === undefined || low === undefined || open === undefined || close === undefined) {
    return null;
  }

  let color: string;
  if (barDate === "Total") {
    color = 'hsl(var(--accent))'; 
  } else {
    const isUp = close >= open;
    color = isUp ? 'hsl(var(--chart-1))' : 'hsl(var(--destructive))';
  }

  const dataMinVal = low; 
  const dataMaxVal = high; 

  const mapDataToPixel = (value: number): number => {
    if (dataMaxVal === dataMinVal) return y + height / 2; 
    const ratio = (dataMaxVal - value) / (dataMaxVal - dataMinVal);
    return y + ratio * height;
  };

  const openPixelY = mapDataToPixel(open);
  const closePixelY = mapDataToPixel(close);
  const highPixelY = mapDataToPixel(high); 
  const lowPixelY = mapDataToPixel(low);   

  const bodyTopPixelY = Math.min(openPixelY, closePixelY);
  const bodyBottomPixelY = Math.max(openPixelY, closePixelY);
  let bodyActualPixelHeight = bodyBottomPixelY - bodyTopPixelY;

  if (bodyActualPixelHeight < 1 && bodyActualPixelHeight >= 0) {
    bodyActualPixelHeight = 1;
  }

  return (
    <g>
      <line
        x1={x + width / 2}
        y1={highPixelY}
        x2={x + width / 2}
        y2={lowPixelY}
        stroke={color}
        strokeWidth={1.5}
      />
      <rect
        x={x}
        y={bodyTopPixelY}
        width={width}
        height={bodyActualPixelHeight}
        fill={color}
      />
    </g>
  );
};

// Custom Tooltip for Candlestick Charts
export const CustomCandlestickTooltip = ({ active, payload, label, aggregationLevel = 'day' }: any) => {
  if (active && payload && payload.length && payload[0].payload) {
    const data = payload[0].payload as DailyCandlestickData;
    let formattedLabel = data.date;

    if (data.date === "Total") {
        formattedLabel = "Total for Selected Range";
        return (
          <div className="p-2 bg-background/90 border border-border rounded-lg shadow-lg text-xs backdrop-blur-sm">
            <p className="font-bold text-foreground mb-1">{formattedLabel}</p>
            <p className="text-muted-foreground"><span className="font-medium text-foreground">Open (Start P&L):</span> {formatCurrency(data.open)}</p>
            <p className="text-muted-foreground"><span className="font-medium text-foreground">High P&L:</span> {formatCurrency(data.high)}</p>
            <p className="text-muted-foreground"><span className="font-medium text-foreground">Low P&L:</span> {formatCurrency(data.low)}</p>
            <p className="text-muted-foreground"><span className="font-medium text-foreground">Net P&L:</span> {formatCurrency(data.close)}</p>
          </div>
        );
    } else {
        try {
            if (aggregationLevel === 'trade') {
                formattedLabel = format(parseISO(data.date), "MMM d, yyyy HH:mm");
            } else if (aggregationLevel === 'day') {
                formattedLabel = format(parseISO(data.date), "MMM d, yyyy");
            } else if (aggregationLevel === 'week') {
                formattedLabel = `Week of ${format(parseISO(data.date), "MMM d, yyyy")}`;
            } else if (aggregationLevel === 'month') {
                formattedLabel = format(parseISO(data.date), "MMMM yyyy");
            } else if (aggregationLevel === 'year') {
                formattedLabel = format(parseISO(data.date), "yyyy");
            }
        } catch (e) {
            // Keep original label if parsing fails (e.g., already formatted)
        }
        
        return (
          <div className="p-2 bg-background/90 border border-border rounded-lg shadow-lg text-xs backdrop-blur-sm">
            <p className="font-bold text-foreground mb-1">{formattedLabel}</p>
            <p className="text-muted-foreground"><span className="font-medium text-foreground">Open:</span> {formatCurrency(data.open)}</p>
            <p className="text-muted-foreground"><span className="font-medium text-foreground">High:</span> {formatCurrency(data.high)}</p>
            <p className="text-muted-foreground"><span className="font-medium text-foreground">Low:</span> {formatCurrency(data.low)}</p>
            <p className="text-muted-foreground"><span className="font-medium text-foreground">Close:</span> {formatCurrency(data.close)}</p>
          </div>
        );
    }
  }
  return null;
};
