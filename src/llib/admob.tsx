import React, { useState, useEffect } from 'react';
import { X, Play, Loader2 } from 'lucide-react';

export const ADMOB_IDS = {
  APP_ID: 'ca-app-pub-3113275088766608~6530986035',
  BANNER: 'ca-app-pub-3113275088766608/5802182123',
  INTERSTITIAL: 'ca-app-pub-3113275088766608/9705768112',
  OPEN_APP: 'ca-app-pub-3113275088766608/5353635736',
};

// Simulated Banner Ad
export const AdMobBanner = () => {
  return (
    <div className="w-full flex items-center justify-center bg-slate-900 border-t border-slate-800 h-[60px] flex-shrink-0 relative z-50">
      <div className="text-center">
        <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Advertisement (AdMob Banner)</span>
        <span className="text-xs text-slate-600 font-mono">{ADMOB_IDS.BANNER}</span>
      </div>
    </div>
  );
};

// Simulated Open App Ad
export const AppOpenAd = ({ onDismiss }: { onDismiss: () => void }) => {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (countdown === 0) {
      onDismiss();
    }
  }, [countdown, onDismiss]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center text-white p-4">
      <div className="absolute top-6 right-6 text-sm bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-full backdrop-blur-md">
        Loading... {countdown}s
      </div>
      <div className="mb-10 relative mt-8">
        <div className="absolute inset-0 bg-indigo-500 blur-[30px] opacity-20 rounded-full"></div>
        <img src="/icon.svg" alt="App Icon" className="w-24 h-24 relative z-10 drop-shadow-xl" />
      </div>
      <h1 className="text-4xl font-black mb-3 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">
        Bubble Shooters Pro
      </h1>
      <p className="text-slate-400 mb-10 max-w-sm text-center text-lg">
        Simulating App Open Ad. In a native build, AdMob SDK handles this.
      </p>
      <div className="text-center p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-xl w-full max-w-sm">
        <span className="text-[10px] text-slate-500 block uppercase tracking-wider mb-2 font-bold">AdMob App Open ID</span>
        <span className="text-sm font-mono text-indigo-400 tracking-wide">{ADMOB_IDS.OPEN_APP}</span>
      </div>
    </div>
  );
};

// Simulated Rewarded / Interstitial Ad
export const FullScreenAd = ({ 
  type, 
  onClose, 
  onReward 
}: { 
  type: 'interstitial' | 'rewarded', 
  onClose: () => void,
  onReward?: () => void 
}) => {
  const AD_DURATION = type === 'rewarded' ? 5 : 3;
  const [timeLeft, setTimeLeft] = useState(AD_DURATION);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClose = () => {
    if (type === 'rewarded' && timeLeft === 0 && onReward) {
      onReward();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center text-white">
      <div className="w-full flex justify-between items-center p-4 border-b border-indigo-500/20 bg-slate-900/50 backdrop-blur-md">
        <div className="bg-white/10 px-4 py-2 rounded-full text-sm flex items-center gap-2 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse shadow-[0_0_10px_rgba(250,204,21,0.6)]" />
          {timeLeft > 0 ? `Ad finishes in ${timeLeft}s` : 'Reward Granted!'}
        </div>
        
        {timeLeft === 0 && (
          <button 
            onClick={handleClose} 
            className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md">
        <div className="w-28 h-28 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(99,102,241,0.4)] animate-pulse">
          <Play className="w-14 h-14 text-white ml-2" />
        </div>
        
        <h2 className="text-3xl font-black mb-4 tracking-tight">
          {type === 'rewarded' ? 'Watch Ad to Continue!' : 'Sponsor Message'}
        </h2>
        
        <p className="text-slate-400 mb-10 text-lg">
          This is a simulated AdMob {type} ad. In a distributed native build (Cordova/Capacitor/React Native), this would trigger the actual video ad.
        </p>

        <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 w-full shadow-lg">
          <span className="text-xs text-slate-500 block uppercase tracking-wider mb-2 font-bold">Selected Ad Unit ID</span>
          <code className="text-sm text-cyan-400 font-mono tracking-wide">
            {type === 'rewarded' ? ADMOB_IDS.INTERSTITIAL : ADMOB_IDS.INTERSTITIAL}
          </code>
        </div>
      </div>
    </div>
  );
};
