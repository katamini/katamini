"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { SizeIndicator } from "./components/size-indicator";
import { auraVertexShader, auraFragmentShader } from "./shaders/aura";
import type { GameObject, GameState } from "./types/game";
import { levels, getCurrentLevel, distributeObjects } from "./levels";
import StartMenu from "./StartMenu";
import { MultiplayerManager } from './multiplayer';
import type { PlayerState } from './types/multiplayer';

import { joinRoom } from 'trystero'; // trystero/torrent

const Game: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blipSoundRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<THREE.Mesh | null>(null);
  const collectedObjectsRef = useRef<THREE.Group | null>(null);
  const multiplayerManagerRef = useRef<MultiplayerManager | null>(null);
  const lastPositionRef = useRef<{x: number, y: number, z: number}>({ x: 0, y: 0, z: 0 });

  const finishedRef = useRef(false);
  const keysRef = useRef({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
  });

  const touchRef = useRef({
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    isDragging: false
  });

  const [currentLevelId, setCurrentLevelId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    playerSize: 0.5,
    collectedObjects: [],
    timeElapsed: 0,
    currentClass: 0,
  });
  const [userInteracted, setUserInteracted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [peerCount, setPeerCount] = useState(0);
  const roomRef = useRef<any>(null);

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

  useEffect(() => {
    // handle controls on game over screen
    if (gameOver) {
      const handleKeyPress = (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          finishedRef.current = true;
          setGameOver(true);
          setCurrentLevelId(null); // Exit to menu
        }
      };
      window.addEventListener('keydown', handleKeyPress);
      return () => {
        window.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [gameOver]);   

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
       if (event.code === "Escape") {
	finishedRef.current = true;
        setGameOver(true);
        setCurrentLevelId(null); // Exit to menu
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

  // Multiplayer System
  useEffect(() => {
	  if (
	    multiplayerManagerRef.current && 
	    playerRef.current && 
	    currentLevelId && 
	    !finishedRef.current
	  ) {
	    const player = playerRef.current;
	    const direction = new THREE.Vector3(0, 0, -1);
	    direction.applyQuaternion(player.quaternion);
	    
	    // Check if position has changed significantly (more than 0.01 units)
	    const positionChanged = 
	      Math.abs(player.position.x - lastPositionRef.current.x) > 0.01 ||
	      Math.abs(player.position.y - lastPositionRef.current.y) > 0.01 ||
	      Math.abs(player.position.z - lastPositionRef.current.z) > 0.01;
	
	    // If position changed significantly or other important states changed
	    if (positionChanged) {
	      lastPositionRef.current = {
	        x: player.position.x,
	        y: player.position.y,
	        z: player.position.z
	      };
	      
	      const playerState: PlayerState = {
	        position: [player.position.x, player.position.y, player.position.z],
	        direction: [direction.x, direction.y, direction.z],
	        size: gameState.playerSize,
	        collectedObjects: gameState.collectedObjects
	      };
	      
	      multiplayerManagerRef.current.broadcastPlayerState(playerState);
	    }
	  }
	}, [
	  gameState.playerSize, 
	  gameState.collectedObjects,
	  // Only check position/rotation at a fixed interval
	  Math.floor((Date.now() / 50)), // Check every 50ms
	]);
	
  // Add a new effect for important state changes that should be instant
  useEffect(() => {
	  if (
	    multiplayerManagerRef.current && 
	    playerRef.current && 
	    currentLevelId && 
	    !finishedRef.current
	  ) {
	    const player = playerRef.current;
	    const direction = new THREE.Vector3(0, 0, -1);
	    direction.applyQuaternion(player.quaternion);
	    
	    const playerState: PlayerState = {
	      position: [player.position.x, player.position.y, player.position.z],
	      direction: [direction.x, direction.y, direction.z],
	      size: gameState.playerSize,
	      collectedObjects: gameState.collectedObjects
	    };
	    
	    // Force immediate broadcast for important state changes
	    multiplayerManagerRef.current.forceBroadcastPlayerState(playerState);
	  }
  }, [gameState.playerSize, gameState.collectedObjects.length]); // Only trigger on important changes
	
  // Music system
  useEffect(() => {
	  let audio: HTMLAudioElement | null = null;
	  let blipSound: HTMLAudioElement | null = null;

	  const playAudio = () => {
	    if (audio) {
	      audio.play().catch((error) => {
	        console.log("Failed to play audio:", error);
	      });
	    }
	  };

	  const stopAudio = () => {
	    if (audio) {
	      audio.pause();
	      // audio = null;
	    }
	    if (blipSound) {
	      blipSound = null;
	    }
	  };

	  if (currentLevelId && userInteracted) {
	    const currentLevel = getCurrentLevel(currentLevelId);
	    const randomBackgroundMusic = currentLevel.backgroundMusic[Math.floor(Math.random() * currentLevel.backgroundMusic.length)];
	    audio = new Audio(randomBackgroundMusic);
	    audio.loop = true;
	    audio.volume = 0.4;
	    audioRef.current = audio;

	    playAudio();
	  }

	  const handleVisibilityChange = () => {
	    if (document.visibilityState === "visible" && userInteracted) {
	      console.log('switch: resume playback');
	      playAudio();
	    } else {
	      console.log('switch: pause playback');
	      stopAudio();
	    }
	  };

	  document.addEventListener("visibilitychange", handleVisibilityChange);

	  return () => {
	    document.removeEventListener("visibilitychange", handleVisibilityChange);
	    stopAudio();
	  };
  }, [currentLevelId, userInteracted]);

  // P2p Setup
  useEffect(() => {
    if (currentLevelId) {
      const currentLevel = getCurrentLevel(currentLevelId);
      if (currentLevel.multiplayer) {
	setIsMultiplayer(true);
	const gameId = "katamini-";
        const room = joinRoom({ appId: gameId + currentLevel.multiplayer }, currentLevelId);
        roomRef.current = room;
	if (window) window.room = roomRef.current;
	// Count current player as 1 base
        room.onPeerJoin(() => {
		const count = Object.keys(room.getPeers()).length - 1 || 1;
		setPeerCount( count > 0 ? count : 1 );
	});
        room.onPeerLeave(() => {
		const count = Object.keys(room.getPeers()).length - 1 || 1;
		setPeerCount( count > 0 ? count : 1 );
	});
      } else if (roomRef.current) {
          roomRef.current.leave();
          roomRef.current = null;
      }
    } else {
	setIsMultiplayer(false);
        if (roomRef.current) {
          roomRef.current.leave();
          roomRef.current = null;
	  if (window.room) window.room = null;
        }
    }
  }, [currentLevelId]);


  // Main game setup and loop
  useEffect(() => {
    if (!mountRef.current || !currentLevelId) return;

    const currentLevel = getCurrentLevel(currentLevelId);
    const sizeTiers = currentLevel.sizeTiers;

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
    let wallTexture;

        let wallRepeat = [2.5, 1];
        if (currentLevel.wallRepeat) {
              wallRepeat = [currentLevel.wallRepeat[0], currentLevel.wallRepeat[1]];
        }

	if (currentLevel?.wallTexture) {
	  const extension = currentLevel.wallTexture.split('.').pop()?.toLowerCase();

	  if (extension === 'mp4') {
	    const video = document.createElement('video');
	    video.src = currentLevel.wallTexture;
	    video.loop = true;
	    video.muted = true;
	    video.play();

	    wallTexture = new THREE.VideoTexture(video);
	    wallTexture.wrapS = THREE.RepeatWrapping;
	    wallTexture.wrapT = THREE.RepeatWrapping;
            wallTexture.repeat.set(wallRepeat[0], wallRepeat[1]);

	  } else {
	    wallTexture = new THREE.TextureLoader().load(currentLevel.wallTexture);
	    wallTexture.wrapS = THREE.RepeatWrapping;
	    wallTexture.wrapT = THREE.RepeatWrapping;
            wallTexture.repeat.set(wallRepeat[0], wallRepeat[1]);

	  }
	} else {
	  wallTexture = new THREE.TextureLoader().load("textures/wall_shoji.png");
	  wallTexture.wrapS = THREE.RepeatWrapping;
	  wallTexture.wrapT = THREE.RepeatWrapping;
          wallTexture.repeat.set(wallRepeat[0], wallRepeat[1]);
	}

	const roomSize = currentLevel.roomSize || 50;
	const roomGeometry = new THREE.BoxGeometry(roomSize, 20, roomSize);
	const roomMaterial = new THREE.MeshStandardMaterial({
	  map: wallTexture,
	  side: THREE.BackSide,
	  roughness: 0.8,
	  metalness: 0.0,
	});
     const room = new THREE.Mesh(roomGeometry, roomMaterial);
     room.position.y = 10;
     scene.add(room);


    // Floor setup
    const floorTexture = new THREE.TextureLoader().load(currentLevel.floorTexture || "textures/floor_carpet.jpg");
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;

    if (currentLevel.floorRepeat) {
      floorTexture.repeat.set(currentLevel.floorRepeat[0], currentLevel.floorRepeat[1]);
    } else {
      floorTexture.repeat.set(20, 20); // Default repeat values
    }

    const floorMaterial = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 1.0,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    const floorGeometry = new THREE.PlaneGeometry(roomSize, roomSize);
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

    distributeObjects(currentLevel.gameObjects).forEach((obj) => {
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
	      if (obj.color){ 
		(child as THREE.Mesh).material.color.set(obj.color) 
              }
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
          if (obj.color) {
            mesh.material.color.set(obj.color);
          }
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
    const minZoom = currentLevel.minZoom || 2.5;
    const maxZoom = currentLevel.maxZoom || 150;
    let currentZoom = minZoom;

    camera.position.copy(player.position).add(cameraOffset);
    camera.lookAt(player.position);

    if (currentLevel.multiplayer && roomRef.current) {
	  multiplayerManagerRef.current = new MultiplayerManager(roomRef.current, scene);	  
	  // Initialize last position
	  if (playerRef.current) {
	    lastPositionRef.current = {
	      x: playerRef.current.position.x,
	      y: playerRef.current.position.y,
	      z: playerRef.current.position.z
	    };
	  }
	  // Set up handler for when other players collect objects
	  multiplayerManagerRef.current.setOnObjectCollected((objectId: string) => {
	    objects.forEach((object, index) => {
	      if (object.uuid === objectId) {
	        scene.remove(object);
	        const aura = auras[index];
	        if (aura) {
	          aura.visible = false;
	          aura.parent?.remove(aura);
	        }
	        totalObjects--;
	      }
	    });
	  });
    }

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
    const halfRoomSize = (roomSize / 2) - 0.15; // Room size minus bits
    nextPosition.x = Math.max(-halfRoomSize, Math.min(halfRoomSize, nextPosition.x));
    nextPosition.z = Math.max(-halfRoomSize, Math.min(halfRoomSize, nextPosition.z));

    // Check collisions with objects
    let collisionOccurred = false;
    objects.forEach((object, index) => {
      if (object.parent === scene) {
        const distance = nextPosition.distanceTo(object.position);
        const combinedRadius = player.scale.x * 0.5 + object.userData.size * 0.05;

        if (distance < combinedRadius) {
          if (object.userData.size <= Math.max(gameState.playerSize * 1.2, smallestObject.userData.size)) {

	    // Broadcast object collection in multiplayer
	    if (multiplayerManagerRef.current) {
		  const peerMeshes = multiplayerManagerRef.current.getPeerMeshes();
		  const peerStates = multiplayerManagerRef.current.getPeerStates();
		  
		  peerMeshes.forEach((peerMesh, peerId) => {
		    const peerState = peerStates.get(peerId);
		    if (!peerState) return;
		
		    // Check collision with peer
		    const distance = player.position.distanceTo(peerMesh.position);
		    const combinedRadius = player.scale.x * 0.5 + peerMesh.scale.x * 0.5;
		    
		    if (distance < combinedRadius) {
		      // Bounce off peers like objects
		      collisionOccurred = true;
		      const pushDirection = player.position.clone()
		        .sub(peerMesh.position)
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
		  });
	    }

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
              const currentClass = sizeTiers[prev.currentClass];
              const objectsInClass = prev.collectedObjects.filter(
                (obj) => obj.size >= currentClass.min && obj.size <= currentClass.max
              );

              const allObjectsInClassCaptured =
                objectsInClass.length + 1 >= currentClass.requiredCount;

              let newPlayerSize = prev.playerSize;
              let newClass = prev.currentClass;

              if (allObjectsInClassCaptured && prev.currentClass < sizeTiers.length - 1) {
                newClass += 1;
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
                    color: "#000",
                  },
                ],
              };
            });

            player.position.y = 0.1 * player.scale.y;

        // Update collected objects positions
        let soundEffect; 
	soundEffect = new Audio("music/blips/0" + randoSeed(1, 9) + ".mp3");
	soundEffect.volume = 0.2;

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
	
	  // Play sound effect for the collected object
	  const currentLevel = getCurrentLevel(currentLevelId);
	  const collectedObjectSound = currentLevel.gameObjects.find(obj => obj.type === child.userData.type)?.sound;
 	  if(collectedObjectSound) soundEffect = new Audio(collectedObjectSound);
	
	  soundEffect.play().catch((error) => {
	    console.log("Failed to play sound effect:", error);
	  });
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
    const zoomFactor = currentLevel.zoom || 4; // Increased zoom factor
    const targetZoom = THREE.MathUtils.clamp(
      player.scale.x * zoomFactor, 
      minZoom, 
      maxZoom
    );

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

  if (multiplayerManagerRef.current && roomRef.current) {
	  const playerState: PlayerState = {
	    position: [player.position.x, player.position.y, player.position.z],
	    direction: [playerDirection.x, playerDirection.y, playerDirection.z],
	    size: gameState.playerSize,
	    collectedObjects: gameState.collectedObjects
	  };
	  multiplayerManagerRef.current.broadcastPlayerState(playerState);
	  
	  // Check for object stealing opportunities
	  const peerMeshes = multiplayerManagerRef.current.getPeerMeshes();
	  peerMeshes.forEach((peerMesh, peerId) => {
	    const distance = player.position.distanceTo(peerMesh.position);
	    const combinedRadius = player.scale.x * 0.5 + peerMesh.scale.x * 0.5;
	    
	    if (distance < combinedRadius) {
	      // Only larger players can steal
	      if (gameState.playerSize > peerMesh.scale.x * 4) {
	        multiplayerManagerRef.current.attemptSteal(peerId);
	        
	        // Visual feedback for steal attempt
	        const stealEffect = new THREE.Mesh(
	          new THREE.SphereGeometry(0.5, 32, 32),
	          new THREE.MeshBasicMaterial({
	            color: 0xff0000,
	            transparent: true,
	            opacity: 0.5
	          })
	        );
	        stealEffect.position.copy(peerMesh.position);
	        scene.add(stealEffect);
	        
	        // Animate and remove the effect
	        let scale = 1;
	        const animateEffect = () => {
	          scale *= 1.1;
	          stealEffect.scale.setScalar(scale);
	          stealEffect.material.opacity *= 0.9;
	          
	          if (stealEffect.material.opacity > 0.1) {
	            requestAnimationFrame(animateEffect);
	          } else {
	            scene.remove(stealEffect);
	          }
	        };
	        animateEffect();
	      }
	    }
	  });
	}

  // Handle window resize
  const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (isMobileDevice) {
      renderer.setPixelRatio(window.devicePixelRatio / 2);
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
    if (multiplayerManagerRef.current) {
      multiplayerManagerRef.current.cleanup();
    }
  };
}, [currentLevelId]);

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

const handleLevelSelect = (levelId: string) => {
  setCurrentLevelId(levelId);
  setGameState({
    playerSize: 0.5,
    collectedObjects: [],
    timeElapsed: 0,
    currentClass: 0,
  });
  setGameOver(false);
  finishedRef.current = false;
};

return (
  <>
    {!currentLevelId ? (
      <StartMenu onSelectLevel={handleLevelSelect} />
    ) : (
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
              <button type="button" onClick={() => setCurrentLevelId(null)}>
                <span className="rainbow rainbow_text_animated text-lg">RETURN TO MENU</span>
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
	{isMultiplayer && (
	<div style={{ position: 'fixed', bottom: '10px', right: '10px', backgroundColor: 'rgba(0, 0, 0, 0.5)', color: 'white', padding: '5px', borderRadius: '5px' }}>
	  {`Players: ${peerCount + 1}`}
	</div>
	)}
      </>
    )}
  </>
);
};

const refreshPage = () => {
  window.location.reload(); 
};

export default Game;
