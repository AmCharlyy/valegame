export interface Position {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  pos: Position;
  velocity: Position;
  size: number;
  health: number;
  maxHealth: number;
  color: string;
  emoji: string;
  scale?: { x: number; y: number };
  rotation?: number;
}

export interface Player extends Entity {
  name: string;
  isExercising: boolean;
  exerciseTimer: number;
  facingRight: boolean;
  lastPos: Position;
  dumbbellCooldown: number;
  bombCooldown: number;
}

export interface Zombie extends Entity {
  speed: number;
  wobbleOffset: number;
  dialogue?: string;
  dialogueTimer?: number;
}

export interface Kitten extends Entity {
  targetId: string | null;
  laserCooldown: number;
  laserTargetPos?: Position; // For drawing the beam
}

export interface Projectile {
  id: string;
  type: 'shockwave' | 'dumbbell' | 'bomb';
  pos: Position;
  velocity: Position;
  duration: number;
  returnToPlayer?: boolean; 
  rotation?: number;
  radius?: number; // For bombs
}

export interface Particle {
  id: string;
  pos: Position;
  velocity: Position;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
}

export interface FloatingText {
  id: string;
  pos: Position;
  text: string;
  color: string;
  life: number;
  opacity: number;
  velocity: Position;
  isDialogue?: boolean;
}

export interface GameState {
  isPlaying: boolean;
  isGameOver: boolean;
  score: number;
  wave: number;
  level: number;
  health: number;
  narrative: string;
  narrativeLoading: boolean;
  showMobileControls: boolean;
}

export interface TouchInput {
  joystickVector: { x: number; y: number }; 
  isActionAPressed: boolean; // Squat
  isActionBPressed: boolean; // Throw
  isActionCPressed: boolean; // Bomb
}