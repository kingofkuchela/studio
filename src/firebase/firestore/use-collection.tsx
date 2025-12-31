"use client";

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, type Query, type DocumentData } from 'firebase/firestore';
import { useFirestore } from '../provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useCollection<T>(path: string, q?: Query): { data: T[]; loading: boolean } {
  const firestore = useFirestore();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore) {
      setLoading(false);
      return;
    };

    const collectionRef = collection(firestore, path);
    const finalQuery = q || query(collectionRef);

    const unsubscribe = onSnapshot(finalQuery, (snapshot) => {
      const results: T[] = [];
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as T);
      });
      setData(results);
      setLoading(false);
    }, (serverError) => {
      console.error("Error fetching collection:", serverError);
      const permissionError = new FirestorePermissionError({
          path: path,
          operation: 'list',
      }, serverError);
      errorEmitter.emit('permission-error', permissionError);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, path, q]);

  return { data, loading };
}
