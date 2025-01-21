export interface PlayerState {
  position: [number, number, number];  // x, y, z
  direction: [number, number, number]; // x, y, z
  size: number;
  collectedObjects: any[];  // Using any for now, should match your GameObject type
}

export interface MultiplayerState {
  [peerId: string]: PlayerState;
}
