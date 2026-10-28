import React, { useEffect, useState } from 'react';
import { Truck, Save, Eye, EyeOff, Loader2, Send, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Order } from '../types';

export type CourierId = 'steadfast' | 'pathao' | 'redx' | 'carrybee';

interface FieldDef {
  key: string;
  label: string;
  secret?: boolean;
  type?: 'text' | 'checkbox';
  placeholder?: string;
}

const PROVIDERS: { id: CourierId; name: string; hint: string; fields: FieldDef[] }[] = [
  {
    id: 'steadfast',
    name: 'Steadfast Courier',
    hint: 'Steadfast পোর্টাল → Profile → API Credentials',
    fields: [
      { key: 'api_key', label: 'API Key', secret: true },
      { key: 'secret_key', label: 'Secret Key', secret: true },
    ],
  },
  {
    id: 'pathao',
    name: 'Pathao Courier',
    hint: 'Pathao Merchant Panel → Developer API',
    fields: [
      { key: 'client_id', label: 'Client ID' },
      { key: 'client_secret', label: 'Client Secret', secret: true },
      { key: 'username', label: 'Merchant Email' },
      { key: 'password', label: 'Merchant Password', secret: true },
      { key: 'store_id', label: 'Store ID', placeholder: 'e.g. 123456' },
      { key: 'sandbox', label: 'Sandbox (টেস্ট মোড)', type: 'checkbox' },
    ],
  },
  {
    id: 'redx',
    name: 'RedX',
    hint: 'RedX Merchant Panel → API Access Token। Delivery Area ও Area ID RedX এর area তালিকা থেকে নিন',
    fields: [
      { key: 'access_token', label: 'API Access Token', secret: true },
      { key: 'delivery_area', label: 'ডিফল্ট Delivery Area', placeholder: 'e.g. Mirpur' },
      { key: 'delivery_area_id', label: 'ডিফল্ট Delivery Area ID', placeholder: 'e.g. 1' },
      { key: 'sandbox', label: 'Sandbox (টেস্ট মোড)', type: 'checkbox' },
    ],
  },
  {
    id: 'carrybee',
    name: 'CarryBee',
    hint: 'CarryBee Merchant Panel → API Credentials',
    fields: [
      { key: 'client_id', label: 'Client ID' },
      { key: 'client_secret', label: 'Client Secret', secret: true },
      { key: 'client_context', label: 'Client Context', secret: true },
      { key: 'store_id', label: 'Store ID' },
      { key: 'city_id', label: 'ডিফল্ট City ID (ঐচ্ছিক)' },
      { key: 'zone_id', label: 'ডিফল্ট Zone ID (ঐচ্ছিক)' },
      { key: 'sandbox', label: 'Sandbox (টেস্ট মোড)', type: 'checkbox' },
    ],
  },
];

interface Row {
  enabled: boolean;
  is_default: boolean;
  config: Record<string, any>;
}

const emptyRows = (): Record<CourierId, Row> => ({
  steadfast: { enabled: false, is_default: false, config: {} },
  pathao: { enabled: false, is_default: false, config: {} },
  redx: { enabled: false, is_default: false, config: {} },
  carrybee: { enabled: false, is_default: false, config: {} },
});

/* ------------------------------------------------------------------ */
/* Settings tab                                                        */
/* ------------------------------------------------------------------ */
export const CourierSettings: React.FC<{ showToast: (m: string) => void }> = ({ showToast }) => {
  const [rows, setRows] = useState<Record<CourierId, Row>>(emptyRows());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('courier_settings').select('*');
      if (error) showToast('কুরিয়ার সেটিংস লোড হয়নি: ' + error.message);
      const next = emptyRows();
      (data || []).forEach((r: any) => {
        next[r.provider as CourierId] = { enabled: r.enabled, is_default: r.is_default, config: r.config || {} };
      });
      setRows(next);
      setLoading(false);
    })();
  }, []);

  const patch = (id: CourierId, p: Partial<Row>) => setRows((r) => ({ ...r, [id]: { ...r[id], ...p } }));
  const setField = (id: CourierId, key: string, value: any) =>
    setRows((r) => ({ ...r, [id]: { ...r[id], config: { ...r[id].config, [key]: value } } }));

  const setDefault = (id: CourierId) =>
    setRows((r) => {
      const n = { ...r };
      (Object.keys(n) as CourierId[]).forEach((k) => (n[k] = { ...n[k], is_default: k === id }));
      return n;
    });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = (Object.keys(rows) as CourierId[]).map((id) => ({
      provider: id,
      enabled: rows[id].enabled,
      is_default: rows[id].is_default,
      config: Object.fromEntries(
        Object.entries(rows[id].config).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
      ),
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('courier_settings').upsert(payload, { onConflict: 'provider' });
    setSaving(false);
    showToast(error ? 'সেভ ব্যর্থ: ' + error.message : '✓ কুরিয়ার সেটিংস সেভ হয়েছে!');
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#185824]" />
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-4 sm:space-y-6">
      <div className="bg-emerald-50/50 p-4 sm:p-5 rounded-2xl border border-emerald-200 space-y-1">
        <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
          <Truck className="w-4 h-4 text-[#185824]" />
          <span>কুরিয়ার API ইন্টিগ্রেশন</span>
        </h3>
        <p className="text-[11px] text-gray-500 leading-relaxed">
          যে কুরিয়ারগুলো ব্যবহার করবেন সেগুলোর API তথ্য দিয়ে চালু করুন। একটিকে ডিফল্ট করলে অর্ডার কার্ডের এক ক্লিকেই
          সেই কুরিয়ারে অর্ডার চলে যাবে এবং ট্র্যাকিং কোড নিজে থেকে বসে যাবে।
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
        {PROVIDERS.map((p) => {
          const row = rows[p.id];
          return (
            <div
              key={p.id}
              className={`p-4 sm:p-5 rounded-2xl border bg-white space-y-3 min-w-0 ${
                row.enabled ? 'border-emerald-300' : 'border-gray-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-black text-gray-900">{p.name}</h4>
                <div className="flex items-center gap-3">
                  {row.enabled && (
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="default-courier"
                        checked={row.is_default}
                        onChange={() => setDefault(p.id)}
                        className="accent-[#185824]"
                      />
                      ডিফল্ট
                    </label>
                  )}
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(e) => patch(p.id, { enabled: e.target.checked })}
                      className="w-4 h-4 accent-[#185824]"
                    />
                    চালু
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {p.fields.map((f) => {
                  const k = `${p.id}.${f.key}`;
                  if (f.type === 'checkbox') {
                    return (
                      <label
                        key={k}
                        className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer sm:col-span-2"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(row.config[f.key])}
                          onChange={(e) => setField(p.id, f.key, e.target.checked)}
                          className="w-4 h-4 accent-[#185824]"
                        />
                        {f.label}
                      </label>
                    );
                  }
                  const show = !f.secret || revealed[k];
                  return (
                    <div key={k} className="min-w-0">
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">{f.label}</label>
                      <div className="relative">
                        <input
                          type={show ? 'text' : 'password'}
                          value={row.config[f.key] || ''}
                          onChange={(e) => setField(p.id, f.key, e.target.value)}
                          placeholder={f.placeholder}
                          autoComplete="off"
                          className="w-full px-3 py-2.5 sm:py-2 pr-9 bg-white border border-emerald-200 rounded-xl text-base sm:text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-[#185824]"
                        />
                        {f.secret && (
                          <button
                            type="button"
                            onClick={() => setRevealed((r) => ({ ...r, [k]: !r[k] }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                            aria-label="দেখান/লুকান"
                          >
                            {revealed[k] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-500">{p.hint}</p>
            </div>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full sm:w-auto py-3 px-6 bg-[#1F1F24] hover:bg-black disabled:opacity-60 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        <span>কুরিয়ার সেটিংস সেভ করুন</span>
      </button>
    </form>
  );
};

/* ------------------------------------------------------------------ */
/* One-click send button (অর্ডার কার্ডে বসবে)                          */
/* ------------------------------------------------------------------ */
const LABELS: Record<CourierId, string> = {
  steadfast: 'Steadfast',
  pathao: 'Pathao',
  redx: 'RedX',
  carrybee: 'CarryBee',
};

export const SendToCourierButton: React.FC<{
  order: Order;
  onSent: (trackingId: string, provider: CourierId) => void;
  showToast: (m: string) => void;
}> = ({ order, onSent, showToast }) => {
  const [enabled, setEnabled] = useState<{ id: CourierId; is_default: boolean }[]>([]);
  const [selected, setSelected] = useState<CourierId | ''>('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('courier_settings').select('provider,is_default').eq('enabled', true);
      const list = (data || []).map((r: any) => ({ id: r.provider as CourierId, is_default: r.is_default }));
      setEnabled(list);
      setSelected((list.find((l) => l.is_default) || list[0])?.id || '');
    })();
  }, []);

  if (enabled.length === 0) return null;

  if (order.courier_tracking_id) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-2 rounded-xl">
        <Check className="w-3.5 h-3.5" /> কুরিয়ারে পাঠানো হয়েছে
      </span>
    );
  }

  const send = async () => {
    if (!selected || sending) return;
    setSending(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch('/.netlify/functions/send-courier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sess.session?.access_token || ''}`,
        },
        body: JSON.stringify({
          provider: selected,
          order: {
            order_number: order.order_number,
            customer_name: order.customer_name,
            phone: order.phone,
            address: order.address,
            total: order.total,
            items: order.items.map((i) => ({ product_name: i.product_name, quantity: i.quantity })),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.trackingId) throw new Error(data.error || 'কুরিয়ারে পাঠানো যায়নি');
      onSent(data.trackingId, selected);
      showToast(`✓ ${LABELS[selected]} এ পাঠানো হয়েছে (${data.trackingId})`);
    } catch (e: any) {
      showToast(`কুরিয়ার ত্রুটি: ${e?.message || 'অজানা সমস্যা'}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-1 sm:flex-none min-w-[200px]">
      {enabled.length > 1 && (
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value as CourierId)}
          className="text-xs font-bold bg-white border border-emerald-200 rounded-xl px-2 py-2 text-gray-900 cursor-pointer"
        >
          {enabled.map((c) => (
            <option key={c.id} value={c.id}>
              {LABELS[c.id]}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={send}
        disabled={sending}
        className="flex-1 sm:flex-none px-3 py-2 bg-[#185824] hover:bg-[#12431C] disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
      >
        {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        <span>{sending ? 'পাঠানো হচ্ছে...' : `${selected ? LABELS[selected] : ''} এ পাঠান`}</span>
      </button>
    </div>
  );
};