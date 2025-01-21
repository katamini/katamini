// multiplayer.ts
import * as THREE from 'three';
import { Room } from 'trystero';
import { GameObject } from './types/game';

export interface PlayerState {
  position: [number, number, number];
  direction: [number, number, number];
  size: number;
  collectedObjects: GameObject[];
}

export interface MultiplayerState {
  [peerId: string]: PlayerState;
}

const BROADCAST_RATE = 50; // 20 updates per second
const PEER_COLOR = 0x6495ED; // Cornflower blue for other players
const PEER_TOP_COLOR = 0x4169E1; // Royal blue for peer top disc
const PEER_SENSOR_COLOR = 0x1E90FF; // Dodger blue for peer sensor

export class MultiplayerManager {
  private room: Room;
  private peers: Map<string, THREE.Group> = new Map();
  private peerStates: Map<string, PlayerState> = new Map();
  private scene: THREE.Scene;
  private lastBroadcastTime: number = 0;
  private onObjectCollectedCallback: ((objectId: string) => void) | null = null;
  
  // Trystero action functions
  private sendPlayerState: (state: PlayerState) => void;
  private getPlayerState: (callback: (state: PlayerState, peerId: string) => void) => void;
  private sendObjectCollected: (objectId: string) => void;
  private getObjectCollected: (callback: (objectId: string, peerId: string) => void) => void;

  constructor(room: Room, scene: THREE.Scene) {
    this.room = room;
    this.scene = scene;
    this.lastBroadcastTime = Date.now();
    
    // Initialize P2P actions
    [this.sendPlayerState, this.getPlayerState] = room.makeAction('playerState');
    [this.sendObjectCollected, this.getObjectCollected] = room.makeAction('playerObj');

    // Set up peer event handlers
    room.onPeerJoin((peerId) => this.handlePeerJoin(peerId));
    room.onPeerLeave((peerId) => this.handlePeerLeave(peerId));

    // Set up state update handler
    this.getPlayerState((state, peerId) => {
      this.peerStates.set(peerId, state);
      this.updatePeerState(state, peerId);
    });
    
    // Set up object collection handler
    this.getObjectCollected((objectId, peerId) => {
      if (this.onObjectCollectedCallback) {
        this.onObjectCollectedCallback(objectId);
      }
    });
  }

  private createPeerMesh(): THREE.Group {
    const peerGroup = new THREE.Group();

    // Create base roomba
    const baseGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 32);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: PEER_COLOR,
      roughness: 0.7,
      metalness: 0.3,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.castShadow = true;
    base.receiveShadow = true;
    peerGroup.add(base);
    
    // Add top disc
    const topDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.05, 32),
      new THREE.MeshStandardMaterial({ color: PEER_TOP_COLOR })
    );
    topDisc.position.y = 0.1;
    base.add(topDisc);

    // Add sensor bump
    const sensorBump = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: PEER_SENSOR_COLOR })
    );
    sensorBump.position.set(0, 0.15, 0.3);
    base.add(sensorBump);

    // Create collected objects container
    const collectedObjectsContainer = new THREE.Group();
    peerGroup.add(collectedObjectsContainer);
    
    return peerGroup;
  }

  private handlePeerJoin(peerId: string) {
    console.log('Peer joined:', peerId);
    const peerMesh = this.createPeerMesh();
    this.peers.set(peerId, peerMesh);
    this.scene.add(peerMesh);
    
    // Set initial scale
    peerMesh.scale.setScalar(0.25);
    peerMesh.position.y = 0.1 * peerMesh.scale.y;
  }

  private handlePeerLeave(peerId: string) {
    console.log('Peer left:', peerId);
    const peerMesh = this.peers.get(peerId);
    if (peerMesh) {
      this.scene.remove(peerMesh);
      this.peers.delete(peerId);
      this.peerStates.delete(peerId);
    }
  }

  private updatePeerState(state: PlayerState, peerId: string) {
    const peerMesh = this.peers.get(peerId);
    if (!peerMesh) return;

    // Update position with smooth lerp
    const targetPosition = new THREE.Vector3(...state.position);
    peerMesh.position.lerp(targetPosition, 0.1);
    
    // Update rotation based on direction
    const direction = new THREE.Vector3(...state.direction);
    if (direction.length() > 0) {
      const lookAtPoint = peerMesh.position.clone().add(direction);
      peerMesh.lookAt(lookAtPoint);
    }
    
    // Update size with proper scaling
    const targetScale = state.size * 0.25;
    peerMesh.scale.setScalar(targetScale);
    peerMesh.position.y = 0.1 * peerMesh.scale.y;

    // Update collected objects visualization
    this.updatePeerCollectedObjects(peerMesh, state.collectedObjects);
  }

  private updatePeerCollectedObjects(peerMesh: THREE.Object3D, collectedObjects: GameObject[]) {
    // Find or create the collected objects container
    let container = peerMesh.children.find(child => child instanceof THREE.Group) as THREE.Group;
    if (!container) {
      container = new THREE.Group();
      peerMesh.add(container);
    }

    // Clear existing objects
    while (container.children.length) {
      container.remove(container.children[0]);
    }

    // Add new objects
    collectedObjects.forEach((obj, index) => {
      const objMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshStandardMaterial({ color: obj.color || 0x808080 })
      );

      // Position around the peer roomba
      const angle = (index / collectedObjects.length) * Math.PI * 2;
      const radius = peerMesh.scale.x * 0.5;
      objMesh.position.set(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );

      container.add(objMesh);
    });
  }

  public broadcastPlayerState(state: PlayerState) {
    const currentTime = Date.now();
    if (currentTime - this.lastBroadcastTime >= BROADCAST_RATE) {
      this.sendPlayerState(state);
      this.lastBroadcastTime = currentTime;
    }
  }

  public forceBroadcastPlayerState(state: PlayerState) {
    this.sendPlayerState(state);
    this.lastBroadcastTime = Date.now();
  }

  public broadcastObjectCollected(objectId: string) {
    this.sendObjectCollected(objectId);
  }

  public setOnObjectCollected(callback: (objectId: string) => void) {
    this.onObjectCollectedCallback = callback;
  }

  public getPeerMeshes(): Map<string, THREE.Group> {
    return this.peers;
  }

  public getPeerStates(): Map<string, PlayerState> {
    return this.peerStates;
  }

  public cleanup() {
    this.peers.forEach((mesh) => {
      this.scene.remove(mesh);
    });
    this.peers.clear();
    this.peerStates.clear();
    this.onObjectCollectedCallback = null;
  }
}
