import { useEffect } from 'react';

export default function BootingView({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="w-full h-full bg-blue-700 flex flex-col items-center justify-center p-8 text-white font-mono">
      <div className="flex flex-col items-center animate-pulse">
        <img src="/npa_logo.png" alt="NPA Logo" className="w-24 h-24 mb-6 object-contain drop-shadow-lg" onError={(e) => e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white opacity-50"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>'} />
        <h1 className="text-3xl font-bold tracking-widest text-center mb-2">网络开拓者协会</h1>
        <h2 className="text-xl tracking-widest text-center opacity-90">NPA BIOS POST...</h2>
        <p className="mt-8 opacity-75 text-sm">System Check OK.</p>
        <p className="mt-2 opacity-75 text-sm">Loading Kernel Modules...</p>
      </div>
    </div>
  );
}
