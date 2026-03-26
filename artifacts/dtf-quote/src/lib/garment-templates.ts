export interface GarmentTemplate {
  id: string;
  name: string;
  svgPath: string;
  printArea: { x: number; y: number; width: number; height: number };
  canvasWidth: number;
  canvasHeight: number;
}

export const GARMENT_COLORS = [
  { name: "Blanco", hex: "#FFFFFF" },
  { name: "Negro", hex: "#1a1a1a" },
  { name: "Gris", hex: "#6b7280" },
  { name: "Rojo", hex: "#dc2626" },
  { name: "Azul Marino", hex: "#1e3a5f" },
  { name: "Verde", hex: "#16a34a" },
  { name: "Amarillo", hex: "#eab308" },
  { name: "Rosa", hex: "#ec4899" },
  { name: "Naranja", hex: "#f97316" },
  { name: "Celeste", hex: "#38bdf8" },
];

export const TSHIRT_FRONT_PATH = `M 200 80 
  C 200 80, 185 70, 175 65 
  C 160 55, 148 52, 135 58 
  C 120 65, 108 80, 100 90 
  L 50 140 
  C 45 145, 42 155, 48 162 
  L 85 200 
  C 90 205, 95 205, 100 200 
  L 115 170 
  L 110 420 
  C 110 430, 115 435, 125 435 
  L 275 435 
  C 285 435, 290 430, 290 420 
  L 285 170 
  L 300 200 
  C 305 205, 310 205, 315 200 
  L 352 162 
  C 358 155, 355 145, 350 140 
  L 300 90 
  C 292 80, 280 65, 265 58 
  C 252 52, 240 55, 225 65 
  C 215 70, 200 80, 200 80 Z`;

export const TSHIRT_BACK_PATH = `M 200 80 
  C 200 80, 190 75, 180 72 
  C 165 65, 148 60, 135 65 
  C 120 72, 108 85, 100 95 
  L 50 145 
  C 45 150, 42 160, 48 167 
  L 85 205 
  C 90 210, 95 210, 100 205 
  L 115 175 
  L 110 420 
  C 110 430, 115 435, 125 435 
  L 275 435 
  C 285 435, 290 430, 290 420 
  L 285 175 
  L 300 205 
  C 305 210, 310 210, 315 205 
  L 352 167 
  C 358 160, 355 150, 350 145 
  L 300 95 
  C 292 85, 280 72, 265 65 
  C 252 60, 235 65, 220 72 
  C 210 75, 200 80, 200 80 Z`;

export const HOODIE_FRONT_PATH = `M 200 65 
  C 200 65, 185 55, 175 50 
  C 155 40, 140 42, 125 50 
  C 108 60, 95 80, 85 95 
  L 25 165 
  C 18 172, 15 185, 22 195 
  L 70 250 
  C 75 255, 82 255, 87 250 
  L 108 215 
  L 108 220 
  L 105 420 
  C 105 432, 112 440, 125 440 
  L 190 440 
  L 190 320 
  C 190 315, 195 310, 200 310 
  C 205 310, 210 315, 210 320 
  L 210 440 
  L 275 440 
  C 288 440, 295 432, 295 420 
  L 292 220 
  L 292 215 
  L 313 250 
  C 318 255, 325 255, 330 250 
  L 378 195 
  C 385 185, 382 172, 375 165 
  L 315 95 
  C 305 80, 292 60, 275 50 
  C 260 42, 245 40, 225 50 
  C 215 55, 200 65, 200 65 Z
  M 200 65 
  C 200 65, 170 60, 160 70 
  C 150 82, 145 100, 150 100 
  L 175 95 
  C 180 90, 190 80, 200 78 
  C 210 80, 220 90, 225 95 
  L 250 100 
  C 255 100, 250 82, 240 70 
  C 230 60, 200 65, 200 65 Z`;

export const TANK_TOP_PATH = `M 200 80 
  C 200 80, 188 72, 178 68 
  C 165 62, 155 65, 145 72 
  C 135 80, 128 95, 125 110 
  L 120 145 
  L 115 420 
  C 115 430, 120 435, 130 435 
  L 270 435 
  C 280 435, 285 430, 285 420 
  L 280 145 
  L 275 110 
  C 272 95, 265 80, 255 72 
  C 245 65, 235 62, 222 68 
  C 212 72, 200 80, 200 80 Z`;

export const garmentTemplates: GarmentTemplate[] = [
  {
    id: "tshirt-front",
    name: "Remera Frente",
    svgPath: TSHIRT_FRONT_PATH,
    printArea: { x: 140, y: 130, width: 120, height: 170 },
    canvasWidth: 400,
    canvasHeight: 500,
  },
  {
    id: "tshirt-back",
    name: "Remera Dorso",
    svgPath: TSHIRT_BACK_PATH,
    printArea: { x: 135, y: 120, width: 130, height: 180 },
    canvasWidth: 400,
    canvasHeight: 500,
  },
  {
    id: "hoodie-front",
    name: "Buzo Frente",
    svgPath: HOODIE_FRONT_PATH,
    printArea: { x: 140, y: 160, width: 120, height: 160 },
    canvasWidth: 400,
    canvasHeight: 500,
  },
  {
    id: "tank-top",
    name: "Musculosa",
    svgPath: TANK_TOP_PATH,
    printArea: { x: 145, y: 130, width: 110, height: 170 },
    canvasWidth: 400,
    canvasHeight: 500,
  },
];
