"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Since there is no login, redirect directly to the main app page.
    router.replace('/journal-entry');
  }, [router]);

  // Show a loading skeleton while redirecting
  return (
      <div className="flex h-screen w-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
              </div>
          </div>
      </div>
  );
}
