import React, { useEffect, useId, useState } from 'react';
import {
  X, Package, ShoppingBag, Sliders, Database, Edit2, Trash2, Plus, Save, Copy, FolderPlus, Tag,
  Check, ArrowLeft, LogOut, Phone, MessageCircle, Search, Printer, Upload, Loader2,
  Image as ImageIcon, Activity, Truck, Eye, EyeOff, KeyRound, TrendingUp, Clock, PackageCheck,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { OrderStatus, Product, Order } from '../types';
import { isSupabaseConfigured, uploadImageToSupabase } from '../lib/supabase';
import { isProductMatchingCategory } from '../lib/categoryUtils';
import { BannerManager } from './BannerManager';
import {
  applyTracking, extractTrackingId, isValidFbPixelId, isValidGtmId, isValidTikTokPixelId,
} from '../lib/tracking';

const hideScrollbar = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';
const MAX_IMAGE_MB = 5;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DEFAULT_PRODUCT_IMAGE = '/src/assets/images/gift_box_pink_teddy_1792050433788.jpg';
const DEFAULT_CATEGORY_IMAGE = DEFAULT_PRODUCT_IMAGE;

const uploadImage = async (file: File): Promise<string> => {
  const okType = ALLOWED_IMAGE_TYPES.includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!okType) throw new Error('শুধু JPG, PNG বা WEBP ছবি আপলোড করা যাবে');
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) throw new Error(`ছবির সাইজ ${MAX_IMAGE_MB}MB এর বেশি হতে পারবে না`);
  const url = await uploadImageToSupabase(file);
  if (!url) throw new Error('আপলোডের পর ছবির লিঙ্ক পাওয়া যায়নি (Supabase bucket/policy চেক করুন)');
  return url;
};

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object' && err && 'message' in err) return String((err as { message: unknown }).message);
  return 'অজানা সমস্যা';
};

/* ------------------------------ Courier config ------------------------------ */
type CourierField = { k: string; label: string; secret?: boolean; placeholder?: string };
type CourierDef = { key: string; name: string; tagline: string; grad: string; fields: CourierField[] };

const COURIERS: CourierDef[] = [
  {
    key: 'steadfast', name: 'Steadfast', tagline: 'Steadfast Courier API',
    grad: 'from-sky-500 to-blue-600',
    fields: [
      { k: 'api_key', label: 'API Key', placeholder: 'Api-Key' },
      { k: 'secret_key', label: 'Secret Key', secret: true, placeholder: 'Secret-Key' },
    ],
  },
  {
    key: 'pathao', name: 'Pathao', tagline: 'Pathao Courier Merchant API',
    grad: 'from-rose-500 to-red-600',
    fields: [
      { k: 'client_id', label: 'Client ID' },
      { k: 'client_secret', label: 'Client Secret', secret: true },
      { k: 'username', label: 'Merchant Email / Username' },
      { k: 'password', label: 'Password', secret: true },
      { k: 'store_id', label: 'Store ID' },
    ],
  },
  {
    key: 'redx', name: 'RedX', tagline: 'RedX Delivery API',
    grad: 'from-orange-500 to-red-500',
    fields: [
      { k: 'api_token', label: 'API Access Token', secret: true },
      { k: 'pickup_store_id', label: 'Pickup Store ID (ঐচ্ছিক)' },
    ],
  },
  {
    key: 'carrybee', name: 'CarryBee', tagline: 'CarryBee Courier API',
    grad: 'from-amber-400 to-yellow-600',
    fields: [
      { k: 'client_id', label: 'Client ID' },
      { k: 'client_secret', label: 'Client Secret', secret: true },
      { k: 'store_id', label: 'Store ID' },
    ],
  },
];

const courierKeys = (): string[] => {
  const keys: string[] = ['courier_default'];
  COURIERS.forEach((c) => {
    keys.push(`courier_${c.key}_enabled`);
    c.fields.forEach((f) => keys.push(`courier_${c.key}_${f.k}`));
  });
  return keys;
};

const SecretInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({
  value, onChange, placeholder,
}) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="w-full pl-3 pr-10 py-3 sm:py-2.5 bg-white border border-gray-200 rounded-xl text-base sm:text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-[#185824]"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700 cursor-pointer"
        aria-label={show ? 'লুকান' : 'দেখুন'}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};

/* ------------------------------ Upload widgets ------------------------------ */
const ImageUploadField: React.FC<{
  label: string; imageUrl?: string | null; uploading: boolean;
  onSelect: (file: File) => void; onClear?: () => void; hint?: string;
}> = ({ label, imageUrl, uploading, onSelect, onClear, hint }) => {
  const inputId = useId();
  return (
    <div className="space-y-1.5">
      <span className="font-bold text-gray-700 block">{label}</span>
      <div className="flex items-center gap-3 p-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/30">
        <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl border border-emerald-200 bg-white overflow-hidden flex items-center justify-center">
          {uploading ? (
            <Loader2 className="w-6 h-6 text-[#185824] animate-spin" />
          ) : imageUrl ? (
            <img src={imageUrl} alt="preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <ImageIcon className="w-6 h-6 text-emerald-300" />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor={inputId}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                uploading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-[#185824] hover:bg-[#12431C] text-white cursor-pointer'
              }`}
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>{uploading ? 'আপলোড হচ্ছে...' : imageUrl ? 'ছবি পরিবর্তন' : 'ছবি বাছুন'}</span>
            </label>
            {imageUrl && onClear && !uploading && (
              <button type="button" onClick={onClear} className="px-2.5 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 cursor-pointer">
                সরান
              </button>
            )}
          </div>
          <input
            id={inputId} type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} className="sr-only"
            onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) onSelect(file); }}
          />
          <p className="text-[10px] text-gray-400 leading-snug">{hint || `JPG / PNG / WEBP, সর্বোচ্চ ${MAX_IMAGE_MB}MB`}</p>
        </div>
      </div>
    </div>
  );
};

const ProductImageGallery: React.FC<{
  images: string[]; onAdd: (file: File) => void; onRemove: (index: number) => void; uploading: boolean;
}> = ({ images, onAdd, onRemove, uploading }) => {
  const inputId = useId();
  return (
    <div className="space-y-2">
      <label className="font-bold text-gray-700 block">পণ্যের ছবিসমূহ (সর্বোচ্চ ৫টি)</label>
      <div className="grid grid-cols-4 gap-2">
        {images.map((img, idx) => (
          <div key={idx} className="relative aspect-square rounded-xl border overflow-hidden">
            <img src={img} alt="product" className="w-full h-full object-cover" />
            <button type="button" onClick={() => onRemove(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {images.length < 5 && (
          <label htmlFor={inputId} className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-[#185824]">
            {uploading ? <Loader2 className="w-5 h-5 text-[#185824] animate-spin" /> : (<><Upload className="w-5 h-5 text-gray-400" /><span className="text-[10px] text-gray-400">Add</span></>)}
          </label>
        )}
      </div>
      <input
        id={inputId} type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} className="sr-only"
        onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) onAdd(file); }}
      />
    </div>
  );
};

/* ------------------------------ Style helpers ------------------------------ */
const inputCls = 'w-full px-3 py-3 sm:py-2.5 bg-white border border-gray-200 rounded-xl text-base sm:text-xs focus:outline-hidden focus:ring-2 focus:ring-[#185824]';
const modalOverlay = 'fixed inset-0 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4';
const modalPanel = 'bg-white rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 w-full space-y-4 max-h-[92vh] sm:max-h-[88vh] overflow-y-auto';
const modalFooter = 'sticky bottom-0 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 px-4 sm:px-6 py-3 bg-white border-t border-gray-100 flex gap-2';

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-sky-100 text-sky-700',
  processing: 'bg-violet-100 text-violet-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
};

/* ------------------------------ Product form (shared) ------------------------------ */
const ProductFormFields: React.FC<{
  value: Partial<Product>;
  onChange: (v: Partial<Product>) => void;
  categories: ReturnType<typeof useStore>['categories'];
  onNewCategory: () => void;
  uploading: boolean;
  onImageAdd: (f: File) => void;
  onImageRemove: (i: number) => void;
}> = ({ value, onChange, categories, onNewCategory, uploading, onImageAdd, onImageRemove }) => (
  <div className="space-y-3.5 text-xs">
    <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <label className="font-black text-gray-900 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-[#185824]" /><span>ক্যাটাগরি *</span>
        </label>
        <button type="button" onClick={onNewCategory} className="text-[11px] font-bold text-[#185824] hover:underline cursor-pointer">
          + নতুন ক্যাটাগরি
        </button>
      </div>
      {categories.length === 0 ? (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">আগে একটি ক্যাটাগরি তৈরি করুন।</div>
      ) : (
        <select
          value={value.category_slug || ''}
          onChange={(e) => {
            const c = categories.find((cat) => cat.slug === e.target.value);
            onChange({ ...value, category_slug: e.target.value, category_id: c?.id || value.category_id });
          }}
          className={`${inputCls} font-bold`}
        >
          {categories.map((c) => (<option key={c.id} value={c.slug}>📁 {c.name} ({c.name_bn})</option>))}
        </select>
      )}
    </div>

    <div>
      <label className="font-bold text-gray-700 block mb-1">পণ্যের নাম (English) *</label>
      <input required type="text" value={value.name || ''} onChange={(e) => onChange({ ...value, name: e.target.value })} className={inputCls} />
    </div>
    <div>
      <label className="font-bold text-gray-700 block mb-1">পণ্যের নাম (বাংলা)</label>
      <input type="text" value={value.name_bn || ''} onChange={(e) => onChange({ ...value, name_bn: e.target.value })} className={inputCls} />
    </div>

    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="font-bold text-gray-700 block mb-1">বিক্রয় মূল্য (৳)</label>
        <input type="number" value={value.price ?? 0} onChange={(e) => onChange({ ...value, price: Number(e.target.value) })} className={`${inputCls} font-mono`} />
      </div>
      <div>
        <label className="font-bold text-gray-700 block mb-1">আগের মূল্য (৳)</label>
        <input type="number" value={value.old_price ?? 0} onChange={(e) => onChange({ ...value, old_price: Number(e.target.value) })} className={`${inputCls} font-mono`} />
      </div>
      <div>
        <label className="font-bold text-gray-700 block mb-1">স্টক</label>
        <input type="number" value={value.stock ?? 0} onChange={(e) => onChange({ ...value, stock: Number(e.target.value) })} className={`${inputCls} font-mono`} />
      </div>
      <div>
        <label className="font-bold text-gray-700 block mb-1">ব্যাজ</label>
        <input type="text" value={value.badge || ''} onChange={(e) => onChange({ ...value, badge: e.target.value })} className={inputCls} />
      </div>
    </div>

    <div>
      <label className="font-bold text-gray-700 block mb-1">বিবরণ (Description)</label>
      <textarea value={value.description || ''} onChange={(e) => onChange({ ...value, description: e.target.value })} className={`${inputCls} h-28`} />
    </div>

    <ProductImageGallery images={value.images || []} uploading={uploading} onAdd={onImageAdd} onRemove={onImageRemove} />

    <div className="flex flex-wrap gap-2 pt-1">
      {([['is_flash_sale', '⚡ Flash Sale'], ['is_hot_deal', '🔥 Hot Deal'], ['is_featured', '⭐ Featured']] as const).map(([k, label]) => (
        <label key={k} className={`flex items-center gap-2 cursor-pointer font-bold px-3 py-2 rounded-xl border ${value[k] ? 'bg-emerald-50 border-emerald-300 text-[#185824]' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
          <input type="checkbox" checked={Boolean(value[k])} onChange={(e) => onChange({ ...value, [k]: e.target.checked })} className="w-4 h-4 accent-[#185824]" />
          <span>{label}</span>
        </label>
      ))}
    </div>
  </div>
);

type TabKey = 'orders' | 'products' | 'banners' | 'courier' | 'tracking' | 'settings' | 'sql';

export const AdminDashboard: React.FC = () => {
  const {
    isAdminDashboardOpen, closeAdminDashboard, orders, updateOrderStatus, deleteOrder, products,
    updateProduct, addProduct, deleteProduct, categories, addCategory, deleteCategory, settings,
    updateSettings, user, isAdmin, refreshUserRole, logout, showToast, clearAllDemoData,
  } = useStore();

  const [activeTab, setActiveTab] = useState<TabKey>('orders');

  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [viewInvoiceOrder, setViewInvoiceOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<(typeof categories)[number] | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const [isUploadingCategoryImage, setIsUploadingCategoryImage] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryNameBn, setNewCategoryNameBn] = useState('');
  const [newCategorySubLabel, setNewCategorySubLabel] = useState('');
  const [newCategoryImageUrl, setNewCategoryImageUrl] = useState('');

  const [newProductForm, setNewProductForm] = useState<Partial<Product>>({});
  const [settingsForm, setSettingsForm] = useState(settings);
  useEffect(() => { setSettingsForm(settings); }, [settings]);

  // Tracking
  const [trackingForm, setTrackingForm] = useState({ facebook_pixel_id: '', gtm_id: '', tiktok_pixel_id: '' });
  // Courier
  const [courierForm, setCourierForm] = useState<Record<string, string>>({});

  useEffect(() => {
    const s = settings as unknown as Record<string, string | undefined>;
    setTrackingForm({
      facebook_pixel_id: s.facebook_pixel_id || '',
      gtm_id: s.gtm_id || '',
      tiktok_pixel_id: s.tiktok_pixel_id || '',
    });
    const cf: Record<string, string> = {};
    courierKeys().forEach((k) => { cf[k] = s[k] || ''; });
    setCourierForm(cf);
  }, [settings]);

  // Access guard (after all hooks)
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-red-100 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-3xl">🔒</div>
          <h2 className="text-xl font-black text-gray-900">অ্যাক্সেস অস্বীকৃত</h2>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            এই ড্যাশবোর্ড শুধু অনুমোদিত অ্যাডমিনদের জন্য। Supabase-এর{' '}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[#185824] font-bold">public.profiles</code> টেবিলে আপনার role{' '}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[#185824] font-bold">&quot;admin&quot;</code> হতে হবে।
          </p>
          <button onClick={closeAdminDashboard} className="w-full py-3 bg-[#1F1F24] hover:bg-black text-white font-bold rounded-2xl cursor-pointer text-sm shadow-md">
            স্টোরফ্রন্টে ফিরে যান
          </button>
        </div>
      </div>
    );
  }
  if (!isAdminDashboardOpen) return null;

  /* ---------------- derived ---------------- */
  const filteredOrders = orders.filter((o) => {
    const matchStatus = orderStatusFilter === 'all' ? o.status !== 'cancelled' : o.status === orderStatusFilter;
    const q = orderSearchQuery.trim().toLowerCase();
    const matchSearch = q ? o.order_number.toLowerCase().includes(q) || o.customer_name.toLowerCase().includes(q) || o.phone.includes(orderSearchQuery) : true;
    return matchStatus && matchSearch;
  });
  const totalRevenue = orders.reduce((s, o) => (o.status !== 'cancelled' ? s + o.total : s), 0);
  const totalOrdersCount = orders.filter((o) => o.status !== 'cancelled').length;
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;

  const filteredProducts = products.filter((p) => {
    const matchCategory = productCategoryFilter === 'all' ? true : isProductMatchingCategory(p, productCategoryFilter, categories);
    const matchSearch = productSearchQuery.trim()
      ? p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) || p.name_bn.includes(productSearchQuery)
      : true;
    return matchCategory && matchSearch;
  });

  const configuredCouriers = COURIERS.filter((c) => c.fields.some((f) => (courierForm[`courier_${c.key}_${f.k}`] || '').trim())).length;

  /* ---------------- handlers ---------------- */
  const handleTrackingSave = (e: React.FormEvent) => {
    e.preventDefault();
    const fb = extractTrackingId('fb', trackingForm.facebook_pixel_id);
    const gtm = extractTrackingId('gtm', trackingForm.gtm_id);
    const tt = extractTrackingId('tiktok', trackingForm.tiktok_pixel_id);
    if (fb && !isValidFbPixelId(fb)) return showToast('Facebook Pixel ID ভুল (৮-২০ ডিজিটের সংখ্যা হবে)');
    if (gtm && !isValidGtmId(gtm)) return showToast('GTM ID ভুল (যেমন: GTM-XXXXXXX)');
    if (tt && !isValidTikTokPixelId(tt)) return showToast('TikTok Pixel ID ভুল');
    const next = { facebook_pixel_id: fb, gtm_id: gtm, tiktok_pixel_id: tt };
    setTrackingForm(next);
    updateSettings({ ...settingsForm, ...next } as typeof settingsForm);
    applyTracking(next);
    showToast('✓ ট্র্যাকিং সেটিংস সেভ হয়েছে!');
  };

  const handleCourierSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed: Record<string, string> = {};
    Object.entries(courierForm).forEach(([k, v]) => { trimmed[k] = (v || '').trim(); });
    setCourierForm(trimmed);
    updateSettings({ ...settingsForm, ...trimmed } as typeof settingsForm);
    showToast('✓ কুরিয়ার API সেটিংস সেভ হয়েছে!');
  };

  const setCourierVal = (k: string, v: string) => setCourierForm((p) => ({ ...p, [k]: v }));

  const handleProductImageAdd = async (file: File, isEdit: boolean) => {
    try {
      setIsUploadingProductImage(true);
      showToast('ছবি আপলোড হচ্ছে...');
      const url = await uploadImage(file);
      if (isEdit) setEditingProduct((prev) => (prev ? { ...prev, images: [...(prev.images || []), url] } : prev));
      else setNewProductForm((prev) => ({ ...prev, images: [...(prev.images || []), url] }));
      showToast('✓ ছবি আপলোড হয়েছে!');
    } catch (err) {
      console.error(err);
      showToast(`ছবি আপলোড ব্যর্থ: ${getErrorMessage(err)}`);
    } finally {
      setIsUploadingProductImage(false);
    }
  };

  const handleProductImageRemove = (index: number, isEdit: boolean) => {
    if (isEdit) setEditingProduct((prev) => (prev ? { ...prev, images: (prev.images || []).filter((_, i) => i !== index) } : prev));
    else setNewProductForm((prev) => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== index) }));
  };

  const handleCategoryImageSelect = async (file: File) => {
    try {
      setIsUploadingCategoryImage(true);
      const url = await uploadImage(file);
      setNewCategoryImageUrl(url);
      showToast('✓ ক্যাটাগরির ছবি আপলোড হয়েছে!');
    } catch (err) {
      showToast(`ছবি আপলোড ব্যর্থ: ${getErrorMessage(err)}`);
    } finally {
      setIsUploadingCategoryImage(false);
    }
  };

  const handleSettingsSave = (e: React.FormEvent) => { e.preventDefault(); updateSettings(settingsForm); };

  const handleOpenAddProduct = () => {
    const activeCat = productCategoryFilter !== 'all'
      ? categories.find((c) => c.slug === productCategoryFilter || c.id === productCategoryFilter)
      : categories[0];
    setNewProductForm({
      name: '', name_bn: '', category_id: activeCat?.id || categories[0]?.id, category_slug: activeCat?.slug || categories[0]?.slug,
      price: 0, old_price: 0, discount_percent: 0, badge: '', secondary_badge: '', stock: 10,
      is_featured: false, is_flash_sale: false, is_hot_deal: false, images: [DEFAULT_PRODUCT_IMAGE], description: '',
    });
    setIsNewProductModalOpen(true);
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.name) return;
    if (isUploadingProductImage) return showToast('ছবি আপলোড শেষ হওয়া পর্যন্ত অপেক্ষা করুন');
    const matchedCat = categories.find((c) => c.id === newProductForm.category_id || c.slug === newProductForm.category_slug);
    addProduct({
      name: newProductForm.name,
      name_bn: newProductForm.name_bn || newProductForm.name,
      slug: (newProductForm.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category_id: matchedCat?.id || categories[0]?.id || '',
      category_slug: matchedCat?.slug || categories[0]?.slug || '',
      price: Number(newProductForm.price) || 0,
      old_price: Number(newProductForm.old_price) || 0,
      discount_percent: Number(newProductForm.discount_percent) || 0,
      badge: newProductForm.badge || '50% ছাড়',
      secondary_badge: newProductForm.secondary_badge || 'NEW',
      sold_count: 0, rating: 5.0, review_count: 0,
      stock: Number(newProductForm.stock) || 10,
      is_featured: Boolean(newProductForm.is_featured),
      is_flash_sale: Boolean(newProductForm.is_flash_sale),
      is_hot_deal: Boolean(newProductForm.is_hot_deal),
      is_active: true,
      image_url: newProductForm.images?.[0] || DEFAULT_PRODUCT_IMAGE,
      images: newProductForm.images?.length ? newProductForm.images : [DEFAULT_PRODUCT_IMAGE],
      description: newProductForm.description || '',
    });
    setIsNewProductModalOpen(false);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    if (typeof deleteCategory !== 'function') { showToast('deleteCategory পাওয়া যায়নি'); setCategoryToDelete(null); return; }
    const target = categoryToDelete;
    try {
      setIsDeletingCategory(true);
      await deleteCategory(target.id);
      if (productCategoryFilter === target.slug) setProductCategoryFilter('all');
      showToast(`✓ ক্যাটাগরি "${target.name}" মুছে ফেলা হয়েছে`);
    } catch (err) {
      showToast(`ক্যাটাগরি মুছতে ব্যর্থ: ${getErrorMessage(err)}`);
    } finally {
      setIsDeletingCategory(false);
      setCategoryToDelete(null);
    }
  };

  const resetCategoryForm = () => { setNewCategoryName(''); setNewCategoryNameBn(''); setNewCategorySubLabel(''); setNewCategoryImageUrl(''); };
  const closeCategoryModal = () => { if (isUploadingCategoryImage) return; resetCategoryForm(); setIsNewCategoryModalOpen(false); };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    if (isUploadingCategoryImage) return showToast('ছবি আপলোড শেষ হওয়া পর্যন্ত অপেক্ষা করুন');
    addCategory({
      name: newCategoryName.trim(),
      name_bn: newCategoryNameBn.trim() || newCategoryName.trim(),
      slug: newCategoryName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
      image_url: newCategoryImageUrl.trim() || DEFAULT_CATEGORY_IMAGE,
      sub_label: newCategorySubLabel.trim() || 'New Collection',
      sort_order: categories.length + 1,
      is_active: true,
    });
    resetCategoryForm();
    setIsNewCategoryModalOpen(false);
  };

  /* ---------------- tabs ---------------- */
  const TABS: { key: TabKey; icon: React.ReactNode; short: string; long: string; badge?: number }[] = [
    { key: 'orders', icon: <ShoppingBag className="w-5 h-5" />, short: 'অর্ডার', long: 'অর্ডার সমূহ', badge: pendingCount },
    { key: 'products', icon: <Package className="w-5 h-5" />, short: 'পণ্য', long: 'পণ্য ও ইনভেন্টরি' },
    { key: 'banners', icon: <ImageIcon className="w-5 h-5" />, short: 'ব্যানার', long: 'হোমপেজ ব্যানার' },
    { key: 'courier', icon: <Truck className="w-5 h-5" />, short: 'কুরিয়ার', long: 'কুরিয়ার API' },
    { key: 'tracking', icon: <Activity className="w-5 h-5" />, short: 'ট্র্যাকিং', long: 'ট্র্যাকিং ও পিক্সেল' },
    { key: 'settings', icon: <Sliders className="w-5 h-5" />, short: 'সেটিংস', long: 'স্টোর সেটিংস' },
    { key: 'sql', icon: <Database className="w-5 h-5" />, short: 'ডাটাবেজ', long: 'Supabase' },
  ];

  const statCards = [
    { label: 'মোট অর্ডার', value: totalOrdersCount.toLocaleString(), icon: <ShoppingBag className="w-5 h-5" />, grad: 'from-[#185824] to-emerald-500' },
    { label: 'মোট আয়', value: `৳${totalRevenue.toLocaleString()}`, icon: <TrendingUp className="w-5 h-5" />, grad: 'from-sky-500 to-blue-600' },
    { label: 'অপেক্ষমান', value: pendingCount.toLocaleString(), icon: <Clock className="w-5 h-5" />, grad: 'from-amber-400 to-orange-500' },
    { label: 'ডেলিভার্ড', value: deliveredCount.toLocaleString(), icon: <PackageCheck className="w-5 h-5" />, grad: 'from-violet-500 to-fuchsia-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 to-gray-50 flex flex-col font-sans overflow-x-hidden">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #invoice-print, #invoice-print * { visibility: visible !important; }
          #invoice-print { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-[#12431C] via-[#185824] to-[#1F7A33] text-white shadow-lg px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-xl shrink-0">🧸</div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-black tracking-tight truncate">Tuktak Admin</h1>
            <p className="text-[10px] sm:text-[11px] text-emerald-100/80 font-mono truncate">{user?.email || 'Admin'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={closeAdminDashboard} className="flex items-center gap-1.5 p-2.5 sm:px-3.5 sm:py-2 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold cursor-pointer" aria-label="স্টোরে ফিরে যান">
            <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">স্টোর দেখুন</span>
          </button>
          <button onClick={logout} className="flex items-center gap-1.5 p-2.5 sm:px-3 sm:py-2 bg-red-500/30 hover:bg-red-500/50 rounded-xl text-xs font-bold cursor-pointer" aria-label="লগআউট">
            <LogOut className="w-4 h-4" /><span className="hidden sm:inline">লগআউট</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 pb-28 lg:pb-8 flex flex-col gap-4 sm:gap-5 min-w-0">
        {/* Desktop tabs */}
        <nav className="hidden lg:flex bg-white p-2 rounded-2xl border border-gray-200/80 shadow-xs gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex-1 px-3 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all cursor-pointer ${
                activeTab === t.key ? 'bg-[#185824] text-white shadow-md' : 'text-gray-600 hover:bg-emerald-50'
              }`}
            >
              {t.icon}<span>{t.long}</span>
              {!!t.badge && <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500 text-white font-mono">{t.badge}</span>}
            </button>
          ))}
        </nav>

        {/* Stats */}
        {activeTab === 'orders' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {statCards.map((s) => (
              <div key={s.label} className={`p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br ${s.grad} text-white shadow-md min-w-0`}>
                <div className="flex items-center justify-between opacity-90">
                  <span className="text-[11px] sm:text-xs font-bold">{s.label}</span>{s.icon}
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono mt-1.5 break-all">{s.value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-3xl border border-gray-200/80 p-3 sm:p-5 lg:p-7 shadow-xs min-w-0">
          {/* ---------------- PRODUCTS ---------------- */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="relative flex-1 lg:max-w-sm">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" value={productSearchQuery} onChange={(e) => setProductSearchQuery(e.target.value)} placeholder="পণ্য খুঁজুন..." className={`${inputCls} pl-9`} />
                </div>
                <div className="grid grid-cols-3 gap-2 lg:flex">
                  <button type="button" onClick={() => { if (window.confirm('সকল ডেমো পণ্য ও অর্ডার মুছে ফেলতে চান?')) clearAllDemoData(); }}
                    className="px-3 py-2.5 bg-gray-50 border border-gray-200 hover:bg-red-50 hover:text-red-600 text-gray-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer">
                    <Trash2 className="w-4 h-4 text-red-500" /><span>ডেমো মুছুন</span>
                  </button>
                  <button onClick={() => setIsNewCategoryModalOpen(true)} className="px-3 py-2.5 bg-white border border-emerald-200 hover:bg-emerald-50 text-[#185824] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer">
                    <FolderPlus className="w-4 h-4" /><span>ক্যাটাগরি</span>
                  </button>
                  <button onClick={handleOpenAddProduct} className="px-3 py-2.5 bg-[#185824] hover:bg-[#12431C] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
                    <Plus className="w-4 h-4" /><span>নতুন পণ্য</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
                  <span>ক্যাটাগরি ফিল্টার:</span>
                  <span className="text-[11px] text-[#185824]">{filteredProducts.length} টি পণ্য</span>
                </div>
                <div className={`flex items-center gap-2 overflow-x-auto pb-2 ${hideScrollbar}`}>
                  <button onClick={() => setProductCategoryFilter('all')}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer whitespace-nowrap ${productCategoryFilter === 'all' ? 'bg-[#1F1F24] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    সবগুলো ({products.length})
                  </button>
                  {categories.map((c) => {
                    const count = products.filter((p) => isProductMatchingCategory(p, c.slug, categories)).length;
                    const sel = productCategoryFilter === c.slug || productCategoryFilter === c.id;
                    return (
                      <div key={c.id} className={`shrink-0 flex items-center rounded-full text-xs font-bold whitespace-nowrap ${sel ? 'bg-[#185824] text-white' : 'bg-emerald-50 text-gray-700 border border-emerald-200'}`}>
                        <button type="button" onClick={() => setProductCategoryFilter(c.slug)} className="pl-3 pr-1.5 py-1.5 flex items-center gap-1.5 cursor-pointer">
                          <span>{c.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${sel ? 'bg-white/20' : 'bg-white text-gray-600'}`}>{count}</span>
                        </button>
                        <button type="button" onClick={() => setCategoryToDelete(c)} aria-label={`ক্যাটাগরি ${c.name} মুছুন`}
                          className={`mr-1 p-1.5 rounded-full cursor-pointer ${sel ? 'hover:bg-white/25' : 'text-gray-400 hover:text-red-600 hover:bg-red-100'}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredProducts.length === 0 ? (
                  <div className="col-span-full py-14 text-center text-gray-400 space-y-3 rounded-2xl border border-dashed border-gray-200 p-6">
                    <span className="text-4xl block">📦</span>
                    <h4 className="text-sm font-bold text-gray-800">কোনো পণ্য পাওয়া যায়নি</h4>
                    <button onClick={handleOpenAddProduct} className="px-5 py-2.5 bg-[#185824] text-white text-xs font-bold rounded-xl cursor-pointer inline-flex items-center gap-1.5">
                      <Plus className="w-4 h-4" /><span>নতুন পণ্য যোগ করুন</span>
                    </button>
                  </div>
                ) : (
                  filteredProducts.map((p) => {
                    const cat = categories.find((c) => c.slug === p.category_slug || c.id === p.category_id);
                    return (
                      <div key={p.id} className="p-3 rounded-2xl border border-gray-100 bg-white flex gap-3 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all min-w-0">
                        <img src={p.image_url} alt={p.name} className="w-20 h-20 object-cover rounded-xl border border-emerald-50 shrink-0" referrerPolicy="no-referrer" />
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="min-w-0">
                            <span className="inline-block text-[10px] font-bold text-[#185824] bg-emerald-50 px-2 py-0.5 rounded-md mb-1 max-w-full truncate">📁 {cat?.name || 'Category'}</span>
                            <h4 className="text-xs font-bold text-gray-900 truncate">{p.name}</h4>
                            <span className="text-[11px] text-gray-400 block truncate">{p.name_bn}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono font-bold text-sm text-[#185824]">৳{p.price}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${p.stock > 5 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>স্টক {p.stock}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-gray-50">
                            <button onClick={() => setEditingProduct(p)} className="text-[11px] font-bold text-gray-700 hover:text-[#185824] flex items-center gap-1 cursor-pointer py-1">
                              <Edit2 className="w-3 h-3" /><span>এডিট</span>
                            </button>
                            <button onClick={() => deleteProduct(p.id)} className="text-gray-400 hover:text-red-500 p-1.5 cursor-pointer" aria-label="পণ্য মুছুন">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ---------------- ORDERS ---------------- */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" value={orderSearchQuery} onChange={(e) => setOrderSearchQuery(e.target.value)} placeholder="অর্ডার খুঁজুন (নাম, মোবাইল, অর্ডার নং)..." className={`${inputCls} pl-9 pr-8`} />
                  {orderSearchQuery && (
                    <button onClick={() => setOrderSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold cursor-pointer" aria-label="সার্চ মুছুন">✕</button>
                  )}
                </div>
                <div className={`flex items-center gap-2 overflow-x-auto pb-1 ${hideScrollbar}`}>
                  {['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((st) => (
                    <button key={st} onClick={() => setOrderStatusFilter(st)}
                      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer whitespace-nowrap uppercase ${orderStatusFilter === st ? 'bg-[#1F1F24] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {filteredOrders.length === 0 ? (
                  <div className="py-16 text-center text-gray-400 text-xs rounded-2xl border border-dashed border-gray-200 px-3">
                    <ShoppingBag className="w-9 h-9 text-gray-300 mx-auto mb-2" />
                    <p className="font-bold text-gray-600 text-sm">কোনো অর্ডার পাওয়া যায়নি</p>
                    <p className="mt-0.5">নতুন অর্ডার এলে এখানে দেখা যাবে</p>
                  </div>
                ) : (
                  filteredOrders.map((ord) => (
                    <div key={`${ord.id}-${ord.status}`} className="rounded-2xl border border-gray-100 bg-white shadow-xs hover:shadow-md hover:border-emerald-300 transition-all overflow-hidden min-w-0">
                      <div className="p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-gradient-to-r from-emerald-50/70 to-white border-b border-gray-100">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="font-mono font-black text-sm text-[#185824] bg-white border border-emerald-200 px-2.5 py-1 rounded-lg">{ord.order_number}</span>
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${STATUS_STYLE[ord.status] || 'bg-gray-100 text-gray-600'}`}>{ord.status}</span>
                          <span className="text-xs font-bold text-gray-900 truncate max-w-[180px] sm:max-w-none">{ord.customer_name}</span>
                          <a href={`tel:${ord.phone}`} className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 flex items-center gap-1">
                            <Phone className="w-3 h-3" /><span>{ord.phone}</span>
                          </a>
                          <a
                            href={`https://wa.me/88${ord.phone.replace(/^0+/, '')}?text=${encodeURIComponent(`আসসালামু আলাইকুম ${ord.customer_name}, Tuktak Shopping থেকে আপনার অর্ডার (${ord.order_number}) এর বিষয়ে যোগাযোগ করা হয়েছে।`)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded-lg flex items-center" aria-label="WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setViewInvoiceOrder(ord)} className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl cursor-pointer" aria-label="ইনভয়েস">
                            <Printer className="w-4 h-4" />
                          </button>
                          <button onClick={() => setOrderToDelete(ord)} className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl cursor-pointer" aria-label="অর্ডার মুছুন">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <select
                            value={ord.status}
                            onChange={async (e) => { await updateOrderStatus(ord.id, e.target.value as OrderStatus); }}
                            className="flex-1 xl:flex-none text-xs font-bold bg-white border border-emerald-200 rounded-xl px-2.5 py-2.5 text-gray-900 cursor-pointer"
                          >
                            <option value="pending">Pending (অপেক্ষমান)</option>
                            <option value="confirmed">Confirmed (নিশ্চিত)</option>
                            <option value="processing">Processing (প্যাকেজিং)</option>
                            <option value="shipped">Shipped (কুরিয়ারে)</option>
                            <option value="delivered">Delivered (ডেলিভার্ড)</option>
                            <option value="cancelled">Cancelled (বাতিল)</option>
                          </select>
                        </div>
                      </div>

                      <div className="p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs text-gray-600">
                        <div className="space-y-1 bg-gray-50/70 p-3 rounded-xl min-w-0">
                          <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">ডেলিভারি ঠিকানা</span>
                          <p className="font-semibold text-gray-800 leading-snug break-words">{ord.address}</p>
                          <span className="inline-block text-[#185824] text-[11px] font-bold bg-emerald-50 px-2 py-0.5 rounded-md">📍 {ord.delivery_zone} · ফি ৳{ord.delivery_charge}</span>
                        </div>
                        <div className="space-y-1 bg-gray-50/70 p-3 rounded-xl min-w-0">
                          <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">আইটেম</span>
                          <div className="space-y-1 max-h-28 overflow-y-auto">
                            {ord.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between items-start gap-2 text-[11px] font-medium py-0.5 border-b border-gray-100 last:border-none">
                                <span className="min-w-0 break-words">• {it.product_name} {it.variant ? `(${it.variant})` : ''}</span>
                                <span className="font-mono font-bold text-gray-700 whitespace-nowrap">×{it.quantity} = ৳{(it.unit_price * it.quantity).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2 bg-gray-50/70 p-3 rounded-xl flex flex-col justify-between min-w-0">
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">কুরিয়ার ট্র্যাকিং কোড</span>
                            <input
                              type="text" defaultValue={ord.courier_tracking_id || ''} placeholder="e.g. PTH-98214"
                              onBlur={(e) => {
                                if (e.target.value !== (ord.courier_tracking_id || '')) {
                                  updateOrderStatus(ord.id, ord.status, e.target.value);
                                  showToast('ট্র্যাকিং কোড আপডেট হয়েছে');
                                }
                              }}
                              className="mt-1 px-2.5 py-2.5 sm:py-1.5 bg-white border border-gray-200 rounded-lg text-base sm:text-xs font-mono w-full focus:outline-hidden focus:ring-2 focus:ring-[#185824]"
                            />
                          </div>
                          <div className="pt-2 border-t border-gray-200 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-gray-500">ক্যাশ অন ডেলিভারি</span>
                            <div className="text-right">
                              <span className="text-[10px] text-gray-400 block">সর্বমোট</span>
                              <span className="font-mono font-black text-base text-[#1F1F24]">৳{ord.total.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ---------------- BANNERS ---------------- */}
          {activeTab === 'banners' && <BannerManager />}

          {/* ---------------- COURIER ---------------- */}
          {activeTab === 'courier' && (
            <form onSubmit={handleCourierSave} className="space-y-4 max-w-3xl">
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#185824] to-emerald-600 text-white shadow-md">
                <h3 className="text-base font-black flex items-center gap-2"><Truck className="w-5 h-5" /> কুরিয়ার API সেটআপ</h3>
                <p className="text-[11px] sm:text-xs text-emerald-50/90 mt-1 leading-relaxed">
                  Steadfast, Pathao, RedX ও CarryBee-র API তথ্য এখানে সেভ করে রাখুন। যে কুরিয়ারের তথ্য দেবেন শুধু সেটারই &quot;সক্রিয়&quot; টগল অন করুন।
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold bg-white/15 px-3 py-1 rounded-full">
                  <KeyRound className="w-3.5 h-3.5" /> {configuredCouriers}/{COURIERS.length} কুরিয়ারের তথ্য দেওয়া আছে
                </div>
              </div>

              {/* default courier */}
              <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-2">
                <label className="text-xs font-black text-gray-900 block">ডিফল্ট কুরিয়ার</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[{ key: '', name: 'কোনোটি নয়' }, ...COURIERS.map((c) => ({ key: c.key, name: c.name }))].map((c) => {
                    const sel = (courierForm.courier_default || '') === c.key;
                    return (
                      <button key={c.key || 'none'} type="button" onClick={() => setCourierVal('courier_default', c.key)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${sel ? 'bg-[#185824] text-white border-[#185824] shadow-md' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-emerald-50'}`}>
                        {sel && <Check className="w-3.5 h-3.5 inline mr-1" />}{c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {COURIERS.map((c) => {
                const enabled = courierForm[`courier_${c.key}_enabled`] === '1';
                const filled = c.fields.some((f) => (courierForm[`courier_${c.key}_${f.k}`] || '').trim());
                return (
                  <div key={c.key} className={`rounded-2xl border bg-white overflow-hidden shadow-xs ${enabled ? 'border-emerald-300' : 'border-gray-200'}`}>
                    <div className={`flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r ${c.grad} text-white`}>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black">{c.name}</h4>
                        <p className="text-[10px] opacity-90 truncate">{c.tagline}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCourierVal(`courier_${c.key}_enabled`, enabled ? '0' : '1')}
                        className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black cursor-pointer ${enabled ? 'bg-white text-emerald-700' : 'bg-black/25 text-white'}`}
                        aria-pressed={enabled}
                      >
                        <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                        {enabled ? 'সক্রিয়' : 'বন্ধ'}
                      </button>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {c.fields.map((f) => {
                        const key = `courier_${c.key}_${f.k}`;
                        return (
                          <div key={key}>
                            <label className="text-[11px] font-bold text-gray-700 block mb-1">{f.label}</label>
                            {f.secret ? (
                              <SecretInput value={courierForm[key] || ''} onChange={(v) => setCourierVal(key, v)} placeholder={f.placeholder} />
                            ) : (
                              <input type="text" value={courierForm[key] || ''} onChange={(e) => setCourierVal(key, e.target.value)} placeholder={f.placeholder} autoComplete="off" spellCheck={false}
                                className={`${inputCls} font-mono`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {!filled && enabled && (
                      <p className="mx-4 mb-4 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">সক্রিয় করা হয়েছে কিন্তু কোনো API তথ্য দেওয়া হয়নি।</p>
                    )}
                  </div>
                );
              })}

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                ⚠️ নিরাপত্তা: Secret/Password জাতীয় তথ্য কখনো ফ্রন্টএন্ডে ব্যবহার করবেন না। ভবিষ্যতে কুরিয়ারে অর্ডার পাঠানোর সময় এগুলো Supabase Edge Function / সার্ভার থেকে ব্যবহার করতে হবে।
              </div>

              <div className="sticky bottom-20 lg:bottom-4 z-10">
                <button type="submit" className="w-full sm:w-auto py-3.5 px-8 bg-[#1F1F24] hover:bg-black text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-xl">
                  <Save className="w-4 h-4" /><span>কুরিয়ার সেটিংস সেভ করুন</span>
                </button>
              </div>
            </form>
          )}

          {/* ---------------- TRACKING ---------------- */}
          {activeTab === 'tracking' && (
            <form onSubmit={handleTrackingSave} className="space-y-4 max-w-2xl">
              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 space-y-1">
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2"><Activity className="w-4 h-4 text-[#185824]" /><span>ট্র্যাকিং ও পিক্সেল</span></h3>
                <p className="text-[11px] text-gray-500 leading-relaxed">শুধু ID দিলেই হবে। চাইলে পুরো পিক্সেল কোড পেস্ট করুন, ID নিজে থেকে বের হবে। ফাঁকা রাখলে ট্র্যাকিং বন্ধ থাকবে।</p>
              </div>
              {([
                { key: 'facebook_pixel_id', kind: 'fb', title: 'Facebook (Meta) Pixel', hint: 'Events Manager → Pixel ID (যেমন: 123456789012345)', placeholder: '123456789012345', valid: isValidFbPixelId },
                { key: 'gtm_id', kind: 'gtm', title: 'Google Tag Manager', hint: 'GTM Container ID (যেমন: GTM-ABC1234)', placeholder: 'GTM-XXXXXXX', valid: isValidGtmId },
                { key: 'tiktok_pixel_id', kind: 'tiktok', title: 'TikTok Pixel', hint: 'TikTok Ads Manager → Events → Pixel ID', placeholder: 'C1A2B3D4E5F6G7H8I9J0', valid: isValidTikTokPixelId },
              ] as const).map((f) => {
                const raw = trackingForm[f.key];
                const id = extractTrackingId(f.kind, raw);
                const state = !raw.trim() ? 'off' : f.valid(id) ? 'ok' : 'bad';
                return (
                  <div key={f.key} className="p-4 rounded-2xl border border-gray-200 bg-white space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-black text-gray-900">{f.title}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${state === 'ok' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : state === 'bad' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                        {state === 'ok' ? '✓ সক্রিয় হবে' : state === 'bad' ? 'ID ভুল' : 'বন্ধ'}
                      </span>
                    </div>
                    <textarea value={raw} onChange={(e) => setTrackingForm({ ...trackingForm, [f.key]: e.target.value })} rows={2} spellCheck={false} placeholder={f.placeholder} className={`${inputCls} font-mono resize-y`} />
                    <p className="text-[11px] text-gray-500">{f.hint}</p>
                    {raw.trim() && raw.trim() !== id && state === 'ok' && (
                      <p className="text-[11px] text-emerald-700 font-mono">ডিটেক্টেড ID: <strong>{id}</strong></p>
                    )}
                  </div>
                );
              })}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                ⚠️ GTM-এর ভেতরেও একই পিক্সেল বসালে ইভেন্ট দুইবার গণনা হতে পারে। যেকোনো একটি মাধ্যম ব্যবহার করুন।
              </div>
              <button type="submit" className="w-full sm:w-auto py-3 px-6 bg-[#1F1F24] hover:bg-black text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md">
                <Save className="w-4 h-4" /><span>ট্র্যাকিং সেভ করুন</span>
              </button>
            </form>
          )}

          {/* ---------------- SETTINGS ---------------- */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSettingsSave} className="space-y-4 max-w-2xl">
              <div className="bg-emerald-50/50 p-4 sm:p-5 rounded-2xl border border-emerald-200 space-y-4">
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2"><Sliders className="w-4 h-4 text-[#185824]" /><span>হটলাইন ও ডেলিভারি</span></h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">WhatsApp নম্বর</label>
                    <input type="text" value={settingsForm.whatsapp_number} onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp_number: e.target.value })} className={`${inputCls} font-mono`} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">হটলাইন কল নম্বর</label>
                    <input type="text" value={settingsForm.call_number} onChange={(e) => setSettingsForm({ ...settingsForm, call_number: e.target.value })} className={`${inputCls} font-mono`} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">ফ্রি ডেলিভারি থ্রেশহোল্ড (৳)</label>
                    <input type="number" value={settingsForm.free_delivery_threshold} onChange={(e) => setSettingsForm({ ...settingsForm, free_delivery_threshold: Number(e.target.value) })} className={`${inputCls} font-mono`} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">এক্সট্রা ৫% ডিসকাউন্ট থ্রেশহোল্ড (৳)</label>
                    <input type="number" value={settingsForm.extra_discount_threshold} onChange={(e) => setSettingsForm({ ...settingsForm, extra_discount_threshold: Number(e.target.value) })} className={`${inputCls} font-mono`} />
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 space-y-2">
                <h3 className="text-sm font-black text-gray-900">ফ্ল্যাশ সেল শেষ হওয়ার সময়</h3>
                <input type="text" value={settingsForm.flash_sale_end_time} onChange={(e) => setSettingsForm({ ...settingsForm, flash_sale_end_time: e.target.value })} className={`${inputCls} font-mono`} />
                <p className="text-[11px] text-gray-500">ISO Format: যেমন &quot;2026-12-31T23:59:59Z&quot;</p>
              </div>
              <button type="submit" className="w-full sm:w-auto py-3 px-6 bg-[#1F1F24] hover:bg-black text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md">
                <Save className="w-4 h-4" /><span>সেটিংস সেভ করুন</span>
              </button>
            </form>
          )}

          {/* ---------------- SUPABASE ---------------- */}
          {activeTab === 'sql' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-white border border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full shrink-0 ${isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <h4 className="text-sm font-black text-gray-900">{isSupabaseConfigured ? 'Supabase সংযুক্ত' : 'Local Preview Mode'}</h4>
                  </div>
                  <p className="text-xs text-gray-500 break-all">URL: <span className="font-mono text-gray-700">https://fksmxdnubjdhnljpsrxh.supabase.co</span></p>
                </div>
                <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 flex flex-wrap items-center gap-3 text-xs">
                  <div className="min-w-0">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">ইউজার</span>
                    <span className="font-mono font-bold text-gray-900 break-all">{user?.email}</span>
                  </div>
                  <div className="border-l border-emerald-200 pl-3">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Role</span>
                    <span className="inline-flex font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">✓ {user?.role}</span>
                  </div>
                  <button onClick={() => { refreshUserRole(); showToast('রোল রিফ্রেশ করা হয়েছে!'); }} className="ml-auto px-3 py-2 bg-white border border-emerald-200 text-[#185824] rounded-lg font-bold text-xs cursor-pointer">
                    রিফ্রেশ
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-black text-gray-900">🛡️ রোল ম্যানেজমেন্ট (SQL)</h3>
                {[
                  { t: '১. Admin বানাতে', cmd: `UPDATE public.profiles SET role = 'admin' WHERE email = 'rifatkhan4054ff@gmail.com';` },
                  { t: '২. Admin সরাতে', cmd: `UPDATE public.profiles SET role = 'user' WHERE email = 'rifatkhan4054ff@gmail.com';` },
                  { t: '৩. সব ইউজার দেখতে', cmd: `SELECT id, full_name, email, role, created_at FROM public.profiles ORDER BY created_at DESC;` },
                ].map((c) => (
                  <div key={c.t} className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800">{c.t}</span>
                      <button onClick={() => { navigator.clipboard.writeText(c.cmd); showToast('SQL কপি হয়েছে!'); }} className="text-[11px] font-bold text-[#185824] flex items-center gap-1 cursor-pointer">
                        <Copy className="w-3 h-3" /><span>Copy</span>
                      </button>
                    </div>
                    <pre className="bg-[#1F1F24] text-emerald-300 p-3 rounded-lg text-[11px] font-mono overflow-x-auto whitespace-pre-wrap break-all">{c.cmd}</pre>
                  </div>
                ))}
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-gray-900">সম্পূর্ণ ডাটাবেজ স্কিমা ও RLS</h4>
                  <p className="text-xs text-gray-500 mt-0.5">সব টেবিল, পলিসি ও ট্রিগার একসাথে কপি করুন।</p>
                </div>
                <button
                  onClick={() => {
                    fetch('/supabase_schema.sql').then((r) => r.text()).then((sql) => { navigator.clipboard.writeText(sql); showToast('SQL স্কিমা কপি হয়েছে!'); }).catch(() => showToast('SQL ফাইল লোড করা যায়নি'));
                  }}
                  className="px-4 py-3 bg-[#1F1F24] hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" /><span>Copy Complete SQL Schema</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
        <div className={`flex overflow-x-auto ${hideScrollbar}`}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`relative flex-1 min-w-[72px] flex flex-col items-center gap-0.5 py-2 cursor-pointer transition-colors ${activeTab === t.key ? 'text-[#185824]' : 'text-gray-400'}`}>
              {activeTab === t.key && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[#185824]" />}
              <span className={`p-1.5 rounded-xl ${activeTab === t.key ? 'bg-emerald-50' : ''}`}>{t.icon}</span>
              <span className="text-[10px] font-bold">{t.short}</span>
              {!!t.badge && <span className="absolute top-1 right-3 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">{t.badge}</span>}
            </button>
          ))}
        </div>
      </nav>

      {/* Edit product modal */}
      {editingProduct && (
        <div className={`${modalOverlay} z-[60]`}>
          <div className={`${modalPanel} sm:max-w-lg`}>
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div>
                <h4 className="text-sm font-black text-gray-900">পণ্য সম্পাদনা</h4>
                <p className="text-[11px] text-gray-400">বিবরণ ও ক্যাটাগরি আপডেট করুন</p>
              </div>
              <button onClick={() => setEditingProduct(null)} className="p-1.5 text-gray-400 hover:text-gray-700 cursor-pointer" aria-label="বন্ধ"><X className="w-5 h-5" /></button>
            </div>
            <ProductFormFields
              value={editingProduct}
              onChange={(v) => setEditingProduct(v as Product)}
              categories={categories}
              onNewCategory={() => setIsNewCategoryModalOpen(true)}
              uploading={isUploadingProductImage}
              onImageAdd={(f) => handleProductImageAdd(f, true)}
              onImageRemove={(i) => handleProductImageRemove(i, true)}
            />
            <div className={modalFooter}>
              <button
                disabled={isUploadingProductImage}
                onClick={() => {
                  updateProduct({ ...editingProduct, image_url: editingProduct.images?.[0] || DEFAULT_PRODUCT_IMAGE });
                  setEditingProduct(null);
                }}
                className="flex-1 py-3 bg-[#1F1F24] hover:bg-black disabled:opacity-60 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /><span>সেভ করুন</span>
              </button>
              <button onClick={() => setEditingProduct(null)} className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer">বাতিল</button>
            </div>
          </div>
        </div>
      )}

      {/* Add product modal */}
      {isNewProductModalOpen && (
        <div className={`${modalOverlay} z-[60]`}>
          <form onSubmit={handleCreateProduct} className={`${modalPanel} sm:max-w-lg`}>
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div>
                <h4 className="text-sm font-black text-gray-900">নতুন পণ্য যুক্ত করুন</h4>
                <p className="text-[11px] text-gray-400">ক্যাটাগরি ঠিক করে ইনভেন্টরিতে যোগ করুন</p>
              </div>
              <button type="button" onClick={() => setIsNewProductModalOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-700 cursor-pointer" aria-label="বন্ধ"><X className="w-5 h-5" /></button>
            </div>
            <ProductFormFields
              value={newProductForm}
              onChange={setNewProductForm}
              categories={categories}
              onNewCategory={() => setIsNewCategoryModalOpen(true)}
              uploading={isUploadingProductImage}
              onImageAdd={(f) => handleProductImageAdd(f, false)}
              onImageRemove={(i) => handleProductImageRemove(i, false)}
            />
            <div className={modalFooter}>
              <button type="submit" disabled={isUploadingProductImage} className="flex-1 py-3 bg-[#185824] hover:bg-[#12431C] disabled:opacity-60 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" /><span>যুক্ত করুন</span>
              </button>
              <button type="button" onClick={() => setIsNewProductModalOpen(false)} className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer">বাতিল</button>
            </div>
          </form>
        </div>
      )}

      {/* New category modal */}
      {isNewCategoryModalOpen && (
        <div className={`${modalOverlay} z-[70]`}>
          <form onSubmit={handleCreateCategory} className={`${modalPanel} sm:max-w-md shadow-2xl`}>
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2"><FolderPlus className="w-5 h-5 text-[#185824]" /><h4 className="text-sm font-black text-gray-900">নতুন ক্যাটাগরি</h4></div>
              <button type="button" onClick={closeCategoryModal} className="p-1.5 text-gray-400 hover:text-gray-700 cursor-pointer" aria-label="বন্ধ"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">নাম (English) *</label>
                <input type="text" required value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="e.g. Wooden Toys" className={inputCls} />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">নাম (বাংলা)</label>
                <input type="text" value={newCategoryNameBn} onChange={(e) => setNewCategoryNameBn(e.target.value)} placeholder="e.g. কাঠের খেলনা" className={inputCls} />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">সাব-লেবেল</label>
                <input type="text" value={newCategorySubLabel} onChange={(e) => setNewCategorySubLabel(e.target.value)} placeholder="e.g. Kids, Newborn" className={inputCls} />
              </div>
              <ImageUploadField label="ক্যাটাগরির ছবি" imageUrl={newCategoryImageUrl} uploading={isUploadingCategoryImage} onSelect={handleCategoryImageSelect} onClear={() => setNewCategoryImageUrl('')} />
            </div>
            <div className={modalFooter}>
              <button type="submit" disabled={isUploadingCategoryImage} className="flex-1 py-3 bg-[#185824] hover:bg-[#12431C] disabled:opacity-60 text-white font-bold rounded-xl text-xs cursor-pointer">
                {isUploadingCategoryImage ? 'ছবি আপলোড হচ্ছে...' : 'ক্যাটাগরি সেভ করুন'}
              </button>
              <button type="button" onClick={closeCategoryModal} className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer">বাতিল</button>
            </div>
          </form>
        </div>
      )}

      {/* Invoice modal */}
      {viewInvoiceOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4">
          <div id="invoice-print" className="bg-white rounded-t-3xl sm:rounded-3xl p-4 sm:p-8 max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl space-y-4 text-gray-800">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#EBF6ED] border border-[#A3D9A5] flex items-center justify-center text-[#185824] font-black">T</div>
                <div>
                  <h3 className="font-black text-lg text-gray-900 leading-tight">Tuktak Shopping</h3>
                  <p className="text-[10px] text-gray-500">Cash on Delivery Memo</p>
                </div>
              </div>
              <button onClick={() => setViewInvoiceOrder(null)} className="no-print p-1.5 rounded-full text-gray-400 hover:bg-gray-100 cursor-pointer" aria-label="বন্ধ"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center gap-2 bg-gray-50 p-3 rounded-xl">
                <div><span className="text-[10px] text-gray-400 font-bold block">অর্ডার নং</span><span className="font-mono font-bold text-[#185824] text-sm">{viewInvoiceOrder.order_number}</span></div>
                <div className="text-right"><span className="text-[10px] text-gray-400 font-bold block">তারিখ</span><span className="font-mono">{new Date(viewInvoiceOrder.created_at).toLocaleDateString('bn-BD')}</span></div>
              </div>
              <div className="p-3 bg-emerald-50/50 rounded-xl space-y-1 break-words">
                <p><strong>গ্রাহক:</strong> {viewInvoiceOrder.customer_name}</p>
                <p><strong>মোবাইল:</strong> +88 {viewInvoiceOrder.phone}</p>
                <p><strong>ঠিকানা:</strong> {viewInvoiceOrder.address} ({viewInvoiceOrder.delivery_zone})</p>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-700 font-bold">
                    <tr><th className="p-2.5">আইটেম</th><th className="p-2.5 text-center">পরিমাণ</th><th className="p-2.5 text-right">মূল্য</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {viewInvoiceOrder.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-medium">{it.product_name} {it.variant ? `(${it.variant})` : ''}</td>
                        <td className="p-2.5 text-center font-mono">{it.quantity}</td>
                        <td className="p-2.5 text-right font-mono font-bold whitespace-nowrap">৳{(it.unit_price * it.quantity).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-1 pt-2 border-t border-gray-200">
                <div className="flex justify-between text-gray-600"><span>সাবটোটাল</span><span className="font-mono">৳{viewInvoiceOrder.subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-gray-600"><span>ডেলিভারি চার্জ</span><span className="font-mono">৳{viewInvoiceOrder.delivery_charge}</span></div>
                {viewInvoiceOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600"><span>ডিসকাউন্ট</span><span className="font-mono">-৳{viewInvoiceOrder.discount}</span></div>
                )}
                <div className="flex justify-between gap-2 text-sm font-black text-gray-900 pt-2 border-t border-gray-200">
                  <span>ক্যাশ অন ডেলিভারি (মোট)</span>
                  <span className="font-mono text-[#185824] whitespace-nowrap">৳{viewInvoiceOrder.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="no-print flex items-center gap-3 pt-3 border-t border-gray-100">
              <button onClick={() => window.print()} className="flex-1 py-3 bg-[#1F1F24] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer">
                <Printer className="w-4 h-4" /><span>প্রিন্ট মেমো</span>
              </button>
              <button onClick={() => setViewInvoiceOrder(null)} className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer">বন্ধ</button>
            </div>
          </div>
        </div>
      )}

      {/* Category delete confirm */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600"><Trash2 className="w-7 h-7" /></div>
            <h3 className="text-lg font-black text-gray-900">ক্যাটাগরি মুছে ফেলবেন?</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              <span className="font-bold text-[#185824]">&quot;{categoryToDelete.name}&quot;</span> স্থায়ীভাবে মুছে যাবে। এটি ফেরানো যাবে না।
            </p>
            {(() => {
              const inCat = products.filter((p) => isProductMatchingCategory(p, categoryToDelete.slug, categories)).length;
              return inCat > 0 ? (
                <p className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">⚠️ এই ক্যাটাগরিতে {inCat} টি পণ্য আছে। আগে সেগুলো অন্য ক্যাটাগরিতে সরান।</p>
              ) : null;
            })()}
            <div className="flex items-center gap-3 pt-2">
              <button type="button" disabled={isDeletingCategory} onClick={() => setCategoryToDelete(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-60 text-gray-700 rounded-xl text-xs font-bold cursor-pointer">বাতিল</button>
              <button type="button" disabled={isDeletingCategory} onClick={confirmDeleteCategory} className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5">
                {isDeletingCategory ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>মুছছে...</span></>) : <span>হ্যাঁ, মুছুন</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order delete confirm */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600"><Trash2 className="w-7 h-7" /></div>
            <h3 className="text-lg font-black text-gray-900">অর্ডার মুছে ফেলবেন?</h3>
            <p className="text-xs text-gray-600">
              <span className="font-mono font-bold text-[#185824]">{orderToDelete.order_number}</span> ({orderToDelete.customer_name}) স্থায়ীভাবে মুছে যাবে।
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button type="button" onClick={() => setOrderToDelete(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer">বাতিল</button>
              <button type="button" onClick={() => { deleteOrder(orderToDelete.id); setOrderToDelete(null); }} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer">হ্যাঁ, মুছুন</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};