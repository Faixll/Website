/**
 * Delivery areas and branches.
 * For now the store delivers only within Al Ain and has one branch (Al Towayya, Al Ain Cooperative).
 * PLACEHOLDER: branch phone, map coordinates and opening hours still need confirming.
 */
import type { L10n } from './catalog';

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

/** Opening hours per weekday (0 = Sunday … 6 = Saturday), as [open, close] in "HH:MM" UAE time. */
export type Hours = Record<number, [string, string][]>;

const everyDay = (ranges: [string, string][], friday?: [string, string][]): Hours =>
  Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, d === 5 && friday ? friday : ranges]));

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

export const branches: Branch[] = [
  {
    id: 'al-ain-towayya', emirate: 'al-ain',
    name: { ar: 'فرع العين — الطوية', en: 'Al Ain — Al Towayya' },
    address: { ar: 'جمعية العين التعاونية، الطوية، العين', en: 'Al Ain Cooperative Society, Al Towayya, Al Ain' },
    // PLACEHOLDER: phone, exact map pin and hours.
    phone: '+971500000001', lat: 24.2533, lng: 55.7369,
    hours: everyDay([['07:00', '23:00']], [['07:00', '11:30'], ['13:30', '23:00']]),
  },
];

export const branchById = (id: string) => branches.find((b) => b.id === id);
