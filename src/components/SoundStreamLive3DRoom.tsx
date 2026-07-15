import React, { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Sparkles, Html } from "@react-three/drei";
import * as THREE from "three";
import { Mic, MicOff, Users, Award, Play, Pause, RefreshCw, Layers } from "lucide-react";

// Check if WebGL is available on this device
export function isWebGLAvailable() {
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

// Interface for seat structure matching SoundStream seat structure
interface Seat {
  id: string;
  userId: string | null;
  username: string;
  photoURL: string;
  role: string;
  isMuted: boolean;
  isSpeaking: boolean;
  coins: string;
  level?: number;
  isVIP?: boolean;
}

interface SoundStreamLive3DRoomProps {
  seatsArray: Seat[];
  roomTheme: "galaxy" | "concert" | "lounge" | "club" | "sky";
  giftBanners: { id: string; sender: string; gift: string; photo: string }[];
  onSeatClick: (seatNum: number) => void;
  currentUser: any;
  activeStream: any;
  fullScreen?: boolean;
}

// 1. Procedural 3D Gift Component
const ActiveGifts3D: React.FC<{
  giftBanners: { id: string; sender: string; gift: string; photo: string }[];
}> = ({ giftBanners }) => {
  const latestGift = giftBanners.length > 0 ? giftBanners[giftBanners.length - 1] : null;

  if (!latestGift) return null;

  const giftName = latestGift.gift.toLowerCase();

  if (giftName.includes("car") || giftName.includes("supercar")) {
    return <SportsCarGift key={latestGift.id} sender={latestGift.sender} />;
  } else if (giftName.includes("rocket")) {
    return <RocketGift key={latestGift.id} sender={latestGift.sender} />;
  } else if (giftName.includes("dragon")) {
    return <DragonGift key={latestGift.id} sender={latestGift.sender} />;
  } else if (giftName.includes("castle")) {
    return <CastleGift key={latestGift.id} sender={latestGift.sender} />;
  } else if (giftName.includes("jet") || giftName.includes("plane")) {
    return <PrivateJetGift key={latestGift.id} sender={latestGift.sender} />;
  } else if (giftName.includes("crown")) {
    return <CrownGift key={latestGift.id} sender={latestGift.sender} />;
  } else if (giftName.includes("diamond")) {
    return <DiamondGift key={latestGift.id} sender={latestGift.sender} />;
  } else if (giftName.includes("rose")) {
    return <RoseGift key={latestGift.id} sender={latestGift.sender} />;
  } else if (giftName.includes("coin")) {
    return <GoldCoinShowerGift key={latestGift.id} sender={latestGift.sender} />;
  } else {
    // Default to fireworks for any other gift types
    return <FireworksGift key={latestGift.id} sender={latestGift.sender} />;
  }
};

// Procedural Rocket Gift Animation
const RocketGift: React.FC<{ sender: string }> = ({ sender }) => {
  const rocketRef = useRef<THREE.Group>(null);
  const particleGroupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 2.5;
    if (rocketRef.current) {
      rocketRef.current.position.y = -3 + t;
      rocketRef.current.position.x = Math.sin(t * 3) * 0.4;
      rocketRef.current.rotation.y = t * 2;
    }
    if (particleGroupRef.current) {
      particleGroupRef.current.position.y = -3.5 + t;
      particleGroupRef.current.position.x = Math.sin(t * 3) * 0.4;
      particleGroupRef.current.children.forEach((child, i) => {
        child.position.y -= 0.1;
        child.scale.multiplyScalar(0.95);
      });
    }
  });

  return (
    <group>
      <group ref={rocketRef}>
        {/* Cone tip */}
        <mesh position={[0, 1.2, 0]}>
          <coneGeometry args={[0.3, 0.6, 16]} />
          <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={0.5} roughness={0.1} />
        </mesh>
        {/* Main cylinder */}
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 1.2, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Rocket fins */}
        <mesh position={[0, -0.3, 0]}>
          <boxGeometry args={[0.8, 0.2, 0.2]} />
          <meshStandardMaterial color="#f43f5e" />
        </mesh>
        <mesh position={[0, -0.3, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.8, 0.2, 0.2]} />
          <meshStandardMaterial color="#f43f5e" />
        </mesh>
        {/* Glow window */}
        <mesh position={[0, 0.5, 0.26]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.1, 16]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={1} />
        </mesh>

        <Html position={[0, 1.8, 0]} center>
          <div className="bg-gradient-to-r from-red-500/90 to-amber-500/90 px-3 py-1 rounded-full text-white text-[10px] font-black uppercase whitespace-nowrap shadow-lg flex items-center gap-1.5 border border-amber-300 animate-bounce">
            🚀 {sender} SENT ROCKET!
          </div>
        </Html>
      </group>

      {/* Flame Particles */}
      <group ref={particleGroupRef}>
        {Array.from({ length: 15 }).map((_, i) => (
          <mesh key={i} position={[(Math.random() - 0.5) * 0.3, -0.6 - Math.random() * 0.4, (Math.random() - 0.5) * 0.3]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color={i % 2 === 0 ? "#f97316" : "#ef4444"} transparent opacity={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// Procedural Sports Car Gift
const SportsCarGift: React.FC<{ sender: string }> = ({ sender }) => {
  const carRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 3.5;
    if (carRef.current) {
      // Circular racetrack drift around the host stage
      const radius = 2.4;
      carRef.current.position.x = Math.sin(t) * radius;
      carRef.current.position.z = Math.cos(t) * radius;
      carRef.current.position.y = 0.15 + Math.sin(t * 8) * 0.05;
      carRef.current.rotation.y = t + Math.PI / 2;
    }
  });

  return (
    <group ref={carRef}>
      {/* Sleek futuristic cyber vehicle design */}
      {/* Chassis base */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.7, 0.15, 1.4]} />
        <meshStandardMaterial color="#8b5cf6" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Cabin top */}
      <mesh position={[0, 0.15, -0.1]}>
        <boxGeometry args={[0.5, 0.2, 0.7]} />
        <meshStandardMaterial color="#06b6d4" transparent opacity={0.85} emissive="#06b6d4" emissiveIntensity={0.3} />
      </mesh>
      {/* Wheels */}
      <mesh position={[-0.38, -0.05, 0.4]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.15, 0.12, 16]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>
      <mesh position={[0.38, -0.05, 0.4]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.15, 0.12, 16]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>
      <mesh position={[-0.38, -0.05, -0.4]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.15, 0.12, 16]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>
      <mesh position={[0.38, -0.05, -0.4]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.15, 0.12, 16]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>
      {/* Glowing neon headlights */}
      <mesh position={[-0.2, 0.03, 0.72]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshBasicMaterial color="#34d399" />
      </mesh>
      <mesh position={[0.2, 0.03, 0.72]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshBasicMaterial color="#34d399" />
      </mesh>

      <Html position={[0, 0.8, 0]} center>
        <div className="bg-gradient-to-r from-purple-600/90 to-pink-600/90 px-3 py-1 rounded-full text-white text-[10px] font-black uppercase whitespace-nowrap shadow-lg flex items-center gap-1.5 border border-purple-300">
          🏎️ {sender} SENT SUPERCAR!
        </div>
      </Html>
    </group>
  );
};

// Procedural Dragon Gift
const DragonGift: React.FC<{ sender: string }> = ({ sender }) => {
  const segmentRefs = useRef<THREE.Mesh[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 3.5;
    segmentRefs.current.forEach((mesh, index) => {
      if (mesh) {
        const offset = index * 0.25;
        // Float path looping through stage coordinates
        mesh.position.x = Math.sin(t - offset) * 1.8;
        mesh.position.z = Math.cos(t - offset * 1.5) * 1.8;
        mesh.position.y = 1 + Math.sin((t - offset) * 2) * 1.2;
        mesh.scale.setScalar(Math.max(0.1, (10 - index) * 0.08));
      }
    });
  });

  return (
    <group>
      {/* Snaking fiery dragon links */}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) segmentRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial
            color={i === 0 ? "#f43f5e" : i % 2 === 0 ? "#f59e0b" : "#ef4444"}
            emissive={i === 0 ? "#f43f5e" : "#ea580c"}
            emissiveIntensity={0.8}
          />
          {i === 0 && (
            <Html position={[0, 0.8, 0]} center>
              <div className="bg-gradient-to-r from-rose-600/95 to-amber-600/95 px-3.5 py-1 rounded-full text-white text-[10px] font-black uppercase tracking-widest shadow-xl border border-red-400 whitespace-nowrap">
                🐉 {sender} SUMMONED DRAGON!
              </div>
            </Html>
          )}
        </mesh>
      ))}
    </group>
  );
};

// Procedural Castle Gift
const CastleGift: React.FC<{ sender: string }> = ({ sender }) => {
  const castleRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (castleRef.current) {
      // Ascends and spins gracefully on stage
      castleRef.current.position.y = Math.min(0, -2 + t * 1.5);
      castleRef.current.rotation.y = t * 0.3;
    }
  });

  return (
    <group ref={castleRef}>
      {/* Main Keep Structure */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1, 0.8, 1]} />
        <meshStandardMaterial color="#64748b" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Turret Cylinders */}
      <mesh position={[-0.5, 0.7, -0.5]}>
        <cylinderGeometry args={[0.2, 0.2, 1.2, 12]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      <mesh position={[0.5, 0.7, -0.5]}>
        <cylinderGeometry args={[0.2, 0.2, 1.2, 12]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      <mesh position={[-0.5, 0.7, 0.5]}>
        <cylinderGeometry args={[0.2, 0.2, 1.2, 12]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      <mesh position={[0.5, 0.7, 0.5]}>
        <cylinderGeometry args={[0.2, 0.2, 1.2, 12]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      {/* Cones on Spires */}
      <mesh position={[-0.5, 1.4, -0.5]}>
        <coneGeometry args={[0.24, 0.5, 12]} />
        <meshStandardMaterial color="#ec4899" emissive="#ec4899" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0.5, 1.4, -0.5]}>
        <coneGeometry args={[0.24, 0.5, 12]} />
        <meshStandardMaterial color="#ec4899" emissive="#ec4899" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[-0.5, 1.4, 0.5]}>
        <coneGeometry args={[0.24, 0.5, 12]} />
        <meshStandardMaterial color="#ec4899" emissive="#ec4899" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0.5, 1.4, 0.5]}>
        <coneGeometry args={[0.24, 0.5, 12]} />
        <meshStandardMaterial color="#ec4899" emissive="#ec4899" emissiveIntensity={0.4} />
      </mesh>

      <Html position={[0, 1.9, 0]} center>
        <div className="bg-gradient-to-r from-cyan-600/90 to-blue-600/90 px-3 py-1 rounded-full text-white text-[10px] font-black uppercase whitespace-nowrap shadow-lg border border-cyan-300">
          🏰 {sender} BUILT CASTLE!
        </div>
      </Html>
    </group>
  );
};

// Procedural Private Jet Gift
const PrivateJetGift: React.FC<{ sender: string }> = ({ sender }) => {
  const jetRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 3.0;
    if (jetRef.current) {
      // Glides flat from back left to front right
      jetRef.current.position.x = -6 + t * 4;
      jetRef.current.position.z = -2 + t * 2;
      jetRef.current.position.y = 2.5 + Math.sin(t * 2) * 0.2;
      jetRef.current.rotation.z = Math.sin(t * 3) * 0.15;
    }
  });

  return (
    <group ref={jetRef} rotation={[0, -Math.PI / 6, 0]}>
      {/* Fuselage */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.12, 1.5, 16]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.1} metalness={0.9} />
      </mesh>
      {/* Wings */}
      <mesh position={[0, -0.02, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[1.6, 0.02, 0.28]} />
        <meshStandardMaterial color="#f1f5f9" />
      </mesh>
      {/* Tail Fin */}
      <mesh position={[0, 0.24, -0.6]} rotation={[Math.PI / 6, 0, 0]}>
        <boxGeometry args={[0.04, 0.4, 0.18]} />
        <meshStandardMaterial color="#38bdf8" />
      </mesh>

      <Html position={[0, 0.6, 0]} center>
        <div className="bg-gradient-to-r from-sky-500/90 to-indigo-500/90 px-3 py-1 rounded-full text-white text-[10px] font-black uppercase whitespace-nowrap shadow-lg border border-sky-300">
          🛩️ {sender} SENT PRIVATE JET!
        </div>
      </Html>
    </group>
  );
};

// Procedural Crown Gift
const CrownGift: React.FC<{ sender: string }> = ({ sender }) => {
  const crownRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 1.5;
    if (crownRef.current) {
      crownRef.current.position.y = 1.0 + Math.sin(t * 4) * 0.15;
      crownRef.current.rotation.y = t;
    }
  });

  return (
    <group ref={crownRef}>
      {/* Base ring */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.15, 24, 1, true]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.1} metalness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* Spikes */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 6;
        const x = Math.sin(angle) * 0.58;
        const z = Math.cos(angle) * 0.58;
        return (
          <group key={i} position={[x, 0.18, z]} rotation={[0, -angle, 0]}>
            <mesh>
              <coneGeometry args={[0.08, 0.35, 8]} />
              <meshStandardMaterial color="#f59e0b" roughness={0.1} metalness={0.9} />
            </mesh>
            {/* Jewel top */}
            <mesh position={[0, 0.2, 0]}>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshBasicMaterial color={i % 2 === 0 ? "#ef4444" : "#ec4899"} />
            </mesh>
          </group>
        );
      })}

      <Html position={[0, 0.7, 0]} center>
        <div className="bg-gradient-to-r from-amber-500/95 to-yellow-500/95 px-3 py-1 rounded-full text-black text-[10px] font-black uppercase whitespace-nowrap shadow-lg border border-amber-300">
          👑 {sender} CROWNED THE ROOM!
        </div>
      </Html>
    </group>
  );
};

// Procedural Diamond Gift
const DiamondGift: React.FC<{ sender: string }> = ({ sender }) => {
  const diamondRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (diamondRef.current) {
      diamondRef.current.position.y = 1.2 + Math.sin(t * 3) * 0.2;
      diamondRef.current.rotation.y = t * 1.5;
      diamondRef.current.rotation.x = Math.sin(t) * 0.3;
    }
  });

  return (
    <mesh ref={diamondRef}>
      <octahedronGeometry args={[0.6]} />
      <meshStandardMaterial color="#06b6d4" roughness={0.1} metalness={0.9} transparent opacity={0.8} emissive="#22d3ee" emissiveIntensity={0.6} />
      <Html position={[0, 0.9, 0]} center>
        <div className="bg-gradient-to-r from-teal-500/90 to-cyan-500/90 px-3 py-1 rounded-full text-white text-[10px] font-black uppercase whitespace-nowrap shadow-lg border border-teal-300">
          💎 {sender} GIFTED DIAMOND!
        </div>
      </Html>
    </mesh>
  );
};

// Procedural Rose Gift
const RoseGift: React.FC<{ sender: string }> = ({ sender }) => {
  const roseRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 1.8;
    if (roseRef.current) {
      roseRef.current.position.y = 1.0 + Math.sin(t * 2) * 0.15;
      roseRef.current.rotation.y = t;
    }
  });

  return (
    <group ref={roseRef}>
      {/* Rosebud Petals */}
      <mesh position={[0, 0.25, 0]}>
        <torusKnotGeometry args={[0.2, 0.1, 32, 8, 3, 4]} />
        <meshStandardMaterial color="#f43f5e" roughness={0.2} emissive="#e11d48" emissiveIntensity={0.5} />
      </mesh>
      {/* Stem */}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
        <meshStandardMaterial color="#10b981" />
      </mesh>
      {/* Leaves */}
      <mesh position={[0.1, -0.1, 0]} rotation={[0.4, 0, 0.8]}>
        <boxGeometry args={[0.16, 0.02, 0.1]} />
        <meshStandardMaterial color="#047857" />
      </mesh>

      <Html position={[0, 0.6, 0]} center>
        <div className="bg-gradient-to-r from-rose-500/90 to-pink-500/90 px-3 py-1 rounded-full text-white text-[10px] font-black uppercase whitespace-nowrap shadow-lg border border-rose-300">
          🌹 {sender} SENT A ROSE!
        </div>
      </Html>
    </group>
  );
};

// Procedural Gold Coins Shower Gift
const GoldCoinShowerGift: React.FC<{ sender: string }> = ({ sender }) => {
  const coinsRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (coinsRef.current) {
      coinsRef.current.children.forEach((child, idx) => {
        // Fall and rotate
        child.position.y -= 0.06;
        child.rotation.x += 0.08;
        child.rotation.y += 0.05;
        if (child.position.y < -2.5) {
          child.position.y = 3;
        }
      });
    }
  });

  return (
    <group>
      <group ref={coinsRef}>
        {Array.from({ length: 25 }).map((_, i) => {
          const x = (Math.random() - 0.5) * 3;
          const y = Math.random() * 5;
          const z = (Math.random() - 0.5) * 3;
          return (
            <mesh key={i} position={[x, y, z]} rotation={[Math.random(), Math.random(), 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.02, 12]} />
              <meshStandardMaterial color="#f59e0b" roughness={0.1} metalness={0.9} />
            </mesh>
          );
        })}
      </group>
      <Html position={[0, 1.5, 0]} center>
        <div className="bg-gradient-to-r from-amber-500/90 to-yellow-500/90 px-3 py-1 rounded-full text-black text-[10px] font-black uppercase whitespace-nowrap shadow-lg border border-yellow-300">
          💰 {sender} SHOWERED GOLD COINS!
        </div>
      </Html>
    </group>
  );
};

// Procedural Fireworks Gift
const FireworksGift: React.FC<{ sender: string }> = ({ sender }) => {
  const particlesRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 1.5;
    if (particlesRef.current) {
      particlesRef.current.children.forEach((child) => {
        // Explode outward from center
        const vel = child.userData.velocity as THREE.Vector3;
        child.position.addScaledVector(vel, 0.04);
        child.scale.multiplyScalar(0.97);
      });
    }
  });

  const particleData = useMemo(() => {
    return Array.from({ length: 60 }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const pitch = (Math.random() - 0.5) * Math.PI;
      const speed = 0.5 + Math.random() * 1.5;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * Math.cos(pitch) * speed,
        Math.sin(pitch) * speed,
        Math.sin(angle) * Math.cos(pitch) * speed
      );
      const colorList = ["#ff2a5f", "#ffd11a", "#22d3ee", "#a855f7", "#34d399", "#ff7a22"];
      const color = colorList[Math.floor(Math.random() * colorList.length)];
      return { velocity, color };
    });
  }, []);

  return (
    <group>
      <group ref={particlesRef} position={[0, 0.8, 0]}>
        {particleData.map((pd, i) => (
          <mesh key={i} position={[0, 0, 0]} userData={{ velocity: pd.velocity }}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshBasicMaterial color={pd.color} />
          </mesh>
        ))}
      </group>
      <Html position={[0, 1.8, 0]} center>
        <div className="bg-gradient-to-r from-pink-500/90 to-yellow-500/90 px-3 py-1 rounded-full text-white text-[10px] font-black uppercase whitespace-nowrap shadow-lg border border-pink-300 animate-pulse">
          🎆 {sender} RELEASED FIREWORKS!
        </div>
      </Html>
    </group>
  );
};

// 2. 3D Audio Visualizer Waves (Pulsing Bar Visualizer around stage)
const RealtimeVisualizer3D: React.FC = () => {
  const visualizerGroupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 4;
    if (visualizerGroupRef.current) {
      visualizerGroupRef.current.children.forEach((mesh, index) => {
        // High-Fidelity bouncing columns reactive to clock sine loops simulating music frequencies
        const height = 0.15 + Math.abs(Math.sin(t + index * 0.15) * 0.8) + Math.abs(Math.sin(t * 1.8 - index * 0.3) * 0.4);
        mesh.scale.y = height;
        mesh.position.y = height / 2 - 0.5;

        // Reactive color shifts
        const material = (mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
        const colorVal = Math.sin(t + index * 0.1) * 0.5 + 0.5;
        material.color.setHSL(0.75 + colorVal * 0.15, 0.9, 0.5);
      });
    }
  });

  return (
    <group ref={visualizerGroupRef} position={[0, -0.4, 0]}>
      {Array.from({ length: 48 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 48;
        const radius = 1.8;
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius;
        return (
          <mesh key={i} position={[x, 0, z]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[0.08, 1, 0.08]} />
            <meshBasicMaterial color="#a855f7" transparent opacity={0.7} />
          </mesh>
        );
      })}
    </group>
  );
};

// 3. Immersive Interactive Theme Atmosphere Component
const ImmersiveThemeAtmosphere: React.FC<{
  theme: "galaxy" | "concert" | "lounge" | "club" | "sky";
}> = ({ theme }) => {
  return (
    <group>
      {theme === "galaxy" && (
        <>
          <color attach="background" args={["#03010b"]} />
          <ambientLight intensity={0.4} />
          <pointLight position={[0, 4, 0]} intensity={1.5} color="#c084fc" />
          <Stars radius={100} depth={50} count={3000} factor={4} saturation={0.5} fade speed={1} />
          <Sparkles count={80} scale={6} size={2.5} color="#ea580c" speed={0.8} noise={0.2} />
        </>
      )}

      {theme === "concert" && (
        <>
          <color attach="background" args={["#010514"]} />
          <ambientLight intensity={0.2} />
          {/* Neon Spotlight Beams sweeping */}
          <LaserBeam color="#22d3ee" angle={-0.3} speed={2} position={[-3, 4, -3]} />
          <LaserBeam color="#ec4899" angle={0.3} speed={1.5} position={[3, 4, -3]} />
          <Sparkles count={100} scale={5} size={3} color="#06b6d4" speed={1.5} />
        </>
      )}

      {theme === "lounge" && (
        <>
          <color attach="background" args={["#0b0602"]} />
          <ambientLight intensity={0.6} />
          <pointLight position={[0, 4, 0]} intensity={2.5} color="#fbbf24" />
          <pointLight position={[3, 1, 3]} intensity={1.0} color="#f59e0b" />
          <Sparkles count={50} scale={6} size={2} color="#fbbf24" speed={0.4} />
        </>
      )}

      {theme === "club" && (
        <>
          <color attach="background" args={["#0a010c"]} />
          <ambientLight intensity={0.2} />
          <pointLight position={[0, 4, 0]} intensity={2.0} color="#d946ef" />
          <LaserBeam color="#a855f7" angle={0.1} speed={3.0} position={[0, 4, 0]} />
          <Sparkles count={120} scale={5} size={2} color="#f472b6" speed={1.8} />
          {/* Cyber disco grids base plane */}
          <gridHelper args={[20, 20, "#8b5cf6", "#4c1d95"]} position={[0, -0.6, 0]} />
        </>
      )}

      {theme === "sky" && (
        <>
          <color attach="background" args={["#160824"]} />
          <ambientLight intensity={0.5} />
          <pointLight position={[0, 5, -2]} intensity={2.0} color="#fda4af" />
          <Sparkles count={60} scale={7} size={2.5} color="#fda4af" speed={0.6} />
        </>
      )}
    </group>
  );
};

// Moving Laser/Spotlight Beam helper
const LaserBeam: React.FC<{ color: string; angle: number; speed: number; position: [number, number, number] }> = ({
  color,
  angle,
  speed,
  position,
}) => {
  const beamRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed;
    if (beamRef.current) {
      beamRef.current.rotation.z = Math.sin(t) * 0.4 + angle;
      beamRef.current.rotation.x = Math.cos(t * 0.5) * 0.15;
    }
  });

  return (
    <group ref={beamRef} position={position}>
      <mesh rotation={[Math.PI, 0, 0]} position={[0, -2, 0]}>
        <cylinderGeometry args={[0.02, 0.4, 4, 16, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <pointLight intensity={2} distance={8} color={color} position={[0, -4, 0]} />
    </group>
  );
};

// 4. Immersive 3D Seats Amphitheater Grid Components
const ImmersiveSeats3D: React.FC<{
  seatsArray: Seat[];
  onSeatClick: (seatNum: number) => void;
}> = ({ seatsArray, onSeatClick }) => {
  return (
    <group>
      {Array.from({ length: 25 }).map((_, i) => {
        const seatNum = i + 1;
        // Occupied state
        const dbSeat = seatsArray.find((s) => s.id === `seat_${seatNum}`);
        const seatUser = dbSeat && dbSeat.userId ? dbSeat : null;

        // Calculate positions in curved amphitheater columns/rows
        // Row 1: Seat 1-5 (front row arch)
        // Row 2: Seat 6-15 (middle row arch)
        // Row 3: Seat 16-25 (back row arch)
        let row = 1;
        let indexInRow = 0;
        let totalInRow = 5;

        if (seatNum <= 5) {
          row = 1;
          indexInRow = seatNum - 1;
          totalInRow = 5;
        } else if (seatNum <= 15) {
          row = 2;
          indexInRow = seatNum - 6;
          totalInRow = 10;
        } else {
          row = 3;
          indexInRow = seatNum - 16;
          totalInRow = 10;
        }

        // Amphitheater polar coords
        const angleSpread = Math.PI * 0.85; // Wide angle facing the camera
        const angleStep = totalInRow > 1 ? angleSpread / (totalInRow - 1) : 0;
        const angle = -Math.PI / 2 - angleSpread / 2 + indexInRow * angleStep;

        const distance = row === 1 ? 2.5 : row === 2 ? 3.8 : 5.0;
        const x = Math.sin(angle) * distance;
        const z = Math.cos(angle) * distance;
        const y = -0.4 + (row - 1) * 0.35; // Each step higher row is raised to look like stadium seating

        return (
          <group key={seatNum} position={[x, y, z]}>
            <SingleSeat3D
              seatNum={seatNum}
              seatUser={seatUser}
              onSeatClick={onSeatClick}
              isHostSeat={seatNum === 1}
            />
          </group>
        );
      })}
    </group>
  );
};

// Individual Seat Component in 3D Space
const SingleSeat3D: React.FC<{
  seatNum: number;
  seatUser: Seat | null;
  onSeatClick: (seatNum: number) => void;
  isHostSeat: boolean;
}> = ({ seatNum, seatUser, onSeatClick, isHostSeat }) => {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      // Floating ambient bobbing
      groupRef.current.position.y = Math.sin(t * 1.5 + seatNum * 0.5) * 0.05;
    }
    if (ringRef.current && seatUser?.isSpeaking && !seatUser?.isMuted) {
      // Pulsing microphone volume ring animation
      ringRef.current.scale.setScalar(1.0 + Math.abs(Math.sin(t * 8)) * 0.2);
    }
  });

  return (
    <group ref={groupRef}>
      {/* 3D Seat Stand / Glassmorphic Floating Pod */}
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[0.34, 0.38, 0.1, 16]} />
        <meshStandardMaterial
          color={isHostSeat ? "#fbbf24" : seatUser ? "#7c3aed" : "#3f3f46"}
          roughness={0.1}
          metalness={0.8}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* 3D Voice Reactive Speaking Ring */}
      {seatUser?.isSpeaking && !seatUser?.isMuted && (
        <mesh ref={ringRef} position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.42, 0.03, 8, 32]} />
          <meshBasicMaterial color="#10b981" />
        </mesh>
      )}

      {/* 3D VIP or Host Glow Ring */}
      {isHostSeat && (
        <mesh position={[0, -0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.4, 0.02, 8, 24]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
      )}

      {/* Seat Number Billbounded tag */}
      <Html position={[0, -0.4, 0]} center>
        <span className="text-[8px] font-bold font-mono px-1.5 py-0.2 bg-zinc-950/80 text-zinc-400 border border-zinc-800 rounded-full select-none">
          {isHostSeat ? "👑 Host" : `#${seatNum}`}
        </span>
      </Html>

      {/* Profile Avatars / Glass Interactive Panels */}
      <Html position={[0, 0.25, 0]} center distanceFactor={6}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSeatClick(seatNum);
          }}
          className={`relative group cursor-pointer flex flex-col items-center select-none transition-transform duration-300 ${
            seatUser?.isSpeaking && !seatUser?.isMuted ? "scale-105" : "hover:scale-105"
          }`}
        >
          {/* Floating Avatar Sphere or Image Block */}
          {seatUser ? (
            <div className="relative">
              <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full p-[1.5px] transition-all duration-300 relative ${
                  seatUser.isSpeaking && !seatUser.isMuted
                    ? "bg-gradient-to-tr from-emerald-400 via-teal-300 to-emerald-500 ring-4 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]"
                    : isHostSeat
                    ? "bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 ring-2 ring-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                    : seatUser.role.toLowerCase().includes("vip") || seatUser.isVIP
                    ? "bg-gradient-to-tr from-purple-600 via-pink-400 to-indigo-600 ring-2 ring-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                    : "bg-gradient-to-tr from-zinc-700 to-zinc-900 ring-1 ring-zinc-500"
                }`}
              >
                <img
                  src={seatUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                  alt={seatUser.username}
                  className="w-full h-full rounded-full object-cover border border-[#0d081b] z-10"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Mute micro overlay badge */}
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border border-[#0d081b] shadow-md ${
                  seatUser.isMuted ? "bg-rose-500" : "bg-emerald-500"
                }`}
              >
                {seatUser.isMuted ? (
                  <MicOff className="w-2.5 h-2.5 text-white" />
                ) : (
                  <Mic className="w-2.5 h-2.5 text-white" />
                )}
              </span>

              {/* Username tag capsule */}
              <div className="mt-1 flex flex-col items-center">
                <span className="text-[9px] font-black text-white px-1.5 py-0.5 rounded-full bg-black/70 border border-white/5 truncate max-w-[65px]">
                  {seatUser.username}
                </span>
                <span className="text-[7px] text-amber-300 font-extrabold bg-amber-500/10 px-1 rounded-full mt-0.5 border border-amber-500/10">
                  💎 {seatUser.coins || "1K"}
                </span>
              </div>
            </div>
          ) : (
            /* Empty seat plus indicator */
            <div className="w-10 h-10 rounded-full border border-dashed border-white/20 hover:border-purple-500/60 bg-black/40 hover:bg-white/5 flex items-center justify-center transition duration-200">
              <span className="text-sm font-light text-zinc-500 group-hover:text-purple-400">+</span>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};

// Central Host Main Floating Stage Component
const CentralFloatingStage: React.FC = () => {
  const stageRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (stageRef.current) {
      stageRef.current.position.y = -0.4 + Math.sin(t * 1.2) * 0.05;
      stageRef.current.rotation.y = t * 0.1;
    }
  });

  return (
    <group ref={stageRef}>
      {/* Heavy futuristic glossy metallic floating stage base */}
      <mesh>
        <cylinderGeometry args={[1.5, 1.7, 0.15, 32]} />
        <meshStandardMaterial color="#312e81" metalness={0.9} roughness={0.1} transparent opacity={0.8} />
      </mesh>
      {/* Innermost glowing stage ring */}
      <mesh position={[0, 0.09, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.4, 0.03, 8, 32]} />
        <meshBasicMaterial color="#a855f7" />
      </mesh>
      {/* Central spotlight hologram sphere */}
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.15} wireframe />
      </mesh>
      {/* Light spotlight projection upward cone */}
      <mesh position={[0, 1.0, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.1, 1.3, 2, 32, 1, true]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.06} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// 5. Main Component exports
const SoundStreamLive3DRoom: React.FC<SoundStreamLive3DRoomProps> = ({
  seatsArray,
  roomTheme,
  giftBanners,
  onSeatClick,
  currentUser,
  activeStream,
  fullScreen = false,
}) => {
  const [hasWebGL, setHasWebGL] = useState(true);

  // Auto-detect WebGL support on initial mount
  useEffect(() => {
    setHasWebGL(isWebGLAvailable());
  }, []);

  if (!hasWebGL) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-8 bg-black/60 border border-white/5 rounded-3xl backdrop-blur text-center space-y-3">
        <Layers className="w-12 h-12 text-zinc-500 animate-pulse" />
        <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">WebGL Fallback Mode</p>
        <p className="text-xs text-zinc-500 max-w-sm">
          WebGL is not supported on this browser/device. Enjoy the high-performance 2D view seamless fallback experience.
        </p>
      </div>
    );
  }

  return (
    <div className={fullScreen ? "absolute inset-0 w-full h-full overflow-hidden bg-transparent z-0" : "w-full h-[calc(100vh-280px)] min-h-[580px] sm:h-[calc(100vh-240px)] sm:min-h-[680px] relative rounded-3xl overflow-hidden border border-white/5 bg-zinc-950/60 shadow-2xl backdrop-blur-md"}>
      {/* Orbit Navigation Tip Header overlay */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-2 bg-black/60 backdrop-blur px-2.5 py-1 rounded-full border border-white/5 text-[9px] text-zinc-400 font-bold font-mono">
        <span>🌌 Immersive 3D Space</span>
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
      </div>

      <div className="absolute top-3 right-3 z-10 pointer-events-none flex items-center gap-1.5 bg-black/60 backdrop-blur px-2.5 py-1 rounded-full border border-white/5 text-[9px] text-zinc-400 font-bold font-mono">
        <span>🖱️ Drag to Rotate Camera</span>
      </div>

      {/* R3F Canvas Container */}
      <Canvas
        camera={{ position: [0, 2.5, 6.0], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      >
        {/* Sky, Theme Stars, Lights Atmosphere */}
        <ImmersiveThemeAtmosphere theme={roomTheme} />

        {/* Central Stage projection */}
        <CentralFloatingStage />

        {/* Curved Stadium amphitheater seats array */}
        <ImmersiveSeats3D seatsArray={seatsArray} onSeatClick={onSeatClick} />

        {/* Realtime Music synchronized equalizer bars */}
        <RealtimeVisualizer3D />

        {/* High-Fidelity 3D Active Gift Animations Overlay inside canvas */}
        <ActiveGifts3D giftBanners={giftBanners} />

        {/* Camera Controls with angle limits */}
        <OrbitControls
          enableZoom={true}
          maxDistance={12}
          minDistance={3.5}
          maxPolarAngle={Math.PI / 2.1} // Prevent looking directly from bottom
          minPolarAngle={0.1}
          autoRotate={true}
          autoRotateSpeed={0.3} // Gentle slow rotation keeps scene alive
        />
      </Canvas>
    </div>
  );
};

export default SoundStreamLive3DRoom;
