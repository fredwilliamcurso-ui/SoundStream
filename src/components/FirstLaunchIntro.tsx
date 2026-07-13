import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "motion/react";
import { Sparkle, Volume2, ShieldAlert } from "lucide-react";

// Check WebGL availability
function isWebGLAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch (e) {
    return false;
  }
}

// Procedural Audio Synthesizer for Lion Roar and Impact
function playLionRoarSound() {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;
  const ctx = new AudioContextClass();

  // Create oscillators for guttural roar rumble
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const noise = ctx.createBufferSource();

  // Noise buffer for the roaring raspiness
  const bufferSize = ctx.sampleRate * 2.0;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noise.buffer = buffer;

  // LFO Modulator for the vibrating growl
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 16; // 16Hz vibration

  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 60;

  // Bandpass filter for growl shaping
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 6.0;
  filter.frequency.setValueAtTime(380, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(75, ctx.currentTime + 1.8);

  // WaveShaper for raw distortion
  const distortion = ctx.createWaveShaper();
  function makeDistortionCurve(amount: number) {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }
  distortion.curve = makeDistortionCurve(350);
  distortion.oversample = "4x";

  // Lowpass filter for sub-bass rumble
  const subFilter = ctx.createBiquadFilter();
  subFilter.type = "lowpass";
  subFilter.frequency.value = 120;

  const mainGain = ctx.createGain();
  mainGain.gain.setValueAtTime(0, ctx.currentTime);
  mainGain.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 0.3);
  mainGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.0);

  osc1.type = "sawtooth";
  osc1.frequency.setValueAtTime(90, ctx.currentTime);
  osc1.frequency.linearRampToValueAtTime(45, ctx.currentTime + 1.8);

  osc2.type = "square";
  osc2.frequency.setValueAtTime(110, ctx.currentTime);
  osc2.frequency.linearRampToValueAtTime(50, ctx.currentTime + 1.8);

  // Hook up graph
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  osc1.connect(filter);
  osc2.connect(filter);

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.value = 250;
  noise.connect(noiseFilter);
  noiseFilter.connect(filter);

  filter.connect(distortion);
  distortion.connect(mainGain);
  mainGain.connect(ctx.destination);

  // Play synthetic roar
  osc1.start();
  osc2.start();
  noise.start();
  lfo.start();

  osc1.stop(ctx.currentTime + 2.0);
  osc2.stop(ctx.currentTime + 2.0);
  noise.stop(ctx.currentTime + 2.0);
  lfo.stop(ctx.currentTime + 2.0);
}

function playImpactSound() {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;
  const ctx = new AudioContextClass();

  const osc = ctx.createOscillator();
  const noise = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const mainGain = ctx.createGain();

  // Noise for debris/dust scatter sound
  const bufferSize = ctx.sampleRate * 0.5;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noise.buffer = buffer;

  filter.type = "lowpass";
  filter.frequency.value = 180;
  noise.connect(filter);

  osc.type = "sine";
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 0.6);

  mainGain.gain.setValueAtTime(1.0, ctx.currentTime);
  mainGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

  osc.connect(mainGain);
  filter.connect(mainGain);
  mainGain.connect(ctx.destination);

  osc.start();
  noise.start();
  osc.stop(ctx.currentTime + 0.8);
  noise.stop(ctx.currentTime + 0.8);
}

// 3D Scene Components for Canvas
interface LionGroupProps {
  timeline: number;
  roarIntensity: number;
}

const Lion3D: React.FC<LionGroupProps> = ({ timeline, roarIntensity }) => {
  const lionRef = useRef<THREE.Group>(null);
  const jawRef = useRef<THREE.Mesh>(null);
  const leftPawRef = useRef<THREE.Mesh>(null);
  const rightPawRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!lionRef.current) return;

    // Standard hovering animation
    const hoverOffset = Math.sin(state.clock.getElapsedTime() * 2) * 0.15;
    lionRef.current.position.y = hoverOffset;

    // Timeline stages
    // 0s to 1.5s: Intro & Roar Build
    if (timeline < 1.5) {
      lionRef.current.scale.setScalar(THREE.MathUtils.lerp(0.1, 1.3, timeline / 1.5) + roarIntensity * 0.15);
      lionRef.current.rotation.y = Math.sin(timeline * 4) * 0.1;
      
      if (jawRef.current) {
        jawRef.current.rotation.x = THREE.MathUtils.lerp(0, 0.5, timeline / 1.5);
      }
    } 
    // 1.5s to 2.2s: Swipe speaker down
    else if (timeline < 2.2) {
      const swipeFactor = (timeline - 1.5) / 0.7;
      lionRef.current.scale.setScalar(1.3 - swipeFactor * 0.2 + roarIntensity * 0.1);
      
      if (leftPawRef.current) {
        leftPawRef.current.position.y = THREE.MathUtils.lerp(1.5, -0.5, swipeFactor);
        leftPawRef.current.position.z = THREE.MathUtils.lerp(-1.5, 0.5, swipeFactor);
      }
      if (rightPawRef.current) {
        rightPawRef.current.position.y = THREE.MathUtils.lerp(1.5, -0.5, swipeFactor);
        rightPawRef.current.position.z = THREE.MathUtils.lerp(-1.5, 0.5, swipeFactor);
      }
    } 
    // 2.2s+: Exit/Settle
    else {
      const exitFactor = Math.min(1, (timeline - 2.2) / 1.3);
      lionRef.current.scale.setScalar(THREE.MathUtils.lerp(1.1, 0, exitFactor));
    }
  });

  return (
    <group ref={lionRef}>
      {/* Mane torus & spheres */}
      <mesh position={[0, 0, -0.4]}>
        <torusGeometry args={[0.9, 0.35, 12, 32]} />
        <meshStandardMaterial color="#8a4d16" roughness={0.8} metalness={0.1} />
      </mesh>
      
      {/* Mane Back Fluff */}
      <mesh position={[0, 0, -0.6]}>
        <sphereGeometry args={[1.1, 16, 16]} />
        <meshStandardMaterial color="#5a310c" roughness={0.9} />
      </mesh>

      {/* Main Face Block */}
      <mesh position={[0, 0.1, 0]}>
        <dodecahedronGeometry args={[0.7, 1]} />
        <meshStandardMaterial color="#d18a38" roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Snout */}
      <mesh position={[0, -0.15, 0.45]}>
        <boxGeometry args={[0.45, 0.35, 0.4]} />
        <meshStandardMaterial color="#e8cb97" roughness={0.7} />
      </mesh>

      {/* Nose */}
      <mesh position={[0, -0.02, 0.65]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.12, 0.15, 4]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>

      {/* Glowing Angry Eyes */}
      <mesh position={[-0.25, 0.3, 0.45]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#ffea36" />
      </mesh>
      <mesh position={[0.25, 0.3, 0.45]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#ffea36" />
      </mesh>

      {/* Roaring Jaw Mesh */}
      <mesh ref={jawRef} position={[0, -0.38, 0.35]}>
        <boxGeometry args={[0.4, 0.15, 0.3]} />
        <meshStandardMaterial color="#b37327" roughness={0.6} />
      </mesh>

      {/* Left and Right Paws */}
      <mesh ref={leftPawRef} position={[-1.1, 1.5, -1.5]}>
        <boxGeometry args={[0.3, 0.2, 0.4]} />
        <meshStandardMaterial color="#d18a38" />
      </mesh>
      <mesh ref={rightPawRef} position={[1.1, 1.5, -1.5]}>
        <boxGeometry args={[0.3, 0.2, 0.4]} />
        <meshStandardMaterial color="#d18a38" />
      </mesh>
    </group>
  );
};

interface SpeakerProps {
  timeline: number;
}

const Speaker3D: React.FC<SpeakerProps> = ({ timeline }) => {
  const speakerRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!speakerRef.current) return;

    // Stages
    // 0s to 1.5s: Hiding at top
    if (timeline < 1.5) {
      speakerRef.current.position.set(0, 8, -5);
      speakerRef.current.scale.setScalar(0);
    } 
    // 1.5s to 2.2s: Dropping down with swipe
    else if (timeline < 2.2) {
      const progress = (timeline - 1.5) / 0.7;
      const currentY = THREE.MathUtils.lerp(8, 0, progress);
      speakerRef.current.position.set(0, currentY, 0);
      speakerRef.current.scale.setScalar(THREE.MathUtils.lerp(0, 1.5, progress));
    } 
    // 2.2s to 3.5s: Smashes ground, bounces & vibrates, dissolves
    else {
      const elapsed = timeline - 2.2;
      const scaleMultiplier = 1.5;

      if (elapsed < 0.6) {
        // Physical bounce sequence
        // Frequency of 12Hz, decaying quickly
        const bounceY = Math.abs(Math.sin(elapsed * Math.PI * 8) * Math.exp(-elapsed * 6)) * 0.6;
        speakerRef.current.position.set(0, bounceY, 0);
        
        // Soundwave squash-stretch distortion
        const pulse = 1.0 + Math.sin(elapsed * 40) * 0.08 * Math.exp(-elapsed * 4);
        speakerRef.current.scale.set(scaleMultiplier * (2 - pulse), scaleMultiplier * pulse, scaleMultiplier);
      } else {
        // Dissolve/shrink out
        const shrink = Math.min(1, (elapsed - 0.6) / 0.7);
        speakerRef.current.position.set(0, 0, 0);
        speakerRef.current.scale.setScalar(THREE.MathUtils.lerp(scaleMultiplier, 0, shrink));
      }
    }
  });

  return (
    <group ref={speakerRef}>
      {/* Outer Cabin Box */}
      <mesh>
        <boxGeometry args={[1, 1.8, 0.8]} />
        <meshStandardMaterial color="#1a1a1e" roughness={0.4} metalness={0.7} />
      </mesh>

      {/* Gold Rim Outlines */}
      <mesh position={[0, 0, 0.41]}>
        <boxGeometry args={[0.94, 1.74, 0.02]} />
        <meshStandardMaterial color="#dfac2a" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Woofer (Bottom Cone) */}
      <mesh position={[0, -0.4, 0.43]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.05, 16]} />
        <meshStandardMaterial color="#121212" roughness={0.6} />
      </mesh>
      {/* Woofer Dust Cap */}
      <mesh position={[0, -0.4, 0.46]}>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshStandardMaterial color="#d1a61c" roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Tweeter (Top Cone) */}
      <mesh position={[0, 0.4, 0.43]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.05, 16]} />
        <meshStandardMaterial color="#121212" roughness={0.6} />
      </mesh>
      {/* Tweeter Dust Cap */}
      <mesh position={[0, 0.4, 0.46]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#d1a61c" roughness={0.3} metalness={0.6} />
      </mesh>
    </group>
  );
};

// Main Component Prop
interface FirstLaunchIntroProps {
  onComplete: () => void;
}

export const FirstLaunchIntro: React.FC<FirstLaunchIntroProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<"greeting" | "animating" | "done">("animating");
  const [webGLAvailable] = useState<boolean>(isWebGLAvailable());
  const [timeline, setTimeline] = useState<number>(0);
  const [roarIntensity, setRoarIntensity] = useState<number>(0);
  const [screenShake, setScreenShake] = useState<number>(0);
  
  const timelineRef = useRef<number>(0);
  const roarInterval = useRef<any>(null);

  useEffect(() => {
    if (stage !== "animating") return;

    // Main animation timer ticks at ~60fps
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      setTimeline(elapsed);
      timelineRef.current = elapsed;

      // Handle custom event timings
      // t = 0.3s -> Play Roar Sound & start screen rumble
      if (elapsed >= 0.3 && elapsed < 1.7) {
        setRoarIntensity(Math.abs(Math.sin(elapsed * 50) * 0.5));
        setScreenShake(Math.abs(Math.sin(elapsed * 20) * 2));
      } else {
        setRoarIntensity(0);
      }

      // t = 2.2s -> Impact point!
      if (Math.abs(elapsed - 2.2) < 0.05) {
        setScreenShake(18); // Large initial slam screen shake
      } else if (elapsed > 2.2 && elapsed < 2.9) {
        // Decaying impact screen shake
        setScreenShake((2.9 - elapsed) * 6);
      } else if (elapsed >= 2.9) {
        setScreenShake(0);
      }

      // t = 3.6s -> Done!
      if (elapsed >= 3.6) {
        clearInterval(interval);
        handleFinish();
      }
    }, 16);

    return () => clearInterval(interval);
  }, [stage]);

  // Handle play audio trigger at specific timeline frames
  useEffect(() => {
    if (stage !== "animating") return;

    // Delayed roar audio call
    const roarTimeout = setTimeout(() => {
      playLionRoarSound();
    }, 300);

    // Delayed impact thud audio call
    const impactTimeout = setTimeout(() => {
      playImpactSound();
    }, 2200);

    return () => {
      clearTimeout(roarTimeout);
      clearTimeout(impactTimeout);
    };
  }, [stage]);

  const handleStartIntro = () => {
    // Standard User Gesture to secure Web Audio capability
    setStage("animating");
  };

  const handleFinish = () => {
    setStage("done");
    localStorage.setItem("soundstream_first_launch_done", "true");
    onComplete();
  };

  const shakeStyle = screenShake > 0 ? {
    transform: `translate(${(Math.random() - 0.5) * screenShake}px, ${(Math.random() - 0.5) * screenShake}px)`,
    transition: "transform 0.02s ease-out"
  } : {};

  return (
    <div className="fixed inset-0 bg-[#060608] z-50 flex items-center justify-center overflow-hidden font-sans select-none">
      <style>{`
        @keyframes ripple-fast {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes ripple-slow {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .animate-ripple-fast {
          animation: ripple-fast 0.6s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
        }
        .animate-ripple-slow {
          animation: ripple-slow 1.2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
        }
      `}</style>
      
      {/* Background stars and particle overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)] pointer-events-none" />

      <AnimatePresence mode="wait">
        
        {/* Step 1: Cinematic Greetings Overlay */}
        {stage === "greeting" && (
          <motion.div 
            key="greetings"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative z-10 max-w-md w-full mx-4 p-8 bg-zinc-950/80 border border-white/5 rounded-3xl text-center backdrop-blur-2xl shadow-2xl flex flex-col items-center"
          >
            <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/25 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 relative animate-pulse">
              <Sparkle className="w-8 h-8" />
              <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-xl pointer-events-none" />
            </div>

            <h1 className="text-2xl md:text-3xl font-black uppercase text-white tracking-tight mb-2">
              SoundStream
            </h1>
            <p className="text-zinc-400 text-xs tracking-widest font-mono uppercase mb-8">
              Hi-Fi Media Center v3.5
            </p>

            <p className="text-zinc-300 text-xs leading-relaxed max-w-sm mb-10 font-sans">
              Experience the customized first-launch cinematic sequence. Prepare your headphones/speakers for the sub-bass frequency soundscapes.
            </p>

            <button
              onClick={handleStartIntro}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white text-xs font-bold uppercase tracking-wider rounded-2xl transition-all shadow-[0_4px_20px_-2px_rgba(99,102,241,0.4)] cursor-pointer flex items-center justify-center gap-2"
            >
              <Volume2 className="w-4 h-4" />
              Enter SoundStream
            </button>

            <button
              onClick={handleFinish}
              className="mt-4 text-[10px] font-bold tracking-widest text-zinc-500 hover:text-zinc-300 uppercase cursor-pointer"
            >
              Skip Directly to App
            </button>
          </motion.div>
        )}

        {/* Step 2: Cinematic Animation Stage */}
        {stage === "animating" && (
          <motion.div 
            key="animation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 w-full h-full flex items-center justify-center"
            style={shakeStyle}
          >
            
            {/* Corner bypass option */}
            <button
              onClick={handleFinish}
              className="absolute top-6 right-6 z-30 bg-black/40 hover:bg-black/60 border border-white/10 px-4 py-2 rounded-full text-[10px] font-bold font-mono text-zinc-400 hover:text-white uppercase tracking-widest cursor-pointer transition-colors"
            >
              SKIP CINEMATIC
            </button>

            {/* 3D Canvas Viewport */}
            {webGLAvailable ? (
              <div className="absolute inset-0 w-full h-full z-10">
                <Canvas camera={{ position: [0, 0, 4.5], fov: 50 }}>
                  <ambientLight intensity={1.5} />
                  <directionalLight position={[2, 3, 4]} intensity={2.2} color="#ffffff" />
                  <pointLight position={[-3, -3, 2]} intensity={1.2} color="#6366f1" />
                  
                  {/* Glowing core background lights */}
                  <pointLight position={[0, 0, -2]} intensity={roarIntensity * 8} color="#f59e0b" />
                  
                  <Sparkles count={50} scale={5} size={2} speed={1.2} color="#818cf8" />
                  
                  <Lion3D timeline={timeline} roarIntensity={roarIntensity} />
                  <Speaker3D timeline={timeline} />
                </Canvas>
              </div>
            ) : (
              
              /* Highly stylized SVG / CSS 3D Fallback for Low-End/Sandbox environments */
              <div className="relative w-full h-full flex flex-col items-center justify-center z-10 px-6">
                
                {/* 3D-like Interactive SVG Lion Container */}
                <motion.div
                  animate={{
                    scale: timeline < 1.5 
                      ? (0.2 + (timeline / 1.5) * 1.1 + roarIntensity * 0.1)
                      : (1.3 - ((timeline - 1.5) / 0.7) * 0.3),
                    y: timeline >= 2.2 ? -50 : 0,
                    opacity: timeline >= 2.9 ? 0 : 1
                  }}
                  transition={{ ease: "easeOut", duration: 0.1 }}
                  className="relative flex items-center justify-center"
                >
                  {/* Stylized Lion Face Vector */}
                  <svg 
                    width="260" 
                    height="260" 
                    viewBox="0 0 100 100" 
                    className="text-amber-500 fill-current drop-shadow-[0_0_35px_rgba(245,158,11,0.4)]"
                  >
                    {/* Glowing golden mane paths */}
                    <path d="M50 5 L68 18 L88 15 L80 35 L95 50 L78 65 L82 85 L62 80 L50 95 L38 80 L18 85 L22 65 L5 50 L20 35 L12 15 L32 18 Z" className="text-amber-700/80" />
                    <path d="M50 12 L63 23 L79 20 L72 36 L85 48 L71 60 L75 76 L59 72 L50 84 L41 72 L25 76 L29 60 L15 48 L28 36 L21 20 L37 23 Z" className="text-amber-600" />
                    
                    {/* Head Shield */}
                    <polygon points="50,22 68,36 62,64 38,64 32,36" className="text-amber-500" />
                    
                    {/* Snout */}
                    <polygon points="50,48 58,58 42,58" className="text-yellow-100" />
                    <polygon points="50,53 54,58 46,58" className="text-zinc-950" />
                    
                    {/* Left and Right Eyes */}
                    <motion.circle 
                      cx="42" 
                      cy="38" 
                      r="2" 
                      className="text-yellow-300 fill-current" 
                      animate={{ scale: timeline < 1.5 ? [1, 1.8] : 1.8 }}
                    />
                    <motion.circle 
                      cx="58" 
                      cy="38" 
                      r="2" 
                      className="text-yellow-300 fill-current" 
                      animate={{ scale: timeline < 1.5 ? [1, 1.8] : 1.8 }}
                    />

                    {/* Roaring Jaw Animation */}
                    <motion.polygon 
                      points="42,58 58,58 54,68 46,68" 
                      className="text-amber-700"
                      animate={{
                        y: timeline < 1.5 ? (timeline / 1.5) * 6 : 6
                      }}
                    />
                  </svg>
                  
                  {/* Glowing Roar Energy rings */}
                  {roarIntensity > 0 && (
                    <div className="absolute inset-0 rounded-full border border-yellow-500/30 animate-ping pointer-events-none" />
                  )}
                </motion.div>

                {/* Styled 3D Speaker Falling Element */}
                {timeline >= 1.5 && (
                  <motion.div
                    initial={{ y: -500, scale: 0.1, rotate: -15 }}
                    animate={{
                      y: timeline < 2.2 
                        ? -500 + ((timeline - 1.5) / 0.7) * 550 
                        : [0, -45, 0, -15, 0], // spring bounce effect!
                      scale: timeline < 2.2 
                        ? 0.1 + ((timeline - 1.5) / 0.7) * 1.1 
                        : [1.2, 1.05, 1.25, 1.18, 1.2],
                      rotate: timeline < 2.2 ? -15 : 0,
                      opacity: timeline >= 2.8 ? 0 : 1
                    }}
                    transition={{
                      y: { duration: timeline < 2.2 ? 0.6 : 0.6, ease: "easeOut" },
                      scale: { duration: 0.4 },
                      opacity: { duration: 0.5 }
                    }}
                    className="absolute w-44 h-72 bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex flex-col justify-around shadow-2xl z-20 drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                  >
                    {/* Gold Metallic Outer Bezel */}
                    <div className="absolute inset-1.5 border-2 border-amber-500/20 rounded-2xl pointer-events-none" />

                    {/* Sound Tweeter */}
                    <div className="w-16 h-16 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center self-center relative shadow-inner">
                      <div className="w-8 h-8 rounded-full bg-amber-500/80 animate-pulse" />
                    </div>

                    {/* Heavy Woofer Sub */}
                    <motion.div 
                      className="w-28 h-28 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center self-center relative shadow-inner"
                      animate={{
                        scale: timeline >= 2.2 ? [1, 1.15, 0.95, 1.05, 1] : 1
                      }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="w-14 h-14 rounded-full bg-amber-500 border border-amber-600 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-zinc-950" />
                      </div>
                    </motion.div>
                  </motion.div>
                )}

                {/* Sub-bass Speaker sound wave ripples */}
                {timeline >= 2.2 && timeline < 2.8 && (
                  <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
                    <div className="w-72 h-72 rounded-full border border-amber-500/20 animate-ripple-fast" />
                    <div className="w-96 h-96 rounded-full border border-indigo-500/10 animate-ripple-slow" />
                  </div>
                )}
              </div>
            )}

            {/* Cinematic subtitle line */}
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 text-center font-mono uppercase tracking-widest text-[9px] font-bold text-zinc-500">
              {timeline < 1.5 && "INITIALIZING SYSTEM BEAST..."}
              {timeline >= 1.5 && timeline < 2.2 && "BRINGING DOWN HIGHER AUDIO..."}
              {timeline >= 2.2 && "HI-FI SONICS ENGAGED"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
