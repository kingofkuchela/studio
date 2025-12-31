
"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAppContext } from '@/contexts/AppContext';
import type { LogicalEdgeFlow } from '@/types';

interface LogicalEdgeFlowImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LogicalEdgeFlowImportDialog({ isOpen, onClose }: LogicalEdgeFlowImportDialogProps) {
  const { toast } = useToast();
  const { bulkAddLogicalEdgeFlows } = useAppContext();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importedData, setImportedData] = useState<LogicalEdgeFlow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setFile(null);
    setIsProcessing(false);
    setImportedData(null);
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    resetState();
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/json') {
      setError("Invalid file type. Please upload a valid .json file.");
      toast({ variant: "destructive", title: "Invalid File Type", description: "Please upload a valid .json file." });
      return;
    }
    setFile(selectedFile);
  };

  const handlePreview = () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }
    setIsProcessing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        if (Array.isArray(data) && data.length > 0) {
          // Basic validation of the first item
          const firstItem = data[0];
          if ('id' in firstItem && 'name' in firstItem && 'edgeId' in firstItem) {
            setImportedData(data);
          } else {
            throw new Error("JSON structure is invalid. It must be an array of logical flows.");
          }
        } else {
          throw new Error("File is empty or not a valid JSON array.");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during parsing.";
        setError(errorMessage);
        toast({ variant: "destructive", title: "Parsing Error", description: errorMessage });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setError("Failed to read the file.");
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!importedData) return;

    setIsProcessing(true);
    try {
      await bulkAddLogicalEdgeFlows(importedData);
      toast({
        title: "Import Successful",
        description: `${importedData.length} logical flows have been added.`,
      });
      handleClose();
    } catch (e) {
      setError("An error occurred during the import process.");
      toast({ variant: "destructive", title: "Import Failed", description: "Could not add the logical flows." });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2"><Upload className="h-5 w-5" />Import Logical Flows from JSON</DialogTitle>
          <DialogDescription>
            Upload a JSON file to add multiple logical flows at once. This will add to your existing flows, not replace them.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="grid grid-cols-1 gap-2">
            <Input id="json-upload" type="file" accept=".json" onChange={handleFileChange} />
            {file && <p className="text-xs text-muted-foreground">Selected: {file.name}</p>}
          </div>

          {error && <Alert variant="destructive"><XCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
          
          {importedData && (
            <Alert variant="default" className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-500/30">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-800 dark:text-green-300">File Ready for Import</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-400">
                Found {importedData.length} logical flows. Click "Confirm Import" to add them to your collection.
              </AlertDescription>
            </Alert>
          )}

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          {!importedData ? (
            <Button onClick={handlePreview} disabled={!file || isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              Preview & Validate File
            </Button>
          ) : (
            <Button onClick={handleConfirmImport} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              Confirm Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
