export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  imageName: string;
  description?: string;
  rating?: number;
  stock?: number;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export function getImagePath(imageName: string): string {
  return `/images/${imageName}`;
}