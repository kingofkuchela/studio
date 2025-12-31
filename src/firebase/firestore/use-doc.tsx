"use client";

import { useState, useEffect } from 'react';
import { doc, onSnapshot, type DocumentData, type Firestore } from 'firebase/firestore';
import { useFirestore } from '../provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useDoc<T>(path: string, id: string): { data: T | null; loading: boolean } {
  const firestore = useFirestore();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !id) {
        setLoading(false);
        return;
    };

    const docRef = doc(firestore, path, id);

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setData({ id: snapshot.id, ...snapshot.data() } as T);
      } else {
        setData(null);
      }
      setLoading(false);
    }, (serverError) => {
      console.error("Error fetching document:", serverError);
      const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'get',
      }, serverError);
      errorEmitter.emit('permission-error', permissionError);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, path, id]);

  return { data, loading };
}
