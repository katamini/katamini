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
  { type: 'paperclip', size: 0.5, model: 'models/none.glb', position: [1, 0, 1], rotation: [0, 0, 0], scale: 1, color: '#A1A1A1', sound: 'music/blips/01.mp3' },
  { type: 'eraser', size: 1, model: 'models/none.glb', position: [-1, 0, 2], rotation: [0, 0, 0], scale: 1, color: '#F48FB1', sound: 'music/blips/02.mp3' },
  { type: 'coin', size: 2, model: 'models/coin.glb', position: [2, 0, -1], rotation: [0, 0, 0], scale: 0.3, color: '#FFD700', round: true, sound: 'music/blips/03.mp3' },
  
  // Tier 2 (2-5cm)
  { type: 'pencil', size: 2, model: 'models/coin.glb', position: [-2, 0, -2], rotation: [0, 0, 0], scale: 0.5, color: '#4CAF50', round: true, sound: 'music/blips/04.mp3' },
  { type: 'spoon', size: 3, model: 'models/eraser.glb', position: [3, 0, 3], rotation: [0, 0, 0], scale: 0.3, color: '#9E9E9E', round: false, sound: 'music/blips/05.mp3' },
  { type: 'toy_car', size: 4.5, model: 'models/pencil.glb', position: [-3, 0, 1], rotation: [0, 0, 0], scale: 1.5, color: '#2196F3', round: true, sound: 'music/blips/06.mp3' },
  
  // Tier 3 (5-10cm)
  { type: 'book', size: 5, model: 'models/books.glb', position: [-4, 0, -4], rotation: [0, 0, 0], scale: 0.25, color: '#795548', sound: 'music/blips/08.mp3' },
  { type: 'mug', size: 6, model: 'models/duck.glb', position: [4, 0, -3], rotation: [0, 0, 0], scale: 0.4, color: '#FF5722', sound: 'music/blips/07.mp3' },
  { type: 'plate', size: 8.5, model: 'models/toy_car.glb', position: [5, 0, 2], rotation: [0, 0, 0], scale: 0.5, color: '#E0E0E0', sound: 'music/blips/09.mp3' },
  
  // Tier 4 (10-20cm)
  { type: 'laptop', size: 12, model: 'models/flowerpot.glb', position: [-5, 0, 5], rotation: [0, 0, 0], scale: 0.4, color: '#9C27B0', sound: 'music/blips/10.mp3' },
  { type: 'box', size: 15, model: 'models/none.glb', position: [6, 0, -5], rotation: [0, 0, 0], scale: 1, color: '#8D6E63', sound: 'music/blips/01.mp3' },
  { type: 'chair', size: 18, model: 'models/chair.glb', position: [-6, 0, -6], rotation: [0, 0, 0], scale: 0.07, color: '#795548', sound: 'music/blips/02.mp3' },
  
  // Tier 5 (20cm+)
  { type: 'table', size: 25, model: 'models/none.glb', position: [7, 0, 7], rotation: [0, 0, 0], scale: 1, color: '#5D4037', sound: 'music/blips/03.mp3' },
  { type: 'desk', size: 30, model: 'models/piano.glb', position: [-7, 0, -7], rotation: [0, 0, 0], scale: 0.05, color: '#3E2723', sound: 'music/blips/04.mp3' },
];

// Size tiers for controlled growth
const sizeTiers = [
  { min: 0, max: 2, growthRate: 0.05 },
  { min: 2, max: 5, growthRate: 0.04 },
  { min: 5, max: 10, growthRate: 0.03 },
  { min: 10, max: 20, growthRate: 0.03 },
  { min: 20, max: Infinity, growthRate: 0.05 },
];

// Multiply objects for better distribution
const distributeObjects = (objects: GameObject[]): GameObject[] => {
  const distributed: GameObject[] = [];
  objects.forEach((obj) => {
    const count =
      obj.size < 5 ? 20 : obj.size < 10 ? 12 : obj.size < 20 ? 6 : 2;
    for (let i = 0; i < count; i++) {
      const distance = Math.pow(obj.size, 1.05) * 0.5;
      const angle = Math.random() * Math.PI * 2;
      distributed.push({
        ...obj,
        position: [
          Math.cos(angle) * distance, 0, Math.sin(angle) * distance,
        ],
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
  const [gameState, setGameState] = useState<GameState>({
    playerSize: 0.5,
    collectedObjects: [],
    timeElapsed: 0,
  });
  const [userInteracted, setUserInteracted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const loader = new GLTFLoader();

  const playRandomSound = (sounds: string[]) => {
      const randomIndex = Math.floor(Math.random() * sounds.length);
      const sound = new Audio(sounds[randomIndex]);
      sound.volume = 0.4;
      sound.play().catch(error => {
        console.log('Failed to play random sound:', error);
      });
    };
  
  function randoSeed(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // readystate
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

  // music
  useEffect(() => {
    const audio = new Audio("music/katamini_0"+randoSeed(1,2)+".mp3");
    const blipSound = new Audio("music/blips/0"+randoSeed(1,9)+".mp3");
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
      playRandomSound(['music/effects/01.mp3', 'music/effects/03.mp3', 'music/effects/04.mp3', 'music/effects/05.mp3']);
      playAudio();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && userInteracted) {
        playRandomSound(['music/effects/01.mp3', 'music/effects/02.mp3', 'music/effects/03.mp3', 'music/effects/04.mp3', 'music/effects/05.mp3']);
        playAudio();
      } else {
        playRandomSound(['music/effects/02.mp3']);
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

  // game
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
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 3000;
    directionalLight.shadow.mapSize.height = 3000;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xffcacc, 0.3);
    scene.add(hemisphereLight);

    // Room setup
    const roomGeometry = new THREE.BoxGeometry(50, 20, 50);
    const roomMaterial = new THREE.MeshStandardMaterial({
      color: 0xffecb3,
      side: THREE.BackSide,
    });
    const room = new THREE.Mesh(roomGeometry, roomMaterial);
    room.position.y = 10;
    scene.add(room);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xffcacc,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    // Player (Katamari)
    const playerGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const playerMaterial = new THREE.MeshStandardMaterial({
      color: 0x4caf50, // Green
      roughness: 0.3,
      metalness: 0.2,
    });
    const player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.y = 0.25; // Start closer to the ground
    player.scale.setScalar(0.25); // Initial size
    player.castShadow = true;
    player.receiveShadow = true;
    scene.add(player);

    // Collected objects container
    const collectedObjectsContainer = new THREE.Group();
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
      if (obj.round){
        // Add random rotation
        model.rotation.set(
          obj.rotation[0],
          obj.rotation[1] + Math.random() * Math.PI,
          obj.rotation[2] + Math.random() * Math.PI
        );
        // adjust to the floor
        model.position.y = 0.05;
        
      } else {
         model.rotation.set(
          0,
          obj.rotation[2] + Math.random() * Math.PI,
          0,
        );
        // Adjust position to be above the floor
        model.position.y = 0.05;
      }
      // Apply the scale parameter
      model.scale.setScalar(obj.scale);
      model.userData.size = obj.size; // Set userData.size for interaction logic

      

      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).castShadow = true;
          (child as THREE.Mesh).receiveShadow = true;
        }
      });
      scene.add(model);
      objects.push(model);

      // Create aura
      const auraGeometry = new THREE.SphereGeometry(
        obj.size * 0.15,
        32,
        32
      );
      const auraMesh = new THREE.Mesh(auraGeometry, auraMaterial.clone());
      auraMesh.scale.multiplyScalar(1.2);
      auraMesh.visible = false;
      model.add(auraMesh);
      auras.push(auraMesh);
    },
    undefined,
    () => {
      // If loading fails, create a default block
      const geometry = new THREE.BoxGeometry(
        obj.size * 0.1,
        obj.size * 0.1,
        obj.size * 0.1
      );
      const material = new THREE.MeshStandardMaterial({ color: obj.color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...obj.position);
      mesh.rotation.set(...obj.rotation);
      mesh.scale.setScalar(obj.scale); // Apply the scale parameter

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.size = obj.size; // Set userData.size for interaction logic

      // Adjust position to be above the floor
      mesh.position.y = obj.size * 0.005;

      scene.add(mesh);
      objects.push(mesh);

      // Create aura
      const auraGeometry = new THREE.SphereGeometry(
        obj.size * 0.06,
        32,
        32
      );
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
    const rotationSpeed = 0.02;
    const acceleration = 0.003;
    const maxSpeed = 0.1;
    const friction = 0.99;
    const bounceForce = 0.4;
    const gravity = 0.01;
    const jumpForce = 0.2;
    let isGrounded = false;

    // Camera setup
    const cameraOffset = new THREE.Vector3(0, 1, 2.5);
    const minZoom = 2.5;
    const maxZoom = 100; 
    let currentZoom = minZoom; 
    camera.position.copy(player.position).add(cameraOffset);
    camera.lookAt(player.position);

    let finished = false;
    let startTime = Date.now();

    // Game loop
    let time = 0;
    const animate = () => {
      if (finished) return; // Stop animation when game is over

      requestAnimationFrame(animate);
      time += 0.016;

      // Update time elapsed
      const currentTime = Date.now();
      const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
      setGameState(prev => ({ ...prev, timeElapsed: elapsedSeconds }));

      // Find the smallest remaining object
      const smallestObject = objects.reduce(
        (smallest, obj) => {
          if (
            obj.parent === scene &&
            obj.userData.size < smallest.userData.size
          ) {
            return obj;
          }
          return smallest;
        },
        { userData: { size: Infinity } }
      );

      // Add logic to check if all objects are captured
      if ((totalObjects + objects.length === 0) && totalObjects != 0 && !finished) { 
        console.log("Game Completed!", time, gameState, objects.length);
        audioRef.current?.pause();
        audioRef.current = null;
        playRandomSound(['music/effects/01.mp3', 'music/effects/03.mp3', 'music/effects/04.mp3', 'music/effects/05.mp3']);
        finished = true;
        setGameOver(true);
      }

      // Update aura uniforms and visibility
      objects.forEach((object, index) => {
        if (object.parent === scene) {
          const aura = auras[index];
          if (aura) {
            aura.material.uniforms.time.value = time;
            // Make objects collectible if they're the smallest remaining or within 20% of the player's size
            aura.visible =
              object.userData.size <=
              Math.max(
                gameState.playerSize * 1.2,
                smallestObject.userData.size
              );
          }
        }
      });

      // Player movement
      const moveDirection = new THREE.Vector3();
      if (keys.ArrowUp) moveDirection.z -= 1;
      if (keys.ArrowDown) moveDirection.z += 1;

      // Apply acceleration in the player's direction
      playerVelocity.add(
        playerDirection.clone().multiplyScalar(moveDirection.z * acceleration)
      );

      // Apply gravity
      playerVelocity.y -= gravity;

      // Check if player is on the ground
      isGrounded = player.position.y <= player.scale.y * 0.5;
      if (isGrounded) {
        player.position.y = player.scale.y * 0.5;
        playerVelocity.y = Math.max(0, playerVelocity.y);
      }

      // Jumping
      if (keys.Space && isGrounded) {
        playerVelocity.y = jumpForce;
      }

      // Steering
      if (keys.ArrowLeft) {
        playerDirection.applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          rotationSpeed
        );
      }
      if (keys.ArrowRight) {
        playerDirection.applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          -rotationSpeed
        );
      }

      // Apply friction and limit speed
      playerVelocity.multiplyScalar(friction);
      if (playerVelocity.length() > maxSpeed) {
        playerVelocity.normalize().multiplyScalar(maxSpeed);
      }

      // Update player position
      const nextPosition = player.position.clone().add(playerVelocity);

      // Keep player within bounds
      nextPosition.x = Math.max(-24, Math.min(24, nextPosition.x));
      nextPosition.z = Math.max(-24, Math.min(24, nextPosition.z));

      // Check collisions with objects
      let collisionOccurred = false;
      objects.forEach((object, index) => {
        if (object.parent === scene) {
          const distance = nextPosition.distanceTo(object.position);
          const combinedRadius =
            player.scale.x * 0.5 + object.userData.size * 0.05;

          if (distance < combinedRadius) {
            if (
              object.userData.size <=
              Math.max(gameState.playerSize * 1.2, smallestObject.userData.size)
            ) {
              // Collect object
              scene.remove(object);
              totalObjects--; // Decrement total objects count

              // Add to collected objects with position on the surface of the ball
              const surfacePosition = new THREE.Vector3(
                (Math.random() - 0.5) * player.scale.x,
                (Math.random() - 0.5) * player.scale.x,
                (Math.random() - 0.5) * player.scale.x
              )
                .normalize()
                .multiplyScalar(player.scale.x * 0.5);
              object.position.copy(surfacePosition);
              // object.aura.visible = false;
              
              // Scale the object to be more visible on the surface
              const scaleFactor = Math.max(0.1, object.userData.size / gameState.playerSize);
              object.scale.multiplyScalar(0.6); // scaleFactor
              
              collectedObjectsContainer.add(object);
              object.userData.orbitOffset = Math.random() * Math.PI * 2;

              // Play blip sound
              if (blipSoundRef.current) {
                blipSoundRef.current.play().catch((error) => {
                  console.log("Failed to play blip sound:", error);
                });
              }

              // Update game state
              setGameState((prev) => {
                const currentTier = sizeTiers.find(
                  (tier) =>
                    prev.playerSize >= tier.min && prev.playerSize < tier.max
                );
                const growthRate = currentTier ? currentTier.growthRate : 0.01;
                const newPlayerSize =
                  prev.playerSize + (object.userData.size * growthRate);

                return {
                  ...prev,
                  playerSize: newPlayerSize,
                  collectedObjects: [
                    ...prev.collectedObjects,
                    {
                      type: "object",
                      size: object.userData.size,
                      position: surfacePosition.toArray(),
                      rotation: [0, 0, 0],
                      scale: object.scale * 0.8,
                      model: "",
                      color: "#ffffff",
                    },
                  ],
                };
              });

              // Adjust player size
              const targetScale = gameState.playerSize;
              player.scale.lerp(
                new THREE.Vector3(targetScale, targetScale, targetScale),
                0.1
              );

              // Adjust collected objects
              collectedObjectsContainer.children.forEach(
                (child: THREE.Object3D) => {
                  const childSize = child.userData.size;
                  const childScaleFactor = Math.max(0.1, childSize / gameState.playerSize);
                  child.scale.setScalar(0.5);

                  // Remove objects that are too small to see
                  if (childScaleFactor < 0.05) {
                    collectedObjectsContainer.remove(child);
                  } else {
                    // Adjust position to orbit around the growing ball
                    const orbitRadius = player.scale.x * 0.7;
                    const angle = time * 0.5 + child.userData.orbitOffset;
                    child.position.set(
                      Math.cos(angle) * orbitRadius,
                      Math.sin(angle * 0.7) * orbitRadius * 0.5,
                      Math.sin(angle) * orbitRadius
                    );
                  }
                }
              );

              cameraOffset.z = Math.max(2.5, player.scale.x * 3);
            } else {
              // Bounce off larger objects
              collisionOccurred = true;
              const pushDirection = nextPosition
                .clone()
                .sub(object.position)
                .normalize();
              playerVelocity.reflect(pushDirection).multiplyScalar(bounceForce);

              // Add some "squish" effect to the player
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

      // Update player position if no collision occurred
      if (!collisionOccurred) {
        player.position.copy(nextPosition);
      } else {
        player.position.add(playerVelocity);
      }

      // Ensure player stays above the ground
      player.position.y = Math.max(player.scale.y * 0.5, player.position.y);

      // Rotate collected objects container
      collectedObjectsContainer.rotation.x += 0.05;

      // Update camera zoom based on player size
      const targetZoom = THREE.MathUtils.clamp(
        player.scale.x * 3,
        minZoom,
        maxZoom
      );
      currentZoom = THREE.MathUtils.lerp(currentZoom, targetZoom, 0.1);
      cameraOffset.z = currentZoom;

      // Update camera position
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

    // Keyboard controls
    const keys: { [key: string]: boolean } = {};
    const onKeyDown = (event: KeyboardEvent) => {
      keys[event.code] = true;
      if (event.code === "Space") {
        event.preventDefault(); // Prevent page scrolling
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keys[event.code] = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // Handle window resize
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onWindowResize);

    // Start the game loop
    animate();

    // Cleanup
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onWindowResize);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <>
      <div ref={mountRef} />
      <SizeIndicator size={gameState.playerSize} time={gameState.timeElapsed} />
      <audio ref={audioRef} />
      <audio ref={blipSoundRef} />
      {gameOver && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-white p-8 rounded-lg text-center">
            <h2 className="text-3xl font-bold mb-4">Congratulations!</h2>
            <p className="text-xl mb-2">You've captured all the objects!</p>
            <p className="text-lg">
              Final size: {Math.floor(gameState.playerSize)}cm {Math.floor((gameState.playerSize % 1) * 10)}mm
            </p>
            <p className="text-lg">
              Time: {Math.floor(gameState.timeElapsed / 60)}m {gameState.timeElapsed % 60}s
            </p>
            <br/>
            <button type="button" onClick={ refreshPage }><span>Play Again</span></button><br/>
            <img src="https://i.imgur.com/n1lfojs.gif"/>
          </div>
        </div>
      )}
    </>
  );
};

const refreshPage = () => {
   window.location.reload(); 
};

export default Game;
