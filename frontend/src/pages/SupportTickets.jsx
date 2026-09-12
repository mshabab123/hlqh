import { useEffect, useRef, useState } from 'react';
import { AiOutlineBug, AiOutlinePlus, AiOutlineSend, AiOutlineClose } from 'react-icons/ai';
import axios from '../utils/axiosConfig';

const statusInfo = {
  open: ['جديدة', 'bg-red-100 text-red-700'], in_progress: ['قيد المعالجة', 'bg-amber-100 text-amber-700'],
  resolved: ['تم الحل', 'bg-green-100 text-green-700'], closed: ['مغلقة', 'bg-gray-100 text-gray-600']
};

export default function SupportTickets() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ subject: '', body: '' });
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const openedQueryTicket = useRef(false);

  const loadTickets = async () => {
    try { const res = await axios.get('/api/support-tickets'); setTickets(res.data.tickets || []); }
    catch (err) { setError(err.response?.data?.error || 'فشل تحميل المشكلات'); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadTickets(); }, []);

  const openTicket = async (ticket) => {
    setSelected(ticket); setError('');
    try { const res = await axios.get(`/api/support-tickets/${ticket.id}/messages`); setMessages(res.data.messages || []); }
    catch (err) { setError(err.response?.data?.error || 'فشل فتح المشكلة'); }
  };

  useEffect(() => {
    if (openedQueryTicket.current || tickets.length === 0) return;
    const ticketId = new URLSearchParams(window.location.search).get('ticket');
    if (!ticketId) return;
    const ticket = tickets.find((item) => String(item.id) === String(ticketId));
    if (ticket) {
      openedQueryTicket.current = true;
      openTicket(ticket);
    }
  }, [tickets]);

  const createTicket = async (event) => {
    event.preventDefault();
    try { setSaving(true); setError(''); const res = await axios.post('/api/support-tickets', form); setShowCreate(false); setForm({ subject: '', body: '' }); await loadTickets(); openTicket(res.data.ticket); }
    catch (err) { setError(err.response?.data?.error || 'فشل رفع المشكلة'); }
    finally { setSaving(false); }
  };

  const sendReply = async (event) => {
    event.preventDefault(); if (!reply.trim()) return;
    try { setSaving(true); const res = await axios.post(`/api/support-tickets/${selected.id}/messages`, { body: reply }); setMessages((items) => [...items, { ...res.data.message, sender_name: user.first_name, sender_role: user.role }]); setReply(''); loadTickets(); }
    catch (err) { setError(err.response?.data?.error || 'فشل إرسال الرد'); }
    finally { setSaving(false); }
  };

  const changeStatus = async (status) => {
    try { const res = await axios.patch(`/api/support-tickets/${selected.id}/status`, { status }); setSelected(res.data.ticket); loadTickets(); }
    catch (err) { setError(err.response?.data?.error || 'فشل تغيير الحالة'); }
  };

  return <div className="mx-auto max-w-7xl p-3 sm:p-6" dir="rtl">
    <div className="mb-5 flex items-center justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-bold"><AiOutlineBug className="text-orange-600" /> الدعم الفني</h1><p className="text-sm text-gray-500">ارفع مشكلة تقنية وستصل مباشرة إلى أدمن المنصة</p></div><button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-white shadow hover:bg-orange-700"><AiOutlinePlus /> رفع مشكلة</button></div>
    {error && <div className="mb-3 rounded-xl bg-red-50 p-3 text-red-700">{error}</div>}
    <div className="grid min-h-[65vh] overflow-hidden rounded-2xl border bg-white shadow-lg md:grid-cols-[340px_1fr]">
      <aside className="border-l bg-gray-50 p-3"><h2 className="mb-3 font-bold">{user.role === 'admin' ? 'جميع المشكلات' : 'مشكلاتي التقنية'}</h2><div className="max-h-[60vh] space-y-2 overflow-y-auto">{loading ? <p className="p-4 text-center text-gray-500">جاري التحميل...</p> : tickets.length === 0 ? <p className="p-4 text-center text-gray-500">لا توجد مشكلات مرفوعة</p> : tickets.map((ticket) => { const info=statusInfo[ticket.status]||statusInfo.open; return <button key={ticket.id} onClick={() => openTicket(ticket)} className={`w-full rounded-xl border p-3 text-right transition hover:shadow ${selected?.id===ticket.id?'border-orange-400 bg-orange-50':'bg-white'}`}><div className="mb-1 flex items-center justify-between gap-2"><span className="truncate font-bold">#{ticket.id} {ticket.subject}</span><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${info[1]}`}>{info[0]}</span></div>{user.role==='admin'&&<p className="text-xs text-gray-500">من: {ticket.creator_name}</p>}<p className="mt-1 text-[10px] text-gray-400">{new Date(ticket.updated_at).toLocaleString('ar-SA')}</p></button>; })}</div></aside>
      <section className="flex min-h-[65vh] flex-col">{!selected?<div className="grid flex-1 place-items-center text-center text-gray-400"><div><AiOutlineBug className="mx-auto mb-3 text-6xl text-orange-100"/><p>اختر مشكلة لعرض تفاصيلها</p></div></div>:<><header className="flex items-center justify-between border-b p-4"><div><h2 className="font-bold">#{selected.id} {selected.subject}</h2><p className="text-xs text-gray-500">{selected.creator_name}</p></div>{user.role==='admin'&&<select value={selected.status} onChange={(e)=>changeStatus(e.target.value)} className="rounded-lg border px-3 py-2 text-sm"><option value="open">جديدة</option><option value="in_progress">قيد المعالجة</option><option value="resolved">تم الحل</option><option value="closed">مغلقة</option></select>}</header><div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">{messages.map((message)=>{const mine=String(message.sender_id)===String(user.id);return <div key={message.id} className={`flex ${mine?'justify-start':'justify-end'}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${mine?'bg-orange-600 text-white':'border bg-white'}`}><p className="mb-1 text-xs font-bold opacity-70">{message.sender_name}</p><p className="whitespace-pre-wrap">{message.body}</p><p className="mt-1 text-[10px] opacity-60">{new Date(message.created_at).toLocaleString('ar-SA')}</p></div></div>})}</div><form onSubmit={sendReply} className="flex gap-2 border-t p-3"><textarea value={reply} onChange={(e)=>setReply(e.target.value)} maxLength="4000" placeholder="اكتب ردك..." className="min-h-11 flex-1 resize-none rounded-xl border p-3 outline-none focus:ring-2 focus:ring-orange-200"/><button disabled={saving||!reply.trim()} className="grid h-11 w-12 place-items-center rounded-xl bg-orange-600 text-xl text-white disabled:opacity-40"><AiOutlineSend/></button></form></>}</section>
    </div>
    {showCreate&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><form onSubmit={createTicket} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-bold">رفع مشكلة تقنية</h2><p className="text-sm text-gray-500">ستُرسل مباشرة إلى أدمن المنصة</p></div><button type="button" onClick={()=>setShowCreate(false)} className="p-2 text-gray-500"><AiOutlineClose/></button></div><label className="mb-1 block text-sm font-bold">عنوان المشكلة</label><input value={form.subject} onChange={(e)=>setForm({...form,subject:e.target.value})} maxLength="200" required className="mb-4 w-full rounded-xl border p-3" placeholder="مثال: لا تظهر درجات الطلاب"/><label className="mb-1 block text-sm font-bold">وصف المشكلة</label><textarea value={form.body} onChange={(e)=>setForm({...form,body:e.target.value})} maxLength="4000" required rows="6" className="w-full rounded-xl border p-3" placeholder="اشرح الخطوات التي أدت إلى المشكلة وما الذي ظهر لك"/><button disabled={saving} className="mt-4 w-full rounded-xl bg-orange-600 py-3 font-bold text-white disabled:opacity-50">{saving?'جاري الإرسال...':'إرسال إلى أدمن المنصة'}</button></form></div>}
  </div>;
}
