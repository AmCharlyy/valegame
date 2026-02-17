import React from 'react';
import { GameCanvas } from './components/GameCanvas';

function App() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center font-sans">
      <GameCanvas />
    </div>
  );
}

export default App;