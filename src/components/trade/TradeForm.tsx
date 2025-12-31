
"use client";

import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { Edge, Trade, TradeFormData, ExpiryType, Formula, IndexType, PositionType, RulesFollowedStatus, TradingMode } from '@/types';
import { CalendarIcon, UploadCloud, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';

const rulesFollowedOptions: RulesFollowedStatus[] = ["RULES FOLLOW", "PARTIALLY FOLLOW", "NOT FOLLOW", "MISS THE ENTRY", "Divergence Flow"];

const formSchema = z.object({
  positionType: z.enum(['Long', 'Short'], { required_error: "Position type is required." }),
  index: z.enum(['NIFTY', 'SENSEX'], { required_error: "Index is required." }),
  strikePrice: z.string().min(1, 'Strike price is required.'),
  quantity: z.string().refine(val => val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), { message: "Must be a positive number" }),
  entryTime: z.string(), // Hidden field to preserve original entry time
  entryTimeDate: z.date({ required_error: "Entry date is required." }),
  entryTimeHours: z.string().regex(/^([01]\d|2[0-3])$/, "HH").refine(val => parseInt(val) >= 0 && parseInt(val) <= 23, "Invalid hour"),
  entryTimeMinutes: z.string().regex(/^[0-5]\d$/, "MM").refine(val => parseInt(val) >= 0 && parseInt(val) <= 59, "Invalid minute"),
  exitTimeDate: z.date().optional(),
  exitTimeHours: z.string().optional().refine(val => val === undefined || val === '' || (/^([01]\d|2[0-3])$/.test(val) && parseInt(val) >= 0 && parseInt(val) <= 23), "Invalid hour"),
  exitTimeMinutes: z.string().optional().refine(val => val === undefined || val === '' || (/^[0-5]\d$/.test(val) && parseInt(val) >= 0 && parseInt(val) <= 59), "Invalid minute"),
  strategyId: z.string().min(1, 'Edge is required.'),
  rulesFollowed: z.enum(rulesFollowedOptions, { required_error: "This field is required." }),
  notes: z.string().optional(),
  expiryType: z.enum(['Expiry', 'Non-Expiry'], { required_error: "Expiry type is required." }),
  screenshotDataUri: z.string().optional(),
  
  // All trade details are now at the top level
  entryFormulaId: z.string().min(1, 'Entry formula is required.'),
  entryPrice: z.string().refine(val => val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), { message: "Must be a positive number" }),
  stopLossFormulaIds: z.array(z.string()).min(1, 'At least one stop loss formula is required.'),
  targetFormulaIds: z.array(z.string()).min(1, 'At least one target formula is required.'),
  sl: z.string().refine(val => val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), { message: "SL price is required" }),
  target: z.string().refine(val => val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), { message: "Target price is required" }),
  result: z.enum(['Target Hit', 'SL Hit'], { required_error: 'Result is required.' }),
  exitPrice: z.string().optional(), // This will be calculated and set before submission

}).refine(data => {
    if (data.exitTimeDate && data.entryTimeDate) {
        const entryDateTime = new Date(data.entryTimeDate);
        const entryHours = data.entryTimeHours || "00";
        const entryMinutes = data.entryTimeMinutes || "00";
        entryDateTime.setHours(parseInt(entryHours), parseInt(entryMinutes), 0, 0);
        
        const exitDateTime = new Date(data.exitTimeDate);
        const exitHours = data.exitTimeHours || "00";
        const exitMinutes = data.exitTimeMinutes || "00";
        exitDateTime.setHours(parseInt(exitHours), parseInt(exitMinutes), 0, 0);
        
        return exitDateTime > entryDateTime;
    }
    return true;
}, {
    message: "Exit time must be after entry time if specified",
    path: ["exitTimeDate"],
});


interface TradeFormProps {
  edges: Edge[];
  formulas: Formula[];
  onSubmit: (data: TradeFormData) => void;
  onCancel: () => void;
  initialData?: Partial<Trade>;
  tradingMode?: TradingMode;
}

const indexOptions: IndexType[] = ['NIFTY', 'SENSEX'];
const positionTypeOptions: PositionType[] = ['Long', 'Short'];
const expiryTypeOptions: ExpiryType[] = ['Expiry', 'Non-Expiry'];
const resultOptions: ('Target Hit' | 'SL Hit')[] = ['Target Hit', 'SL Hit'];


const MultiSelectFormulaField = ({
  value,
  onChange,
  placeholder,
  formulas,
}: {
  value?: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  formulas: Formula[];
}) => {
  const selectedFormulas = React.useMemo(
    () => formulas.filter(f => value?.includes(f.id)),
    [formulas, value]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-start h-auto min-h-10 text-left">
          <div className="flex flex-wrap gap-1">
            {selectedFormulas.length > 0 ? (
              selectedFormulas.map(f => (
                <Badge key={f.id} variant="secondary" className="font-normal">
                  {f.name}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground font-normal">{placeholder}</span>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <ScrollArea className="max-h-60">
          {formulas.map(formula => (
            <DropdownMenuCheckboxItem
              key={formula.id}
              checked={value?.includes(formula.id)}
              onCheckedChange={checked => {
                const currentIds = value || [];
                const newIds = checked
                  ? [...currentIds, formula.id]
                  : currentIds.filter(id => id !== formula.id);
                onChange(newIds);
              }}
              onSelect={e => e.preventDefault()}
            >
              {formula.name}
            </DropdownMenuCheckboxItem>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const getDefaultValues = (initialData?: Partial<Trade>): z.infer<typeof formSchema> => {
    const now = new Date();
    const nowHours = format(now, 'HH');
    const nowMinutes = format(now, 'mm');

    const entryTime = initialData?.entryTime ? parseISO(initialData.entryTime) : now;
    const exitTime = initialData?.exitTime ? parseISO(initialData.exitTime) : undefined;
    
    return {
        positionType: initialData?.positionType ?? 'Long',
        index: initialData?.index ?? 'NIFTY',
        strikePrice: initialData?.strikePrice ?? '',
        quantity: initialData?.quantity?.toString() ?? '',
        entryTime: initialData?.entryTime || now.toISOString(),
        entryTimeDate: entryTime,
        entryTimeHours: format(entryTime, "HH"),
        entryTimeMinutes: format(entryTime, "mm"),
        exitTimeDate: exitTime,
        exitTimeHours: exitTime ? format(exitTime, "HH") : nowHours,
        exitTimeMinutes: exitTime ? format(exitTime, "mm") : nowMinutes,
        strategyId: initialData?.strategyId ?? '',
        rulesFollowed: initialData?.rulesFollowed ?? 'RULES FOLLOW',
        notes: initialData?.notes ?? '',
        expiryType: initialData?.expiryType ?? 'Non-Expiry',
        screenshotDataUri: initialData?.screenshotDataUri ?? '',
        // Base fields
        entryFormulaId: initialData?.entryFormulaId ?? '',
        entryPrice: initialData?.entryPrice?.toString() ?? '',
        stopLossFormulaIds: initialData?.stopLossFormulaIds ?? [],
        targetFormulaIds: initialData?.targetFormulaIds ?? [],
        sl: initialData?.sl?.toString() ?? '',
        target: initialData?.target?.toString() ?? '',
        result: initialData?.result ?? 'Target Hit',
        exitPrice: initialData?.exitPrice?.toString() ?? '',
    };
};

export default function TradeForm({ edges, formulas, onSubmit, onCancel, initialData }: TradeFormProps) {
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(initialData),
  });
  
  useEffect(() => {
    form.reset(getDefaultValues(initialData));
  }, [initialData, form]);
  
  const watchedScreenshot = form.watch('screenshotDataUri');
  
  const processImageFile = useCallback((file: File | null) => {
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          variant: "destructive",
          title: "Image Too Large",
          description: "Please upload an image smaller than 5MB.",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('screenshotDataUri', reader.result as string, { shouldValidate: true, shouldDirty: true });
      };
      reader.onerror = () => {
        console.error('Error reading file for screenshot');
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not read the image file. Please try again.",
        });
      };
      reader.readAsDataURL(file);
    }
  }, [form, toast]);

  const handleScreenshotUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    event.target.value = ''; 
  };

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
            const file = items[i].getAsFile();
            if (file) {
              processImageFile(file);
              event.preventDefault(); 
              toast({
                title: "Image Pasted",
                description: "Screenshot has been added from clipboard.",
              });
              return;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [processImageFile, toast]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const calculatedExitPrice = values.result === 'Target Hit' ? values.target : values.sl;
    const finalValues = {
      ...values,
      exitPrice: calculatedExitPrice,
    };
    onSubmit(finalValues as unknown as TradeFormData);
  };

  const DateTimePicker = ({ fieldNameDate, fieldNameHours, fieldNameMinutes, label, isOptional, disabled }: { fieldNameDate: any, fieldNameHours: any, fieldNameMinutes: any, label: string, isOptional?: boolean, disabled?: boolean}) => {
    const dateValue = form.watch(fieldNameDate);
    
    return (
    <FormItem className="flex flex-col">
      <FormLabel>{label}{isOptional && " (Optional)"}</FormLabel>
      <div className="flex gap-2 items-center">
        <Popover modal={true}>
          <PopoverTrigger asChild>
            <FormControl>
              <Button
                disabled={disabled}
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateValue && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(dateValue, "PPP") : <span>Pick a date</span>}
              </Button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateValue || undefined}
              onSelect={(date) => form.setValue(fieldNameDate, date, { shouldValidate: true, shouldDirty: true })} 
              initialFocus
              disabled={disabled}
            />
          </PopoverContent>
        </Popover>
        
        <FormField
            control={form.control}
            name={fieldNameHours}
            render={({ field }) => (
                <Input type="number" min="0" max="23" placeholder="HH" {...field} className="w-[70px] text-center" disabled={disabled} />
            )} />
        <span className="font-bold">:</span>
        <FormField
            control={form.control}
            name={fieldNameMinutes}
            render={({ field }) => (
                <Input type="number" min="0" max="59" placeholder="MM" {...field} className="w-[70px] text-center" disabled={disabled} />
            )} />
      </div>
      <FormMessage>{(form.formState.errors[fieldNameDate] || form.formState.errors[fieldNameHours] || form.formState.errors[fieldNameMinutes])?.message?.toString()}</FormMessage>
    </FormItem>
    );
  };
  
  const entryFormulas = useMemo(() => formulas.filter(f => f.type === 'normal-entry' || f.type === 'breakout-entry'), [formulas]);
  const stopLossFormulas = useMemo(() => formulas.filter(f => f.type === 'stop-loss'), [formulas]);
  const targetFormulas = useMemo(() => formulas.filter(f => f.type === 'target' || f.type === 'target-index' || f.type === 'target-option'), [formulas]);

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Hidden field to preserve original entryTime on edit */}
          <FormField control={form.control} name="entryTime" render={({ field }) => <Input type="hidden" {...field} />} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="index" render={({ field }) => ( <FormItem><FormLabel>Index</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select an index" /></SelectTrigger></FormControl><SelectContent>{indexOptions.map(option => (<SelectItem key={option} value={option}>{option}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="strikePrice" render={({ field }) => ( <FormItem><FormLabel>Strike Price</FormLabel><FormControl><Input type="text" placeholder="e.g. 150 or NIFTY24AUG18000CE" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem> )} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="strategyId" render={({ field }) => ( <FormItem><FormLabel>Edge</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select an edge" /></SelectTrigger></FormControl><SelectContent>{edges.map(edge => (<SelectItem key={edge.id} value={edge.id} className="font-code">{edge.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="positionType" render={({ field }) => ( <FormItem><FormLabel>Position Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select position type" /></SelectTrigger></FormControl><SelectContent>{positionTypeOptions.map(option => (<SelectItem key={option} value={option}>{option}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="quantity" render={({ field }) => ( <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" step="1" placeholder="0" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="expiryType" render={({ field }) => (
              <FormItem className="space-y-3"> <FormLabel>Expiry Type</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-row space-x-4 pt-2"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Expiry" /></FormControl><FormLabel className="font-normal">Expiry</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Non-Expiry" /></FormControl><FormLabel className="font-normal">Non-Expiry</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>
            )}/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DateTimePicker fieldNameDate="entryTimeDate" fieldNameHours="entryTimeHours" fieldNameMinutes="entryTimeMinutes" label="Entry Time" disabled={!!initialData} />
              <DateTimePicker fieldNameDate="exitTimeDate" fieldNameHours="exitTimeHours" fieldNameMinutes="exitTimeMinutes" label="Exit Time" isOptional={true} />
          </div>
          {form.formState.errors.exitTimeDate && !form.formState.errors.exitTimeDate.ref && <p className="text-sm font-medium text-destructive">{form.formState.errors.exitTimeDate.message}</p>}

          <FormField control={form.control} name="rulesFollowed" render={({ field }) => ( <FormItem><FormLabel>Rules Followed</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select rule status" /></SelectTrigger></FormControl><SelectContent>{rulesFollowedOptions.map(option => (<SelectItem key={option} value={option}>{option}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="entryFormulaId" render={({ field }) => (
                  <FormItem><FormLabel>Entry Formula</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select an entry formula" /></SelectTrigger></FormControl><SelectContent>{entryFormulas.map(formula => (<SelectItem key={formula.id} value={formula.id}>{formula.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="entryPrice" render={({ field }) => (
                  <FormItem><FormLabel>Entry Price</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="stopLossFormulaIds" render={({ field }) => (
                  <FormItem><FormLabel>Stop Loss Formulas</FormLabel><MultiSelectFormulaField {...field} placeholder="Select SL formulas..." formulas={stopLossFormulas} /><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="targetFormulaIds" render={({ field }) => (
                  <FormItem><FormLabel>Target Formulas</FormLabel><MultiSelectFormulaField {...field} placeholder="Select target formulas..." formulas={targetFormulas} /><FormMessage /></FormItem>
              )} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="sl" render={({ field }) => (
                  <FormItem><FormLabel>SL (Stop Loss)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="target" render={({ field }) => (
                  <FormItem><FormLabel>Target</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
          </div>
          <FormField control={form.control} name="result" render={({ field }) => (
              <FormItem><FormLabel>Result</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select result" /></SelectTrigger></FormControl><SelectContent>{resultOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
          )} />
          
          <FormField control={form.control} name="screenshotDataUri" render={() => ( <FormItem><FormLabel>Screenshot (Optional) - Upload or Paste</FormLabel><FormControl><Input type="file" accept="image/*,.heic,.heif" onChange={handleScreenshotUpload} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" /></FormControl>
                {watchedScreenshot && (
                  <div className="mt-2 relative w-fit"><img src={watchedScreenshot} alt="Screenshot preview" className="max-h-40 rounded-md border" /><Button variant="ghost" size="icon" onClick={() => form.setValue('screenshotDataUri', undefined)} className="absolute top-1 right-1 bg-background/50 hover:bg-background/75 h-6 w-6" aria-label="Clear image"><XCircle className="h-4 w-4 text-destructive" /></Button></div>
                )}<FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Trade rationale, observations, etc." {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem> )} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {initialData ? 'Update Trade' : 'Add Trade'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
