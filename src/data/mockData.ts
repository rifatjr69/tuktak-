import { Category, Product, DeliveryZone, Coupon, SiteSettings, Order } from '../types';

// Clean empty initial categories - user can manually add categories in admin dashboard
export const INITIAL_CATEGORIES: Category[] = [];


// Clean empty initial products - ready for user products added in admin dashboard
export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: 'zone-1',
    name: 'Inside Dhaka',
    name_bn: 'ঢাকার ভিতরে',
    charge: 60,
    estimated_days: '১–৩ কার্যদিবস',
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'zone-2',
    name: 'Around Dhaka (Narayanganj, Gazipur, Savar, Keraniganj)',
    name_bn: 'ঢাকার আশেপাশে (নারায়ণগঞ্জ, গাজীপুর, সাভার, কেরানীগঞ্জ)',
    charge: 100,
    estimated_days: '১–৩ কার্যদিবস',
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'zone-3',
    name: 'Outside Dhaka',
    name_bn: 'ঢাকার বাইরে',
    charge: 130,
    estimated_days: '৩–৫ কার্যদিবস',
    is_active: true,
    sort_order: 3,
  },
];

export const INITIAL_COUPONS: Coupon[] = [
  {
    id: 'c1',
    code: 'LITTLEHUG',
    type: 'fixed',
    value: 100,
    min_order: 1000,
    is_active: true,
  },
  {
    id: 'c2',
    code: 'WELCOME50',
    type: 'fixed',
    value: 50,
    min_order: 500,
    is_active: true,
  },
  {
    id: 'c3',
    code: 'HUG10',
    type: 'percent',
    value: 10,
    min_order: 1500,
    is_active: true,
  },
];

export const INITIAL_SITE_SETTINGS: SiteSettings = {
  whatsapp_number: '01717823525',
  call_number: '01717823525',
  free_delivery_threshold: 999,
  extra_discount_threshold: 1999,
  extra_discount_percent: 5,
  site_name: 'Tuktak Shopping',
  tagline_en: 'PURE & ORGANIC ESSENTIALS',
  tagline_bn: 'tuktakshopping.netlify.app',
  flash_sale_end_time: new Date(Date.now() + 937 * 3600 * 1000 + 2 * 60 * 1000 + 7 * 1000).toISOString(),
};

// Clean empty initial orders - orders will come from live customer purchases
export const INITIAL_ORDERS: Order[] = [];
