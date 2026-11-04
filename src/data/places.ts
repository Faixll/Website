/**
 * Delivery areas and branches.
 * For now the store delivers only within Al Ain and has one branch (Al Towayya, Al Ain Cooperative).
 * Branch phone numbers and opening hours are in src/config/site.ts (site.branches), marked TODO.
 * TODO: confirm the exact map pin.
 */
import { site, type Hours } from '@/config/site';
import type { L10n } from './catalog';

export type { Hours };

/** Delivery cities (fees and minimum order are in site.delivery.emirates, keyed by id). */
export const emirates: { id: string; name: L10n; areas: L10n[] }[] = [
  {
    id: 'al-ain', name: { ar: 'العين', en: 'Al Ain' },
    areas: [
      { ar: 'الطوية', en: 'Al Towayya' }, { ar: 'الجيمي', en: 'Al Jimi' }, { ar: 'المويجعي', en: 'Al Muwaiji' },
      { ar: 'المطوع', en: 'Al Mutawaa' }, { ar: 'الهيلي', en: 'Al Hili' }, { ar: 'فلج هزاع', en: 'Falaj Hazza' },
      { ar: 'الخبيصي', en: 'Al Khabisi' }, { ar: 'المقام', en: 'Al Maqam' }, { ar: 'زاخر', en: 'Zakher' },
      { ar: 'اليحر', en: 'Al Yahar' }, { ar: 'البطين', en: 'Al Bateen' }, { ar: 'الصاروج', en: 'Al Sarooj' },
      { ar: 'المسعودي', en: 'Al Masoudi' }, { ar: 'الجاهلي', en: 'Al Jahili' }, { ar: 'القطارة', en: 'Al Qattara' },
    ],
  },
];

export type Branch = {
  id: string;
  emirate: string;
  name: L10n;
  address: L10n;
  phone: string;
  lat: number;
  lng: number;
  hours: Hours;
};

const branch = (b: Omit<Branch, 'phone' | 'hours'>): Branch => ({ ...b, ...site.branches[b.id] });

export const branches: Branch[] = [
  branch({
    id: 'al-ain-towayya', emirate: 'al-ain',
    name: { ar: 'فرع العين — الطوية', en: 'Al Ain — Al Towayya' },
    address: { ar: 'جمعية العين التعاونية، الطوية، العين', en: 'Al Ain Cooperative Society, Al Towayya, Al Ain' },
    lat: 24.2533, lng: 55.7369, // TODO: confirm the exact map pin
  }),
];

export const branchById = (id: string) => branches.find((b) => b.id === id);
