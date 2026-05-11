import React, { useState, useEffect } from 'react';
import { AdMobBanner, AppOpenAd, FullScreenAd } from './lib/admob';
import { BubbleShooterGame } from './components/BubbleShooterGame';
import { Play, Trophy, RotateCcw, MonitorPlay, ChevronLeft, ChevronRight, Pause, Home, Volume2, VolumeX } from 'lucide-react';
import { sounds } from './lib/sounds';

type AppState = 'SPLASH' | 'BOOTING' | 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'WON' | 'WATCHING_REWARDED' | 'WATCHING_INTERSTITIAL';


export default function App() {
  const [appState, setAppState] = useState<AppState>('SPLASH');
  
  const [level, setLevel] = useState<number>(() => {
    const saved = localStorage.getItem('bubble_level');
    return saved ? parseInt(saved, 10) : 1;
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('bubble_sound');
    return saved ? saved === 'true' : true;
  });

  useEffect(() => {
    sounds.enabled = soundEnabled;
    localStorage.setItem('bubble_sound', soundEnabled.toString());
  }, [soundEnabled]);

  useEffect(() => {
    if (appState === 'SPLASH') {
       const timer = setTimeout(() => {
          setAppState('BOOTING');
       }, 2500);
       return () => clearTimeout(timer);
    }
  }, [appState]);

  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState<number>(() => {
    const savedMax = localStorage.getItem('bubble_max_unlocked_level');
    const savedCurrent = localStorage.getItem('bubble_level');
    
    if (savedMax) return parseInt(savedMax, 10);
    if (savedCurrent) {
       // if we only had the old save, upgrade it
       localStorage.setItem('bubble_max_unlocked_level', savedCurrent);
       return parseInt(savedCurrent, 10);
    }
    return 1;
  });

  const [isReady, setIsReady] = useState(false);

  const saveLevel = (newLevel: number) => {
    setLevel(newLevel);
    localStorage.setItem('bubble_level', newLevel.toString());
    
    if (newLevel > maxUnlockedLevel) {
      setMaxUnlockedLevel(newLevel);
      localStorage.setItem('bubble_max_unlocked_level', newLevel.toString());
    }
  };

  const handleLevelWin = React.useCallback(() => {
    setAppState('WON');
  }, []);

  const handleGameOver = React.useCallback(() => {
    setAppState('GAME_OVER');
  }, []);

  const nextLevel = () => {
    saveLevel(level + 1);
    setAppState('WATCHING_INTERSTITIAL'); // Show interstitial between levels
  };

  const restartLevel = () => {
    setAppState('WATCHING_INTERSTITIAL'); // Show interstitial when restarting
  };

  const watchAdToContinue = () => {
    setAppState('WATCHING_REWARDED');
  };

  const onRewardedComplete = () => {
    // Send event to game engine to clear bottom rows
    window.dispatchEvent(new CustomEvent('bubble-continue'));
    setAppState('PLAYING');
  };

  const onInterstitialComplete = () => {
    setAppState('PLAYING'); // Returns to playing the newly set level (via nextLevel or restart)
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 flex flex-col font-sans text-slate-100 selection:bg-indigo-500/30 overflow-hidden relative">
      {/* Dynamic Main App Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden h-full">
        
        {appState === 'SPLASH' && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 bg-slate-950">
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950"></div>
             <div className="relative z-10 flex flex-col items-center">
                <img src="/icon.svg" alt="App Icon" className="w-56 h-56 mx-auto mb-10 drop-shadow-2xl animate-pulse" />
                <div className="flex gap-2">
                  <div className="w-4 h-4 rounded-full bg-cyan-400 animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-4 h-4 rounded-full bg-indigo-500 animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-4 h-4 rounded-full bg-purple-500 animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
             </div>
          </div>
        )}

        {appState === 'BOOTING' && (
          <AppOpenAd onDismiss={() => setAppState('MENU')} />
        )}

        {appState === 'MENU' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500 bg-slate-950 relative overflow-y-auto">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 min-h-[150%]"></div>
            
            <div className="relative z-10">
              <img src="/icon.svg" alt="App Icon" className="w-40 h-40 mx-auto mb-8 drop-shadow-2xl hover:scale-105 transition-transform duration-300" />
              <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-300 to-purple-300 mb-3 tracking-tight">
                Bubble Shooters Pro
              </h1>
              <p className="text-indigo-200 mb-10 font-medium text-lg">Clear bubbles, conquer 5000 levels!</p>
              
              <div className="bg-slate-900/80 backdrop-blur-md p-8 rounded-3xl shadow-xl border border-indigo-500/20 mb-8 w-full max-w-sm mx-auto">
                <div className="flex flex-col gap-2 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium text-lg">Select Level</span>
                    <span className="text-xs text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-1 rounded-full border border-indigo-500/20">Unlocked: {maxUnlockedLevel}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded-2xl border border-slate-800">
                     <button
                       onClick={() => setLevel(Math.max(1, level - 1))}
                       disabled={level <= 1}
                       className="p-3 disabled:opacity-30 text-indigo-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all active:scale-95"
                     >
                       <ChevronLeft size={24} />
                     </button>
                     <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                       {level} <span className="text-slate-600 text-lg">/ 5000</span>
                     </span>
                     <button
                       onClick={() => setLevel(Math.min(maxUnlockedLevel, level + 1))}
                       disabled={level >= maxUnlockedLevel}
                       className="p-3 disabled:opacity-30 text-indigo-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all active:scale-95"
                     >
                       <ChevronRight size={24} />
                     </button>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    localStorage.setItem('bubble_level', level.toString());
                    setIsReady(false); // force unmount
                    setTimeout(() => {
                      setAppState('PLAYING');
                      setIsReady(true);
                    }, 50);
                  }}
                  className="w-full py-5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 active:scale-[0.98] text-white rounded-2xl font-bold text-xl flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                >
                  <Play fill="currentColor" size={24} /> Play Now
                </button>
              </div>
            </div>
          </div>
        )}

        {(appState === 'PLAYING' || appState === 'PAUSED' || appState === 'GAME_OVER' || appState === 'WON') && (
          <div className="flex-1 flex flex-col w-full bg-slate-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 pointer-events-none"></div>

            {/* Top HUD Overlay */}
            <div className="absolute top-0 left-0 right-0 z-20 w-full max-w-lg mx-auto flex justify-between items-start p-4 pt-6 pointer-events-none">
               <div className="flex flex-col gap-1 pointer-events-auto">
                 <span className="font-black text-white text-3xl tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none">L - {level}</span>
               </div>
               <div className="flex items-center gap-2">
                 <button 
                   onClick={() => setSoundEnabled(!soundEnabled)}
                   className="w-10 h-10 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-all pointer-events-auto active:scale-95 shadow-lg"
                   aria-label="Toggle Sound"
                 >
                   {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                 </button>
                 <button 
                   onClick={() => setAppState('PAUSED')}
                   className="w-10 h-10 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-all pointer-events-auto active:scale-95 shadow-lg"
                   aria-label="Pause"
                 >
                   <Pause fill="currentColor" size={20} />
                 </button>
               </div>
            </div>
            
            <div className="flex-1 w-full h-full relative flex items-center justify-center">
              {/* Force remount of game if level changes, but not when continuing */}
              <BubbleShooterGame 
                key={isReady ? 'ready' : level} // Key trick to remount on restart but not continue
                level={level} 
                isPaused={appState === 'PAUSED'}
                onGameOver={handleGameOver} 
                onWin={handleLevelWin} 
              />
              
              {/* Paused Overlay */}
              {appState === 'PAUSED' && (
                <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                  <h2 className="text-5xl font-black text-white mb-10 tracking-widest drop-shadow-lg">PAUSED</h2>
                  
                  <div className="flex flex-col gap-4 w-full max-w-xs relative z-40 block pointer-events-auto">
                    <button 
                      onClick={() => setAppState('PLAYING')}
                      className="w-full py-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 active:scale-[0.98] text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] text-xl"
                    >
                      <Play fill="currentColor" size={24} /> Resume
                    </button>
                    
                    <button 
                      onClick={() => {
                        setIsReady(!isReady); // Force remount
                        restartLevel();
                      }}
                      className="w-full py-4 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-white rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all border border-slate-700 hover:border-slate-600"
                    >
                      <RotateCcw size={20} /> Restart Level
                    </button>

                    <button 
                      onClick={() => setAppState('MENU')}
                      className="w-full py-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-slate-300 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all border border-slate-800 hover:border-slate-700"
                    >
                      <Home size={20} /> Main Menu
                    </button>
                  </div>
                </div>
              )}

              {/* Game Over Overlay */}
              {appState === 'GAME_OVER' && (
                <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                  <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-600 mb-2 drop-shadow-[0_0_15px_rgba(225,29,72,0.8)]">GAME OVER</h2>
                  <p className="text-slate-300 mb-8 text-lg font-medium">The bubbles reached the bottom.</p>
                  
                  <div className="flex flex-col gap-4 w-full max-w-xs relative z-40 block pointer-events-auto">
                    <button 
                      onClick={watchAdToContinue}
                      className="w-full py-4 bg-gradient-to-r from-emerald-400 to-green-600 hover:from-emerald-300 hover:to-green-500 active:scale-[0.98] text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(34,197,94,0.4)] text-lg"
                    >
                      <MonitorPlay size={24} /> Watch Ad to Continue
                    </button>
                    
                    <button 
                      onClick={() => {
                        setIsReady(!isReady); // Force remount
                        restartLevel();
                      }}
                      className="w-full py-4 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-white rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all border border-slate-700 hover:border-slate-600"
                    >
                      <RotateCcw size={20} /> Restart Level
                    </button>
                  </div>
                </div>
              )}

              {/* Won Overlay */}
              {appState === 'WON' && (
                <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-300">
                  <Trophy className="w-24 h-24 text-yellow-400 mb-6 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]" />
                  <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Level {level} Cleared!</h2>
                  
                  <button 
                    onClick={nextLevel}
                    className="mt-8 w-full max-w-xs py-4 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 active:scale-[0.98] text-indigo-950 rounded-2xl font-black text-xl transition-all shadow-[0_0_20px_rgba(251,191,36,0.6)] relative z-40 pointer-events-auto block"
                  >
                    Next Level
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Ads Overlays */}
      {appState === 'WATCHING_REWARDED' && (
        <FullScreenAd type="rewarded" onClose={() => setAppState('GAME_OVER')} onReward={onRewardedComplete} />
      )}
      
      {appState === 'WATCHING_INTERSTITIAL' && (
        <FullScreenAd type="interstitial" onClose={onInterstitialComplete} />
      )}

      {/* Persistent Banner Ad at Bottom */}
      <AdMobBanner />
    </div>
  );
}
