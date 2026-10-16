import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://fksmxdnubjdhnljpsrxh.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrc214ZG51YmpkaG5sanBzcnhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNDA0NDgsImV4cCI6MjEwNzcxNjQ0OH0.xS4pXBXEevSGYNacq1TjMA5VgrmgmHHmO2UQuCZOs2Q';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Storage bucket নাম (supabase_storage_setup.sql এর সাথে মিলিয়ে)
export const IMAGE_BUCKET = 'product-images';

// Fetch role strictly from Supabase database table
// Never relies on localStorage, client variables, or user-editable metadata
export const fetchUserRoleFromDatabase = async (
  userId?: string | null,
  email?: string | null
): Promise<'admin' | 'user'> => {
  if (!isSupabaseConfigured || !supabase) {
    return 'user';
  }

  try {
    // 1. Primary check: Query public.profiles table by authenticated user UUID
    if (userId) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (!error && profile?.role) {
        const normalizedRole = String(profile.role).toLowerCase().trim();
        if (normalizedRole === 'admin') {
          return 'admin';
        }
        return 'user';
      }
    }

    // 2. Server-side database RPC check if available
    try {
      const { data: rpcAdmin, error: rpcErr } = await supabase.rpc('is_admin');
      if (!rpcErr && rpcAdmin === true) {
        return 'admin';
      }
    } catch {
      // ignore rpc failure
    }

    // 3. Fallback check: Query public.profiles by authenticated email
    const cleanEmail = email?.toLowerCase().trim() || '';
    if (cleanEmail) {
      const { data: profileByEmail, error: emailErr } = await supabase
        .from('profiles')
        .select('role')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (!emailErr && profileByEmail?.role) {
        const normalizedRole = String(profileByEmail.role).toLowerCase().trim();
        if (normalizedRole === 'admin') {
          return 'admin';
        }
        return 'user';
      }
    }
  } catch (err) {
    console.warn('Error checking admin role in Supabase database:', err);
  }

  // Default role for any regular user or unverified session is strictly 'user'
  return 'user';
};

// Supabase স্টোরেজের এরর ইউজার-বান্ধব বাংলায় অনুবাদ
const friendlyStorageError = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes('bucket not found')) {
    return `Supabase এ "${IMAGE_BUCKET}" নামের bucket টি পাওয়া যায়নি (supabase_storage_setup.sql রান করুন)`;
  }
  if (m.includes('row-level security') || m.includes('policy') || m.includes('unauthorized') || m.includes('not allowed')) {
    return 'ছবি আপলোড অনুমতি নেই (Supabase এ public storage policy দিন)';
  }
  if (m.includes('payload too large') || m.includes('exceeded the maximum')) {
    return 'ছবির সাইজ অনুমোদিত সীমার চেয়ে বড়';
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'ইন্টারনেট বা Supabase সার্ভারের সংযোগে সমস্যা';
  }
  return message;
};

// Upload image to Supabase Storage.
export const uploadImageToSupabase = async (file: File): Promise<string> => {
  if (isSupabaseConfigured && supabase) {
    const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileExt = /^[a-z0-9]{2,5}$/.test(rawExt) ? rawExt : 'jpg';
    const cleanFileName = `img-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `products/${cleanFileName}`;

    const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/jpeg',
    });

    if (error) {
      console.error('Supabase storage upload error:', error);
      throw new Error(friendlyStorageError(error.message));
    }

    const { data: publicUrlData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      throw new Error('পাবলিক লিঙ্ক পাওয়া যায়নি (bucket টি Public আছে কিনা দেখুন)');
    }

    return publicUrlData.publicUrl;
  }

  // Supabase না থাকলে প্রিভিউয়ের জন্য base64 Data URL তৈরি করে ফেরত দেবে
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('ফাইল পড়তে সমস্যা হয়েছে'));
    reader.readAsDataURL(file);
  });
};
