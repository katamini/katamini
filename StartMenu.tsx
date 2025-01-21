import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { levels } from './levels';
import { Howl } from 'howler';

interface StartMenuProps {
  onSelectLevel: (levelId: string) => void;
}

const StartMenu: React.FC<StartMenuProps> = ({ onSelectLevel }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const audioRef = useRef<Howl | null>(null);

  const playRandomSound = (sounds: string[]) => {
    const randomIndex = Math.floor(Math.random() * sounds.length);
    const sound = new Howl({
      src: [sounds[randomIndex]],
      volume: 0.2,
    });
    sound.play();
  };

  const menuMusicFiles = [
    "music/katamenu_01.mp3",
    "music/katamenu_02.mp3",
    "music/katamenu_03.mp3",
  ];

  const playRandomMenuMusic = () => {
    const randomIndex = Math.floor(Math.random() * menuMusicFiles.length);
    const audio = new Howl({
      src: [menuMusicFiles[randomIndex]],
      loop: true,
      volume: 0.1,
    });
    audio.play();
    return audio;
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const audio = playRandomMenuMusic();
    audioRef.current = audio;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        audioRef.current?.pause();
      } else {
        audioRef.current?.play();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    const backgroundGeometry = new THREE.PlaneGeometry(100, 100);
    const backgroundMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec2 resolution;
        varying vec2 vUv;

        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        vec3 starfield(vec2 uv) {
          float rotation = time * 0.05;
          vec2 center = vec2(0.5);
          vec2 rotatedUv = center + mat2(
            cos(rotation), -sin(rotation),
            sin(rotation), cos(rotation)
          ) * (uv - center);
          
          vec3 col = vec3(0.0);
          col = vec3(0.1, 0.0, 0.2);
          float noise = random(rotatedUv + time * 0.1);
          col += vec3(0.2, 0.0, 0.3) * noise;
          float stars = step(0.98, random(floor(rotatedUv * 1000.0)));
          col += vec3(1.0) * stars;
          return col;
        }

        void main() {
          vec2 uv = vUv;
          vec3 color = starfield(uv);
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
    const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    background.position.z = -20;
    scene.add(background);

    const levelGroup = new THREE.Group();
    scene.add(levelGroup);

    const positions = [
      [-4, 2, 0],
      [0, 2, 0],
      [4, 2, 0],
      [-2, -1, 0],
      [2, -1, 0],
    ];

    const frameGeometry = new THREE.CircleGeometry(1.2, 32);
    const levelGeometry = new THREE.CircleGeometry(1, 32);
    const planets: THREE.Group[] = [];

    levels.forEach((level, index) => {
      const planetGroup = new THREE.Group();
      
      const frameMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const frame = new THREE.Mesh(frameGeometry, frameMaterial);
      planetGroup.add(frame);

      const levelMaterial = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color().setHSL(index * 0.2, 0.7, 0.5)
      });
      const levelMesh = new THREE.Mesh(levelGeometry, levelMaterial);
      planetGroup.add(levelMesh);

      if (index > 0) {
        const lockGeometry = new THREE.PlaneGeometry(0.5, 0.5);
        const lockMaterial = new THREE.MeshBasicMaterial({ 
          color: 0xffffff,
          transparent: true,
          opacity: 0.9
        });
        const lock = new THREE.Mesh(lockGeometry, lockMaterial);
        lock.position.z = 0.1;
        planetGroup.add(lock);
      }

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = 256;
        canvas.height = 64;
        context.font = 'Bold 32px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText(level.name, 128, 32);
        const texture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.SpriteMaterial({ map: texture });
        const label = new THREE.Sprite(labelMaterial);
        label.scale.set(2, 0.5, 1);
        label.position.y = -1.5;
        planetGroup.add(label);
      }

      planetGroup.position.set(...positions[index]);
      levelGroup.add(planetGroup);
      planets.push(planetGroup);
    });

    camera.position.z = 10;

    const animate = (time: number) => {
      requestAnimationFrame(animate);

      backgroundMaterial.uniforms.time.value = time * 0.001;

      planets.forEach((planet, index) => {
        const targetScale = index === selectedIndex ? 1.2 : 1.0;
        planet.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        planet.position.y = positions[index][1] + Math.sin(time * 0.002 + index) * 0.1;
      });

      renderer.render(scene, camera);
    };
    animate(0);

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      playRandomSound([
        "music/effects/01.mp3",
        "music/effects/03.mp3",
        "music/effects/04.mp3",
        "music/effects/05.mp3",
      ]);

      switch (event.key) {
        case 'ArrowLeft':
          setSelectedIndex((prev) => (prev - 1 + levels.length) % levels.length);
          break;
        case 'ArrowRight':
          setSelectedIndex((prev) => (prev + 1) % levels.length);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          handleLevelSelect(levels[selectedIndex].id);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      backgroundMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeChild(renderer.domElement);
      if (audioRef.current) {
        audioRef.current.stop();
      }
    };
  }, [onSelectLevel, selectedIndex]);

  const handleLevelSelect = (levelId: string) => {
    if (audioRef.current) {
      audioRef.current.stop();
    }
    onSelectLevel(levelId);
  };

  const logoStyle = {
    maxWidth: '40%',
    marginTop: '10px',
  }

  const instructionsStyle = {
    color: 'white',
    fontSize: '1.5rem',
    textAlign: 'center',
    textShadow: '0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.3)',
    marginTop: '20px',
  };

  const centerStyle = {
    marginLeft: 'auto',
    marginRight: 'auto',
    width: '10%',
  };

  return (
    <div className="relative w-full h-screen">
      <div ref={mountRef} className="absolute inset-0" />
      <div className="absolute top-0 left-0 right-0 flex justify-center mt-8">
        <img className="justify-center logomenu" src="logo.png" style={logoStyle} />
        <br />
        <h1 className="text-6xl font-bold text-white text-center rainbow_text_animated" 
            style={{
              textShadow: '0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.3)',
              marginTop: '10px'
            }}> beta
        </h1>
      </div>
      <div className="absolute bottom-0 left-0 right-0 mb-8 rainbow_text_animated" style={instructionsStyle}>
        <img src="/katamini_mini.gif" style={centerStyle} />
        <p>⬅️+➡️+⬆️+⬇️ to move</p>
        <p>SPACE to select</p>
        <p>ESC to exit</p>
      </div>
      <button 
        onClick={(e) => {
          e.preventDefault();
          window.open("https://github.com/katamini", "_blank");
        }}
        className="absolute bottom-4 right-4 w-16 h-16 rounded-full bg-pink-500 hover:bg-pink-600 flex items-center justify-center text-white text-2xl font-bold"
      >
        ?
      </button>
    </div>
  );
};

export default StartMenu;
