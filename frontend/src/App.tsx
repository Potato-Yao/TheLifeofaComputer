import { useState, useEffect } from 'react';
import { usePlayerStore } from './store/usePlayerStore';
import BootingView from './views/BootingView';
import SelectPCView from './views/SelectPCView';
import DesktopView from './views/DesktopView';
import GameOverView from './views/GameOverView';

export type ViewState = 'BOOTING' | 'SELECT_PC' | 'DESKTOP' | 'GAME_OVER';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('BOOTING');
  const { computer, health_status, day, hidden_flags } = usePlayerStore();

  useEffect(() => {
    // Ensure dark mode by default
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    // Check game over conditions
    const isDead = Object.values(health_status).some(h => h <= 0) || Object.values(health_status.hardware_details).some(h => h <= 0);
    const standardDays = import.meta.env.VITE_STANDARD_MODE_DAYS ? parseInt(import.meta.env.VITE_STANDARD_MODE_DAYS) : 7;
    if (isDead || (!hidden_flags?.is_endless_mode && day > standardDays)) {
      if (currentView !== 'BOOTING' && currentView !== 'SELECT_PC') {
        setCurrentView('GAME_OVER');
      }
    }
  }, [health_status, day, hidden_flags?.is_endless_mode, currentView]);

  const renderView = () => {
    switch (currentView) {
      case 'BOOTING':
        return <BootingView onComplete={() => setCurrentView(computer ? 'DESKTOP' : 'SELECT_PC')} />;
      case 'SELECT_PC':
        return <SelectPCView onSelect={() => setCurrentView('DESKTOP')} />;
      case 'DESKTOP':
        return <DesktopView onShutdown={() => setCurrentView('SELECT_PC')} />;
      case 'GAME_OVER':
        return <GameOverView onRestart={() => setCurrentView('SELECT_PC')} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-[100dvh] overflow-hidden font-sans">
      {renderView()}
    </div>
  );
}

export default App;
