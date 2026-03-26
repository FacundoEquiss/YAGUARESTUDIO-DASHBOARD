export interface GarmentTemplate {
  id: string;
  name: string;
  colors: GarmentColor[];
}

export interface GarmentColor {
  id: string;
  label: string;
  hex: string;
  frontImage: string;
  backImage: string;
}

export interface PrintArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const TSHIRT_PRINT_AREA_FRONT: PrintArea = { x: 0.28, y: 0.18, width: 0.44, height: 0.52 };
export const TSHIRT_PRINT_AREA_BACK: PrintArea = { x: 0.26, y: 0.15, width: 0.48, height: 0.55 };
export const HOODIE_PRINT_AREA_FRONT: PrintArea = { x: 0.28, y: 0.28, width: 0.44, height: 0.38 };
export const HOODIE_PRINT_AREA_BACK: PrintArea = { x: 0.25, y: 0.18, width: 0.50, height: 0.48 };

export const garmentTemplates: GarmentTemplate[] = [
  {
    id: "tshirt",
    name: "Remera",
    colors: [
      {
        id: "white",
        label: "Blanca",
        hex: "#FFFFFF",
        frontImage: "/garments/tshirt-white-front.png",
        backImage: "/garments/tshirt-white-back.png",
      },
      {
        id: "black",
        label: "Negra",
        hex: "#1a1a1a",
        frontImage: "/garments/tshirt-black-front.png",
        backImage: "/garments/tshirt-black-back.png",
      },
    ],
  },
  {
    id: "hoodie",
    name: "Buzo",
    colors: [
      {
        id: "black",
        label: "Negro",
        hex: "#1a1a1a",
        frontImage: "/garments/hoodie-black-front.png",
        backImage: "/garments/hoodie-black-back.png",
      },
    ],
  },
];

export function getPrintArea(templateId: string, side: "front" | "back"): PrintArea {
  if (templateId === "hoodie") {
    return side === "front" ? HOODIE_PRINT_AREA_FRONT : HOODIE_PRINT_AREA_BACK;
  }
  return side === "front" ? TSHIRT_PRINT_AREA_FRONT : TSHIRT_PRINT_AREA_BACK;
}
