'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { createNoise2D } from 'simplex-noise'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { SizeIndicator } from './components/size-indicator'
import { auraVertexShader, auraFragmentShader } from './shaders/aura'
import type { GameObject, GameState } from './types/game'

// Organized game objects by size tiers
const gameObjects: GameObject[] = [
  // Tier 1 (0-2cm)
  { type: 'paperclip', size: 0.5, model: '/models/paperclip.glb', position: [1, 0, 1], rotation: [0, 0, 0], scale: 1, color: '#A1A1A1' },
  { type: 'eraser', size: 1, model: '/models/eraser.glb', position: [-1, 0, 2], rotation: [0, 0, 0], scale: 1, color: '#F48FB1' },
  { type: 'coin', size: 1.5, model: '/models/coin.glb', position: [2, 0, -1], rotation: [0, 0, 0], scale: 1, color: '#FFD700' },
  
  // Tier 2 (2-5cm)
  { type: 'pencil', size: 2.5, model: '/models/pencil.glb', position: [-2, 0, -2], rotation: [0, 0, 0], scale: 1, color: '#4CAF50' },
  { type: 'spoon', size: 3, model: '/models/spoon.glb', position: [3, 0, 3], rotation: [0, 0, 0], scale: 1, color: '#9E9E9E' },
  { type: 'toy_car', size: 4, model: '/models/toy_car.glb', position: [-3, 0, 1], rotation: [0, 0, 0], scale: 1, color: '#2196F3' },
  
  // Tier 3 (5-10cm)
  { type: 'mug', size: 6, model: '/models/mug.glb', position: [4, 0, -3], rotation: [0, 0, 0], scale: 1, color: '#FF5722' },
  { type: 'book', size: 8, model: '/models/book.glb', position: [-4, 0, -4], rotation: [0, 0, 0], scale: 1, color: '#795548' },
  { type: 'plate', size: 9, model: '/models/plate.glb', position: [5, 0, 2], rotation: [0, 0, 0], scale: 1, color: '#E0E0E0' },
  
  // Tier 4 (10-20cm)
  { type: 'laptop', size: 12, model: '/models/laptop.glb', position: [-5, 0, 5], rotation: [0, 0, 0], scale: 1, color: '#9C27B0' },
  { type: 'box', size: 15, model: '/models/box.glb', position: [6, 0, -5], rotation: [0, 0, 0], scale: 1, color: '#8D6E63' },
  { type: 'chair', size: 18, model: '/models/chair.glb', position: [-6, 0, -6], rotation: [0, 0, 0], scale: 1, color: '#795548' },
  
  // Tier 5 (20cm+)
  { type: 'table', size: 25, model: '/models/table.glb', position: [7, 0, 7], rotation: [0, 0, 0], scale: 1, color: '#5D4037' },
  { type: 'desk', size: 30, model: '/models/desk.glb', position: [-7, 0, -7], rotation: [0, 0, 0], scale: 1, color: '#3E2723' },
]

// Size tiers for controlled growth
const sizeTiers = [
  { min: 0, max: 2, growthRate: 0.005 },
  { min: 2, max: 5, growthRate: 0.003 },
  { min: 5, max: 10, growthRate: 0.002 },
  { min: 10, max: 20, growthRate: 0.001 },
  { min: 20, max: Infinity, growthRate: 0.0005 },
]

// Multiply objects for better distribution
const distributeObjects = (objects: GameObject[]): GameObject[] => {
  const distributed: GameObject[] = []
  objects.forEach(obj => {
    const count = obj.size < 5 ? 20 : obj.size < 10 ? 12 : obj.size < 20 ? 6 : 2
    for (let i = 0; i < count; i++) {
      const distance = Math.pow(obj.size, 1.2) * 0.8
      const angle = Math.random() * Math.PI * 2
      distributed.push({
        ...obj,
        position: [
          Math.cos(angle) * distance,
          obj.position[1],
          Math.sin(angle) * distance
        ]
      })
    }
  })
  return distributed
}

const Game: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null)
  const [gameState, setGameState] = useState<GameState>({
    playerSize: 1.5,
    collectedObjects: [],
    timeElapsed: 0,
  })

  useEffect(() => {
    if (!mountRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#E0E0E0')
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.shadowMap.enabled = true
    mountRef.current.appendChild(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2)
    scene.add(ambientLight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(10, 10, 10)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    // Room setup
    const roomGeometry = new THREE.BoxGeometry(50, 20, 50)
    const roomMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFECB3,
      side: THREE.BackSide 
    })
    const room = new THREE.Mesh(roomGeometry, roomMaterial)
    room.position.y = 10
    scene.add(room)

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(50, 50)
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFCACC,
      roughness: 0.8 
    })
    const floor = new THREE.Mesh(floorGeometry, floorMaterial)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)


    // Player (Katamari)
    const playerGeometry = new THREE.SphereGeometry(0.5, 32, 32)
    const playerMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4CAF50, // Green
      roughness: 0.3,
      metalness: 0.2
    })
    const player = new THREE.Mesh(playerGeometry, playerMaterial)
    player.position.y = 0.25 // Start closer to the ground
    player.scale.setScalar(0.75) // Increased initial size
    player.castShadow = true
    player.receiveShadow = true
    scene.add(player)

    // Collected objects container
    const collectedObjectsContainer = new THREE.Group()
    player.add(collectedObjectsContainer)

    // Create aura material
    const auraMaterial = new THREE.ShaderMaterial({
      vertexShader: auraVertexShader,
      fragmentShader: auraFragmentShader,
      transparent: true,
      uniforms: {
        time: { value: 0 }
      }
    })

    // Load game objects
    const objects: THREE.Object3D[] = []
    const auras: THREE.Mesh[] = []
    
    distributeObjects(gameObjects).forEach(obj => {
      // Create object
      const geometry = new THREE.BoxGeometry(obj.size * 0.1, obj.size * 0.1, obj.size * 0.1)
      const material = new THREE.MeshStandardMaterial({ color: obj.color })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(...obj.position)
      mesh.rotation.set(...obj.rotation)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData.size = obj.size
      scene.add(mesh)
      objects.push(mesh)

      // Create aura
      const auraGeometry = new THREE.SphereGeometry(obj.size * 0.06, 32, 32)
      const auraMesh = new THREE.Mesh(auraGeometry, auraMaterial.clone())
      auraMesh.scale.multiplyScalar(1.2)
      auraMesh.visible = false
      mesh.add(auraMesh)
      auras.push(auraMesh)
    })

    // Player movement properties
    const playerVelocity = new THREE.Vector3()
    const playerDirection = new THREE.Vector3(0, 0, -1)
    const rotationSpeed = 0.02
    const acceleration = 0.003
    const maxSpeed = 0.2
    const friction = 0.99
    const bounceForce = 0.3
    const gravity = 0.01
    const jumpForce = 0.2
    let isGrounded = false

    // Camera setup
    const cameraOffset = new THREE.Vector3(0, 2, 5)
    const minZoom = 5
    const maxZoom = 30
    let currentZoom = minZoom
    camera.position.copy(player.position).add(cameraOffset)
    camera.lookAt(player.position)

    // Game loop
    let time = 0
    const animate = () => {
      requestAnimationFrame(animate)
      time += 0.016

      // Update aura uniforms and visibility
      objects.forEach((object, index) => {
        if (object.parent === scene) {
          const aura = auras[index]
          if (aura) {
            aura.material.uniforms.time.value = time
            aura.visible = object.userData.size <= gameState.playerSize * 1.2
          }
        }
      })

      // Player movement
      const moveDirection = new THREE.Vector3()
      if (keys.ArrowUp) moveDirection.z -= 1
      if (keys.ArrowDown) moveDirection.z += 1

      // Apply acceleration in the player's direction
      playerVelocity.add(playerDirection.clone().multiplyScalar(moveDirection.z * acceleration))

      // Apply gravity
      playerVelocity.y -= gravity

      // Check if player is on the ground
      isGrounded = player.position.y <= player.scale.y * 0.5
      if (isGrounded) {
        player.position.y = player.scale.y * 0.5
        playerVelocity.y = Math.max(0, playerVelocity.y)
      }

      // Jumping
      if (keys.Space && isGrounded) {
        playerVelocity.y = jumpForce
      }

      // Steering
      if (keys.ArrowLeft) {
        playerDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationSpeed)
      }
      if (keys.ArrowRight) {
        playerDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotationSpeed)
      }

      // Apply friction and limit speed
      playerVelocity.multiplyScalar(friction)
      if (playerVelocity.length() > maxSpeed) {
        playerVelocity.normalize().multiplyScalar(maxSpeed)
      }

      // Update player position
      const nextPosition = player.position.clone().add(playerVelocity)
      
      // Keep player within bounds
      nextPosition.x = Math.max(-24, Math.min(24, nextPosition.x))
      nextPosition.z = Math.max(-24, Math.min(24, nextPosition.z))

      // Check collisions with objects
      let collisionOccurred = false
      objects.forEach((object, index) => {
        if (object.parent === scene) {
          const distance = nextPosition.distanceTo(object.position)
          const combinedRadius = player.scale.x * 0.5 + (object.userData.size * 0.05)
          
          if (distance < combinedRadius) {
            if (object.userData.size <= gameState.playerSize * 1.2) { // Reduced from 1.5 to 1.2
              // Collect object
              scene.remove(object)
              
              // Add to collected objects with position on the surface of the ball
              const surfacePosition = object.position.clone().sub(player.position).normalize().multiplyScalar(player.scale.x * 0.5)
              object.position.copy(surfacePosition)
              object.scale.multiplyScalar(0.9) // Increased from 0.8 to 0.9 for better visibility
              collectedObjectsContainer.add(object)

              // Update game state with controlled growth
              const currentTier = sizeTiers.find(tier => gameState.playerSize >= tier.min && gameState.playerSize < tier.max)
              const growthRate = currentTier ? currentTier.growthRate : 0.001
              
              setGameState(prev => ({
                ...prev,
                playerSize: prev.playerSize + object.userData.size * growthRate,
                collectedObjects: [...prev.collectedObjects, {
                  type: 'object',
                  size: object.userData.size,
                  position: surfacePosition.toArray(),
                  rotation: [0, 0, 0],
                  scale: 0.9,
                  model: '',
                  color: '#ffffff'
                }]
              }))

              // Grow player
              const growFactor = 1 + (object.userData.size * growthRate)
              player.scale.multiplyScalar(growFactor)
              
              // Adjust collected objects
              collectedObjectsContainer.children.forEach((child: THREE.Object3D) => {
                const childSize = child.userData.size
                const scaleFactor = Math.min(1, (gameState.playerSize * 0.15) / childSize) // Increased from 0.1 to 0.15
                child.scale.setScalar(scaleFactor)
                
                // Remove objects that are too small to see
                if (scaleFactor < 0.05) { // Increased from 0.01 to 0.05
                  collectedObjectsContainer.remove(child)
                } else {
                  // Adjust position to stay on the surface of the growing ball
                  const direction = child.position.clone().normalize()
                  child.position.copy(direction.multiplyScalar(player.scale.x * 0.5))
                }
              })

              cameraOffset.z *= growFactor
            } else {
              // Bounce off larger objects
              collisionOccurred = true
              const pushDirection = nextPosition.clone().sub(object.position).normalize()
              playerVelocity.reflect(pushDirection).multiplyScalar(bounceForce)
              
              // Add some "squish" effect to the player
              player.scale.x *= 0.95
              player.scale.z *= 1.05
              setTimeout(() => {
                player.scale.x /= 0.95
                player.scale.z /= 1.05
              }, 100)
            }
          }
        }
      })

      // Update player position if no collision occurred
      if (!collisionOccurred) {
        player.position.copy(nextPosition)
      } else {
        player.position.add(playerVelocity)
      }

      // Ensure player stays above the ground
      player.position.y = Math.max(player.scale.y * 0.5, player.position.y)

      // Rotate collected objects container
      collectedObjectsContainer.rotation.y += 0.01

      // Update camera zoom based on player size
      const targetZoom = THREE.MathUtils.clamp(player.scale.x * 5, minZoom, maxZoom)
      currentZoom = THREE.MathUtils.lerp(currentZoom, targetZoom, 0.1)
      cameraOffset.z = currentZoom

      // Update camera position
      const idealOffset = cameraOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(playerDirection.x, playerDirection.z))
      camera.position.lerp(player.position.clone().add(idealOffset), 0.1)
      camera.lookAt(player.position)

      renderer.render(scene, camera)
    }

    // Keyboard controls
    const keys: { [key: string]: boolean } = {}
    const onKeyDown = (event: KeyboardEvent) => {
      keys[event.code] = true
      if (event.code === 'Space') {
        event.preventDefault() // Prevent page scrolling
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      keys[event.code] = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // Handle window resize
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onWindowResize)

    // Start the game loop
    animate()

    // Cleanup
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('resize', onWindowResize)
      mountRef.current?.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <>
      <div ref={mountRef} />
      <SizeIndicator size={gameState.playerSize} />
    </>
  )
}

export default Game

