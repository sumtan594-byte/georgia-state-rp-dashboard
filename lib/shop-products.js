import { Crown, Heart, Zap } from 'lucide-react';
import { DONATION_PERKS, PRODUCTS as BASE_PRODUCTS } from './shop-catalog';

const ICONS = {
  crown: Crown,
  heart: Heart,
  zap: Zap,
};

export { DONATION_PERKS };

export const PRODUCTS = Object.fromEntries(
  Object.entries(BASE_PRODUCTS).map(([category, products]) => [
    category,
    products.map(product => ({
      ...product,
      icon: ICONS[product.iconName] || Heart,
    })),
  ])
);
