import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_SIZE, ZOMBIE_SIZE, KITTEN_SIZE, 
  PLAYER_SPEED, ZOMBIE_SPEED, KITTEN_SPEED, ATTACK_RADIUS, 
  EXERCISE_COOLDOWN, DUMBBELL_COOLDOWN, BOMB_COOLDOWN, LASER_COOLDOWN, INITIAL_SPAWN_RATE, SPAWN_RATE_DECREMENT,
  COLORS, GRAVITY, PARTICLE_COUNT_HIT, PARTICLE_COUNT_DEATH, ZOMBIE_QUOTES
} from '../constants';
import { Player, Zombie, Kitten, Projectile, GameState, Particle, FloatingText, TouchInput } from '../types';
import { UIOverlay } from './UIOverlay';
import { generateGameNarrative } from '../services/geminiService';
import { playSound } from '../utils/sound';

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const shakeIntensityRef = useRef<number>(0);
  
  // Input
  const keysPressed = useRef<Set<string>>(new Set());
  const touchInputRef = useRef<TouchInput>({
    joystickVector: { x: 0, y: 0 },
    isActionAPressed: false,
    isActionBPressed: false,
    isActionCPressed: false
  });

  // Entities
  const playerRef = useRef<Player>({
    id: 'valee',
    name: 'Valee',
    pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    lastPos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    velocity: { x: 0, y: 0 },
    size: PLAYER_SIZE,
    health: 100,
    maxHealth: 100,
    color: COLORS.shirtGradientStart,
    emoji: '',
    isExercising: false,
    exerciseTimer: 0,
    facingRight: true,
    scale: { x: 1, y: 1 },
    rotation: 0,
    dumbbellCooldown: 0,
    bombCooldown: 0
  });

  const kittenRef = useRef<Kitten>({
    id: 'kitten',
    pos: { x: CANVAS_WIDTH / 2 - 50, y: CANVAS_HEIGHT / 2 },
    velocity: { x: 0, y: 0 },
    size: KITTEN_SIZE,
    health: 100,
    maxHealth: 100,
    color: COLORS.kitten,
    emoji: '',
    targetId: null,
    rotation: 0,
    laserCooldown: 0
  });

  const zombiesRef = useRef<Zombie[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  
  const scoreRef = useRef<number>(0);
  const waveRef = useRef<number>(1);
  const spawnRateRef = useRef<number>(INITIAL_SPAWN_RATE);
  
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    isGameOver: false,
    score: 0,
    wave: 1,
    level: 1,
    health: 100,
    narrative: "",
    narrativeLoading: false,
    showMobileControls: false,
  });

  // --- HELPERS ---

  const addShake = (amount: number) => {
    shakeIntensityRef.current = Math.min(shakeIntensityRef.current + amount, 30);
  };

  const spawnParticles = (x: number, y: number, color: string, count: number, speedMultiplier: number = 1) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 * speedMultiplier;
      particlesRef.current.push({
        id: Math.random().toString(),
        pos: { x, y },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed - 1.5
        },
        life: 1.0,
        maxLife: 1.0,
        color: color,
        size: Math.random() * 3 + 2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3
      });
    }
  };

  const spawnFloatingText = (x: number, y: number, text: string, color: string, isDialogue: boolean = false) => {
    floatingTextsRef.current.push({
      id: Math.random().toString(),
      pos: { x, y: y - 40 },
      velocity: { x: (Math.random() - 0.5) * (isDialogue ? 0.2 : 1), y: isDialogue ? -0.5 : -1.5 },
      text,
      color,
      life: isDialogue ? 90 : 50,
      opacity: 1,
      isDialogue
    });
  };

  const spawnZombie = () => {
    const edge = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    const offset = 80;
    
    switch(edge) {
      case 0: x = Math.random() * CANVAS_WIDTH; y = -offset; break;
      case 1: x = CANVAS_WIDTH + offset; y = Math.random() * CANVAS_HEIGHT; break;
      case 2: x = Math.random() * CANVAS_WIDTH; y = CANVAS_HEIGHT + offset; break;
      case 3: x = -offset; y = Math.random() * CANVAS_HEIGHT; break;
    }

    const speedMultiplier = 1 + (waveRef.current * 0.05);
    zombiesRef.current.push({
      id: `zombie_${Date.now()}_${Math.random()}`,
      pos: { x, y },
      velocity: { x: 0, y: 0 },
      size: ZOMBIE_SIZE,
      health: 30 + (waveRef.current * 10),
      maxHealth: 30 + (waveRef.current * 10),
      color: COLORS.zombieSkin,
      emoji: '',
      speed: ZOMBIE_SPEED * speedMultiplier,
      wobbleOffset: Math.random() * Math.PI * 2
    });
  };

  const updateNarrative = useCallback(async (situation: 'start' | 'wave_complete' | 'game_over' | 'low_health') => {
    setGameState(prev => ({ ...prev, narrativeLoading: true }));
    const text = await generateGameNarrative(waveRef.current, scoreRef.current, situation);
    setGameState(prev => ({ ...prev, narrative: text, narrativeLoading: false }));
  }, []);

  const startGame = () => {
    playerRef.current = {
      ...playerRef.current,
      pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
      lastPos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
      health: 100,
      isExercising: false,
      exerciseTimer: 0,
      dumbbellCooldown: 0,
      bombCooldown: 0
    };
    kittenRef.current = {
        ...kittenRef.current,
        pos: { x: CANVAS_WIDTH / 2 - 50, y: CANVAS_HEIGHT / 2 },
        laserCooldown: 0
    };
    zombiesRef.current = [];
    projectilesRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    scoreRef.current = 0;
    waveRef.current = 1;
    spawnRateRef.current = INITIAL_SPAWN_RATE;
    
    setGameState(prev => ({
      ...prev,
      isPlaying: true,
      isGameOver: false,
      score: 0,
      wave: 1,
      level: 1,
      health: 100,
      narrative: "Let's go, Valee. Time to burn.",
      narrativeLoading: false,
    }));
    
    playSound('powerup');
    updateNarrative('start');
  };

  // --- LOGIC ---

  const handleInput = () => {
    const player = playerRef.current;
    player.lastPos = { ...player.pos };
    if (player.dumbbellCooldown > 0) player.dumbbellCooldown--;
    if (player.bombCooldown > 0) player.bombCooldown--;

    // 1. Squat / Shockwave
    if (player.exerciseTimer > 0) {
      player.exerciseTimer--;
      // Mid-point trigger
      if (player.exerciseTimer === EXERCISE_COOLDOWN - 10) {
        addShake(8);
        playSound('hit');
        projectilesRef.current.push({
          id: `shock_${Date.now()}`,
          type: 'shockwave',
          pos: { ...player.pos },
          velocity: { x: 0, y: 0 },
          duration: 15
        });
        
        zombiesRef.current.forEach(z => {
          if (Math.hypot(z.pos.x - player.pos.x, z.pos.y - player.pos.y) < ATTACK_RADIUS) {
            z.health -= 50;
            const angle = Math.atan2(z.pos.y - player.pos.y, z.pos.x - player.pos.x);
            z.pos.x += Math.cos(angle) * 80;
            z.pos.y += Math.sin(angle) * 80;
            spawnParticles(z.pos.x, z.pos.y, COLORS.zombieSkin, PARTICLE_COUNT_HIT);
            spawnFloatingText(z.pos.x, z.pos.y, "CRUNCH", "#fff");
            if (z.health <= 0) addShake(2);
          }
        });
      }
      return; 
    }
    player.isExercising = false;

    // 2. Dumbbell Throw
    const isThrowing = keysPressed.current.has('k') || touchInputRef.current.isActionBPressed;
    if (isThrowing && player.dumbbellCooldown <= 0) {
        player.dumbbellCooldown = DUMBBELL_COOLDOWN;
        const throwDir = player.facingRight ? 1 : -1;
        projectilesRef.current.push({
            id: `db_${Date.now()}`,
            type: 'dumbbell',
            pos: { x: player.pos.x, y: player.pos.y - 20 },
            velocity: { x: throwDir * 14, y: 0 },
            duration: 60,
            rotation: 0
        });
        spawnFloatingText(player.pos.x, player.pos.y - 40, "YEET!", COLORS.dumbbell);
        playSound('yeet');
    }

    // 3. Protein Bomb (Area Deny)
    const isBombing = keysPressed.current.has('l') || touchInputRef.current.isActionCPressed;
    if (isBombing && player.bombCooldown <= 0) {
        player.bombCooldown = BOMB_COOLDOWN;
        projectilesRef.current.push({
            id: `bomb_${Date.now()}`,
            type: 'bomb',
            pos: { x: player.pos.x, y: player.pos.y },
            velocity: { x: 0, y: 0 },
            duration: 60, // Fuse time
            radius: 250
        });
        spawnFloatingText(player.pos.x, player.pos.y - 50, "PROTEIN BOMB!", COLORS.bomb);
        playSound('powerup');
    }

    // 4. Movement
    let dx = 0, dy = 0;
    if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) dy -= 1;
    if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) dy += 1;
    if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) dx -= 1;
    if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) dx += 1;

    const joy = touchInputRef.current.joystickVector;
    if (joy.x !== 0 || joy.y !== 0) { dx = joy.x; dy = joy.y; }

    if (dx !== 0 || dy !== 0) {
      if (joy.x === 0 && Math.abs(dx) > 0 && Math.abs(dy) > 0) {
          const l = Math.sqrt(dx*dx + dy*dy);
          dx /= l; dy /= l;
      }
      player.pos.x += dx * PLAYER_SPEED;
      player.pos.y += dy * PLAYER_SPEED;
      player.facingRight = dx !== 0 ? dx > 0 : player.facingRight;
      
      // Bounds
      player.pos.x = Math.max(20, Math.min(CANVAS_WIDTH - 20, player.pos.x));
      player.pos.y = Math.max(20, Math.min(CANVAS_HEIGHT - 20, player.pos.y));
    }

    if (keysPressed.current.has(' ') || touchInputRef.current.isActionAPressed) {
      player.isExercising = true;
      player.exerciseTimer = EXERCISE_COOLDOWN;
    }
  };

  const updateEntities = () => {
    const player = playerRef.current;
    const kitten = kittenRef.current;

    // Particles
    particlesRef.current.forEach(p => {
        p.pos.x += p.velocity.x;
        p.pos.y += p.velocity.y;
        p.velocity.y += GRAVITY;
        p.rotation += p.rotationSpeed;
        p.life -= 0.04;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    // Text
    floatingTextsRef.current.forEach(t => {
        t.pos.x += t.velocity.x;
        t.pos.y += t.velocity.y;
        t.life--;
        t.opacity = t.isDialogue ? Math.min(1, t.life/20) : t.life / 50;
    });
    floatingTextsRef.current = floatingTextsRef.current.filter(t => t.life > 0);

    // --- KITTEN AI & LASER ---
    let nearestZombie: Zombie | null = null;
    let minDst = Infinity;
    zombiesRef.current.forEach(z => {
      const d = Math.hypot(z.pos.x - kitten.pos.x, z.pos.y - kitten.pos.y);
      if (d < minDst) { minDst = d; nearestZombie = z; }
    });

    kitten.laserTargetPos = undefined;
    if (kitten.laserCooldown > 0) kitten.laserCooldown--;

    if (nearestZombie && minDst < 300) {
        if (kitten.laserCooldown <= 0) {
            kitten.laserCooldown = LASER_COOLDOWN;
            kitten.laserTargetPos = { x: nearestZombie.pos.x, y: nearestZombie.pos.y };
            nearestZombie.health -= 70; 
            spawnParticles(nearestZombie.pos.x, nearestZombie.pos.y, COLORS.laser, 5);
            spawnFloatingText(nearestZombie.pos.x, nearestZombie.pos.y, "PEW!", COLORS.laser);
            playSound('shoot');
            addShake(4);
        } else if (kitten.laserCooldown > LASER_COOLDOWN - 10 && nearestZombie) {
             kitten.laserTargetPos = { x: nearestZombie.pos.x, y: nearestZombie.pos.y };
        }
    }

    // Follow Logic
    const orbit = frameCountRef.current * 0.05;
    const targetX = player.pos.x + Math.cos(orbit) * 60;
    const targetY = player.pos.y + Math.sin(orbit) * 20;
    
    const kAngle = Math.atan2(targetY - kitten.pos.y, targetX - kitten.pos.x);
    const kDist = Math.hypot(targetX - kitten.pos.x, targetY - kitten.pos.y);
    if (kDist > 5) {
      kitten.pos.x += Math.cos(kAngle) * KITTEN_SPEED;
      kitten.pos.y += Math.sin(kAngle) * KITTEN_SPEED;
    }

    // --- ZOMBIES ---
    zombiesRef.current.forEach(z => {
      const angle = Math.atan2(player.pos.y - z.pos.y, player.pos.x - z.pos.x);
      z.pos.x += Math.cos(angle) * z.speed;
      z.pos.y += Math.sin(angle) * z.speed;

      if (Math.hypot(player.pos.x - z.pos.x, player.pos.y - z.pos.y) < 35) {
        player.health -= 0.6;
        if (frameCountRef.current % 20 === 0) {
            addShake(5);
            playSound('hit');
            spawnParticles(player.pos.x, player.pos.y, COLORS.shirtGradientStart, 3);
        }
      }
    });

    const preCount = zombiesRef.current.length;
    zombiesRef.current = zombiesRef.current.filter(z => {
        if (z.health <= 0) {
            spawnParticles(z.pos.x, z.pos.y, COLORS.zombieSkin, PARTICLE_COUNT_DEATH);
            // Random Dialogue
            if (Math.random() < 0.15) {
                const quote = ZOMBIE_QUOTES[Math.floor(Math.random() * ZOMBIE_QUOTES.length)];
                spawnFloatingText(z.pos.x, z.pos.y, quote, '#88ff88', true);
            }
            return false;
        }
        return true;
    });
    if (preCount > zombiesRef.current.length) scoreRef.current += (preCount - zombiesRef.current.length) * 10;

    // Level & Wave Logic
    if (scoreRef.current > waveRef.current * 300) {
      waveRef.current++;
      
      // Level up every 3 waves
      if (waveRef.current % 3 === 0) {
         setGameState(prev => ({...prev, level: prev.level + 1}));
         playSound('powerup');
      }

      spawnRateRef.current = Math.max(30, INITIAL_SPAWN_RATE - (waveRef.current * SPAWN_RATE_DECREMENT));
      player.health = Math.min(100, player.health + 30);
      spawnFloatingText(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, "WAVE CLEARED", COLORS.collar);
      addShake(10);
      updateNarrative('wave_complete');
    }
    if (frameCountRef.current % Math.floor(spawnRateRef.current) === 0) spawnZombie();

    // Projectiles
    projectilesRef.current.forEach(p => {
        p.duration--;
        if (p.type === 'dumbbell') {
            p.rotation = (p.rotation || 0) + 0.4;
            // Boomerang
            if (p.duration < 30) {
                const dx = player.pos.x - p.pos.x;
                const dy = player.pos.y - p.pos.y;
                const d = Math.sqrt(dx*dx+dy*dy);
                p.velocity.x += (dx/d)*2.5;
                p.velocity.y += (dy/d)*2.5;
                p.velocity.x *= 0.85; p.velocity.y *= 0.85;
            }
            p.pos.x += p.velocity.x;
            p.pos.y += p.velocity.y;
            
            zombiesRef.current.forEach(z => {
                if (Math.hypot(z.pos.x - p.pos.x, z.pos.y - p.pos.y) < z.size) {
                    z.health -= 40;
                    spawnParticles(z.pos.x, z.pos.y, COLORS.zombieSkin, 3);
                    z.pos.x += p.velocity.x * 0.5;
                    z.pos.y += p.velocity.y * 0.5;
                }
            });
        } else if (p.type === 'bomb') {
           // Fuse ticking logic (flashing?)
           if (p.duration <= 1) {
              // EXPLODE
              playSound('explosion');
              addShake(15);
              spawnParticles(p.pos.x, p.pos.y, COLORS.bomb, 30, 2);
              zombiesRef.current.forEach(z => {
                 const d = Math.hypot(z.pos.x - p.pos.x, z.pos.y - p.pos.y);
                 if (d < (p.radius || 200)) {
                    z.health -= 200; // Massive damage
                    const angle = Math.atan2(z.pos.y - p.pos.y, z.pos.x - p.pos.x);
                    z.pos.x += Math.cos(angle) * 150;
                    z.pos.y += Math.sin(angle) * 150;
                 }
              });
           }
        }
    });
    projectilesRef.current = projectilesRef.current.filter(p => p.duration > 0);

    shakeIntensityRef.current *= 0.9;
    if (shakeIntensityRef.current < 0.5) shakeIntensityRef.current = 0;

    if (player.health <= 0) {
      setGameState(p => ({ ...p, isPlaying: false, isGameOver: true, score: scoreRef.current, wave: waveRef.current }));
      playSound('explosion'); // Sad sound
      updateNarrative('game_over');
    } else if (frameCountRef.current % 10 === 0) {
      setGameState(p => ({ ...p, score: scoreRef.current, wave: waveRef.current, health: Math.floor(player.health) }));
    }
  };

  // --- RENDERING ---

  const drawPlayer = (ctx: CanvasRenderingContext2D, p: Player) => {
    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);
    if (!p.facingRight) ctx.scale(-1, 1);

    const isMoving = (Math.abs(p.pos.x - p.lastPos.x) > 0.1 || Math.abs(p.pos.y - p.lastPos.y) > 0.1) && !p.isExercising;
    const time = frameCountRef.current;
    
    let bodyY = 0, legBend = 0;
    if (p.isExercising) {
        const t = (EXERCISE_COOLDOWN - p.exerciseTimer) / EXERCISE_COOLDOWN;
        const depth = Math.sin(t * Math.PI); 
        bodyY = depth * 15; legBend = depth * 15; 
    } else if (isMoving) {
        bodyY = Math.sin(time * 0.4) * 3;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 42, 14, 5, 0, 0, Math.PI*2);
    ctx.fill();

    // LEGS (Fixing the one-leg issue by offsetting them)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const drawLeg = (isBack: boolean) => {
       ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
       ctx.fillStyle = COLORS.pants;
       
       const phase = isBack ? Math.PI : 0; // Opposite phase
       const zIndexOff = isBack ? -4 : 4;  // Back leg X offset

       ctx.beginPath();
       if (p.isExercising) {
           // Squat
           ctx.moveTo(zIndexOff, 15+bodyY); 
           ctx.lineTo(zIndexOff * 1.5 - legBend/2, 30); 
           ctx.lineTo(zIndexOff, 42);
       } else if (isMoving) {
           // Run Cycle (Sine Wave)
           const run = Math.sin(time * 0.5 + phase) * 12;
           const lift = Math.cos(time * 0.5 + phase) * 5; // Knee lift
           ctx.moveTo(zIndexOff, 15+bodyY);
           ctx.lineTo(zIndexOff + run, 30 - Math.max(0, lift));
           ctx.lineTo(zIndexOff + run * 1.2, 42 - Math.max(0, -lift));
       } else {
           // Idle (Stance)
           ctx.moveTo(zIndexOff, 15+bodyY); 
           ctx.lineTo(zIndexOff*1.2, 42);
       }
       ctx.fill();
       ctx.stroke();

       // Stripe
       ctx.strokeStyle = COLORS.pantsStripe; ctx.lineWidth = 2;
       ctx.beginPath();
       if (p.isExercising) {
            ctx.moveTo(zIndexOff*1.2 - legBend/3, 20); ctx.lineTo(zIndexOff, 40);
       } else if (isMoving) {
           const run = Math.sin(time * 0.5 + phase) * 12;
           ctx.moveTo(zIndexOff + run*0.5, 20); ctx.lineTo(zIndexOff + run, 40);
       } else {
           ctx.moveTo(zIndexOff, 20); ctx.lineTo(zIndexOff, 40);
       }
       ctx.stroke();
    }

    // Draw Back Leg first
    drawLeg(true);

    // Body (Gradient Shirt)
    const grad = ctx.createLinearGradient(0, -10+bodyY, 0, 15+bodyY);
    grad.addColorStop(0, COLORS.shirtGradientStart);
    grad.addColorStop(1, COLORS.shirtGradientEnd);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(-11, -10+bodyY, 22, 28, 6);
    ctx.fill();
    
    // Draw Front Leg
    drawLeg(false);

    // Arms
    ctx.strokeStyle = COLORS.skin; ctx.lineWidth = 5; 
    ctx.beginPath();
    if (p.isExercising) {
        ctx.moveTo(-9, -6+bodyY); ctx.lineTo(-20, -14+bodyY); ctx.lineTo(-14, -30+bodyY);
        ctx.moveTo(9, -6+bodyY); ctx.lineTo(20, -14+bodyY); ctx.lineTo(14, -30+bodyY);
    } else if (isMoving) {
        const ph = Math.sin(time*0.5);
        ctx.moveTo(0, -6+bodyY); ctx.lineTo(ph*14, 10+bodyY); ctx.lineTo(ph*18, 20+bodyY);
    } else {
        ctx.moveTo(-9, -6+bodyY); ctx.lineTo(-14, 14+bodyY);
        ctx.moveTo(9, -6+bodyY); ctx.lineTo(14, 14+bodyY);
    }
    ctx.stroke();

    // Head
    ctx.fillStyle = COLORS.skin;
    ctx.beginPath(); ctx.arc(0, -16+bodyY, 11, 0, Math.PI*2); ctx.fill();

    // Hair (Improved Physics)
    ctx.fillStyle = COLORS.hair;
    ctx.beginPath();
    // Scalp
    ctx.arc(0, -18+bodyY, 12, Math.PI, 0);
    ctx.lineTo(12, -14+bodyY);
    ctx.lineTo(-12, -14+bodyY);
    ctx.fill();
    
    // Ponytail
    const vel = (p.pos.x - p.lastPos.x)*3; // More drag
    const lag = Math.max(-15, Math.min(15, vel));
    ctx.beginPath();
    ctx.moveTo(-10, -18+bodyY);
    // Dynamic curve based on velocity
    ctx.bezierCurveTo(-25-lag, -15+bodyY, -20-lag, 5+bodyY, -12-lag*0.5, 8+bodyY); 
    ctx.lineTo(-8, -14+bodyY);
    ctx.fill();

    // Headband
    ctx.strokeStyle = COLORS.shirtGradientEnd; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-10, -20+bodyY); ctx.quadraticCurveTo(0, -24+bodyY, 10, -20+bodyY); ctx.stroke();

    ctx.restore();
  };

  const drawZombie = (ctx: CanvasRenderingContext2D, z: Zombie) => {
    ctx.save();
    ctx.translate(z.pos.x, z.pos.y);
    const wobble = Math.sin(frameCountRef.current*0.1 + z.wobbleOffset)*4;
    ctx.rotate(wobble * 0.05);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 15, 12, 4, 0, 0, Math.PI*2); ctx.fill();

    // Body
    ctx.fillStyle = COLORS.zombieSkin;
    ctx.beginPath();
    ctx.roundRect(-12, -20, 24, 35, 8);
    ctx.fill();

    // Arms reaching
    ctx.strokeStyle = COLORS.zombieDark; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath();
    const aw = Math.sin(frameCountRef.current*0.2 + z.wobbleOffset)*3;
    ctx.moveTo(-10, -5); ctx.lineTo(-20, 8+aw);
    ctx.moveTo(10, -5); ctx.lineTo(20, 4-aw);
    ctx.stroke();

    // Face
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(-5, -12, 3, 0, Math.PI*2); ctx.arc(5, -11, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FF3B30';
    ctx.beginPath(); ctx.arc(-5, -12, 1, 0, Math.PI*2); ctx.fill();

    // Health Bar
    const hp = z.health/z.maxHealth;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-14, -32, 28, 4);
    ctx.fillStyle = hp > 0.5 ? '#30D158' : '#FF453A'; ctx.fillRect(-14, -32, 28*hp, 4);

    ctx.restore();
  };

  const drawKitten = (ctx: CanvasRenderingContext2D, k: Kitten) => {
    ctx.save();
    ctx.translate(k.pos.x, k.pos.y);
    const bounce = Math.abs(Math.sin(frameCountRef.current*0.4))*5;
    ctx.translate(0, -bounce);
    if (playerRef.current.pos.x < k.pos.x) ctx.scale(-1, 1);

    // Body
    ctx.fillStyle = COLORS.kitten;
    ctx.beginPath(); ctx.ellipse(0, 6, 12, 8, 0, 0, Math.PI*2); ctx.fill();
    // Belly
    ctx.fillStyle = COLORS.kittenWhite;
    ctx.beginPath(); ctx.ellipse(0, 8, 6, 5, 0, 0, Math.PI*2); ctx.fill();

    // Head
    ctx.fillStyle = COLORS.kitten;
    ctx.beginPath(); ctx.arc(0, -6, 10, 0, Math.PI*2); ctx.fill();

    // Ears
    ctx.beginPath();
    ctx.moveTo(-8, -12); ctx.lineTo(-11, -19); ctx.lineTo(-3, -14);
    ctx.moveTo(8, -12); ctx.lineTo(11, -19); ctx.lineTo(3, -14);
    ctx.fill();

    // Collar
    ctx.strokeStyle = COLORS.collar; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-6, 2); ctx.quadraticCurveTo(0, 5, 6, 2); ctx.stroke();
    // Tag
    ctx.fillStyle = '#FFD700';
    ctx.beginPath(); ctx.arc(0, 5, 2, 0, Math.PI*2); ctx.fill();

    // Face
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(-4, -6, 2.5, 3.5, 0, 0, Math.PI*2); ctx.ellipse(4, -6, 2.5, 3.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(-4.5, -7.5, 1.2, 0, Math.PI*2); ctx.arc(3.5, -7.5, 1.2, 0, Math.PI*2); ctx.fill();

    // Tail
    const wag = Math.sin(frameCountRef.current*0.4)*10;
    ctx.strokeStyle = COLORS.kitten; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-10, 5); ctx.quadraticCurveTo(-18, 0, -18-wag/2, -8+Math.abs(wag)); ctx.stroke();

    // LASER BEAM
    if (k.laserTargetPos && k.laserCooldown > LASER_COOLDOWN - 10) {
        ctx.restore(); // Use world coords
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(k.pos.x, k.pos.y - 10);
        ctx.lineTo(k.laserTargetPos.x, k.laserTargetPos.y);
        ctx.strokeStyle = COLORS.laser;
        ctx.lineWidth = 4;
        ctx.shadowColor = COLORS.laser;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();
        return; // Already restored
    }

    ctx.restore();
  };

  const drawBomb = (ctx: CanvasRenderingContext2D, b: Projectile) => {
      ctx.save();
      ctx.translate(b.pos.x, b.pos.y);
      // Throbbing effect
      const scale = 1 + Math.sin(frameCountRef.current * 0.5) * 0.2;
      ctx.scale(scale, scale);
      
      // Bomb body
      ctx.fillStyle = COLORS.bomb;
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
      
      // Cap
      ctx.fillStyle = '#333';
      ctx.fillRect(-5, -20, 10, 8);
      
      // Fuse
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -20); ctx.quadraticCurveTo(5, -25, 10, -22); ctx.stroke();
      
      // Spark
      ctx.fillStyle = '#ff0';
      ctx.beginPath(); ctx.arc(10, -22, 3, 0, Math.PI*2); ctx.fill();

      // Range indicator (faint)
      ctx.strokeStyle = `rgba(255, 165, 0, 0.2)`;
      ctx.beginPath(); ctx.arc(0, 0, b.radius || 200, 0, Math.PI*2); ctx.stroke();
      
      ctx.restore();
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    // 1. Clear & Background (Level based)
    const levelIndex = (gameState.level - 1) % COLORS.levels.length;
    ctx.fillStyle = COLORS.levels[levelIndex];
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Camera Shake
    ctx.save();
    if (shakeIntensityRef.current > 0) {
        ctx.translate((Math.random()-0.5)*shakeIntensityRef.current, (Math.random()-0.5)*shakeIntensityRef.current);
    }

    // 3. Grid
    ctx.strokeStyle = COLORS.floorGrid; ctx.lineWidth = 1;
    ctx.beginPath();
    const offX = -playerRef.current.pos.x * 0.1;
    const offY = -playerRef.current.pos.y * 0.1;
    for (let i = 0; i < CANVAS_WIDTH; i += 50) {
        ctx.moveTo((i+offX)%CANVAS_WIDTH, 0); ctx.lineTo((i+offX)%CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    for (let i = 0; i < CANVAS_HEIGHT; i += 50) {
        ctx.moveTo(0, (i+offY)%CANVAS_HEIGHT); ctx.lineTo(CANVAS_WIDTH, (i+offY)%CANVAS_HEIGHT);
    }
    ctx.stroke();

    // 4. Entities
    const entities = [
        ...zombiesRef.current.map(z => ({ type: 'zombie', data: z, y: z.pos.y })),
        { type: 'player', data: playerRef.current, y: playerRef.current.pos.y },
        { type: 'kitten', data: kittenRef.current, y: kittenRef.current.pos.y },
        ...projectilesRef.current.map(p => ({ type: p.type, data: p, y: p.pos.y }))
    ].sort((a, b) => a.y - b.y);

    entities.forEach(e => {
        if (e.type === 'zombie') drawZombie(ctx, e.data as Zombie);
        if (e.type === 'player') drawPlayer(ctx, e.data as Player);
        if (e.type === 'kitten') drawKitten(ctx, e.data as Kitten);
        if (e.type === 'bomb') drawBomb(ctx, e.data as Projectile);
        if (e.type === 'dumbbell') {
            const p = e.data as Projectile;
            ctx.save();
            ctx.translate(p.pos.x, p.pos.y);
            ctx.rotate(p.rotation || 0);
            ctx.fillStyle = '#636366'; ctx.fillRect(-10, -2, 20, 4);
            ctx.fillStyle = COLORS.dumbbell; 
            ctx.beginPath(); ctx.roundRect(-14, -5, 5, 10, 2); ctx.roundRect(9, -5, 5, 10, 2); ctx.fill();
            ctx.restore();
        }
    });

    // 5. Shockwaves
    const player = playerRef.current;
    if (player.isExercising && player.exerciseTimer > EXERCISE_COOLDOWN - 15) {
        const p = (EXERCISE_COOLDOWN - player.exerciseTimer)/15;
        ctx.beginPath(); ctx.arc(player.pos.x, player.pos.y, ATTACK_RADIUS*p, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(255, 45, 85, ${1-p})`; ctx.lineWidth = 4; ctx.stroke();
    }

    // 6. Particles
    particlesRef.current.forEach(p => {
        ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.rotate(p.rotation);
        ctx.fillStyle = p.color; ctx.globalAlpha = p.life;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        ctx.restore();
    });
    ctx.globalAlpha = 1;

    // 7. Floating Text (Enhanced)
    ctx.textAlign = 'center';
    floatingTextsRef.current.forEach(t => {
        ctx.font = t.isDialogue ? 'italic 12px "Courier New", monospace' : '700 14px system-ui';
        
        // Dialogue Bubble effect
        if (t.isDialogue) {
             ctx.fillStyle = 'white';
             const w = ctx.measureText(t.text).width + 10;
             ctx.beginPath(); ctx.roundRect(t.pos.x - w/2, t.pos.y - 12, w, 20, 5); ctx.fill();
             ctx.fillStyle = 'black';
             ctx.fillText(t.text, t.pos.x, t.pos.y + 2);
        } else {
             ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(t.text, t.pos.x+1, t.pos.y+1);
             ctx.fillStyle = t.color; ctx.fillText(t.text, t.pos.x, t.pos.y);
        }
    });

    // 8. Vignette
    ctx.restore();
    const grad = ctx.createRadialGradient(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 350, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 600);
    grad.addColorStop(0, 'transparent'); grad.addColorStop(1, 'rgba(0,0,0,0.9)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  };

  const gameLoop = () => {
    if (!gameState.isPlaying) return;
    frameCountRef.current++;
    handleInput();
    updateEntities();
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) draw(ctx);
    }
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    if (gameState.isPlaying && !gameState.isGameOver) requestRef.current = requestAnimationFrame(gameLoop);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameState.isPlaying, gameState.isGameOver]);

  useEffect(() => {
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) { ctx.fillStyle = COLORS.levels[0]; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); }
    }
    const down = (e: KeyboardEvent) => keysPressed.current.add(e.key.toLowerCase());
    const up = (e: KeyboardEvent) => keysPressed.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  return (
    <div className="relative w-full h-full flex justify-center items-center bg-black p-4">
      <div className="relative shadow-2xl rounded-[40px] overflow-hidden border border-white/10 ring-1 ring-white/5">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block bg-[#000000] cursor-crosshair"
        />
        <UIOverlay 
          gameState={gameState} 
          playerBombCooldown={playerRef.current.bombCooldown}
          onStart={startGame} 
          onRestart={startGame} 
          touchInputRef={touchInputRef}
          onToggleMobile={() => setGameState(p => ({ ...p, showMobileControls: !p.showMobileControls }))}
        />
      </div>
    </div>
  );
};