import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { createClient, type User } from '@supabase/supabase-js'
import { MessageCircle, Search, Plus, Send, Paperclip, Image as ImageIcon, LogOut, Users, ArrowRight, X, CheckCheck, Settings } from 'lucide-react'
import Extras from './Extras'

const SUPABASE_URL = 'https://gegkwtxpygtfzyhnnrgv.supabase.co'
const SUPABASE_KEY = 'sb_publishable_fyidvtGSXVDcZS5U5BQbSg_t_8FYYNO'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

type Profile = { id: string; username: string; display_name: string; avatar_url: string | null; email_visible: boolean }
type Conversation = { id: string; title: string | null; is_group: boolean; created_at: string }
type Message = { id: string; conversation_id: string; sender_id: string; body: string; attachment_path: string | null; attachment_name: string | null; created_at: string }

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [authError, setAuthError] = useState('')
  const [busy, setBusy] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [groupMode, setGroupMode] = useState(false)
  const [groupTitle, setGroupTitle] = useState('')
  const [groupUsers, setGroupUsers] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [notice, setNotice] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const filtered = useMemo(() => conversations.filter(c => (c.title || 'گفت‌وگوی خصوصی').toLowerCase().includes(search.toLowerCase())), [conversations, search])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) { setOnlineUserIds([]); return }
    const channel = supabase.channel('kimi:online', {
      config: { private: true, presence: { key: user.id } },
    })
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const ids = Object.values(state).flatMap((items: any[]) => items.map(item => item.user_id as string))
      setOnlineUserIds([...new Set(ids)])
    }).subscribe(status => {
      if (status === 'SUBSCRIBED') {
        void channel.track({ user_id: user.id, online_at: new Date().toISOString() })
      }
    })
    return () => { void supabase.removeChannel(channel) }
  }, [user?.id])

  useEffect(() => {
    if (!user) { setProfile(null); setConversations([]); setSelected(null); return }
    loadProfile()
    loadConversations()
  }, [user])

  useEffect(() => {
    if (!selected || !user) { setMessages([]); return }
    loadMessages(selected.id)
    const channel = supabase.channel('messages:' + selected.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + selected.id }, () => loadMessages(selected.id))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selected?.id, user?.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadProfile() {
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (data) setProfile(data)
    else {
      const fallback = (user.user_metadata?.username || user.email?.split('@')[0] || 'kimi_user').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'kimi_user'
      const { data: created } = await supabase.from('profiles').upsert({ id: user.id, username: fallback + (user.user_metadata?.username ? '' : '_' + user.id.slice(0, 4)), display_name: user.user_metadata?.display_name || fallback }, { onConflict: 'id' }).select().single()
      if (created) setProfile(created)
    }
  }

  async function loadConversations() {
    const { data: memberships } = await supabase.from('conversation_members').select('conversation_id').order('joined_at', { ascending: false })
    if (!memberships?.length) { setConversations([]); return }
    const ids = memberships.map(m => m.conversation_id)
    const { data } = await supabase.from('conversations').select('*').in('id', ids).order('created_at', { ascending: false })
    setConversations(data || [])
  }

  async function loadMessages(id: string) {
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', id).order('created_at', { ascending: true }).limit(100)
    setMessages(data || [])
  }

  function cleanUsername(value: string) {
    return value.trim().replace(/^@/, '').toLowerCase()
  }

  async function authenticate(e: FormEvent) {
    e.preventDefault(); setBusy(true); setAuthError('')
    try {
      const cleanEmail = email.trim().toLowerCase()
      const cleanPhone = phone.trim()
      if (authMode === 'signup') {
        if (!username.trim().startsWith('@')) throw new Error('نام کاربری باید با @ شروع شود؛ مثل @kkkkk.')
        const clean = cleanUsername(username)
        if (!/^[a-z0-9_]{3,24}$/.test(clean)) throw new Error('نام کاربری باید با @ شروع شود و ۳ تا ۲۴ حرف انگلیسی کوچک، عدد یا _ داشته باشد؛ مثل @kkkkk.')
        if (!/^\+?[0-9]{8,15}$/.test(cleanPhone.replace(/[\s()-]/g, ''))) throw new Error('شماره موبایل را با کد کشور وارد کن.')
        const { error } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: { shouldCreateUser: true, data: { username: clean, display_name: displayName.trim() || clean, phone: cleanPhone } }
        })
        if (error) throw error
        setUsername(clean)
        setOtpSent(true)
        setAuthError('کد ۶ رقمی به ایمیلت فرستاده شد. صندوق ورودی و پوشه هرزنامه را بررسی کن.')
      } else {
        const { error } = await supabase.auth.signInWithOtp({ email: cleanEmail, options: { shouldCreateUser: false } })
        if (error) throw error
        setOtpSent(true)
        setAuthError('کد ورود ۶ رقمی به ایمیلت فرستاده شد.')
      }
    } catch (err) { setAuthError(err instanceof Error ? err.message : 'ارسال کد ایمیل ناموفق بود.') }
    finally { setBusy(false) }
  }

  async function verifyEmailOtp(e: FormEvent) {
    e.preventDefault(); setBusy(true); setAuthError('')
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: otp.trim(), type: 'email' })
      if (error) throw error
      if (data.user && authMode === 'signup') {
        const clean = cleanUsername(username)
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id, username: clean, display_name: displayName.trim() || clean, email_visible: false
        }, { onConflict: 'id' })
        if (profileError) throw profileError
      }
    } catch (err) { setAuthError(err instanceof Error ? err.message : 'کد تأیید نامعتبر است.') }
    finally { setBusy(false) }
  }

  async function toggleEmailVisibility(visible: boolean) {
    if (!user) return
    const { error } = await supabase.from('profiles').update({ email_visible: visible }).eq('id', user.id)
    if (error) { setNotice(error.message); return }
    setProfile(current => current ? { ...current, email_visible: visible } : current)
  }

  async function createDirect(e: FormEvent) {
    e.preventDefault(); if (!user || !newUsername.trim()) return
    setBusy(true); setNotice('')
    try {
      const targetUsername = cleanUsername(newUsername)
      const { data: target, error: findError } = await supabase.from('profiles').select('id, username, display_name').eq('username', targetUsername).single()
      if (findError || !target) throw new Error('این نام کاربری پیدا نشد.')
      if (target.id === user.id) throw new Error('نمی‌توانی با خودت گفت‌وگو بسازی.')
      const { data: existing } = await supabase.from('conversation_members').select('conversation_id').eq('user_id', user.id)
      const ids = (existing || []).map(x => x.conversation_id)
      if (ids.length) {
        const { data: matches } = await supabase.from('conversation_members').select('conversation_id').eq('user_id', target.id).in('conversation_id', ids)
        if (matches?.length) {
          const { data: c } = await supabase.from('conversations').select('*').eq('id', matches[0].conversation_id).single()
          if (c) { setSelected(c); setShowNew(false); setNewUsername(''); return }
        }
      }
      const { data: conv, error } = await supabase.from('conversations').insert({ created_by: user.id, is_group: false, title: target.display_name || target.username }).select().single()
      if (error || !conv) throw error || new Error('ساخت گفت‌وگو ناموفق بود.')
      const { error: memberError } = await supabase.from('conversation_members').insert([{ conversation_id: conv.id, user_id: user.id }, { conversation_id: conv.id, user_id: target.id }])
      if (memberError) throw memberError
      setSelected(conv); setShowNew(false); setNewUsername(''); await loadConversations()
    } catch (err) { setNotice(err instanceof Error ? err.message : 'خطا در ساخت گفت‌وگو') }
    finally { setBusy(false) }
  }

  async function createGroup(e: FormEvent) {
    e.preventDefault(); if (!user || !groupTitle.trim()) return
    const names = [...new Set(groupUsers.split(',').map(cleanUsername).filter(Boolean))]
    if (!names.length) { setNotice('حداقل یک عضو وارد کن.'); return }
    setBusy(true); setNotice('')
    try {
      const { data: people, error: findError } = await supabase.from('profiles').select('id, username').in('username', names)
      if (findError) throw findError
      const found = people || []
      const missing = names.filter(n => !found.some(p => p.username === n))
      if (missing.length) throw new Error('نام کاربری پیدا نشد: ' + missing.join(', '))
      const { data: conv, error } = await supabase.from('conversations').insert({ created_by: user.id, is_group: true, title: groupTitle.trim() }).select().single()
      if (error || !conv) throw error || new Error('ساخت گروه ناموفق بود.')
      const ids = [...new Set([user.id, ...found.map(p => p.id)])]
      const { error: memberError } = await supabase.from('conversation_members').insert(ids.map(user_id => ({ conversation_id: conv.id, user_id })))
      if (memberError) throw memberError
      setSelected(conv); setShowNew(false); setGroupTitle(''); setGroupUsers(''); await loadConversations()
    } catch (err) { setNotice(err instanceof Error ? err.message : 'خطا در ساخت گروه') }
    finally { setBusy(false) }
  }
  async function sendMessage(e: FormEvent) {
    e.preventDefault(); if (!user || !selected || !draft.trim()) return
    const body = draft.trim(); setDraft('')
    const { error } = await supabase.from('messages').insert({ conversation_id: selected.id, sender_id: user.id, body })
    if (error) { setDraft(body); setNotice(error.message) } else loadMessages(selected.id)
  }

  async function uploadFile(file?: File) {
    if (!file || !user || !selected) return
    if (file.size > 20 * 1024 * 1024) { setNotice('حداکثر حجم فایل ۲۰ مگابایت است.'); return }
    const path = selected.id + '/' + user.id + '/' + crypto.randomUUID() + '-' + file.name
    const { error } = await supabase.storage.from('chat-files').upload(path, file)
    if (error) { setNotice(error.message); return }
    const { error: msgError } = await supabase.from('messages').insert({ conversation_id: selected.id, sender_id: user.id, body: '', attachment_path: path, attachment_name: file.name })
    if (msgError) setNotice(msgError.message); else loadMessages(selected.id)
  }

  async function attachmentUrl(path: string) {
    const { data } = await supabase.storage.from('chat-files').createSignedUrl(path, 3600)
    return data?.signedUrl
  }

  async function logout() { await supabase.auth.signOut() }

  if (!user) return <main className="auth-page"><section className="auth-card"><div className="brand-mark"><MessageCircle size={30} /></div><h1>Kimi</h1><p className="muted">پیام‌هایت، نزدیک‌تر از همیشه</p>
    <div className="mode-tabs"><button type="button" className={authMode === "login" ? "chosen" : ""} onClick={() => { setAuthMode("login"); setOtpSent(false); setOtp(""); setAuthError("") }}>ورود</button><button type="button" className={authMode === "signup" ? "chosen" : ""} onClick={() => { setAuthMode("signup"); setOtpSent(false); setOtp(""); setAuthError("") }}>ثبت‌نام</button></div>
    <form onSubmit={otpSent ? verifyEmailOtp : authenticate}>
      {authMode === "signup" && <>
        <label>نام نمایشی<input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="مثلاً محسن" /></label>
        <label>نام کاربری<input value={username} onChange={e => setUsername(e.target.value)} placeholder="@kkkkk" required disabled={otpSent} /></label>
        <label>شماره موبایل<input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+989121234567" required disabled={otpSent} /></label>
      </>}
      <label>ایمیل<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" required disabled={otpSent} /></label>
      {otpSent && <label>کد تأیید ایمیل<input inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={e => setOtp(e.target.value)} placeholder="کد ۶ رقمی" minLength={6} maxLength={6} required /></label>}
      {authError && <p className="error">{authError}</p>}
      <button className="primary full" disabled={busy || (otpSent && otp.trim().length !== 6)}>{busy ? "لطفاً صبر کن…" : otpSent ? "تأیید کد و ورود" : authMode === "login" ? "ارسال کد ورود به ایمیل" : "ارسال کد ثبت‌نام"}</button>
      {otpSent && <button type="button" className="link-button" onClick={() => { setOtpSent(false); setOtp(""); setAuthError("") }}>بازگشت و تغییر اطلاعات</button>}
    </form>
    <p className="tiny">ورود با ایمیل برای کاربران قبلی هم در دسترس است.</p></section></main>

  return <main className="app-shell">
    <aside className={'sidebar ' + (selected ? 'mobile-hidden' : '')}>
      <header className="side-header"><div className="brand"><span className="brand-mark small"><MessageCircle size={20}/></span><b>Kimi</b></div><button className="icon-button" title="گفت‌وگوی جدید" onClick={() => setShowNew(true)}><Plus/></button></header>
      <div className="profile-strip"><div className="avatar">{(profile?.display_name || user.email || 'K')[0].toUpperCase()}</div><div className="profile-info"><b>{profile?.display_name || 'کاربر Kimi'}</b><span>@{profile?.username || '...'}</span></div><button className="icon-button subtle" title="تنظیمات حریم خصوصی" onClick={() => setShowSettings(true)}><Settings size={18}/></button><button className="icon-button subtle" title="خروج" onClick={logout}><LogOut size={18}/></button></div>
      <div className="search-box"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="جست‌وجوی گفتگوها" /></div>\n      <Extras userId={user.id} onStartChat={(name) => { setNewUsername(name); setGroupMode(false); setShowNew(true) }} />
      <div className="list-heading">پیام‌ها <span>{conversations.length}</span></div>
      <div className="conversation-list">{filtered.map(c => <button key={c.id} className={'conversation ' + (selected?.id === c.id ? 'active' : '')} onClick={() => setSelected(c)}><div className="avatar chat-avatar">{c.is_group ? <Users size={19}/> : (c.title || 'K')[0]}</div><div className="conversation-meta"><b>{c.title || 'گفت‌وگوی خصوصی'}</b><span>{c.is_group ? 'گروه' : 'گفت‌وگوی خصوصی'}</span></div></button>)}{!filtered.length && <div className="empty-list">هنوز گفت‌وگویی نداری.<br/>برای شروع روی + بزن.</div>}</div>
    </aside>
    <section className={'chat-panel ' + (!selected ? 'mobile-hidden' : '')}>
      {selected ? <>
        <header className="chat-header"><button className="icon-button back-button" onClick={() => setSelected(null)}><ArrowRight/></button><div className="avatar chat-avatar">{selected.is_group ? <Users size={19}/> : (selected.title || 'K')[0]}</div><div className="chat-title"><b>{selected.title || 'گفت‌وگو'}</b><span>{onlineUserIds.length ? onlineUserIds.length + ' نفر آنلاین' : 'گفت‌وگوی Kimi'}</span></div></header>
        <div className="messages-area">{messages.map(m => <MessageBubble key={m.id} message={m} mine={m.sender_id === user.id} getUrl={attachmentUrl} />)}{!messages.length && <div className="welcome-chat"><div className="brand-mark"><MessageCircle size={26}/></div><b>گفت‌وگو را شروع کن</b><span>اولین پیام را برای این گفتگو بفرست.</span></div>}<div ref={bottomRef}/></div>
        <form className="composer" onSubmit={sendMessage}><label className="attach-button" title="ارسال فایل"><Paperclip size={20}/><input type="file" hidden onChange={e => uploadFile(e.target.files?.[0])}/></label><label className="attach-button image-attach" title="ارسال تصویر"><ImageIcon size={20}/><input type="file" accept="image/*" hidden onChange={e => uploadFile(e.target.files?.[0])}/></label><input value={draft} onChange={e => setDraft(e.target.value)} placeholder="پیامت را بنویس…" /><button className="send-button" disabled={!draft.trim()}><Send size={19}/></button></form>
      </> : <div className="welcome-screen"><div className="welcome-art"><MessageCircle size={52}/></div><h2>به Kimi خوش آمدی</h2><p>یک گفت‌وگو انتخاب کن یا پیام جدیدی شروع کن.</p><button className="primary" onClick={() => setShowNew(true)}><Plus size={18}/> شروع گفت‌وگوی جدید</button></div>}
    </section>
    {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><section className="modal" onClick={e => e.stopPropagation()}><div className="modal-head"><b>تنظیمات حریم خصوصی</b><button type="button" className="icon-button" onClick={() => setShowSettings(false)}><X/></button></div><label className="privacy-toggle"><input type="checkbox" checked={!!profile?.email_visible} onChange={e => void toggleEmailVisibility(e.target.checked)} /> نمایش ایمیل برای دیگر کاربران</label><p className="muted">ایمیل به‌صورت پیش‌فرض خصوصی است. فقط با روشن‌کردن این گزینه اجازه نمایش آن را می‌دهی.</p></section></div>}
    {showNew && <div className="modal-backdrop" onClick={() => setShowNew(false)}><form className="modal" onSubmit={groupMode ? createGroup : createDirect} onClick={e => e.stopPropagation()}><div className="modal-head"><b>گفت‌وگوی جدید</b><button type="button" className="icon-button" onClick={() => setShowNew(false)}><X/></button></div><div className="mode-tabs"><button type="button" className={!groupMode ? 'chosen' : ''} onClick={() => {setGroupMode(false);setNotice('')}}>خصوصی</button><button type="button" className={groupMode ? 'chosen' : ''} onClick={() => {setGroupMode(true);setNotice('')}}>گروهی</button></div>{groupMode ? <><label>نام گروه<input autoFocus value={groupTitle} onChange={e => setGroupTitle(e.target.value)} placeholder="دوستان" /></label><label>نام کاربری اعضا با کاما جدا شود<input value={groupUsers} onChange={e => setGroupUsers(e.target.value)} placeholder="@ali, @sara" /></label></> : <><p className="muted">نام کاربری شخص موردنظر را وارد کن.</p><label>نام کاربری<input autoFocus value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="@username" /></label></>}{notice && <p className="error">{notice}</p>}<button className="primary full" disabled={busy || (groupMode ? !groupTitle.trim() || !groupUsers.trim() : !newUsername.trim())}>{busy ? 'در حال ساخت…' : groupMode ? 'ساخت گروه' : 'شروع گفتگو'}</button></form></div>}
  </main>
}

function MessageBubble({ message, mine, getUrl }: { message: Message; mine: boolean; getUrl: (path: string) => Promise<string | undefined> }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => { if (message.attachment_path) getUrl(message.attachment_path).then(setUrl) }, [message.attachment_path])
  return <div className={'message-row ' + (mine ? 'mine' : '')}><div className="bubble">{message.body && <p>{message.body}</p>}{message.attachment_path && (url ? (message.attachment_name?.match(/\.(png|jpe?g|gif|webp)$/i) ? <a href={url} target="_blank" rel="noreferrer"><img className="attachment-image" src={url} alt={message.attachment_name}/></a> : <a className="file-link" href={url} target="_blank" rel="noreferrer">{message.attachment_name}</a>) : <span>در حال بارگذاری فایل…</span>)}<small>{new Date(message.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })} {mine && <CheckCheck size={13}/>}</small></div></div>
}