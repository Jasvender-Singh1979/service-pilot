'use client';

import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration: number;
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((toastObj) => {
      setToasts((prev) => [...prev, toastObj]);

      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toastObj.id));
      }, toastObj.duration);

      return () => clearTimeout(timer);
    });

    return unsubscribe;
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-sm font-semibold animate-in fade-in slide-in-from-right duration-300 flex items-center gap-2 max-w-xs ${
            t.type === 'success'
              ? 'bg-green-500 text-white'
              : t.type === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
          }`}
        >
          <span>
            {t.type === 'success' && '✓'}
            {t.type === 'error' && '✕'}
            {t.type === 'info' && 'ℹ'}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
