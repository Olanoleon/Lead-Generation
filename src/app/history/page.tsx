'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HistoryPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to dashboard which contains the history
    router.replace('/dashboard');
  }, [router]);

  return null;
}
