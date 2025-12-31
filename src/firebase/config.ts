import type { FirebaseOptions } from 'firebase/app';

let firebaseConfig: FirebaseOptions = {};

try {
  if (process.env.NEXT_PUBLIC_FIREBASE_CONFIG) {
    firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG);
  }
} catch (e) {
  console.error("Could not parse NEXT_PUBLIC_FIREBASE_CONFIG:", e);
}

export { firebaseConfig };
