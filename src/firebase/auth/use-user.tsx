
"use client";

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { useAuth } from '../client-provider';
import { onAuthStateChanged } from 'firebase/auth';

export const useUser = () => {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // If auth is not ready, we are still loading.
      // The onAuthStateChanged will run once auth is initialized.
      setLoading(true);
    }
  }, [auth]);

  return { user, loading };
};
