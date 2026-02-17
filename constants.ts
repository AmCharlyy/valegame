export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const PLAYER_SPEED = 5;
export const ZOMBIE_SPEED = 1.4;
export const KITTEN_SPEED = 4.5;

export const PLAYER_SIZE = 50; // Slightly larger for detail
export const ZOMBIE_SIZE = 42;
export const KITTEN_SIZE = 26;

// Combat Constants
export const EXERCISE_COOLDOWN = 30; 
export const DUMBBELL_COOLDOWN = 45; 
export const BOMB_COOLDOWN = 300; // New Protein Bomb
export const LASER_COOLDOWN = 110; 
export const ATTACK_RADIUS = 180; 

export const SPAWN_RATE_DECREMENT = 2; 
export const INITIAL_SPAWN_RATE = 75; 

// Physics & Visuals
export const GRAVITY = 0.35;
export const FRICTION = 0.88;
export const PARTICLE_COUNT_HIT = 12;
export const PARTICLE_COUNT_DEATH = 25;

export const ZOMBIE_QUOTES = [
  "Leg day...",
  "Too... cardio...",
  "My gains!",
  "Cheat day?",
  "Oof.",
  "Need protein...",
  "Cramping!",
  "Zero carb...",
  "Bruh."
];

// Apple Arcade / iOS Dark Mode Palette
export const COLORS = {
  background: '#000000', 
  floorGrid: '#1C1C1E', 
  
  // UI Glass
  glassBg: 'rgba(20, 20, 20, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  
  // Player (Valee)
  skin: '#E0AC69', 
  shirtGradientStart: '#FF2D55', // iOS Pink
  shirtGradientEnd: '#BF5AF2', // iOS Purple
  pants: '#1C1C1E', // iOS Dark Gray
  pantsStripe: '#30D158', // iOS Green
  hair: '#2d1b0e',
  
  // Zombie
  zombieSkin: '#30D158', // iOS Green
  zombieDark: '#248A3D',
  
  // Kitten
  kitten: '#FFD60A', // iOS Yellow
  kittenWhite: '#FFFFFF',
  collar: '#0A84FF', // iOS Blue
  laser: '#FF453A', // iOS Red
  
  // FX
  dumbbell: '#8E8E93', // iOS Gray
  bomb: '#FF9F0A', // Orange
  sparkle: '#BF5AF2', // iOS Purple
  
  // Levels (Background tints)
  levels: [
    '#111827', // Dark Blue (Start)
    '#1f1414', // Dark Red
    '#141f14', // Dark Green
    '#1f1f14', // Dark Yellow
    '#14141f', // Deep Purple
  ]
};