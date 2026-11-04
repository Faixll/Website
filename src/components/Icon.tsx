/**
 * The one icon set: Phosphor (regular by default, fill for active/selected).
 * Uses the SSR build so icons work in both server and client components.
 * Hawar, Sheep and Goat have no Phosphor icon, so three simple line icons are drawn in the same style.
 */
import {
  BowlFood, CaretDown, Check, Clock, Cow, Envelope, Globe, Hamburger, House, InstagramLogo, Knife, Lock,
  MagnifyingGlass, MapPin, Minus, Phone, Plus, SealCheck, ShoppingBag, Snowflake, Storefront, Truck, User,
  WhatsappLogo, X, Bell, Tag, ArrowSquareOut, CaretLeft, CaretRight,
} from '@phosphor-icons/react/dist/ssr';
import type { IconWeight } from '@phosphor-icons/react';

const phosphor = {
  home: House, search: MagnifyingGlass, cart: ShoppingBag, user: User, pin: MapPin, phone: Phone,
  whatsapp: WhatsappLogo, truck: Truck, snow: Snowflake, knife: Knife, seal: SealCheck, clock: Clock,
  plus: Plus, minus: Minus, check: Check, caretDown: CaretDown, cow: Cow, burger: Hamburger, bowl: BowlFood,
  close: X, globe: Globe, mail: Envelope, instagram: InstagramLogo, lock: Lock, store: Storefront, bell: Bell,
  tag: Tag, external: ArrowSquareOut, caretStart: CaretRight, caretEnd: CaretLeft,
};

/* Custom line icons, drawn on Phosphor's 256 grid with its 16px round stroke. */
const custom = {
  // young camel
  camel: (
    <>
      <path d="M40 200v-56c0-24 16-40 36-40 10-28 46-28 56 0 12-12 32-4 32 14v26c0 10 8 18 18 18" />
      <path d="M182 162V96c0-14 10-24 24-24h10l10 14-18 6v70" />
      <path d="M64 200v-40M104 200v-36M156 200v-36" />
    </>
  ),
  // sheep
  sheep: (
    <>
      <path d="M72 168c-22 0-36-14-36-32s14-30 30-30c4-18 20-30 40-30 14 0 26 6 34 16 6-4 12-6 20-6 22 0 38 16 38 36s-16 46-40 46H72z" />
      <path d="M182 120h18c10 0 18 8 18 18s-8 18-18 18h-6" />
      <path d="M84 168v32M156 168v32" />
    </>
  ),
  // goat
  goat: (
    <>
      <path d="M48 196v-52c0-22 18-36 40-36h72" />
      <path d="M160 108l20-36 24 4c10 2 16 10 16 20v20l-28 12-16 32H88" />
      <path d="M176 72c-4-18 4-32 20-40M196 76c6-16 18-24 32-24" />
      <path d="M200 140c2 14-2 26-10 34" />
      <path d="M72 196v-28M136 196v-28" />
    </>
  ),
};

export type IconName = keyof typeof phosphor | keyof typeof custom;

export function Icon({
  name, size = 24, weight = 'regular', label, className,
}: { name: IconName; size?: number; weight?: IconWeight; label?: string; className?: string }) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const };
  if (name in custom) {
    return (
      <svg viewBox="0 0 256 256" width={size} height={size} className={className} fill="none" stroke="currentColor"
        strokeWidth={weight === 'fill' || weight === 'bold' ? 22 : 16} strokeLinecap="round" strokeLinejoin="round" {...a11y}>
        {custom[name as keyof typeof custom]}
      </svg>
    );
  }
  const C = phosphor[name as keyof typeof phosphor];
  return <C size={size} weight={weight} className={className} {...a11y} />;
}

/** Category → icon. */
export const categoryIcon: Record<string, IconName> = {
  hawar: 'camel', sheep: 'sheep', goat: 'goat', calf: 'cow', burgers: 'burger', meals: 'bowl',
};
