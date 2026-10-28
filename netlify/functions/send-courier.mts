// Netlify Function: /.netlify/functions/send-courier
// Env vars (Netlify → Site settings → Environment variables):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// API key গুলো ব্রাউজারে যায় না; এখানে সার্ভারে DB থেকে পড়া হয়।

type Provider = 'steadfast' | 'pathao' | 'redx' | 'carrybee';

interface OrderPayload {
  order_number: string;
  customer_name: string;
  phone: string;
  address: string;
  total: number;
  note?: string;
  items: { product_name: string; quantity: number }[];
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

const SB_URL = () => process.env.SUPABASE_URL!;
const SB_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function sb(path: string, token?: string) {
  const res = await fetch(`${SB_URL()}${path}`, {
    headers: { apikey: SB_KEY(), Authorization: `Bearer ${token || SB_KEY()}` },
  });
  return res.json();
}

async function assertAdmin(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Unauthorized');
  const u = await sb('/auth/v1/user', token);
  if (!u?.id) throw new Error('Unauthorized');
  const p = await sb(`/rest/v1/profiles?id=eq.${u.id}&select=role`);
  if (p?.[0]?.role !== 'admin') throw new Error('Forbidden');
}

const cleanPhone = (p: string) => p.replace(/\D/g, '').replace(/^88/, '');
const summary = (o: OrderPayload) => o.items.map((i) => `${i.product_name} x${i.quantity}`).join(', ');
const qty = (o: OrderPayload) => o.items.reduce((s, i) => s + i.quantity, 0) || 1;

async function readJson(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

// ---------- Steadfast ----------
async function steadfast(c: any, o: OrderPayload) {
  const res = await fetch('https://portal.packzy.com/api/v1/create_order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Api-Key': c.api_key, 'Secret-Key': c.secret_key },
    body: JSON.stringify({
      invoice: o.order_number,
      recipient_name: o.customer_name,
      recipient_phone: cleanPhone(o.phone),
      recipient_address: o.address,
      cod_amount: o.total,
      note: o.note || summary(o),
    }),
  });
  const d = await readJson(res);
  const id = d?.consignment?.tracking_code || d?.consignment?.consignment_id;
  if (!res.ok || !id) throw new Error(d?.message || JSON.stringify(d));
  return String(id);
}

// ---------- Pathao ----------
async function pathao(c: any, o: OrderPayload) {
  const base = c.sandbox ? 'https://courier-api-sandbox.pathao.com' : 'https://api-hermes.pathao.com';
  const tRes = await fetch(`${base}/aladdin/api/v1/issue-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: c.client_id,
      client_secret: c.client_secret,
      username: c.username,
      password: c.password,
      grant_type: 'password',
    }),
  });
  const t = await readJson(tRes);
  if (!t?.access_token) throw new Error('Pathao লগইন ব্যর্থ: ' + (t?.message || 'credentials ভুল'));

  const res = await fetch(`${base}/aladdin/api/v1/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t.access_token}` },
    body: JSON.stringify({
      store_id: Number(c.store_id),
      merchant_order_id: o.order_number,
      recipient_name: o.customer_name,
      recipient_phone: cleanPhone(o.phone),
      recipient_address: o.address,
      delivery_type: 48,
      item_type: 2,
      special_instruction: o.note || '',
      item_quantity: qty(o),
      item_weight: Number(c.default_weight || 0.5),
      item_description: summary(o),
      amount_to_collect: o.total,
    }),
  });
  const d = await readJson(res);
  const id = d?.data?.consignment_id;
  if (!res.ok || !id) throw new Error(d?.message || JSON.stringify(d?.errors || d));
  return String(id);
}

// ---------- RedX ----------
async function redx(c: any, o: OrderPayload) {
  const base = c.sandbox ? 'https://sandbox.redx.com.bd/v1.0.0-beta' : 'https://openapi.redx.com.bd/v1.0.0-beta';
  const res = await fetch(`${base}/parcel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'API-ACCESS-TOKEN': `Bearer ${c.access_token}` },
    body: JSON.stringify({
      customer_name: o.customer_name,
      customer_phone: cleanPhone(o.phone),
      delivery_area: c.delivery_area,
      delivery_area_id: Number(c.delivery_area_id),
      customer_address: o.address,
      merchant_invoice_id: o.order_number,
      cash_collection_amount: String(o.total),
      parcel_weight: Number(c.default_weight_gram || 500),
      instruction: o.note || '',
      value: o.total,
      parcel_details_json: o.items.map((i) => ({ name: i.product_name, category: 'general', value: 0 })),
    }),
  });
  const d = await readJson(res);
  const id = d?.tracking_id;
  if (!res.ok || !id) throw new Error(d?.message || JSON.stringify(d));
  return String(id);
}

// ---------- CarryBee ----------
// দ্রষ্টব্য: CarryBee এর endpoint/field নাম তাদের ডকুমেন্টেশনের সাথে মিলিয়ে নিন।
async function carrybee(c: any, o: OrderPayload) {
  const base = c.sandbox ? 'https://stage-sandbox.carrybee.com' : 'https://developers.carrybee.com';
  const res = await fetch(`${base}/api/v2/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-ID': c.client_id,
      'Client-Secret': c.client_secret,
      'Client-Context': c.client_context,
    },
    body: JSON.stringify({
      store_id: c.store_id,
      merchant_order_id: o.order_number,
      delivery_type: 1,
      product_type: 1,
      recipient_name: o.customer_name,
      recipient_phone: cleanPhone(o.phone),
      recipient_address: o.address,
      city_id: c.city_id ? Number(c.city_id) : undefined,
      zone_id: c.zone_id ? Number(c.zone_id) : undefined,
      area_id: c.area_id ? Number(c.area_id) : undefined,
      item_weight: Number(c.default_weight_gram || 500),
      collectable_amount: o.total,
      product_description: summary(o),
      special_instruction: o.note || '',
    }),
  });
  const d = await readJson(res);
  const id = d?.data?.consignment_id || d?.data?.order_id || d?.consignment_id;
  if (!res.ok || !id) throw new Error(d?.message || JSON.stringify(d));
  return String(id);
}

const handlers: Record<Provider, (c: any, o: OrderPayload) => Promise<string>> = {
  steadfast, pathao, redx, carrybee,
};

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    await assertAdmin(req);
    const { provider, order } = (await req.json()) as { provider: Provider; order: OrderPayload };
    if (!handlers[provider]) return json({ error: 'অজানা কুরিয়ার' }, 400);

    const rows = await sb(`/rest/v1/courier_settings?provider=eq.${provider}&select=enabled,config`);
    const row = rows?.[0];
    if (!row?.enabled) return json({ error: `${provider} চালু করা নেই বা API key সেট করা হয়নি` }, 400);

    const trackingId = await handlers[provider](row.config || {}, order);
    return json({ ok: true, trackingId, provider });
  } catch (e: any) {
    const msg = e?.message || 'অজানা সমস্যা';
    return json({ error: msg }, msg === 'Unauthorized' || msg === 'Forbidden' ? 403 : 500);
  }
};
