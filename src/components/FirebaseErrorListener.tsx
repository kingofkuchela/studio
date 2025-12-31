
'use client';
import {useEffect} from 'react';
import {errorEmitter} from '@/firebase/error-emitter';
import {useToast} from '@/hooks/use-toast';

export default function FirebaseErrorListener() {
  const {toast} = useToast();

  useEffect(() => {
    const handleError = (error: any) => {
      console.error(
        'A new Firebase error has been thrown. This is a critical error that needs to be handled. You should not be seeing this error in a production environment.',
        error
      );
      toast({
        variant: 'destructive',
        title: error.name || 'Firebase Error',
        description: error.message,
        duration: 10000,
      });
      // We don't re-throw the error here to prevent crashing the entire app.
      // The toast notification informs the user.
    };
    errorEmitter.on('permission-error', handleError);
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);
  return null;
}
