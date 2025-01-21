import type { GameObject, SizeTier } from './types/game';

export interface LevelConfig {
  id: string;
  name: string;
  maxTime: number; // in seconds
  description: string;
  gameObjects: GameObject[];
  sizeTiers: SizeTier[];
  requiredScore: number;
  backgroundMusic: string[];
  ambientColor?: string;
  floorTexture?: string;
  wallTexture?: string;
}

const katamariPalette = [
  "#87CEEB", // Sky Blue
  "#FFD700", // Gold
  "#FF69B4", // Hot Pink
  "#8A2BE2", // Blue Violet
  "#FF4500", // Orange Red
  "#7FFF00", // Chartreuse
  "#00CED1", // Dark Turquoise
  "#FF6347", // Tomato
  "#40E0D0", // Turquoise
  "#DA70D6", // Orchid
  "#87CEEB", // Sky Blue
  "#FFD700", // Gold
  "#FF69B4", // Hot Pink
  "#8A2BE2", // Blue Violet
  "#FF4500", // Orange Red
  "#7FFF00", // Chartreuse
  "#00CED1", // Dark Turquoise
  "#FF6347", // Tomato
  "#40E0D0", // Turquoise
  "#DA70D6", // Orchid
];

function getRandomKatamariColor() {
  const randomIndex = Math.floor(Math.random() * katamariPalette.length);
  return katamariPalette[randomIndex];
}

const createLevel1Objects = (): GameObject[] => [
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
//    color: "#F48FB1",
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
//    color: "#FFD700",
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
 // color: "#4CAF50",
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
 //   color: "#9E9E9E",
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
 //   color: "#2196F3",
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
 //   color: "#795548",
    sound: "music/blips/08.mp3",
  },
  {
    type: "duck",
    size: 7,
    model: "models/duck.glb",
    position: [4, 0, -3],
    rotation: [0, 0, 0],
    scale: 0.5,
 //   color: "#FF5722",
    sound: "music/blips/07.mp3",
  },
  {
    type: "car",
    size: 8.5,
    model: "models/toy_car.glb",
    position: [5, 0, 2],
    rotation: [0, 0, 0],
    scale: 0.5,
 //   color: "#E0E0E0",
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
 //   color: "#9C27B0",
    sound: "music/blips/10.mp3",
  },
  {
    type: "chair",
    size: 13,
    model: "models/chair.glb",
    position: [6, 0, -5],
    rotation: [0, 0, 0],
    scale: 0.06,
 //   color: "#8D6E63",
    sound: "music/blips/01.mp3",
  },
  {
    type: "trashcan",
    size: 14,
    model: "models/trashcan.glb",
    position: [-6, 0, -6],
    rotation: [0, 0, 0],
    scale: 1.1,
 //   color: "#795548",
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
 //   color: "#5D4037",
    sound: "music/blips/03.mp3",
  },
  { type: 'desk', size: 25, model: 'models/piano.glb', position: [-7, 0, -7], rotation: [0, 0, 0], scale: 0.1, sound: 'music/blips/04.mp3' },
];

const createLevel2Objects = (): GameObject[] => [
  // New objects for level 2
  {
    type: "pencil",
    size: 0.3,
    model: "models/pencil.glb",
    position: [0, 0, 1],
    rotation: [0, 0, 0],
    scale: 1,
    color: "#FFD700",
    sound: "music/blips/01.mp3",
  },
  {
    type: "pencil",
    size: 5,
    model: "models/pencil.glb",
    position: [0, 0, 1],
    rotation: [0, 0, 0],
    scale: 1.5,
    color: "#FFD700",
    sound: "music/blips/01.mp3",
  },
  {
    type: "pencil",
    size: 10,
    model: "models/pencil.glb",
    position: [0, 0, 1],
    rotation: [0, 0, 0],
    scale: 2,
    color: "#FFD700",
    sound: "music/blips/01.mp3",
  },
];

const createLevel3Objects = (): GameObject[] => [
  // More challenging objects for level 3
  {
    type: "coin",
    size: 0.5,
    model: "models/coin.glb",
    position: [1, 0, 0],
    rotation: [0, 0, 0],
    scale: 0.1,
    color: getRandomKatamariColor(),
    sound: "music/blips/01.mp3",
  },
  {
    type: "coin",
    size: 1,
    model: "models/coin.glb",
    position: [1, 0, 0],
    rotation: [0, 0, 0],
    scale: 0.2,
    color: getRandomKatamariColor(),
    sound: "music/blips/01.mp3",
  },
  {
    type: "coin",
    size: 2,
    model: "models/coin.glb",
    position: [1, 0, 0],
    rotation: [0, 0, 0],
    scale: 0.3,
    color: getRandomKatamariColor(),
    sound: "music/blips/01.mp3",
  },
  {
    type: "coin",
    size: 4,
    model: "models/coin.glb",
    position: [1, 0, 0],
    rotation: [0, 0, 0],
    scale: 0.4,
    color: getRandomKatamariColor(),
    sound: "music/blips/01.mp3",
  },
  // Add more level 3 specific objects
];

export const levels: LevelConfig[] = [
  {
    id: "level1",
    name: "Sweet Home",
    minZoom: 1,
    roomSize: 40,
    maxTime: 300, // 5 minutes
    description: "Start your cleaning adventure in a cozy Japanese-style room!",
    gameObjects: createLevel1Objects(),
    sizeTiers: [
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
    ],
    requiredScore: 300,
    backgroundMusic: ["music/katamini_01.mp3", "music/katamini_02.mp3"],
    wallTexture: "textures/wall_shoji.png",
    floorTexture: "textures/floor_carpet.jpg",
  },
  {
    id: "level2",
    name: "Office Space",
    maxTime: 240, // 4 minutes
    description: "Take on the challenge of cleaning a busy office!",
    gameObjects: createLevel2Objects(),
    sizeTiers: [
      { min: 0, max: 3, growthRate: 0.6, requiredCount: 12 },
      { min: 3, max: 7, growthRate: 0.8, requiredCount: 12 },
      { min: 7, max: 15, growthRate: 1.2, requiredCount: 8 },
      { min: 15, max: 25, growthRate: 2.5, requiredCount: 5 }
    ],
    requiredScore: 150,
    backgroundMusic: ["music/katamini_03.mp3", "music/katamini_04.mp3"],
    wallTexture: "textures/wall_shoji.png",
    floorTexture: "textures/floor_parquet.jpg",
    multiplayer: "katamini-office-space",
  },
  {
    id: "level3",
    name: "Gold Rush",
    minZoom: 1,
    maxZoom: 10,
    zoom: 1,
    roomSize: 8,
    floorRepeat: [5,5],
    wallRepeat: [10,20],
    maxTime: 10, // 10 seconds
    description: "Clean up after an outdoor garden party!",
    gameObjects: createLevel3Objects(),
    sizeTiers: [
      { min: 0, max: 1, growthRate: 1.0, requiredCount: 10 },
      { min: 2, max: 3, growthRate: 2.0, requiredCount: 10 },
      { min: 3, max: 4, growthRate: 3.0, requiredCount: 5 },
    ],
    requiredScore: 200,
    backgroundMusic: ["music/katamini_01.mp3", "music/katamini_04.mp3"],
    ambientColor: "#88CCFF", // Outdoor lighting
    wallTexture: "textures/wall_stars.mp4",
    floorTexture: "textures/floor_dirt.png",
    multiplayer: "katamini-gold-rush",
  }
];

export const getCurrentLevel = (levelId: string): LevelConfig => {
  const level = levels.find(l => l.id === levelId);
  if (!level) throw new Error(`Level ${levelId} not found`);
  return level;
};

export const getNextLevel = (currentLevelId: string): LevelConfig | null => {
  const currentIndex = levels.findIndex(l => l.id === currentLevelId);
  return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
};

export const distributeObjects = (objects: GameObject[]): GameObject[] => {
  const distributed: GameObject[] = [];
  objects.forEach((obj) => {
    const count = obj.size < 5 ? 20 : obj.size < 10 ? 12 : obj.size < 20 ? 4 : 2;
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
