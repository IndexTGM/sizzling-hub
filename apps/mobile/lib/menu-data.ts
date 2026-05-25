export const PRIMARY = "#dc2626";

export type Category = "all" | "silog" | "drinks" | "addons";

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: Exclude<Category, "all">;
  image: string;
  rating: number;
  description: string;
  stock: number;
}

export const MENU_ITEMS: MenuItem[] = [
  // Silog Meals
  {
    id: "1",
    name: "Tapsilog",
    price: 85,
    category: "silog",
    image: "tapsilog",
    rating: 4.8,
    description:
      "Classic Filipino breakfast combo — tender beef tapa, garlic fried rice, and a sunny-side-up egg. Served with spiced vinegar on the side.",
    stock: 25,
  },
  {
    id: "2",
    name: "Tocilog",
    price: 85,
    category: "silog",
    image: "tocilog",
    rating: 4.7,
    description:
      "Sweet cured pork tocino paired with garlic rice and a fried egg. A sweet-savory favorite that hits every time.",
    stock: 20,
  },
  {
    id: "3",
    name: "Longsilog",
    price: 85,
    category: "silog",
    image: "longsilog",
    rating: 4.6,
    description:
      "Garlicky longganisa sausage with sinangag rice and itlog. Bold, savory, and perfectly paired with atsara.",
    stock: 18,
  },
  {
    id: "4",
    name: "Bangsilog",
    price: 95,
    category: "silog",
    image: "bangsilog",
    rating: 4.9,
    description:
      "Crispy fried bangus (milkfish) belly served with garlic fried rice and egg. Boneless and marinated to perfection.",
    stock: 12,
  },
  {
    id: "5",
    name: "Chicksilog",
    price: 95,
    category: "silog",
    image: "chicksilog",
    rating: 4.8,
    description:
      "Juicy fried chicken leg quarter with sinangag and a fried egg. Crispy on the outside, tender inside.",
    stock: 15,
  },
  {
    id: "6",
    name: "Hotsilog",
    price: 75,
    category: "silog",
    image: "hotsilog",
    rating: 4.5,
    description:
      "Grilled jumbo hotdog with garlic rice and egg. Simple, satisfying, and always a crowd-pleaser.",
    stock: 30,
  },
  {
    id: "7",
    name: "Cornedsilog",
    price: 85,
    category: "silog",
    image: "cornedsilog",
    rating: 4.6,
    description:
      "Sautéed corned beef with onions, served with garlic fried rice and egg. Comfort food done right.",
    stock: 16,
  },
  {
    id: "8",
    name: "Sisilog",
    price: 99,
    category: "silog",
    image: "sisilog",
    rating: 4.9,
    description:
      "Sizzling pork sisig topped on garlic rice with a runny fried egg. Crispy, tangy, creamy — an absolute banger.",
    stock: 10,
  },
  {
    id: "9",
    name: "Liemposilog",
    price: 105,
    category: "silog",
    image: "liemposilog",
    rating: 4.8,
    description:
      "Grilled pork belly (liempo) marinated in soy-calamansi, served with sinangag and egg. Smoky, juicy, irresistible.",
    stock: 14,
  },
  {
    id: "10",
    name: "Adobosilog",
    price: 95,
    category: "silog",
    image: "adobosilog",
    rating: 4.7,
    description:
      "Slow-braised chicken or pork adobo with garlic rice and fried egg. The Filipino classic, breakfast-style.",
    stock: 22,
  },

  // Drinks
  {
    id: "20",
    name: "Coke",
    price: 35,
    category: "drinks",
    image: "coke",
    rating: 4.5,
    description: "Ice-cold Coca-Cola. The perfect partner to any silog meal.",
    stock: 100,
  },
  {
    id: "21",
    name: "Sprite",
    price: 35,
    category: "drinks",
    image: "sprite",
    rating: 4.4,
    description: "Lemon-lime crisp refreshment to cut through the richness.",
    stock: 90,
  },
  {
    id: "22",
    name: "Royal",
    price: 35,
    category: "drinks",
    image: "royal",
    rating: 4.3,
    description: "Fruity orange soda — sweet, bubbly, and refreshing.",
    stock: 85,
  },
  {
    id: "23",
    name: "Iced Tea",
    price: 30,
    category: "drinks",
    image: "icedtea",
    rating: 4.6,
    description: "House-brewed iced tea with a hint of calamansi. Not too sweet.",
    stock: 60,
  },
  {
    id: "24",
    name: "Water",
    price: 15,
    category: "drinks",
    image: "water",
    rating: 4.0,
    description: "Chilled bottled mineral water. Stay hydrated.",
    stock: 200,
  },
  {
    id: "25",
    name: "Coffee",
    price: 40,
    category: "drinks",
    image: "coffee",
    rating: 4.7,
    description: "Hot brewed kapeng barako. Strong, bold, and aromatic.",
    stock: 50,
  },
  {
    id: "26",
    name: "Mango Shake",
    price: 65,
    category: "drinks",
    image: "mangoshake",
    rating: 4.9,
    description: "Thick and creamy fresh Philippine mango shake. Pure tropical bliss.",
    stock: 20,
  },
  {
    id: "27",
    name: "Buko Juice",
    price: 45,
    category: "drinks",
    image: "bukojuice",
    rating: 4.8,
    description: "Fresh young coconut water and meat. Naturally sweet and hydrating.",
    stock: 15,
  },

  // Add-ons
  {
    id: "30",
    name: "Extra Rice",
    price: 20,
    category: "addons",
    image: "extrarice",
    rating: 4.5,
    description: "One extra cup of garlic fried rice (sinangag).",
    stock: 200,
  },
  {
    id: "31",
    name: "Extra Egg",
    price: 25,
    category: "addons",
    image: "extraegg",
    rating: 4.8,
    description: "One additional sunny-side-up egg, fried to order.",
    stock: 200,
  },
  {
    id: "32",
    name: "Fried Egg",
    price: 20,
    category: "addons",
    image: "friedegg",
    rating: 4.7,
    description: "A single fried egg cooked your way — sunny side up or well done.",
    stock: 200,
  },
  {
    id: "33",
    name: "Atsara",
    price: 15,
    category: "addons",
    image: "atsara",
    rating: 4.4,
    description: "Tangy pickled green papaya relish. The perfect palate cleanser.",
    stock: 80,
  },
  {
    id: "34",
    name: "Sabaw",
    price: 10,
    category: "addons",
    image: "sabaw",
    rating: 4.3,
    description: "Hot soup of the day (usually bulalo or sinigang broth).",
    stock: 50,
  },
  {
    id: "35",
    name: "Garlic Rice",
    price: 30,
    category: "addons",
    image: "garlicrice",
    rating: 4.9,
    description: "A generous serving of our signature sinangag — loaded with toasted garlic.",
    stock: 100,
  },
];