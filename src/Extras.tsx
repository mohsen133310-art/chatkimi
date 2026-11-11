import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Search, Users, Bot, Globe, X, Plus, Copy, ExternalLink, ArrowUpRight, UserPlus, Terminal, ShieldCheck } from 'lucide-react'

const supabase = createClient(
  'https://gegkwtxpygtfzyhnnrgv.supabase.co',
  'sb_publishable_fyidvtGSXVDcZS5U5BQbSg_t_8FYYNO'
)

type Person = { id: string; username: string; display_name: string; avatar_url: string | null }
type BotRecord = { id: string; owner_id: string; username: string; name: string; description: string; is_public: boolean }

export default function Extras({ userId, onStartChat }: { userId: string; onStartChat: (username: string) => void }) {
  const [panel, setPanel] = useState<'people' | 'bots' | 'browser' | null>(null)
  const [query, setQuery] = useState('')
  const [people, setPeople] = useState<Person[]>([])
  const [bots, setBots] = useState<BotRecord[]>([])
  const [botName, setBotName] = useState('')
  const [botUsername, setBotUsername] = useState('')
  const [botDescription, setBotDescription] = useState('')
  const [botToken, setBotToken] = useState('')
  const [botError, setBotError] = useState('')
  const [commandBot, setCommandBot] = useState<BotRecord | null>(null)
  const [command, setCommand] = useState('')
  const [commandDescription, setCommandDescription] = useState('')
  const [commandResponse, setCommandResponse] = useState('')
  const [commands, setCommands] = useState<any[]>([])
  const [browserUrl, setBrowserUrl] = useState('https://example.com')
  const [activeUrl, setActiveUrl] = useState('https://example.com')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (panel !== 'people' || query.trim().length < 2) { setPeople([]); return }
    let alive = true
    const run = async () => {
      const term = query.trim().replace(/[%_]/g, '')
      const { data } = await supabase.from('profiles').select('id,username,display_name,avatar_url')
        .or('username.ilike.%' + term + '%,display_name.ilike.%' + term + '%')
        .neq('id', userId).limit(20)
      if (alive) setPeople(data || [])
    }
    void run()
    return () => { alive = false }
  }, [query, panel, userId])

  useEffect(() => {
    if (panel !== 'bots') return
    void loadBots()
  }, [panel])

  async function loadBots() {
    const { data } = await supabase.from('bots').select('id,owner_id,username,name,description,is_public').order('created_at', { ascending: false }).limit(50)
    setBots(data || [])
  }

  async function createBot(e: FormEvent) {
    e.preventDefault()
    setBotError('')
    const username = botUsername.trim().replace(/^@/, '').toLowerCase()
    if (!/^[a-z0-9_]{5,24}$/.test(username) || !username.endsWith('bot')) {
      setBotError('نام ربات باید ۵ تا ۲۴ حرف کوچک انگلیسی، عدد یا _ باشد و به bot ختم شود.')
      return
    }
    const raw = 'kimi_' + Array.from(crypto.getRandomValues(new Uint8Array(28))).map(x => x.toString(16).padStart(2, '0')).join('')
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
    const hash = Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('')
    const { error } = await supabase.from('bots').insert({
      owner_id: userId, username, name: botName.trim(), description: botDescription.trim(), token_hash: hash, is_public: true
    })
    if (error) { setBotError(error.message); return }
    setBotToken(raw)
    setBotName(''); setBotUsername(''); setBotDescription('')
    await loadBots()
  }

  async function loadCommands(bot: BotRecord) {
    setCommandBot(bot)
    const { data } = await supabase.from('bot_commands').select('*').eq('bot_id', bot.id).order('command')
    setCommands(data || [])
  }

  async function addCommand(e: FormEvent) {
    e.preventDefault()
    if (!commandBot) return
    const clean = command.trim().replace(/^\//, '').toLowerCase()
    const { error } = await supabase.from('bot_commands').insert({
      bot_id: commandBot.id, command: clean, description: commandDescription.trim(), response: commandResponse.trim()
    })
    if (error) { setBotError(error.message); return }
    setCommand(''); setCommandDescription(''); setCommandResponse('')
    await loadCommands(commandBot)
  }

  async function addContact(person: Person) {
    const { error } = await supabase.from('contacts').upsert({ owner_id: userId, contact_id: person.id })
    if (error) { setBotError(error.message); return }
    onStartChat(person.username)
  }

  function openPanel(next: 'people' | 'bots' | 'browser') {
    setPanel(next)
    setBotError('')
    setBotToken('')
    setCommandBot(null)
  }

  return <>
    <div className="extras-nav">
      <button onClick={() => openPanel('people')}><Users size={17}/> پیدا کردن افراد</button>
      <button onClick={() => openPanel('bots')}><Bot size={17}/> ربات‌ها و KimiBotFather</button>
      <button onClick={() => openPanel('browser')}><Globe size={17}/> مرورگر داخلی</button>
    </div>
    {panel && <div className="extras-backdrop" onClick={() => setPanel(null)}>
      <section className="extras-panel" onClick={e => e.stopPropagation()}>
        <header className="extras-header">
          <div><span className="extras-icon">{panel === 'people' ? <Users/> : panel === 'bots' ? <Bot/> : <Globe/>}</span>
            <div><b>{panel === 'people' ? 'جست‌وجوی کاربران' : panel === 'bots' ? 'KimiBotFather' : 'مرورگر Kimi'}</b>
              <small>{panel === 'people' ? 'نام کاربری یا نام نمایشی را جست‌وجو کن' : panel === 'bots' ? 'ساخت و مدیریت ربات‌های اختصاصی' : 'مرور صفحات وب درون برنامه'}</small></div>
          </div>
          <button className="icon-button" onClick={() => setPanel(null)}><X/></button>
        </header>

        {panel === 'people' && <div className="extras-content">
          <div className="extras-search"><Search size={18}/><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="جست‌وجوی @username یا نام..." /></div>
          {query.trim().length < 2 ? <p className="extras-hint">برای پیدا کردن افراد، حداقل دو حرف بنویس.</p> :
            people.length ? people.map(person => <div className="person-result" key={person.id}>
              <div className="avatar">{(person.display_name || person.username)[0]}</div>
              <div className="person-meta"><b>{person.display_name || person.username}</b><span>@{person.username}</span></div>
              <button className="primary small" onClick={() => void addContact(person)}><UserPlus size={15}/> افزودن و گفتگو</button>
            </div>) : <p className="extras-hint">کاربری با این مشخصات پیدا نشد.</p>}
        </div>}

        {panel === 'bots' && <div className="extras-content">
          <div className="bot-intro"><Terminal size={22}/><div><b>BotFather مخصوص Kimi</b><p>ربات بساز، دستورهای اختصاصی تعریف کن و توکن دسترسی دریافت کن.</p></div></div>
          {botToken && <div className="token-card"><b><ShieldCheck size={16}/> توکن ربات ساخته شد</b><code>{botToken}</code><p>این توکن فقط همین بار نمایش داده می‌شود؛ آن را امن نگه دار.</p><button className="secondary" onClick={() => { void navigator.clipboard.writeText(botToken); setCopied(true) }}><Copy size={15}/>{copied ? 'کپی شد' : 'کپی توکن'}</button></div>}
          <form className="bot-create-form" onSubmit={createBot}>
            <b>ساخت ربات جدید</b>
            <label>نام ربات<input value={botName} onChange={e => setBotName(e.target.value)} placeholder="مثلاً دستیار اخبار" required /></label>
            <label>نام کاربری ربات<input value={botUsername} onChange={e => setBotUsername(e.target.value)} placeholder="news_helper_bot" required /></label>
            <label>توضیحات<input value={botDescription} onChange={e => setBotDescription(e.target.value)} placeholder="ربات من چه کاری انجام می‌دهد؟" /></label>
            {botError && <p className="error">{botError}</p>}
            <button className="primary" disabled={!botName.trim() || !botUsername.trim()}><Plus size={16}/> ساخت ربات</button>
          </form>
          {commandBot && <div className="commands-box">
            <div className="commands-head"><b>دستورهای @{commandBot.username}</b><button className="icon-button" onClick={() => setCommandBot(null)}><X size={17}/></button></div>
            <form onSubmit={addCommand}>
              <label>دستور<input value={command} onChange={e => setCommand(e.target.value)} placeholder="/start" required /></label>
              <label>توضیح<input value={commandDescription} onChange={e => setCommandDescription(e.target.value)} placeholder="شروع کار با ربات" /></label>
              <label>پاسخ متنی<input value={commandResponse} onChange={e => setCommandResponse(e.target.value)} placeholder="سلام! به ربات خوش آمدی." required /></label>
              <button className="primary small">افزودن دستور</button>
            </form>
            {commands.map(c => <div className="command-row" key={c.id}><code>/{c.command}</code><span>{c.description}</span></div>)}
          </div>}
          <div className="bot-list-heading">ربات‌های موجود</div>
          {bots.map(bot => <div className="bot-result" key={bot.id}>
            <div className="bot-avatar"><Bot size={20}/></div><div className="person-meta"><b>{bot.name}</b><span>@{bot.username} · {bot.owner_id === userId ? 'ساخته‌شده توسط تو' : 'ربات عمومی'}</span></div>
            {bot.owner_id === userId ? <button className="secondary small" onClick={() => void loadCommands(bot)}>دستورها</button> : <button className="secondary small" onClick={() => onStartChat(bot.username)}>مشاهده</button>}
          </div>)}
          {!bots.length && <p className="extras-hint">هنوز رباتی ثبت نشده است.</p>}
        </div>}

        {panel === 'browser' && <div className="browser-content">
          <form className="browser-toolbar" onSubmit={e => { e.preventDefault(); const raw = browserUrl.trim(); const safe = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw; setActiveUrl(safe) }}>
            <input value={browserUrl} onChange={e => setBrowserUrl(e.target.value)} placeholder="https://example.com"/>
            <button className="primary" aria-label="باز کردن صفحه"><ArrowUpRight size={18}/></button>
            <button type="button" className="secondary" onClick={() => window.open(activeUrl, '_blank', 'noopener,noreferrer')}><ExternalLink size={16}/></button>
          </form>
          <iframe title="مرورگر داخلی Kimi" src={activeUrl} sandbox="allow-forms allow-scripts allow-same-origin allow-popups" referrerPolicy="no-referrer" />
          <p className="browser-note">بعضی وب‌سایت‌ها اجازه نمایش داخل برنامه را نمی‌دهند؛ در آن حالت از دکمه بازکردن در مرورگر استفاده کن.</p>
        </div>}
      </section>
    </div>}
  </>
}
