import { useEffect, useMemo, useRef, useState } from 'react';
import { AiOutlineMail, AiOutlinePlus, AiOutlineSearch, AiOutlineSend, AiOutlineUser } from 'react-icons/ai';
import axios from '../utils/axiosConfig';

const roleNames = {
  admin: 'أدمن المنصة', administrator: 'مدير مجمع', supervisor: 'مشرف',
  teacher: 'معلم', parent: 'ولي أمر', parent_student: 'ولي أمر', student: 'طالب'
};

const recipientGroups = [
  { key: 'admin', label: 'أدمن المنصة', roles: ['admin'] },
  { key: 'administrator', label: 'مديرو المجمعات', roles: ['administrator'] },
  { key: 'supervisor', label: 'المشرفون', roles: ['supervisor'] },
  { key: 'teacher', label: 'المعلمون', roles: ['teacher'] },
  { key: 'student', label: 'الطلاب', roles: ['student'] },
  { key: 'parent', label: 'أولياء الأمور', roles: ['parent', 'parent_student'] },
];

export default function Messages() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [recipientGroup, setRecipientGroup] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const openedQueryContact = useRef(false);

  const loadLists = async () => {
    try {
      const [contactsRes, conversationsRes] = await Promise.all([
        axios.get('/api/messages/contacts'), axios.get('/api/messages/conversations')
      ]);
      setContacts(contactsRes.data.contacts || []);
      setConversations(conversationsRes.data.conversations || []);
    } catch (err) {
      setError(err.response?.data?.error || 'فشل تحميل الرسائل');
    } finally { setLoading(false); }
  };

  const openConversation = async (contact) => {
    setSelected(contact);
    setShowNew(false);
    setError('');
    try {
      const response = await axios.get(`/api/messages/thread/${contact.id}`, { params: { limit: 100 } });
      setMessages(response.data.messages || []);
      await axios.patch(`/api/messages/thread/${contact.id}/read`);
      loadLists();
    } catch (err) { setError(err.response?.data?.error || 'فشل فتح المحادثة'); }
  };

  useEffect(() => { loadLists(); }, []);
  useEffect(() => {
    if (openedQueryContact.current) return;
    const contactId = new URLSearchParams(window.location.search).get('contact');
    if (!contactId) return;
    const contact = [...contacts, ...conversations].find((item) => String(item.id) === String(contactId));
    if (contact) {
      openedQueryContact.current = true;
      openConversation(contact);
    }
  }, [contacts, conversations]);
  useEffect(() => {
    if (!selected) return undefined;
    const timer = setInterval(() => openConversation(selected), 20000);
    return () => clearInterval(timer);
  }, [selected?.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (event) => {
    event.preventDefault();
    if (!selected || !body.trim()) return;
    try {
      setSending(true);
      const response = await axios.post('/api/messages', { recipient_id: selected.id, body });
      setMessages((current) => [...current, response.data.message]);
      setBody('');
      loadLists();
    } catch (err) { setError(err.response?.data?.error || 'فشل إرسال الرسالة'); }
    finally { setSending(false); }
  };

  const displayedConversations = useMemo(() => conversations.filter((item) =>
    item.name?.toLowerCase().includes(search.toLowerCase())
  ), [conversations, search]);
  const displayedContacts = useMemo(() => {
    const group = recipientGroups.find((item) => item.key === recipientGroup);
    return contacts.filter((item) =>
      (!group || group.roles.includes(item.role)) &&
      item.name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [contacts, search, recipientGroup]);

  return (
    <div className="mx-auto max-w-7xl p-3 sm:p-6" dir="rtl">
      <div className="mb-5 flex items-center justify-between">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800"><AiOutlineMail className="text-teal-600" /> الرسائل</h1><p className="text-sm text-gray-500">تواصل داخلي آمن داخل المنصة</p></div>
        <button onClick={() => { setShowNew(true); setSelected(null); setRecipientGroup(''); setSearch(''); }} className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-white shadow hover:bg-teal-700"><AiOutlinePlus /> رسالة جديدة</button>
      </div>
      {error && <div className="mb-3 rounded-xl bg-red-50 p-3 text-red-700">{error}</div>}
      <div className="grid min-h-[65vh] overflow-hidden rounded-2xl border bg-white shadow-lg md:grid-cols-[340px_1fr]">
        <aside className="border-l bg-gray-50/70 p-3">
          {showNew && (
            <div className="mb-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-700">إرسال إلى</p>
                {recipientGroup && <button onClick={() => setRecipientGroup('')} className="text-xs text-teal-700 hover:underline">كل الفئات</button>}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {recipientGroups.map((group) => {
                  const count = contacts.filter((contact) => group.roles.includes(contact.role)).length;
                  return (
                    <button
                      key={group.key}
                      onClick={() => { setRecipientGroup(group.key); setSearch(''); }}
                      className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${recipientGroup === group.key ? 'border-teal-600 bg-teal-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-teal-300 hover:bg-teal-50'}`}
                    >
                      <span className="block">{group.label}</span>
                      <span className="mt-0.5 block text-[10px] opacity-70">{count} متاح</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="relative mb-3"><AiOutlineSearch className="absolute right-3 top-3 text-gray-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم" className="w-full rounded-xl border bg-white py-2.5 pr-9 pl-3 outline-none focus:ring-2 focus:ring-teal-200" /></div>
          <div className="max-h-[58vh] space-y-1 overflow-y-auto">
            {loading ? <p className="p-4 text-center text-gray-500">جاري التحميل...</p> : showNew && !recipientGroup ? (
              <p className="p-5 text-center text-sm text-gray-500">اختر فئة المستلم أولًا لعرض الأسماء</p>
            ) : (showNew ? displayedContacts : displayedConversations).length === 0 ? (
              <p className="p-5 text-center text-sm text-gray-500">لا توجد أسماء متاحة في هذه الفئة</p>
            ) : (showNew ? displayedContacts : displayedConversations).map((item) => (
              <button key={item.id} onClick={() => openConversation(item)} className={`w-full rounded-xl p-3 text-right transition ${String(selected?.id) === String(item.id) ? 'bg-teal-600 text-white' : 'hover:bg-white hover:shadow-sm'}`}>
                <div className="flex items-center gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${String(selected?.id) === String(item.id) ? 'bg-white/20' : 'bg-teal-100 text-teal-700'}`}><AiOutlineUser /></span><span className="min-w-0 flex-1"><span className="block truncate font-bold">{item.name}</span><span className="block truncate text-xs opacity-70">{showNew ? roleNames[item.role] || item.role : item.last_message}</span></span>{!showNew && item.unread_count > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">{item.unread_count}</span>}</div>
              </button>
            ))}
          </div>
        </aside>
        <section className="flex min-h-[65vh] flex-col">
          {!selected ? <div className="grid flex-1 place-items-center p-8 text-center text-gray-400"><div><AiOutlineMail className="mx-auto mb-3 text-6xl text-teal-100" /><p className="font-medium">اختر محادثة أو ابدأ رسالة جديدة</p></div></div> : <>
            <header className="border-b p-4"><h2 className="font-bold text-gray-800">{selected.name}</h2><p className="text-xs text-gray-500">{roleNames[selected.role] || selected.role}</p></header>
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
              {messages.map((message) => { const mine = String(message.sender_id) === String(user.id); return <div key={message.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}><div className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${mine ? 'rounded-tr-sm bg-teal-600 text-white' : 'rounded-tl-sm border bg-white text-gray-800'}`}><p className="whitespace-pre-wrap break-words">{message.body}</p><p className="mt-1 text-[10px] opacity-60">{new Date(message.created_at).toLocaleString('ar-SA')}</p></div></div>; })}
              <div ref={endRef} />
            </div>
            <form onSubmit={send} className="flex gap-2 border-t bg-white p-3"><textarea value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }} rows="1" maxLength="4000" placeholder="اكتب رسالتك..." className="min-h-11 flex-1 resize-none rounded-xl border p-3 outline-none focus:ring-2 focus:ring-teal-200" /><button disabled={sending || !body.trim()} className="grid h-11 w-12 place-items-center rounded-xl bg-teal-600 text-xl text-white hover:bg-teal-700 disabled:opacity-40"><AiOutlineSend /></button></form>
          </>}
        </section>
      </div>
    </div>
  );
}
