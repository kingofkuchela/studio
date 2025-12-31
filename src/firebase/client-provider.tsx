
"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo } from 'react';
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { firebaseConfig } from './config';
import FirebaseErrorListener from '@/components/FirebaseErrorListener';

interface FirebaseContextValue {
  firebaseApp: FirebaseApp | null;
  auth: Auth | null;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

export const FirebaseClientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [instances, setInstances] = useState<FirebaseContextValue>({ firebaseApp: null, auth: null });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if the config has a valid API key before initializing
      if (firebaseConfig && firebaseConfig.apiKey) {
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        const auth = getAuth(app);
        setInstances({ firebaseApp: app, auth });
      } else {
        console.warn("Firebase configuration is missing or invalid. Please ensure your NEXT_PUBLIC_FIREBASE_CONFIG environment variable is set correctly.");
      }
    }
  }, []);

  return (
    <FirebaseContext.Provider value={instances}>
      {children}
      <FirebaseErrorListener />
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseContextValue => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseClientProvider');
  }
  return context;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  if (!firebaseApp) {
    throw new Error('Firebase app not available. This component must be rendered on the client.');
  }
  return firebaseApp;
};

export const useAuth = (): Auth | null => {
  const { auth } = useFirebase();
  // It's okay for auth to be null initially, the useUser hook will handle this.
  return auth;
};
