import React, { useState, useRef } from 'react';
import { GameState, TouchInput } from '../types';
import { BOMB_COOLDOWN } from '../constants';

interface UIOverlayProps {
  gameState: GameState;
  playerBombCooldown: number;
  onStart: () => void;
  onRestart: () => void;
  onToggleMobile: () => void;
  touchInputRef: React.MutableRefObject<TouchInput>;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({ 
  gameState, 
  playerBombCooldown,
  onStart, 
  onRestart, 
  onToggleMobile,
  touchInputRef 
}) => {
  // Joystick State
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });

  // Joystick Handlers
  const handleJoystickStart = (e: React.TouchEvent) => {
    setJoystickActive(true);
  };

  const handleJoystickMove = (e: React.TouchEvent) => {
    if (!joystickActive || !joystickRef.current) return;
    const touch = e.touches[0];
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDist = rect.width / 2;

    if (distance > maxDist) {
      dx = (dx / distance) * maxDist;
      dy = (dy / distance) * maxDist;
    }

    setJoystickPos({ x: dx, y: dy });
    
    touchInputRef.current.joystickVector = {
      x: dx / maxDist,
      y: dy / maxDist
    };
  };

  const handleJoystickEnd = () => {
    setJoystickActive(false);
    setJoystickPos({ x: 0, y: 0 });
    touchInputRef.current.joystickVector = { x: 0, y: 0 };
  };

  // Button handlers
  const handleBtnStart = (e: React.TouchEvent, action: 'A' | 'B' | 'C') => {
    e.preventDefault();
    if (action === 'A') touchInputRef.current.isActionAPressed = true;
    if (action === 'B') touchInputRef.current.isActionBPressed = true;
    if (action === 'C') touchInputRef.current.isActionCPressed = true;
  };

  const handleBtnEnd = (e: React.TouchEvent, action: 'A' | 'B' | 'C') => {
    e.preventDefault();
    if (action === 'A') touchInputRef.current.isActionAPressed = false;
    if (action === 'B') touchInputRef.current.isActionBPressed = false;
    if (action === 'C') touchInputRef.current.isActionCPressed = false;
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between overflow-hidden font-sans select-none text-white">
      
      {/* --- TOP HUD --- */}
      <div className="flex justify-between items-start p-6 w-full">
        
        {/* Left: Player Info & Stats */}
        <div className="flex flex-col gap-4 animate-fade-in-down">
          
          {/* Avatar / Name Card */}
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl border border-white/10 pr-6 pl-2 py-2 rounded-full shadow-lg">
             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center text-lg shadow-inner border border-white/20">
               👩‍🎤
             </div>
             <div className="flex flex-col">
                 <span className="text-sm font-bold tracking-wide text-white leading-none">Valee</span>
                 <span className="text-[10px] text-white/50 uppercase font-semibold mt-1">Lvl {gameState.level}</span>
             </div>
          </div>

          <div className="flex gap-3">
             {/* Score */}
             <div className="bg-black/30 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-xl shadow-lg flex flex-col min-w-[90px]">
                <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Score</span>
                <span className="text-xl font-medium font-monospaced tabular-nums text-white/90">{gameState.score}</span>
             </div>

             {/* Wave */}
             <div className="bg-black/30 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-xl shadow-lg flex flex-col min-w-[70px]">
                <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Wave</span>
                <span className="text-xl font-medium text-yellow-400">{gameState.wave}</span>
             </div>
          </div>

          {/* Health Bar */}
          <div className="bg-black/30 backdrop-blur-xl border border-white/10 px-3 py-2 rounded-full shadow-lg flex items-center gap-3 w-64 transition-transform hover:scale-105">
             <span className="text-red-500 text-xs font-bold">♥</span>
             <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-gradient-to-r from-red-500 to-pink-500 shadow-[0_0_10px_rgba(239,68,68,0.6)] transition-all duration-300 ease-out"
                 style={{ width: `${Math.max(0, gameState.health)}%` }}
               />
             </div>
          </div>
        </div>

        {/* Right: Controls & Narrative */}
        <div className="flex flex-col items-end gap-4 max-w-sm pointer-events-auto">
           <button 
             onClick={onToggleMobile} 
             className={`
               w-10 h-10 flex items-center justify-center rounded-xl backdrop-blur-xl shadow-lg transition-all duration-300
               border border-white/10
               ${gameState.showMobileControls ? 'bg-white text-black' : 'bg-black/40 text-white hover:bg-white/20'}
             `}
           >
             <span className="material-symbols-outlined text-lg">📱</span>
           </button>

           {gameState.narrative && (
             <div className="bg-black/40 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl shadow-2xl animate-slide-in-right">
               <div className="flex items-center gap-2 mb-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                 <span className="text-[9px] font-bold text-blue-300 uppercase tracking-widest">AI Commentary</span>
               </div>
               <p className="text-white/90 text-sm font-medium leading-snug">
                 {gameState.narrative}
               </p>
             </div>
           )}
        </div>
      </div>

      {/* --- MENU --- */}
      {(!gameState.isPlaying || gameState.isGameOver) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-lg z-50 pointer-events-auto p-4">
          <div className="relative bg-[#1c1c1e] border border-white/10 p-8 rounded-[40px] shadow-2xl text-center max-w-md w-full overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-pink-500/20 blur-[80px] -z-10"></div>
            <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-br from-white via-gray-200 to-gray-500 mb-2 tracking-tight">
              {gameState.isGameOver ? "GAME OVER" : "Fit Survivor"}
            </h1>
            <p className="text-white/60 mb-8 font-medium text-lg">
              {gameState.isGameOver ? `Valee survived ${gameState.wave} waves.` : "Help Valee & Kitten survive."}
            </p>

            <button 
              onClick={gameState.isGameOver ? onRestart : onStart}
              className="w-full py-4 bg-white text-black font-bold text-lg rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
            >
              {gameState.isGameOver ? "Try Again" : "Start Run"}
            </button>
            
            {!gameState.isGameOver && (
               <div className="mt-6 text-xs text-white/30 font-medium">
                 WASD to move • SPACE Squat • K Dumbbell • L Protein Bomb
               </div>
            )}
          </div>
        </div>
      )}

      {/* --- MOBILE CONTROLS --- */}
      {gameState.showMobileControls && gameState.isPlaying && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-end pb-6 px-6">
          <div className="flex justify-between items-end w-full pointer-events-auto">
            
            {/* Joystick */}
            <div 
              ref={joystickRef}
              className="w-32 h-32 bg-white/5 backdrop-blur-2xl rounded-full border border-white/10 flex items-center justify-center relative touch-none shadow-xl mb-4"
              onTouchStart={handleJoystickStart}
              onTouchMove={handleJoystickMove}
              onTouchEnd={handleJoystickEnd}
            >
              <div 
                className="w-12 h-12 bg-white/80 rounded-full shadow-lg absolute transition-transform duration-75"
                style={{ transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)` }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col items-end gap-3 mb-2">
               {/* Top Row: Small Actions */}
               <div className="flex gap-3">
                   {/* Bomb Button (C) */}
                   <button
                    className={`w-16 h-16 backdrop-blur-2xl border border-white/10 rounded-full flex items-center justify-center transition-all touch-none shadow-xl relative overflow-hidden ${playerBombCooldown > 0 ? 'bg-gray-800/50 opacity-50' : 'bg-orange-500/30 active:bg-orange-500/50'}`}
                    onTouchStart={(e) => handleBtnStart(e, 'C')}
                    onTouchEnd={(e) => handleBtnEnd(e, 'C')}
                   >
                     <span className="text-white font-bold text-xs z-10">BOMB</span>
                     {playerBombCooldown > 0 && (
                       <div 
                         className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px]"
                       >
                         {Math.ceil(playerBombCooldown/60)}s
                       </div>
                     )}
                   </button>

                   {/* Throw Button (B) */}
                   <button
                    className="w-16 h-16 bg-blue-500/30 backdrop-blur-2xl border border-white/10 rounded-full flex items-center justify-center active:bg-blue-500/50 transition-all touch-none shadow-xl"
                    onTouchStart={(e) => handleBtnStart(e, 'B')}
                    onTouchEnd={(e) => handleBtnEnd(e, 'B')}
                   >
                     <span className="text-white font-bold text-xs">YEET</span>
                   </button>
               </div>

               {/* Bottom Row: Main Action (Squat) */}
               <button
                className="w-24 h-24 bg-pink-500/30 backdrop-blur-2xl border border-white/10 rounded-full flex items-center justify-center active:bg-pink-500/50 active:scale-95 transition-all touch-none shadow-xl"
                onTouchStart={(e) => handleBtnStart(e, 'A')}
                onTouchEnd={(e) => handleBtnEnd(e, 'A')}
               >
                 <span className="text-white font-bold text-lg">SQUAT</span>
               </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};