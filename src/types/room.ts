export interface Door {
  id: string;
  roomId1: string;
  roomId2: string;
  side1: "top" | "right" | "bottom" | "left";
  side2: "top" | "right" | "bottom" | "left";
}

export interface Room {
  id: string;
  name: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface World {
  id: string;
  name: string;
  description: string;
  rooms: Room[];
  doors: Door[];
}

export interface Universe {
  id: string;
  name: string;
  worlds: World[];
}

export interface DoorPosition {
  roomId: string;
  side: "top" | "right" | "bottom" | "left";
  position: number; // 0-1, position along the side
}
