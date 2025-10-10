import {
  Coffee, Croissant, UtensilsCrossed, Moon, Cookie, Soup, Salad,
  IceCream, Cake, Pizza, Beef, Fish, Leaf, Carrot, GlassWater, Wine, Beer,
  Sandwich, Apple, Egg, Milk, ChefHat, Grape, Sun, CookingPot,
  Flame, Wheat, Droplet, Droplets, Candy
} from "lucide-react";

// Zentrale Icon-Mapping-Funktion
export const getIconComponent = (iconName) => {
  const iconMap = {
    'Coffee': Coffee,
    'Sun': Sun,
    'Moon': Moon,
    'Cookie': Cookie,
    'Croissant': Croissant,
    'UtensilsCrossed': UtensilsCrossed,
    'Soup': Soup,
    'CookingPot': CookingPot,
    'Salad': Salad,
    'Pizza': Pizza,
    'Beef': Beef,
    'Fish': Fish,
    'Leaf': Leaf,
    'Carrot': Carrot,
    'Cake': Cake,
    'IceCream': IceCream,
    'GlassWater': GlassWater,
    'Wine': Wine,
    'Beer': Beer,
    'Sandwich': Sandwich,
    'Apple': Apple,
    'Egg': Egg,
    'Milk': Milk,
    'Grape': Grape,
    'ChefHat': ChefHat,
    'Flame': Flame,
    'Wheat': Wheat,
    'Droplet': Droplet,
    'Droplets': Droplets,
    'Candy': Candy
  };
  
  return iconMap[iconName] || ChefHat;
};

export const AVAILABLE_ICONS = {
  'Coffee': { component: Coffee, label: 'Kaffee' },
  'Sun': { component: Sun, label: 'Sonne' },
  'Moon': { component: Moon, label: 'Mond' },
  'Cookie': { component: Cookie, label: 'Keks' },
  'Croissant': { component: Croissant, label: 'Croissant' },
  'UtensilsCrossed': { component: UtensilsCrossed, label: 'Besteck' },
  'Soup': { component: Soup, label: 'Suppe' },
  'CookingPot': { component: CookingPot, label: 'Topf' },
  'Salad': { component: Salad, label: 'Salat' },
  'Pizza': { component: Pizza, label: 'Pizza' },
  'Beef': { component: Beef, label: 'Fleisch' },
  'Fish': { component: Fish, label: 'Fisch' },
  'Leaf': { component: Leaf, label: 'Vegetarisch' },
  'Carrot': { component: Carrot, label: 'Gemüse' },
  'Cake': { component: Cake, label: 'Kuchen' },
  'IceCream': { component: IceCream, label: 'Eis' },
  'GlassWater': { component: GlassWater, label: 'Getränk' },
  'Wine': { component: Wine, label: 'Wein' },
  'Beer': { component: Beer, label: 'Bier' },
  'Sandwich': { component: Sandwich, label: 'Sandwich' },
  'Apple': { component: Apple, label: 'Obst' },
  'Egg': { component: Egg, label: 'Ei' },
  'Milk': { component: Milk, label: 'Milch' },
  'Grape': { component: Grape, label: 'Traube' },
  'ChefHat': { component: ChefHat, label: 'Koch' },
};