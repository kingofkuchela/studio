
"use client";

import React, { useState, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload, ArrowRight, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAppContext } from '@/contexts/AppContext';
import type { Trade, PositionType, RulesFollowedStatus, ExpiryType, IndexType } from '@/types';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';


interface TradeImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'upload' | 'map' | 'review' | 'importing' | 'complete';
type MappedTradeField = keyof Omit<Trade, 'id' | 'pnl' | 'outcome' | 'screenshotDataUri'>;


const parseDateString = (dateString: string): Date | null => {
  if (!dateString || typeof dateString !== 'string') return null;

  // Attempt to parse multiple common formats to be more robust.
  const formats = [
    // 1. DD/MM/YYYY or DD-MM-YYYY with optional time. Prioritized as requested.
    {
      regex: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
      parser: (parts: string[]) => ({ 
        day: parseInt(parts[1], 10), 
        month: parseInt(parts[2], 10) - 1, 
        year: parseInt(parts[3], 10), 
        hours: parts[4] ? parseInt(parts[4], 10) : 0, 
        minutes: parts[5] ? parseInt(parts[5], 10) : 0, 
        seconds: parts[6] ? parseInt(parts[6], 10) : 0 
      })
    },
    // 2. YYYY-MM-DD or YYYY/MM/DD (ISO-like) with optional time.
    {
        regex: /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
        parser: (parts: string[]) => ({ 
          year: parseInt(parts[1], 10), 
          month: parseInt(parts[2], 10) - 1, 
          day: parseInt(parts[3], 10), 
          hours: parts[4] ? parseInt(parts[4], 10) : 0, 
          minutes: parts[5] ? parseInt(parts[5], 10) : 0, 
          seconds: parts[6] ? parseInt(parts[6], 10) : 0 
        })
    }
  ];

  for (const format of formats) {
    const parts = dateString.match(format.regex);
    if (parts) {
      const { year, month, day, hours, minutes, seconds } = format.parser(parts);

      if (month < 0 || month > 11 || day < 1 || day > 31) {
          continue; // Invalid month or day, try next format.
      }

      const date = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
      
      // Strict validation to ensure date wasn't rolled over by the Date constructor (e.g. month 13 -> next year).
      if (date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day) {
        return date;
      }
    }
  }

  // Last resort: Fallback to browser's native parsing, which is good for full ISO 8601 but unreliable for ambiguous formats.
  const standardDate = new Date(dateString);
  if (!isNaN(standardDate.getTime())) {
    return standardDate;
  }

  return null;
};


const tradeFieldsToMap: Array<{ key: MappedTradeField; label: string; required: boolean; description: string }> = [
    { key: 'entryTime', label: 'Entry Time', required: true, description: 'Formats: DD/MM/YYYY, YYYY-MM-DD (time is optional). Use / or - as separators.' },
    { key: 'exitTime', label: 'Exit Time', required: false, description: 'Formats: DD/MM/YYYY, YYYY-MM-DD (time is optional). Use / or - as separators.' },
    { key: 'positionType', label: 'Position Type', required: true, description: 'Must contain "Long" or "Short". Case-insensitive.' },
    { key: 'entryPrice', label: 'Entry Price', required: true, description: 'The price at which the trade was entered.' },
    { key: 'quantity', label: 'Quantity', required: true, description: 'The number of shares or contracts.' },
    { key: 'exitPrice', label: 'Exit Price', required: false, description: 'The price at which the trade was exited.' },
    { key: 'symbol', label: 'Symbol', required: false, description: 'The stock ticker or instrument name (e.g., "AAPL").' },
    { key: 'index', label: 'Index', required: false, description: 'Must be "NIFTY" or "SENSEX".' },
    { key: 'strikePrice', label: 'Strike Price', required: false, description: 'The strike price of the option.' },
    { key: 'strategyId', label: 'Edge', required: false, description: 'Name of the edge used (must match an existing one).' },
    { key: 'entryFormulaId', label: 'Entry Formula', required: false, description: 'Name of the Normal or Breakout entry formula (must match an existing one).' },
    { key: 'stopLossFormulaId', label: 'Stop Loss Formula', required: false, description: 'Name of the stop loss formula (must match an existing one).' },
    { key: 'targetFormulaId', label: 'Target Formula', required: false, description: 'Name of the target formula (must match an existing one).' },
    { key: 'rulesFollowed', label: 'RULES FOLLOW', required: false, description: 'Can be "RULES FOLLOW", "NOT FOLLOW", etc.' },
    { key: 'expiryType', label: 'Expiry Type', required: false, description: 'Must be "Expiry" or "Non-Expiry". Defaults to Non-Expiry.' },
    { key: 'notes', label: 'Notes', required: false, description: 'Any notes or comments about the trade.' },
    { key: 'sl', label: 'SL (Stop Loss)', required: false, description: 'The stop loss price for the trade.' },
    { key: 'target', label: 'Target', required: false, description: 'The target price for the trade.' },
    { key: 'result', label: 'Result', required: false, description: 'The result of the trade, e.g., "Target Hit".' }
];

type ProcessedRow = {
    data: Omit<Trade, 'id' | 'pnl' | 'outcome'> | null;
    originalRow: any;
    success: boolean;
    errors: string[];
};

export default function TradeImportDialog({ isOpen, onClose }: TradeImportDialogProps) {
  const { toast } = useToast();
  const { bulkAddTrades, edges, formulas } = useAppContext();

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>(
    tradeFieldsToMap.reduce((acc, field) => ({ ...acc, [field.key]: null }), {} as Record<string, string | null>)
  );
  const [processedTrades, setProcessedTrades] = useState<ProcessedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const combinedEdges = useMemo(() => [...(edges.real || []), ...(edges.theoretical || [])], [edges]);
  const combinedFormulas = useMemo(() => [...(formulas.real || []), ...(formulas.theoretical || [])], [formulas]);

  const edgeMap = useMemo(() => new Map(combinedEdges.map(s => [s.name.toLowerCase(), s.id])), [combinedEdges]);
  const entryFormulaMap = useMemo(() => new Map(combinedFormulas.filter(f => f.type === 'normal-entry' || f.type === 'breakout-entry').map(f => [f.name.toLowerCase(), f.id])), [combinedFormulas]);
  const stopLossFormulaMap = useMemo(() => new Map(combinedFormulas.filter(f => f.type === 'stop-loss').map(f => [f.name.toLowerCase(), f.id])), [combinedFormulas]);
  const targetFormulaMap = useMemo(() => new Map(combinedFormulas.filter(f => f.type === 'target').map(f => [f.name.toLowerCase(), f.id])), [combinedFormulas]);

  const resetState = () => {
    setStep('upload');
    setFile(null);
    setCsvHeaders([]);
    setCsvData([]);
    setMapping(tradeFieldsToMap.reduce((acc, field) => ({ ...acc, [field.key]: null }), {} as Record<MappedTradeField, string | null>));
    setProcessedTrades([]);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      resetState();
      return;
    }
    if (selectedFile.type !== 'text/csv') {
      toast({ variant: "destructive", title: "Invalid File Type", description: "Please upload a valid .csv file." });
      resetState();
      return;
    }
    setFile(selectedFile);
    setIsProcessing(true);
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.meta.fields && results.data.length > 0) {
          setCsvHeaders(results.meta.fields);
          setCsvData(results.data);
          setStep('map');
          toast({ title: "File Read Successfully", description: "Please map your CSV columns to the trade fields." });
        } else {
          toast({ variant: "destructive", title: "Invalid CSV", description: "Could not read headers or file is empty. Please check your file." });
          resetState();
        }
        setIsProcessing(false);
      },
      error: (error) => {
        console.error("CSV Parsing Error:", error);
        toast({ variant: "destructive", title: "File Parsing Error", description: "There was an error parsing your file." });
        resetState();
        setIsProcessing(false);
      }
    });
    event.target.value = '';
  };
  
  const handleMappingChange = (fieldKey: string, csvHeader: string) => {
    setMapping(prev => ({ ...prev, [fieldKey]: csvHeader }));
  };

  const handleAutoMap = () => {
    const newMapping = { ...mapping };
    tradeFieldsToMap.forEach(field => {
      const foundHeader = csvHeaders.find(header => header.toLowerCase().replace(/[\s_]/g, '') === field.label.toLowerCase().replace(/[\s_]/g, ''));
      if (foundHeader) {
        newMapping[field.key] = foundHeader;
      }
    });
    setMapping(newMapping);
    toast({ title: "Auto-mapped fields", description: "Review the automatic mappings and adjust as needed." });
  };
  
  const handleProceedToReview = () => {
      setIsProcessing(true);
      const processed: ProcessedRow[] = csvData.map(row => {
          const errors: string[] = [];
          const tradeData: any = {};

          tradeFieldsToMap.forEach(field => {
              const csvHeader = mapping[field.key];
              const value = csvHeader ? row[csvHeader] : undefined;
              
              if (field.required && (value === undefined || value === null || value === '')) {
                  errors.push(`Required field "${field.label}" is missing.`);
                  return;
              }
              if (value === undefined || value === null || value === '') return;

              try {
                  switch (field.key) {
                      case 'entryPrice':
                      case 'exitPrice':
                      case 'quantity':
                      case 'sl':
                      case 'target':
                          const numValue = parseFloat(value);
                          if (isNaN(numValue)) throw new Error(`must be a valid number.`);
                          tradeData[field.key] = numValue;
                          break;
                      case 'entryTime':
                      case 'exitTime':
                          const dateValue = parseDateString(value);
                          if (!dateValue) throw new Error(`is not a valid date/time. Use DD/MM/YYYY HH:mm or a standard format.`);
                          tradeData[field.key] = dateValue.toISOString();
                          break;
                      case 'positionType':
                          const posType = String(value).toLowerCase();
                          if (posType.includes('long')) tradeData[field.key] = 'Long';
                          else if (posType.includes('short')) tradeData[field.key] = 'Short';
                          else throw new Error(`must contain "Long" or "Short".`);
                          break;
                      case 'index':
                          const indexVal = String(value).toUpperCase();
                          if (indexVal === 'NIFTY' || indexVal === 'SENSEX') {
                              tradeData[field.key] = indexVal as IndexType;
                          } else {
                              throw new Error(`must be "NIFTY" or "SENSEX".`);
                          }
                          break;
                      case 'strategyId':
                          const stratId = edgeMap.get(String(value).toLowerCase());
                          if (!stratId) throw new Error(`edge "${value}" not found.`);
                          tradeData[field.key] = stratId;
                          break;
                      case 'entryFormulaId':
                          const entryFormId = entryFormulaMap.get(String(value).toLowerCase());
                          if (!entryFormId) throw new Error(`entry formula "${value}" not found.`);
                          tradeData[field.key] = entryFormId;
                          break;
                      case 'stopLossFormulaId':
                           const slFormId = stopLossFormulaMap.get(String(value).toLowerCase());
                           if (!slFormId) throw new Error(`stop loss formula "${value}" not found.`);
                           tradeData[field.key] = slFormId;
                           break;
                      case 'targetFormulaId':
                           const targetFormId = targetFormulaMap.get(String(value).toLowerCase());
                           if (!targetFormId) throw new Error(`target formula "${value}" not found.`);
                           tradeData[field.key] = targetFormId;
                           break;
                      default:
                          tradeData[field.key] = value;
                  }
              } catch (e: any) {
                  errors.push(`Field "${field.label}" ${e.message}`);
              }
          });
          
          return {
              data: errors.length > 0 ? null : (tradeData as Omit<Trade, 'id' | 'pnl' | 'outcome'>),
              originalRow: row,
              success: errors.length === 0,
              errors,
          };
      });

      setProcessedTrades(processed);
      setIsProcessing(false);
      setStep('review');
  };

  const handleConfirmImport = async () => {
    setIsProcessing(true);
    const validTrades = processedTrades
      .filter(p => p.success && p.data)
      .map(p => p.data as Omit<Trade, 'id' | 'pnl' | 'outcome'>);

    if (validTrades.length > 0) {
      await bulkAddTrades(validTrades);
    }
    
    setIsProcessing(false);
    setStep('complete');
  };

  const isMapStepValid = useMemo(() => {
    return tradeFieldsToMap.every(field => {
      if (!field.required) return true;
      return mapping[field.key] !== null;
    });
  }, [mapping]);

  const successfulImports = processedTrades.filter(p => p.success).length;
  const failedImports = processedTrades.length - successfulImports;
  
  const renderContent = () => {
    switch (step) {
      case 'upload':
        return (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="csv-upload" className="text-sm font-medium">Step 1: Upload your CSV File</label>
              <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} disabled={isProcessing} />
              {isProcessing && <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Parsing file...</div>}
            </div>
          </div>
        );
      case 'map':
        return (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Step 2: Map Your Columns</AlertTitle>
              <AlertDescription>Match the columns from your CSV file to the app's trade fields. Required fields are marked with an asterisk (*).</AlertDescription>
            </Alert>
            <Button onClick={handleAutoMap} size="sm">Auto-map Fields</Button>
            <ScrollArea className="h-72 w-full rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-secondary">
                  <TableRow>
                    <TableHead>Trade Field</TableHead>
                    <TableHead>Your CSV Column</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tradeFieldsToMap.map(field => (
                    <TableRow key={field.key}>
                      <TableCell>
                        <label htmlFor={`select-${field.key}`} className="font-medium">
                          {field.label} {field.required && <span className="text-destructive">*</span>}
                        </label>
                        <p className="text-xs text-muted-foreground">{field.description}</p>
                      </TableCell>
                      <TableCell>
                        <Select value={mapping[field.key] || ''} onValueChange={(value) => handleMappingChange(field.key, value)}>
                          <SelectTrigger id={`select-${field.key}`} className="w-full">
                            <SelectValue placeholder="Select a column..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="--skip--">-- Don't Import --</SelectItem>
                            {csvHeaders.map(header => (
                              <SelectItem key={header} value={header}>{header}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        );
      case 'review':
        return (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Step 3: Review Import Data</AlertTitle>
              <AlertDescription>
                We found <span className="font-bold">{processedTrades.length}</span> rows. <span className="font-bold text-green-600">{successfulImports} can be imported</span> and <span className="font-bold text-destructive">{failedImports} have errors</span>.
              </AlertDescription>
            </Alert>
             <ScrollArea className="h-72 w-full rounded-md border">
               <Table>
                <TableHeader className="sticky top-0 bg-secondary">
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Entry Time</TableHead>
                    <TableHead>Entry Price</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedTrades.map((p, index) => (
                    <TableRow key={index}>
                      <TableCell>
                         {p.success ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
                      </TableCell>
                       <TableCell>{p.data?.symbol || p.originalRow[mapping.symbol || ''] || 'N/A'}</TableCell>
                       <TableCell>{p.data?.entryTime ? new Date(p.data.entryTime).toLocaleString() : 'Invalid'}</TableCell>
                       <TableCell>{p.data?.entryPrice || 'Invalid'}</TableCell>
                       <TableCell>
                        {p.errors.length > 0 && (
                            <ul className="list-disc list-inside text-destructive text-xs">
                                {p.errors.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                        )}
                       </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
               </Table>
            </ScrollArea>
          </div>
        );
      case 'complete':
          return (
             <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <h3 className="text-xl font-semibold">Import Complete!</h3>
                <p>
                    <span className="font-bold text-green-600">{successfulImports} trades</span> were successfully imported.
                </p>
                {failedImports > 0 && <p className="text-muted-foreground">{failedImports} rows had errors and were skipped.</p>}
                <Button onClick={handleClose}>Close</Button>
            </div>
          )
      default: return null;
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2"><Upload className="h-5 w-5" />Import Trades from CSV</DialogTitle>
          <DialogDescription>
            {step === 'upload' && "Upload a CSV file to begin the import process."}
            {step === 'map' && "Match your CSV columns to the application's trade fields."}
            {step === 'review' && "Review the processed data before finalizing the import."}
            {step === 'complete' && "Your import is complete."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0">
         {renderContent()}
        </div>
        <DialogFooter>
          {step === 'upload' && <Button variant="outline" onClick={handleClose}>Cancel</Button>}
          {step === 'map' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button onClick={handleProceedToReview} disabled={!isMapStepValid || isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ArrowRight className="mr-2 h-4 w-4" />}
                Review Trades
              </Button>
            </>
          )}
          {step === 'review' && (
             <>
              <Button variant="outline" onClick={() => setStep('map')}>Back to Mapping</Button>
              <Button onClick={handleConfirmImport} disabled={isProcessing || successfulImports === 0}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Confirm & Import {successfulImports} Trades
              </Button>
            </>
          )}
          {step === 'complete' && <Button onClick={handleClose}>Finish</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
