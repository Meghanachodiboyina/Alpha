'use client';

import { AlertCircle } from 'lucide-react';

export default function SubPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        <AlertCircle size={40} />
      </div>
      <div>
        <h2 className="text-2xl mb-1">Coming Soon</h2>
        <p className="text-muted font-medium max-w-sm mx-auto">
          We're working hard to bring this feature to your dashboard. Stay tuned!
        </p>
      </div>
    </div>
  );
}
