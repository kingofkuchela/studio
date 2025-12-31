
"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfToday, endOfToday, subYears, startOfDay } from "date-fns"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface AdvancedDateRangePickerProps {
  value: DateRange | undefined;
  onValueChange: (range: DateRange | undefined) => void;
  className?: string;
}

interface Preset {
  label: string;
  range: DateRange;
}


export default function AdvancedDateRangePicker({
  className,
  value,
  onValueChange,
}: AdvancedDateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  const presets: Preset[] = React.useMemo(() => {
    const today = new Date();
    return [
      { label: "Today", range: { from: startOfToday(), to: endOfToday() } },
      { label: "Last 7 Days", range: { from: subDays(today, 6), to: today } },
      { label: "Last 30 Days", range: { from: subDays(today, 29), to: today } },
      { label: "This Month", range: { from: startOfMonth(today), to: endOfMonth(today) } },
      { label: "Last Month", range: { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) } },
      { label: "Last 3 Months", range: { from: startOfDay(subMonths(today, 2)), to: endOfToday() } },
      { label: "Last 6 Months", range: { from: startOfDay(subMonths(today, 5)), to: endOfToday() } },
      { label: "Last 12 Months", range: { from: startOfDay(subYears(today, 1)), to: endOfToday() } },
    ]
  }, []);
  
  const handlePresetClick = (preset: Preset) => {
    onValueChange(preset.range);
    setOpen(false);
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full sm:w-[300px] justify-start text-left font-normal h-9",
              "border-transparent bg-accent text-accent-foreground hover:bg-accent/90",
              !value && "text-accent-foreground/70"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "LLL dd, y")} -{" "}
                  {format(value.to, "LLL dd, y")}
                </>
              ) : (
                format(value.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 flex" align="end">
            <div className="flex flex-col space-y-1 border-r p-2">
                {presets.map((preset) => (
                    <Button
                        key={preset.label}
                        onClick={() => handlePresetClick(preset)}
                        variant="ghost"
                        className="w-full justify-start h-8 px-2 text-xs"
                    >
                        {preset.label}
                    </Button>
                ))}
            </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={onValueChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
