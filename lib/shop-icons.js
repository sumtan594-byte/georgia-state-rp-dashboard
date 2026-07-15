import {
  Crown,
  Heart,
  Zap,
  Gift,
  Star,
  Gem,
  Sparkles,
  Trophy,
  Rocket,
  ShieldCheck,
  Megaphone,
  BadgeCheck,
  Flame,
  DollarSign,
  Ticket,
} from 'lucide-react';

// Central registry of icons an admin can assign to a shop product.
// Keep keys stable — they are persisted on each product as `iconName`.
export const SHOP_ICONS = {
  crown: Crown,
  heart: Heart,
  zap: Zap,
  gift: Gift,
  star: Star,
  gem: Gem,
  sparkles: Sparkles,
  trophy: Trophy,
  rocket: Rocket,
  shield: ShieldCheck,
  megaphone: Megaphone,
  badge: BadgeCheck,
  flame: Flame,
  dollar: DollarSign,
  ticket: Ticket,
};

// Friendly labels for the admin icon picker.
export const SHOP_ICON_OPTIONS = [
  { name: 'crown', label: 'Crown' },
  { name: 'heart', label: 'Heart' },
  { name: 'zap', label: 'Lightning' },
  { name: 'gift', label: 'Gift' },
  { name: 'star', label: 'Star' },
  { name: 'gem', label: 'Gem' },
  { name: 'sparkles', label: 'Sparkles' },
  { name: 'trophy', label: 'Trophy' },
  { name: 'rocket', label: 'Rocket' },
  { name: 'shield', label: 'Shield' },
  { name: 'megaphone', label: 'Megaphone' },
  { name: 'badge', label: 'Badge' },
  { name: 'flame', label: 'Flame' },
  { name: 'dollar', label: 'Dollar' },
  { name: 'ticket', label: 'Ticket' },
];

export const DEFAULT_SHOP_ICON = 'heart';

export function getShopIcon(iconName) {
  return SHOP_ICONS[iconName] || SHOP_ICONS[DEFAULT_SHOP_ICON];
}
