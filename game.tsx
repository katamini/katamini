"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { SizeIndicator } from "./components/size-indicator";
import { auraVertexShader, auraFragmentShader } from "./shaders/aura";
import type { GameObject, GameState } from "./types/game";

// Organized game objects by size tiers
const gameObjects: GameObject[] = [
  // Tier 1 (0-2cm)
  {
    type: "paperclip",
    size: 0.5,
    model: "models/none.glb",
    position: [1, 0, 1],
    rotation: [0, 0, 0],
    scale: 1,
    color: "#A1A1A1",
    sound: "music/blips/01.mp3",
  },
  {
    type: "paperclip",
    size: 1,
    model: "models/paperclip.glb",
    position: [-1, 0, 2],
    rotation: [0, 0, 0],
    scale: 1,
    color: "#F48FB1",
    round: true,
    sound: "music/blips/02.mp3",
  },
  {
    type: "coin1",
    size: 2,
    model: "models/coin.glb",
    position: [2, 0, -1],
    rotation: [0, 0, 0],
    scale: 0.3,
    color: "#FFD700",
    round: true,
    sound: "music/blips/03.mp3",
  },

  // Tier 2 (2-5cm)
  {
    type: "coin2",
    size: 2,
    model: "models/coin.glb",
    position: [-2, 0, -2],
    rotation: [0, 0, 0],
    scale: 0.5,
    color: "#4CAF50",
    round: true,
    sound: "music/blips/04.mp3",
  },
  {
    type: "eraser",
    size: 3,
    model: "models/eraser.glb",
    position: [3, 0, 3],
    rotation: [0, 0, 0],
    scale: 0.2,
    color: "#9E9E9E",
    round: false,
    sound: "music/blips/05.mp3",
  },
  {
    type: "paperclip",
    size: 4,
    model: "models/cookie.glb",
    position: [-3, 0, 1],
    rotation: [0, 0, 0],
    scale: 0.7,
    color: "#2196F3",
    round: true,
    sound: "music/blips/06.mp3",
  },

  // Tier 3 (5-10cm)
  {
    type: "book",
    size: 5,
    model: "models/books.glb",
    position: [-4, 0, -4],
    rotation: [0, 0, 0],
    scale: 0.25,
    color: "#795548",
    sound: "music/blips/08.mp3",
  },
  {
    type: "duck",
    size: 7,
    model: "models/duck.glb",
    position: [4, 0, -3],
    rotation: [0, 0, 0],
    scale: 0.5,
    color: "#FF5722",
    sound: "music/blips/07.mp3",
  },
  {
    type: "car",
    size: 8.5,
    model: "models/toy_car.glb",
    position: [5, 0, 2],
    rotation: [0, 0, 0],
    scale: 0.5,
    color: "#E0E0E0",
    sound: "music/blips/09.mp3",
  },

  // Tier 4 (10-20cm)
  {
    type: "pot",
    size: 12,
    model: "models/flowerpot.glb",
    position: [-5, 0, 5],
    rotation: [0, 0, 0],
    scale: 0.3,
    color: "#9C27B0",
    sound: "music/blips/10.mp3",
  },
  {
    type: "chair",
    size: 13,
    model: "models/chair.glb",
    position: [6, 0, -5],
    rotation: [0, 0, 0],
    scale: 0.06,
    color: "#8D6E63",
    sound: "music/blips/01.mp3",
  },
  {
    type: "trashcan",
    size: 14,
    model: "models/trashcan.glb",
    position: [-6, 0, -6],
    rotation: [0, 0, 0],
    scale: 1.1,
    color: "#795548",
    sound: "music/blips/02.mp3",
  },

  // Tier 5 (20cm+)
  {
    type: "sofa",
    size: 20,
    model: "models/sofa.glb",
    position: [7, 0, 7],
    rotation: [0, 0, 0],
    scale: 0.1,
    color: "#5D4037",
    sound: "music/blips/03.mp3",
  },
  { type: 'desk', size: 25, model: 'models/piano.glb', position: [-7, 0, -7], rotation: [0, 0, 0], scale: 0.1, color: '#3E2723', sound: 'music/blips/04.mp3' },
];

const sizeTiers = [
  {
    min: 0,
    max: 2,
    growthRate: 0.5,
    requiredCount: 10,
  }, // Tiny objects
  {
    min: 2,
    max: 5,
    growthRate: 0.7,
    requiredCount: 10,
  }, // Small objects
  {
    min: 5,
    max: 10,
    growthRate: 1,
    requiredCount: 10,
  }, // Medium objects
  {
    min: 10,
    max: 20,
    growthRate: 2,
    requiredCount: 10,
  }, // Large objects
  {
    min: 20,
    max: Infinity,
    growthRate: 3,
    requiredCount: 1,
  }, // Huge objects
];

// Multiply objects for better distribution
const distributeObjects = (objects: GameObject[]): GameObject[] => {
  const distributed: GameObject[] = [];
  objects.forEach((obj) => {
    const count =
      obj.size < 5 ? 20 : obj.size < 10 ? 12 : obj.size < 20 ? 4 : 2;
    for (let i = 0; i < count; i++) {
      const distance = Math.pow(obj.size, 1.05) * 0.6;
      const angle = Math.random() * Math.PI * 2;
      distributed.push({
        ...obj,
        position: [Math.cos(angle) * distance, 0, Math.sin(angle) * distance],
        rotation: obj.rotation,
      });
    }
  });
  return distributed;
};

const Game: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blipSoundRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<THREE.Mesh | null>(null);
  const collectedObjectsRef = useRef<THREE.Group | null>(null);
  const finishedRef = useRef(false);

  const touchRef = useRef({
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    isDragging: false
  });
  const keysRef = useRef({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
  });
  
  const [gameState, setGameState] = useState<GameState>({
    playerSize: 0.5,
    collectedObjects: [],
    timeElapsed: 0,
    currentClass: 0,
  });
  const [userInteracted, setUserInteracted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  const detectMobileDevice = () => {
    return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const loader = new GLTFLoader();

  const playRandomSound = (sounds: string[]) => {
    const randomIndex = Math.floor(Math.random() * sounds.length);
    const sound = new Audio(sounds[randomIndex]);
    sound.volume = 0.3;
    sound.play().catch((error) => {
      console.log("Failed to play random sound:", error);
    });
  };

  function randoSeed(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  useEffect(() => {
    setIsMobileDevice(detectMobileDevice());
  }, []);

  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    touchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      lastY: touch.clientY,
      isDragging: true
    };
    console.log('Touch start', touchRef.current);
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!touchRef.current.isDragging) return;
  
    const touch = event.touches[0];
  
    // Calculate delta from last position
    const deltaX = touch.clientX - touchRef.current.lastX;
    const deltaY = touch.clientY - touchRef.current.lastY;

    // Reset all keys first
    keysRef.current.ArrowUp = false;
    keysRef.current.ArrowDown = false;
    keysRef.current.ArrowLeft = false;
    keysRef.current.ArrowRight = false;

    // Update keys based on movement
    const threshold = 2; // Much lower threshold
  
    if (Math.abs(deltaY) > threshold || Math.abs(deltaX) > threshold) {
      // If moving more vertically
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        if (deltaY < 0) {
          keysRef.current.ArrowUp = true;
        } else {
          keysRef.current.ArrowDown = true;
        }
      }
      // If moving more horizontally
      else {
        if (deltaX < 0) {
          keysRef.current.ArrowLeft = true;
        } else {
          keysRef.current.ArrowRight = true;
        }
      }
    }

    // Update last position
    touchRef.current.lastX = touch.clientX;
    touchRef.current.lastY = touch.clientY;
  
    console.log('Touch move', { deltaX, deltaY, keys: { ...keysRef.current } });
  };

  const handleTouchEnd = () => {
    touchRef.current.isDragging = false;
    keysRef.current.ArrowUp = false;
    keysRef.current.ArrowDown = false;
    keysRef.current.ArrowLeft = false;
    keysRef.current.ArrowRight = false;
    console.log('Touch end');
  };


  // Handle keyboard controls
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      keysRef.current[event.code] = true;
      if (event.code === "Space") {
        event.preventDefault();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current[event.code] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Update player scale when playerSize changes
  useEffect(() => {
   if (playerRef.current) {
    // Scale only the player geometry and its direct parts
    playerRef.current.children.forEach(child => {
      if (child instanceof THREE.Group && child === collectedObjectsRef.current) {
        // Counter-scale the collected objects container
        child.scale.setScalar(1 / (gameState.playerSize * 0.25));
      } else {
        // Scale roomba parts (top disc and sensor)
        child.scale.setScalar(1);
      }
    });
    
    // Scale the player
    playerRef.current.scale.setScalar(gameState.playerSize * 0.25);
    playerRef.current.position.y = 0.1 * playerRef.current.scale.y;
   }
  }, [gameState.playerSize]);




  // Handle user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      setUserInteracted(true);
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
    };

    window.addEventListener("click", handleUserInteraction);
    window.addEventListener("keydown", handleUserInteraction);

    return () => {
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
    };
  }, []);

  // Music system
  useEffect(() => {
    const audio = new Audio("music/katamini_0" + randoSeed(1, 4) + ".mp3");
    const blipSound = new Audio("music/blips/0" + randoSeed(1, 9) + ".mp3");
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;
    blipSound.volume = 0.3;
    blipSoundRef.current = blipSound;

    const playAudio = () => {
      audio.play().catch((error) => {
        console.log("Failed to play audio:", error);
      });
    };

    if (userInteracted) {
      playRandomSound([
        "music/effects/01.mp3",
        "music/effects/03.mp3",
        "music/effects/04.mp3",
        "music/effects/05.mp3",
      ]);
      playAudio();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && userInteracted) {
        playRandomSound([
          "music/effects/01.mp3",
          "music/effects/02.mp3",
          "music/effects/03.mp3",
          "music/effects/04.mp3",
          "music/effects/05.mp3",
        ]);
        playAudio();
      } else {
        playRandomSound(["music/effects/02.mp3"]);
        audio.pause();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [userInteracted]);

  // Main game setup and loop
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#E0E0E0");
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
    });
	  
    // Set the size of the renderer to the window size
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Adjust the pixel ratio to lower the resolution on mobile
    if (isMobileDevice) {
      renderer.setPixelRatio(window.devicePixelRatio / 2); // Adjust this value as needed
    } else {
      renderer.setPixelRatio(window.devicePixelRatio);
    }
	  
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1200;
    directionalLight.shadow.mapSize.height = 1200;
    directionalLight.shadow.camera.near = 0.6;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xffcacc, 0.3);
    scene.add(hemisphereLight);

    // Room setup
    const wallTexture = new THREE.TextureLoader().load("textures/wall_shoji.png");
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(2.5, 1); // Adjust these values to change the pattern scale
    
    const roomGeometry = new THREE.BoxGeometry(50, 20, 50);
    const roomMaterial = new THREE.MeshStandardMaterial({
      map: wallTexture,
      color: 0xffffff, // Using white to let the texture show properly
      side: THREE.BackSide,
      roughness: 0.8,
      metalness: 0.0,
    });
    const room = new THREE.Mesh(roomGeometry, roomMaterial);
    room.position.y = 10;
    scene.add(room);

    // Floor setup
    const floorTexture = new THREE.TextureLoader().load("textures/floor_carpet.jpg");
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(20, 20);

    const floorMaterial = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 1.0,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    // Player setup
    const playerGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 32);
    const playerMaterial = new THREE.MeshStandardMaterial({
      color: 0x303030,
      roughness: 0.7,
      metalness: 0.3,
    });
    const player = new THREE.Mesh(playerGeometry, playerMaterial);
    playerRef.current = player;

    // Roomba details
    const topDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.05, 32),
      new THREE.MeshStandardMaterial({ color: 0x404040 })
    );
    topDisc.position.y = 0.1;
    player.add(topDisc);

    const sensorBump = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: 0x202020 })
    );
    sensorBump.position.set(0, 0.15, 0.3);
    player.add(sensorBump);

    player.scale.setScalar(0.25);
    player.position.y = 0.1 * player.scale.y;
    player.castShadow = true;
    player.receiveShadow = true;
    scene.add(player);

    // Collected objects container
    const collectedObjectsContainer = new THREE.Group();
    collectedObjectsRef.current = collectedObjectsContainer;
    player.add(collectedObjectsContainer);

    // Create aura material
    const auraMaterial = new THREE.ShaderMaterial({
      vertexShader: auraVertexShader,
      fragmentShader: auraFragmentShader,
      transparent: true,
      uniforms: {
        time: { value: 0 },
      },
    });

    // Load game objects
    const objects: THREE.Object3D[] = [];
    const auras: THREE.Mesh[] = [];
    let totalObjects = objects.length;

    distributeObjects(gameObjects).forEach((obj) => {
      loader.load(
        obj.model,
        (gltf) => {
          const model = gltf.scene;
          model.position.set(...obj.position);
          model.rotation.set(...obj.rotation);
          if (obj.round) {
            model.rotation.set(
              obj.rotation[0],
              obj.rotation[1] + Math.random() * Math.PI,
              obj.rotation[2] + Math.random() * Math.PI
            );
            model.position.y = 0.05;
          } else {
            model.rotation.set(0, obj.rotation[2] + Math.random() * Math.PI, 0);
            model.position.y = 0.05;
          }
          model.scale.setScalar(obj.scale);
          model.userData.size = obj.size;

          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              (child as THREE.Mesh).castShadow = true;
              (child as THREE.Mesh).receiveShadow = true;
            }
          });
          scene.add(model);
          objects.push(model);

          // Create aura
          const auraGeometry = new THREE.SphereGeometry(obj.size * 0.15, 32, 32);
          const auraMesh = new THREE.Mesh(auraGeometry, auraMaterial.clone());
          auraMesh.scale.multiplyScalar(1.2);
          auraMesh.visible = false;
          model.add(auraMesh);
          auras.push(auraMesh);
        },
        undefined,
        () => {
          // Fallback object creation if model loading fails
          const geometry = new THREE.BoxGeometry(
            obj.size * 0.1,
            obj.size * 0.1,
            obj.size * 0.1
          );
          const material = new THREE.MeshStandardMaterial({
            color: obj.color,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(...obj.position);
          mesh.rotation.set(...obj.rotation);
          mesh.scale.setScalar(obj.scale);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData.size = obj.size;
          mesh.position.y = obj.size * 0.005;
          scene.add(mesh);
          objects.push(mesh);

          // Create aura for fallback object
          const auraGeometry = new THREE.SphereGeometry(obj.size * 0.15, 32, 32);
          const auraMesh = new THREE.Mesh(auraGeometry, auraMaterial.clone());
          auraMesh.scale.multiplyScalar(1.2);
          auraMesh.visible = false;
          mesh.add(auraMesh);
          auras.push(auraMesh);
        }
      );
    });

    // Player movement properties
    const playerVelocity = new THREE.Vector3();
    const playerDirection = new THREE.Vector3(0, 0, -1);
    const rotationSpeed = 0.03;
    const acceleration = 0.003;
    const maxSpeed = 0.4;
    const friction = 0.9;
    const bounceForce = 0.4;
    const gravity = 0.01;
    const jumpForce = 0.2;
    let isGrounded = false;

    // Camera setup
    const cameraOffset = new THREE.Vector3(0, 2, 2.5);
    const minZoom = 2.5;
    const maxZoom = 150;
    let currentZoom = minZoom;

    camera.position.copy(player.position).add(cameraOffset);
    camera.lookAt(player.position);

    let startTime = Date.now();

    // Game loop
    let time = 0;
    const animate = () => {
	    
      time += 0.016;

      if (finishedRef.current) {
	console.log('game over!');
	return;
      } else {
        requestAnimationFrame(animate);
      }
	    
      // Update time elapsed
      if (!finishedRef.current) {
        const currentTime = Date.now();
        const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
        setGameState(prev => ({ ...prev, timeElapsed: elapsedSeconds }));
      }

      // Check if all objects are captured
      if (totalObjects + objects.length === 0 && totalObjects != 0 && !finishedRef.current) {
        console.log("Game Completed!", time, gameState, objects.length);
        finishedRef.current = true;
        audioRef.current?.pause();
        audioRef.current = null;
        playRandomSound([
          "music/effects/01.mp3",
          "music/effects/03.mp3",
          "music/effects/04.mp3",
          "music/effects/05.mp3",
        ]);
        setGameOver(true);
        return;
      }

      // Find the smallest remaining object
      const smallestObject = objects.reduce(
        (smallest, obj) => {
          if (obj.parent === scene && obj.userData.size < smallest.userData.size) {
            return obj;
          }
          return smallest;
        },
        { userData: { size: Infinity } }
      );

      // Update aura uniforms and visibility
      objects.forEach((object, index) => {
        if (object.parent === scene) {
          const aura = auras[index];
          if (aura) {
            aura.material.uniforms.time.value = time;
            aura.visible =
              object.userData.size <=
              Math.max(gameState.playerSize * 1.2, smallestObject.userData.size);
          }
        }
      });

      // Player movement using keysRef
      const moveDirection = new THREE.Vector3();
      if (keysRef.current.ArrowUp) moveDirection.z -= 1;
      if (keysRef.current.ArrowDown) moveDirection.z += 1;
      
      if (keysRef.current.ArrowLeft) {
        playerDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationSpeed);
      }
      if (keysRef.current.ArrowRight) {
        playerDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotationSpeed);
      }

      let dynamicMaxSpeed = maxSpeed * (1 + gameState.playerSize * 0.6);  // Increased scaling factor
      const dynamicAcceleration = acceleration * (1 + gameState.playerSize * 0.4);  // Add dynamic acceleration
      playerVelocity.add(
        playerDirection.clone().multiplyScalar(moveDirection.z * dynamicAcceleration)
      );

      playerVelocity.y -= gravity;

      isGrounded = player.position.y <= player.scale.y * 0.5;
      if (isGrounded) {
        player.position.y = player.scale.y * 0.5;
        playerVelocity.y = Math.max(0, playerVelocity.y);
      }

      if (keysRef.current.Space && isGrounded) {
        playerVelocity.y = jumpForce;
      }

      // Apply friction and limit speed
      playerVelocity.multiplyScalar(friction);
	    
      if (isMobileDevice) { dynamicMaxSpeed = dynamicMaxSpeed * 2; }
      if (playerVelocity.length() > dynamicMaxSpeed) {
        playerVelocity.normalize().multiplyScalar(dynamicMaxSpeed);
      }

      // Calculate next position
      const nextPosition = player.position.clone().add(playerVelocity);
      nextPosition.x = Math.max(-24, Math.min(24, nextPosition.x));
      nextPosition.z = Math.max(-24, Math.min(24, nextPosition.z));

      // Check collisions with objects
      let collisionOccurred = false;
      objects.forEach((object, index) => {
        if (object.parent === scene) {
          const distance = nextPosition.distanceTo(object.position);
          const combinedRadius = player.scale.x * 0.5 + object.userData.size * 0.05;

          if (distance < combinedRadius) {
            if (object.userData.size <= Math.max(gameState.playerSize * 1.2, smallestObject.userData.size)) {
              // Object collection logic
              scene.remove(object);
              const aura = auras[index];
              if (aura) {
                aura.visible = false;
                aura.parent?.remove(aura);
              }
              totalObjects--;

              // Position on sphere surface
              const u = Math.random();
              const v = Math.random();
              const radius = player.scale.x * 0.5;

              const theta = 2 * Math.PI * u;
              const phi = Math.acos(2 * v - 1);

              const surfacePosition = new THREE.Vector3(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.sin(phi) * Math.sin(theta),
                radius * Math.cos(phi)
              );

              object.userData.initialPosition = {
                theta: theta,
                phi: phi,
                radius: radius,
              };

              object.position.copy(surfacePosition);
              surfacePosition.add(
                new THREE.Vector3(
                  (Math.random() - 0.5) * 0.05,
                  (Math.random() - 0.5) * 0.05,
                  (Math.random() - 0.5) * 0.05
                ).multiplyScalar(player.scale.x)
              );

	      const scaleFactor = Math.min(1.2, object.userData.size / gameState.playerSize);
	      object.scale.multiplyScalar(scaleFactor * 0.8);
              collectedObjectsContainer.add(object);  

              if (blipSoundRef.current) {
                blipSoundRef.current.play().catch((error) => {
                  console.log("Failed to play blip sound:", error);
                });
              }

              // Update game state
              setGameState((prev) => {
                const smallestRemaining = objects.reduce(
                  (smallest, obj) => {
                    if (obj.parent === scene && obj.userData.size < smallest.userData.size) {
                      return obj;
                    }
                    return smallest;
                  },
                  { userData: { size: Infinity } }
                );

                let newPlayerSize = prev.playerSize;
                let newClass = prev.currentClass;
                const currentClass = sizeTiers[prev.currentClass];
                const objectsInClass = prev.collectedObjects.filter(
                  (obj) => obj.size >= currentClass.min && obj.size <= currentClass.max
                );

                const allObjectsInClassCaptured =
                  objectsInClass.length + 1 >= currentClass.requiredCount;

                if (allObjectsInClassCaptured && prev.currentClass < sizeTiers.length - 1) {
		  newClass += 1;
		  // Increase the size multiplier for more dramatic growth
		  newPlayerSize = prev.playerSize * 1.8; // More aggressive growth
		  console.log('roomba upgraded', newPlayerSize);

                  playRandomSound([
                    "music/effects/01.mp3",
                    "music/effects/03.mp3",
                    "music/effects/04.mp3",
                  ]);
                }

                return {
                  ...prev,
                  playerSize: newPlayerSize,
                  currentClass: newClass,
                  collectedObjects: [
                    ...prev.collectedObjects,
                    {
                      type: "object",
                      size: object.userData.size,
                      position: surfacePosition.toArray(),
                      rotation: [0, 0, 0],
                      scale: object.scale.x,
                      model: "",
                      color: "#ffffff",
                    },
                  ],
                };
              });

              player.position.y = 0.1 * player.scale.y;

              // Update collected objects positions
              collectedObjectsContainer.children.forEach((child: THREE.Object3D) => {
                if (child.userData.size < gameState.playerSize * 0.08) {
                  collectedObjectsContainer.remove(child);
                  return;
                }

                const initialPos = child.userData.initialPosition;
                const currentRadius = player.scale.x * 0.5;
                const movementAngle = Math.atan2(playerVelocity.x, playerVelocity.z);
                const rotationSpeed = playerVelocity.length() * 2;
                const rotatedTheta = initialPos.theta + movementAngle * rotationSpeed;

                child.position.set(
                  currentRadius * Math.sin(initialPos.phi) * Math.cos(rotatedTheta),
                  currentRadius * Math.sin(initialPos.phi) * Math.sin(rotatedTheta),
                  currentRadius * Math.cos(initialPos.phi)
                );
              });

              cameraOffset.z = Math.max(2.5, player.scale.x * 3);
            } else {
              // Bounce off larger objects
              collisionOccurred = true;
              const pushDirection = nextPosition
                .clone()
                .sub(object.position)
                .normalize();
              playerVelocity.reflect(pushDirection).multiplyScalar(bounceForce);

              // Squish effect
              player.scale.x *= 0.95;
              player.scale.z *= 1.05;
              setTimeout(() => {
                player.scale.x /= 0.95;
                player.scale.z /= 1.05;
              }, 100);
            }
          }
        }
      });

      // Update player position
      if (!collisionOccurred) {
        player.position.copy(nextPosition);
      } else {
        player.position.add(playerVelocity);
      }

      // Ensure player stays above ground
      player.position.y = Math.max(player.scale.y * 0.5, player.position.y);

      // Update camera
      const zoomFactor = 4; // Increased zoom factor
      const targetZoom = THREE.MathUtils.clamp(
        player.scale.x * zoomFactor, 
        minZoom, 
        maxZoom
      );

      // const targetZoom = THREE.MathUtils.clamp(player.scale.x * 3, minZoom, maxZoom);
      currentZoom = THREE.MathUtils.lerp(currentZoom, targetZoom, 0.1);
      cameraOffset.z = currentZoom;

      // Adjust camera height based on zoom level
      cameraOffset.y = Math.max(2, currentZoom * 0.3); // Camera height scales with zoom

      const idealOffset = cameraOffset
        .clone()
        .applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          Math.atan2(playerDirection.x, playerDirection.z)
        );
      camera.position.lerp(player.position.clone().add(idealOffset), 0.1);
      camera.lookAt(player.position);

      renderer.render(scene, camera);
    };

    // Handle window resize
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      // Set the size of the renderer to the window size
      renderer.setSize(window.innerWidth, window.innerHeight);
      // Adjust the pixel ratio to lower the resolution on mobile
      if (isMobileDevice) {
        renderer.setPixelRatio(window.devicePixelRatio / 2); // Adjust this value as needed
      } else {
        renderer.setPixelRatio(window.devicePixelRatio);
      }
    };
    window.addEventListener("resize", onWindowResize);

    // Start animation
    if (!finishedRef.current) animate();

    // Cleanup
    return () => {
      window.removeEventListener("resize", onWindowResize);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  const touchpadStyles = {
    position: 'fixed' as const,
    bottom: '40px',
    right: '40px',
    width: '120px',
    height: '120px',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: '50%',
    border: '3px solid rgba(255, 255, 255, 0.8)',
    zIndex: 1000,
    touchAction: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none' as const
  };

  const centerDotStyles = {
    width: '30px',
    height: '30px',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 1)'
  };

  return (
    <>
      <div ref={mountRef} />
      <SizeIndicator size={gameState.playerSize} time={gameState.timeElapsed} />
      <audio ref={audioRef} />
      <audio ref={blipSoundRef} />
      {gameOver && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-white p-8 rounded-lg text-center">
            <h1 className="text-3xl font-bold mb-4 rainbow_text_animated"><b>Congratulations!</b></h1>
            <p className="text-xl mb-2">You vacuumed all the objects!</p>
            <p className="text-lg">
              Final size: {Math.floor(gameState.playerSize)} cm{" "}
              {Math.floor((gameState.playerSize % 1) * 10)} mm
            </p>
            <p className="text-lg">
              Time: {Math.floor(gameState.timeElapsed / 60)}m{" "}
              {gameState.timeElapsed % 60}s
            </p>
            <br />
            <button type="button" onClick={refreshPage}>
              <span className="rainbow rainbow_text_animated text-lg">PLAY AGAIN</span>
            </button>
            <br />
            <img src="https://i.imgur.com/n1lfojs.gif" />
          </div>
        </div>
      )}

      {isMobileDevice && (
        <div 
          style={touchpadStyles}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div style={centerDotStyles} />
        </div>
      )}

    </>
  );
};

const refreshPage = () => {
   window.location.reload(); 
};

export default Game;
