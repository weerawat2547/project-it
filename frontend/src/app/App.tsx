import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';

export default function App() {
  useEffect(() => {
    // หากเปิดผ่าน LINE ในมือถือ ให้เปิดใน Chrome/Safari อัตโนมัติเพื่อความลื่นไหลและรองรับ 100%
    const isLine = /Line/i.test(navigator.userAgent);
    if (isLine && !window.location.search.includes('openExternalBrowser=1')) {
      const sep = window.location.search ? '&' : '?';
      window.location.replace(window.location.href + sep + 'openExternalBrowser=1');
    }
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" />
    </>
  );
}