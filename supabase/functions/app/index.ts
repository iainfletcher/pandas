// Serves the levelup app as a single self-contained page.
//
// verify_jwt is disabled deliberately: this endpoint returns a public HTML
// shell containing no secrets. The Supabase publishable key it embeds is
// designed to ship to browsers, and every table is guarded by row-level
// security keyed on auth.uid(), so the sign-in screen is the real boundary.
//
// The page is written without backticks or ${ } so it survives being embedded
// in this template literal unescaped.

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0b0f16">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="levelup">
<link rel="apple-touch-icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='112' fill='%230b0f16'/%3E%3Cpath d='M116 356 L212 260 L288 336 L410 172' fill='none' stroke='%235eead4' stroke-width='34' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='410' cy='172' r='30' fill='%235eead4'/%3E%3C/svg%3E">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='112' fill='%230b0f16'/%3E%3Cpath d='M116 356 L212 260 L288 336 L410 172' fill='none' stroke='%235eead4' stroke-width='34' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='410' cy='172' r='30' fill='%235eead4'/%3E%3C/svg%3E">
<title>levelup</title>
<script src="https://cdn.tailwindcss.com"></script>
<script>
tailwind.config = {
  theme: { extend: { colors: {
    ink: { 900:'#0b0f16', 800:'#111725', 700:'#182034', 600:'#212c45' },
    accent: { DEFAULT:'#5eead4', soft:'#2dd4bf' }
  } } }
};
</script>
<style>
  html { -webkit-text-size-adjust:100%; -webkit-tap-highlight-color:transparent; }
  body { background:#0b0f16; color:#e2e8f0; font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
  input,textarea { font-size:16px; }
  .card { background:#111725; border:1px solid rgba(255,255,255,.06); border-radius:1rem; }
  .field { width:100%; background:#182034; border:1px solid rgba(255,255,255,.06);
           border-radius:.75rem; padding:.625rem .75rem; color:#f1f5f9; }
  .field:focus { outline:none; border-color:#5eead4; }
  .field::placeholder { color:#64748b; }
  .btn { border-radius:.75rem; padding:.625rem 1rem; font-weight:500; }
  .btn-primary { background:#5eead4; color:#0b0f16; }
  .btn-ghost { background:#182034; color:#e2e8f0; }
  .chip { font-size:11px; text-transform:uppercase; letter-spacing:.05em;
          font-weight:600; padding:.125rem .5rem; border-radius:.375rem; }
  .safe-bottom { padding-bottom:calc(env(safe-area-inset-bottom) + .5rem); }
</style>
<script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
<script src="https://unpkg.com/@supabase/supabase-js@2"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
<div id="root" style="min-height:100dvh"></div>

<script type="text/babel" data-presets="react">
const { useState, useEffect } = React;

const db = supabase.createClient(
  "https://lhobanahrkcyrsotgriu.supabase.co",
  "sb_publishable_GF_4Nszm4tBb4ZLzP7zD_w_Ko3YI_Wx",
  { auth: { persistSession: true, autoRefreshToken: true, storageKey: "levelup-auth" } }
);

const PHASE_TONE = {
  decide: "text-amber-300 bg-amber-300/10",
  reposition: "text-sky-300 bg-sky-300/10",
  build: "text-accent bg-accent/10",
  market: "text-fuchsia-300 bg-fuchsia-300/10"
};
const ORDER = ["decide", "reposition", "build", "market"];

function todayISO() { return new Date().toISOString().slice(0, 10); }

function weekStart() {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function weeksBetween(a, b) {
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / 604800000));
}

function fmtHours(mins) {
  const h = mins / 60;
  return (h >= 10 || Number.isInteger(h)) ? h.toFixed(0) + "h" : h.toFixed(1) + "h";
}

function relDay(iso) {
  const diff = Math.round((new Date(todayISO()) - new Date(iso)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return diff + " days ago";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await db.auth.signInWithPassword({ email: email.trim(), password: pw });
    if (r.error) setErr(r.error.message);
    setBusy(false);
  }

  return (
    <div className="min-h-dvh grid place-items-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <div className="mb-8">
          <div className="text-accent text-3xl font-semibold">levelup</div>
          <p className="text-slate-400 text-sm mt-1.5">Senior Data Engineer to £100k+ remote.</p>
        </div>
        <input className="field" type="email" autoComplete="username" placeholder="Email"
               value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="field" type="password" autoComplete="current-password" placeholder="Password"
               value={pw} onChange={e => setPw(e.target.value)} required />
        {err ? <p className="text-rose-400 text-sm">{err}</p> : null}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function Today({ go }) {
  const [profile, setProfile] = useState(null);
  const [next, setNext] = useState([]);
  const [weekMins, setWeekMins] = useState(0);
  const [totals, setTotals] = useState({ done: 0, all: 0 });
  const [hrs, setHrs] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    const p = await db.from("profile").select("*").maybeSingle();
    const t = await db.from("tasks").select("*").neq("status", "done").neq("status", "skipped");
    const l = await db.from("work_log").select("minutes").gte("logged_on", weekStart());
    const c = await db.from("tasks").select("status");
    setProfile(p.data);
    const sorted = (t.data || []).sort((a, b) =>
      ORDER.indexOf(a.phase_key) - ORDER.indexOf(b.phase_key) || a.position - b.position);
    setNext(sorted.slice(0, 3));
    setWeekMins((l.data || []).reduce((s, r) => s + r.minutes, 0));
    setTotals({
      done: (c.data || []).filter(x => x.status === "done").length,
      all: (c.data || []).length
    });
  }

  useEffect(() => { load(); }, []);

  async function logWork(e) {
    e.preventDefault();
    const n = parseFloat(hrs);
    if (!n || n <= 0) return;
    await db.from("work_log").insert({
      minutes: Math.round(n * 60), note: note.trim() || null, logged_on: todayISO()
    });
    setHrs(""); setNote(""); load();
  }

  async function done(id) {
    await db.from("tasks").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", id);
    load();
  }

  const weeksLeft = profile ? weeksBetween(todayISO(), profile.target_date) : null;
  const target = profile ? (profile.weekly_hours_min + profile.weekly_hours_max) / 2 : 6.5;
  const pct = Math.min(100, Math.round((weekMins / 60 / target) * 100));
  const h = new Date().getHours();
  const greet = h < 12 ? "Morning" : (h < 18 ? "Afternoon" : "Evening");

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-white">{greet}, Iain</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {weeksLeft === null ? "Loading..." : weeksLeft + " weeks left on the runway"}
        </p>
      </header>

      {profile && !profile.chosen_path ? (
        <div className="card p-4" style={{ borderColor: "rgba(252,211,77,.25)", background: "rgba(252,211,77,.05)" }}>
          <div className="chip text-amber-300 bg-amber-300/10 inline-block mb-2">Blocking</div>
          <p className="text-sm text-slate-300 leading-relaxed">
            You have not committed to a direction yet. Everything after the first phase
            is blocked on it, and it gets expensive if it drifts past month two.
            Work the Decide tasks first.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="text-slate-400 text-xs uppercase tracking-wider">This week</div>
          <div className="text-2xl font-semibold text-white mt-1.5">{fmtHours(weekMins)}</div>
          <div className="h-1.5 bg-ink-600 rounded-full mt-2.5 overflow-hidden">
            <div className="h-full bg-accent rounded-full" style={{ width: pct + "%" }} />
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5">target {target}h</div>
        </div>
        <div className="card p-4">
          <div className="text-slate-400 text-xs uppercase tracking-wider">Tasks done</div>
          <div className="text-2xl font-semibold text-white mt-1.5">
            {totals.done}<span className="text-slate-500 text-base font-normal">/{totals.all}</span>
          </div>
          <div className="h-1.5 bg-ink-600 rounded-full mt-2.5 overflow-hidden">
            <div className="h-full bg-sky-400 rounded-full"
                 style={{ width: (totals.all ? (totals.done / totals.all) * 100 : 0) + "%" }} />
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5">across all phases</div>
        </div>
      </div>

      <section>
        <div className="flex items-baseline justify-between mb-2.5">
          <h2 className="font-semibold text-white">Do next</h2>
          <button onClick={() => go("plan")} className="text-xs text-accent font-medium">Full plan</button>
        </div>
        <div className="space-y-2.5">
          {next.length === 0 ? (
            <div className="card p-4 text-sm text-slate-400">Nothing outstanding.</div>
          ) : null}
          {next.map(t => (
            <div key={t.id} className="card p-4">
              <div className={"chip inline-block mb-2 " + (PHASE_TONE[t.phase_key] || "")}>{t.phase_key}</div>
              <div className="font-medium text-white leading-snug">{t.title}</div>
              {t.detail ? <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{t.detail}</p> : null}
              {t.why ? (
                <p className="text-sm text-slate-500 mt-2 leading-relaxed italic border-l-2 border-white/10 pl-3">
                  {t.why}
                </p>
              ) : null}
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-slate-500">~{t.est_hours}h</span>
                <button onClick={() => done(t.id)} className="btn btn-ghost text-sm py-1.5">Mark done</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold text-white mb-3">Log time</h2>
        <form onSubmit={logWork} className="space-y-2.5">
          <div className="flex gap-2.5">
            <input className="field flex-1" type="number" step="0.25" inputMode="decimal"
                   placeholder="Hours" value={hrs} onChange={e => setHrs(e.target.value)} />
            <button className="btn btn-primary px-5">Log</button>
          </div>
          <input className="field" placeholder="What did you work on? (optional)"
                 value={note} onChange={e => setNote(e.target.value)} />
        </form>
      </section>

      <button onClick={() => db.auth.signOut()} className="text-xs text-slate-600 w-full py-2">Sign out</button>
    </div>
  );
}

function Plan() {
  const [phases, setPhases] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [open, setOpen] = useState("decide");

  async function load() {
    const p = await db.from("phases").select("*").order("position");
    const t = await db.from("tasks").select("*").order("position");
    setPhases(p.data || []); setTasks(t.data || []);
  }
  useEffect(() => { load(); }, []);

  async function toggle(task) {
    const s = task.status === "done" ? "todo" : "done";
    setTasks(ts => ts.map(x => x.id === task.id ? Object.assign({}, x, { status: s }) : x));
    await db.from("tasks").update({
      status: s, completed_at: s === "done" ? new Date().toISOString() : null
    }).eq("id", task.id);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-white">The plan</h1>
        <p className="text-slate-400 text-sm mt-0.5">Four phases to 30 July 2027. Tap to expand.</p>
      </header>
      <div className="space-y-3">
        {phases.map(ph => {
          const mine = tasks.filter(t => t.phase_key === ph.key);
          const doneN = mine.filter(t => t.status === "done").length;
          const isOpen = open === ph.key;
          return (
            <div key={ph.key} className="card overflow-hidden">
              <button onClick={() => setOpen(isOpen ? null : ph.key)} className="w-full text-left p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className={"chip inline-block mb-1.5 " + PHASE_TONE[ph.key]}>
                      weeks {ph.start_week}-{ph.end_week}
                    </div>
                    <div className="font-semibold text-white">{ph.name}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm text-slate-400">{doneN}/{mine.length}</div>
                  </div>
                </div>
                {isOpen && ph.summary ? (
                  <p className="text-sm text-slate-400 mt-3 leading-relaxed">{ph.summary}</p>
                ) : null}
              </button>
              {isOpen ? (
                <div className="border-t border-white/5">
                  {mine.map(t => (
                    <div key={t.id} className="p-4 border-b border-white/5">
                      <div className="flex gap-3">
                        <button onClick={() => toggle(t)}
                          className={"mt-0.5 w-5 h-5 shrink-0 rounded-md border grid place-items-center " +
                            (t.status === "done" ? "bg-accent border-accent text-ink-900" : "border-slate-600")}>
                          {t.status === "done" ? <span className="text-xs font-bold">y</span> : null}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className={"font-medium leading-snug " +
                            (t.status === "done" ? "text-slate-500 line-through" : "text-white")}>
                            {t.title}
                          </div>
                          {t.detail ? <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{t.detail}</p> : null}
                          {t.why ? (
                            <p className="text-sm text-slate-500 mt-2 leading-relaxed italic border-l-2 border-white/10 pl-3">
                              {t.why}
                            </p>
                          ) : null}
                          <div className="text-xs text-slate-600 mt-2">~{t.est_hours}h</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Gaps() {
  const [gaps, setGaps] = useState([]);
  async function load() {
    const r = await db.from("gaps").select("*").order("priority");
    setGaps(r.data || []);
  }
  useEffect(() => { load(); }, []);

  async function setScore(g, score) {
    setGaps(gs => gs.map(x => x.id === g.id ? Object.assign({}, x, { score: score }) : x));
    await db.from("gaps").update({ score: score, updated_at: new Date().toISOString() }).eq("id", g.id);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-white">Gaps</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Ordered by what actually costs you money, not by how weak you feel.
        </p>
      </header>
      <div className="space-y-3">
        {gaps.map(g => (
          <div key={g.id} className="card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <div className="font-medium text-white">{g.label}</div>
              <div className="text-xs text-slate-600 shrink-0">#{g.priority}</div>
            </div>
            <div className="flex gap-1.5 mt-3">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setScore(g, n)}
                  className={"flex-1 h-8 rounded-lg text-sm font-medium " +
                    (n <= g.score
                      ? (n >= g.target_score ? "bg-accent text-ink-900" : "bg-sky-500/80 text-white")
                      : "bg-ink-600 text-slate-600")}>
                  {n}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5">
              now {g.score} / target {g.target_score}
            </div>
            {g.note ? <p className="text-sm text-slate-400 mt-3 leading-relaxed">{g.note}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

const TRACKS = [
  { key: "ai_engineer", label: "AI engineer" },
  { key: "staff_data_engineer", label: "Staff DE" },
  { key: "other", label: "Other" }
];

function Jobs() {
  const blank = {
    track: "ai_engineer", title: "", company: "", url: "", salary_text: "",
    salary_max: "", requirements: "", match_score: 3, could_apply_today: false
  };
  const [ads, setAds] = useState([]);
  const [form, setForm] = useState(blank);
  const [adding, setAdding] = useState(false);

  async function load() {
    const r = await db.from("job_ads").select("*").order("created_at", { ascending: false });
    setAds(r.data || []);
  }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await db.from("job_ads").insert(Object.assign({}, form, {
      salary_max: form.salary_max ? parseInt(form.salary_max, 10) : null,
      company: form.company || null, url: form.url || null,
      salary_text: form.salary_text || null, requirements: form.requirements || null
    }));
    setForm(blank); setAdding(false); load();
  }

  async function remove(id) {
    await db.from("job_ads").delete().eq("id", id);
    load();
  }

  const applicable = ads.filter(a => a.could_apply_today).length;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-white">Job ads</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Ten of each, £100k+ and UK-remote. Take them as they come.
        </p>
      </header>

      <div className="card p-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          {TRACKS.map(t => (
            <div key={t.key}>
              <div className="text-xl font-semibold text-white">
                {ads.filter(a => a.track === t.key).length}
                {t.key !== "other" ? <span className="text-slate-600 text-sm font-normal">/10</span> : null}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{t.label}</div>
            </div>
          ))}
        </div>
        {ads.length > 0 ? (
          <p className="text-sm text-slate-400 mt-4 pt-4 border-t border-white/5 leading-relaxed">
            You could apply for <span className="text-white font-medium">{applicable} of {ads.length}</span> today
            with an honest CV.
            {ads.length >= 10 ? " That number is the answer to the direction question." : ""}
          </p>
        ) : null}
      </div>

      {!adding ? (
        <button onClick={() => setAdding(true)} className="btn btn-primary w-full">Add an advert</button>
      ) : (
        <form onSubmit={save} className="card p-4 space-y-3">
          <div className="flex gap-2">
            {TRACKS.map(t => (
              <button key={t.key} type="button" onClick={() => setForm(Object.assign({}, form, { track: t.key }))}
                className={"flex-1 py-2 rounded-lg text-xs font-medium " +
                  (form.track === t.key ? "bg-accent text-ink-900" : "bg-ink-600 text-slate-400")}>
                {t.label}
              </button>
            ))}
          </div>
          <input className="field" placeholder="Job title" value={form.title} required
                 onChange={e => setForm(Object.assign({}, form, { title: e.target.value }))} />
          <input className="field" placeholder="Company" value={form.company}
                 onChange={e => setForm(Object.assign({}, form, { company: e.target.value }))} />
          <div className="flex gap-2.5">
            <input className="field flex-1" placeholder="Salary as stated" value={form.salary_text}
                   onChange={e => setForm(Object.assign({}, form, { salary_text: e.target.value }))} />
            <input className="field w-28" type="number" inputMode="numeric" placeholder="Max" value={form.salary_max}
                   onChange={e => setForm(Object.assign({}, form, { salary_max: e.target.value }))} />
          </div>
          <input className="field" placeholder="Link" value={form.url}
                 onChange={e => setForm(Object.assign({}, form, { url: e.target.value }))} />
          <textarea className="field" style={{ minHeight: "6rem" }} placeholder="What it actually asks for"
                    value={form.requirements}
                    onChange={e => setForm(Object.assign({}, form, { requirements: e.target.value }))} />
          <div>
            <div className="text-xs text-slate-400 mb-1.5">How well do you match? Be strict.</div>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button"
                  onClick={() => setForm(Object.assign({}, form, { match_score: n }))}
                  className={"flex-1 h-9 rounded-lg text-sm font-medium " +
                    (form.match_score === n ? "bg-sky-500 text-white" : "bg-ink-600 text-slate-500")}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2.5 py-1">
            <input type="checkbox" className="w-5 h-5" checked={form.could_apply_today}
                   onChange={e => setForm(Object.assign({}, form, { could_apply_today: e.target.checked }))} />
            <span className="text-sm text-slate-300">I could apply for this today, honestly</span>
          </label>
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={() => { setAdding(false); setForm(blank); }}
                    className="btn btn-ghost flex-1">Cancel</button>
            <button className="btn btn-primary flex-1">Save</button>
          </div>
        </form>
      )}

      <div className="space-y-2.5">
        {ads.map(a => (
          <div key={a.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-white leading-snug">{a.title}</div>
                <div className="text-sm text-slate-400 mt-0.5">
                  {a.company || "Unknown"}{a.salary_text ? " - " + a.salary_text : ""}
                </div>
              </div>
              <button onClick={() => remove(a.id)} className="text-slate-600 text-lg shrink-0 px-1">x</button>
            </div>
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <span className="chip bg-ink-600 text-slate-400">
                {(TRACKS.find(t => t.key === a.track) || {}).label}
              </span>
              <span className="chip bg-sky-400/10 text-sky-300">match {a.match_score}/5</span>
              {a.could_apply_today ? <span className="chip bg-accent/10 text-accent">could apply now</span> : null}
            </div>
            {a.requirements ? (
              <p className="text-sm text-slate-400 mt-2.5 leading-relaxed">{a.requirements}</p>
            ) : null}
            {a.url ? (
              <a href={a.url} target="_blank" rel="noreferrer"
                 className="text-xs text-accent mt-2 inline-block">Open advert</a>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

const KINDS = [
  { key: "shipped", label: "Shipped", tone: "text-accent bg-accent/10" },
  { key: "wrote", label: "Wrote", tone: "text-sky-300 bg-sky-300/10" },
  { key: "learned", label: "Learned", tone: "text-amber-300 bg-amber-300/10" },
  { key: "talked", label: "Talked to", tone: "text-violet-300 bg-violet-300/10" },
  { key: "applied", label: "Applied", tone: "text-orange-300 bg-orange-300/10" },
  { key: "interviewed", label: "Interviewed", tone: "text-rose-300 bg-rose-300/10" }
];

function Evidence() {
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState({ kind: "shipped", title: "", detail: "", link: "" });
  const [adding, setAdding] = useState(false);

  async function load() {
    const e = await db.from("evidence").select("*").order("happened_on", { ascending: false });
    const l = await db.from("work_log").select("*").order("logged_on", { ascending: false }).limit(20);
    setItems(e.data || []); setLogs(l.data || []);
  }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await db.from("evidence").insert(Object.assign({}, form, {
      detail: form.detail || null, link: form.link || null, happened_on: todayISO()
    }));
    setForm({ kind: "shipped", title: "", detail: "", link: "" });
    setAdding(false); load();
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-white">Evidence</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Everything here becomes CV bullets and interview answers.
        </p>
      </header>

      {!adding ? (
        <button onClick={() => setAdding(true)} className="btn btn-primary w-full">Add evidence</button>
      ) : (
        <form onSubmit={save} className="card p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {KINDS.map(k => (
              <button key={k.key} type="button"
                onClick={() => setForm(Object.assign({}, form, { kind: k.key }))}
                className={"py-2 rounded-lg text-xs font-medium " +
                  (form.kind === k.key ? "bg-accent text-ink-900" : "bg-ink-600 text-slate-400")}>
                {k.label}
              </button>
            ))}
          </div>
          <input className="field" placeholder="What happened" value={form.title} required
                 onChange={e => setForm(Object.assign({}, form, { title: e.target.value }))} />
          <textarea className="field" style={{ minHeight: "6rem" }}
                    placeholder="Detail - what you did, what changed, what you would say in an interview"
                    value={form.detail}
                    onChange={e => setForm(Object.assign({}, form, { detail: e.target.value }))} />
          <input className="field" placeholder="Link (optional)" value={form.link}
                 onChange={e => setForm(Object.assign({}, form, { link: e.target.value }))} />
          <div className="flex gap-2.5">
            <button type="button" onClick={() => setAdding(false)} className="btn btn-ghost flex-1">Cancel</button>
            <button className="btn btn-primary flex-1">Save</button>
          </div>
        </form>
      )}

      <div className="space-y-2.5">
        {items.map(it => {
          const k = KINDS.find(x => x.key === it.kind) || {};
          return (
            <div key={it.id} className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={"chip " + k.tone}>{k.label}</span>
                <span className="text-xs text-slate-600">{relDay(it.happened_on)}</span>
              </div>
              <div className="font-medium text-white leading-snug">{it.title}</div>
              {it.detail ? <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{it.detail}</p> : null}
              {it.link ? (
                <a href={it.link} target="_blank" rel="noreferrer"
                   className="text-xs text-accent mt-2 inline-block">Open</a>
              ) : null}
            </div>
          );
        })}
      </div>

      {logs.length > 0 ? (
        <section>
          <h2 className="font-semibold text-white mb-2.5">Recent sessions</h2>
          <div className="card">
            {logs.map(l => (
              <div key={l.id} className="px-4 py-3 flex items-baseline gap-3 border-b border-white/5">
                <span className="text-sm text-white w-12 shrink-0">{fmtHours(l.minutes)}</span>
                <span className="text-sm text-slate-400 flex-1 min-w-0">
                  {l.note || <span className="text-slate-600">No note</span>}
                </span>
                <span className="text-xs text-slate-600 shrink-0">{relDay(l.logged_on)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

const PATHS = [
  { key: "ai_ml_engineer", label: "AI/ML engineer", note: "Recommended" },
  { key: "staff_data_engineer", label: "Staff/principal DE", note: "The floor" },
  { key: "head_of_data", label: "Head of data", note: "Opportunistic" },
  { key: "contract", label: "Contract, outside IR35", note: "Later" }
];

function Brief() {
  const [profile, setProfile] = useState(null);
  const [walk, setWalk] = useState("");

  async function load() {
    const r = await db.from("profile").select("*").maybeSingle();
    setProfile(r.data);
    setWalk(r.data && r.data.walk_away_number ? String(r.data.walk_away_number) : "");
  }
  useEffect(() => { load(); }, []);

  async function choose(key) {
    setProfile(p => Object.assign({}, p, { chosen_path: key }));
    await db.from("profile").update({ chosen_path: key, updated_at: new Date().toISOString() })
      .eq("user_id", profile.user_id);
  }

  async function saveWalk() {
    const n = parseInt(walk, 10);
    if (!n) return;
    await db.from("profile").update({ walk_away_number: n, updated_at: new Date().toISOString() })
      .eq("user_id", profile.user_id);
    load();
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-white">The brief</h1>
        <p className="text-slate-400 text-sm mt-0.5">Why this plan looks the way it does.</p>
      </header>

      <section className="card p-4">
        <div className="chip inline-block bg-rose-400/10 text-rose-300 mb-2.5">The core finding</div>
        <p className="text-slate-300 text-sm leading-relaxed">
          You are already getting offers. They come in below target. That is not a
          capability problem, because a candidate who cannot get offers has one of
          those. It is a <span className="text-white font-medium">pricing problem</span>.
        </p>
        <p className="text-slate-300 text-sm leading-relaxed mt-3">
          Median UK data engineer pay is about £70k. Lead and principal roles top out
          around £85-91k. You are on £70-85k, so you are already near the ceiling of
          the band your job title addresses. £100k is not the middle of the range you
          are climbing, it is above the top of it.
        </p>
        <p className="text-slate-300 text-sm leading-relaxed mt-3">
          Median advertised pay for a remote AI engineer is about £91k, with UK seniors
          at £90-150k base. <span className="text-white font-medium">The gap between
          those two distributions is the whole strategy.</span> Getting better at data
          engineering cannot fix a band ceiling.
        </p>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold text-white mb-2.5">What you already have</h2>
        <ul className="text-sm text-slate-400 space-y-2 leading-relaxed">
          <li><span className="text-slate-200">MSc Computational Intelligence, Distinction.</span> Most
            people rebranding into AI engineering have no formal ML grounding.</li>
          <li><span className="text-slate-200">Production LLM tooling, already shipped.</span> Agentic
            assistants and automated impact analysis in GitLab CI. The most valuable
            line on your CV, currently one bullet.</li>
          <li><span className="text-slate-200">Feature engineering, misnamed.</span> Point-in-time
            correctness on the Single Customer View is ML infrastructure. Call it that.</li>
          <li><span className="text-slate-200">Ten years teaching.</span> Communication is the
            staff-level multiplier and you were professionally assessed on it.</li>
        </ul>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold text-white mb-2.5">A calibration warning</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          When asked, you selected every weakness on offer. Your CV contradicts at least
          two of them. You lead architecture initiatives and taught complex material for
          a decade, so system design and communication is not plausibly a weakness. What
          may be weak is the artificial 45-minute whiteboard format, which is a different
          and learnable thing.
        </p>
        <p className="text-sm text-slate-400 leading-relaxed mt-3">
          Strong CV, every weakness selected, offers below market accepted. If that
          pattern is what it looks like, it is costing you more than any technical gap
          on the list. Treat it as a hypothesis to test.
        </p>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold text-white mb-3">Direction</h2>
        <div className="space-y-2">
          {PATHS.map(p => (
            <button key={p.key} onClick={() => choose(p.key)}
              className={"w-full text-left px-3.5 py-3 rounded-xl border " +
                (profile && profile.chosen_path === p.key
                  ? "bg-accent/10 border-accent/40" : "bg-ink-700 border-transparent")}>
              <div className="flex items-center justify-between gap-3">
                <span className={"font-medium " +
                  (profile && profile.chosen_path === p.key ? "text-accent" : "text-slate-200")}>
                  {p.label}
                </span>
                <span className="text-[11px] text-slate-500 shrink-0">{p.note}</span>
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
          Do not pick from this screen alone. Work the Decide tasks first, then commit
          and stop reconsidering.
        </p>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold text-white mb-1.5">Walk-away number</h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-3">
          Not the target, the number below which you say no. Decided in advance and
          written down, it is the best defence against taking another offer below target.
        </p>
        <div className="flex gap-2.5">
          <input className="field flex-1" type="number" inputMode="numeric" placeholder="Amount"
                 value={walk} onChange={e => setWalk(e.target.value)} />
          <button onClick={saveWalk} className="btn btn-primary px-5">Save</button>
        </div>
        {profile && profile.walk_away_number ? (
          <p className="text-sm text-accent mt-2.5">
            Committed: £{profile.walk_away_number.toLocaleString()}
          </p>
        ) : null}
      </section>

      <Gaps />
    </div>
  );
}

const CATEGORIES = [
  { key: "evaluation", label: "Evaluation" },
  { key: "retrieval", label: "Retrieval / RAG" },
  { key: "llm", label: "LLM internals" },
  { key: "theory", label: "ML theory" },
  { key: "agents", label: "Agents" },
  { key: "production", label: "Production ML" },
  { key: "stats", label: "Stats" }
];

function ConceptBody({ c }) {
  return (
    <div>
      <p className="text-slate-200 text-sm leading-relaxed">{c.one_liner}</p>
      {c.detail ? (
        <p className="text-sm text-slate-400 mt-2.5 leading-relaxed">{c.detail}</p>
      ) : null}
      {c.interview_note ? (
        <div className="mt-3 pl-3 border-l-2 border-accent/40">
          <div className="chip text-accent bg-accent/10 inline-block mb-1">In the room</div>
          <p className="text-sm text-slate-400 leading-relaxed">{c.interview_note}</p>
        </div>
      ) : null}
    </div>
  );
}

function Learn() {
  const [concepts, setConcepts] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [mode, setMode] = useState("drill");
  const [cur, setCur] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [cat, setCat] = useState("evaluation");
  const [openId, setOpenId] = useState(null);
  const [q, setQ] = useState("");

  async function load() {
    const r = await db.from("concepts").select("*").order("position");
    const qs = await db.from("questions").select("*").order("created_at", { ascending: false });
    setConcepts(r.data || []);
    setQuestions(qs.data || []);
    return r.data || [];
  }

  function pick(list) {
    if (!list || !list.length) return;
    const sorted = list.slice().sort((a, b) =>
      (a.confidence - b.confidence) || (a.times_seen - b.times_seen));
    const pool = sorted.slice(0, 8);
    setCur(pool[Math.floor(Math.random() * pool.length)]);
    setRevealed(false);
  }

  useEffect(() => { load().then(pick); }, []);

  async function rate(n) {
    await db.from("concepts").update({
      confidence: n,
      times_seen: cur.times_seen + 1,
      last_seen_at: new Date().toISOString()
    }).eq("id", cur.id);
    const list = await load();
    pick(list);
  }

  async function ask(e) {
    e.preventDefault();
    if (!q.trim()) return;
    await db.from("questions").insert({ body: q.trim() });
    setQ("");
    load();
  }

  const solid = concepts.filter(c => c.confidence >= 4).length;
  const unseen = concepts.filter(c => c.confidence === 0).length;
  const inCat = concepts.filter(c => c.category === cat);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-white">Learn</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          The vocabulary and theory that makes you sound like you belong in the room.
        </p>
      </header>

      <div className="card p-4">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-2xl font-semibold text-white">
              {solid}<span className="text-slate-500 text-base font-normal">/{concepts.length}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">solid (rated 4 or 5)</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-slate-300">{unseen}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">not yet seen</div>
          </div>
        </div>
        <div className="h-1.5 bg-ink-600 rounded-full mt-3 overflow-hidden">
          <div className="h-full bg-accent rounded-full"
               style={{ width: (concepts.length ? (solid / concepts.length) * 100 : 0) + "%" }} />
        </div>
      </div>

      <div className="flex gap-2">
        {[["drill", "Drill"], ["browse", "Browse"], ["ask", "Ask"]].map(m => (
          <button key={m[0]} onClick={() => setMode(m[0])}
            className={"flex-1 py-2 rounded-lg text-sm font-medium " +
              (mode === m[0] ? "bg-accent text-ink-900" : "bg-ink-700 text-slate-400")}>
            {m[1]}
          </button>
        ))}
      </div>

      {mode === "drill" ? (
        cur ? (
          <div className="card p-5">
            <div className="chip inline-block bg-ink-600 text-slate-400 mb-3">
              {(CATEGORIES.find(x => x.key === cur.category) || {}).label || cur.category}
            </div>
            <div className="text-xl font-semibold text-white leading-snug">{cur.term}</div>

            {!revealed ? (
              <div className="mt-5">
                <p className="text-sm text-slate-500 mb-4">
                  Say it out loud in one sentence before you reveal. That is the skill.
                </p>
                <button onClick={() => setRevealed(true)} className="btn btn-primary w-full">
                  Reveal
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <ConceptBody c={cur} />
                <div className="mt-5">
                  <div className="text-xs text-slate-400 mb-2">
                    How solid did that feel? Be honest, it only tunes what comes back.
                  </div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => rate(n)}
                        className={"flex-1 h-10 rounded-lg text-sm font-medium " +
                          (n >= 4 ? "bg-accent/20 text-accent" : "bg-ink-600 text-slate-400")}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600 mt-1.5">
                    <span>no idea</span><span>could teach it</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card p-4 text-sm text-slate-400">Loading concepts...</div>
        )
      ) : null}

      {mode === "browse" ? (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map(c => (
              <button key={c.key} onClick={() => setCat(c.key)}
                className={"shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium " +
                  (cat === c.key ? "bg-accent text-ink-900" : "bg-ink-700 text-slate-400")}>
                {c.label}
              </button>
            ))}
          </div>
          {inCat.map(c => (
            <div key={c.id} className="card p-4">
              <button onClick={() => setOpenId(openId === c.id ? null : c.id)}
                      className="w-full text-left flex items-center justify-between gap-3">
                <span className="font-medium text-white">{c.term}</span>
                <span className={"chip shrink-0 " + (c.confidence >= 4
                  ? "bg-accent/10 text-accent"
                  : (c.confidence === 0 ? "bg-ink-600 text-slate-500" : "bg-sky-400/10 text-sky-300"))}>
                  {c.confidence === 0 ? "new" : c.confidence + "/5"}
                </span>
              </button>
              {openId === c.id ? <div className="mt-3"><ConceptBody c={c} /></div> : null}
            </div>
          ))}
        </div>
      ) : null}

      {mode === "ask" ? (
        <div className="space-y-3">
          <form onSubmit={ask} className="card p-4 space-y-3">
            <p className="text-sm text-slate-400 leading-relaxed">
              Anything you nodded along to but did not fully follow. Park it here, ask
              Claude in your next session, and the answer gets added to your concepts.
            </p>
            <textarea className="field" style={{ minHeight: "5rem" }}
                      placeholder="What do people actually mean by..."
                      value={q} onChange={e => setQ(e.target.value)} />
            <button className="btn btn-primary w-full">Park it</button>
          </form>
          {questions.map(item => (
            <div key={item.id} className="card p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={"chip " + (item.answer
                  ? "bg-accent/10 text-accent" : "bg-amber-300/10 text-amber-300")}>
                  {item.answer ? "answered" : "open"}
                </span>
                <span className="text-xs text-slate-600">{relDay(item.created_at.slice(0, 10))}</span>
              </div>
              <div className="text-white text-sm leading-relaxed">{item.body}</div>
              {item.answer ? (
                <p className="text-sm text-slate-400 mt-2.5 leading-relaxed">{item.answer}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const TABS = [
  { key: "today", label: "Today", icon: "◎" },
  { key: "learn", label: "Learn", icon: "◈" },
  { key: "plan", label: "Plan", icon: "☰" },
  { key: "jobs", label: "Jobs", icon: "⌗" },
  { key: "log", label: "Evidence", icon: "✎" },
  { key: "brief", label: "Brief", icon: "❖" }
];

function App() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("today");

  useEffect(() => {
    db.auth.getSession().then(r => { setSession(r.data.session); setReady(true); });
    const sub = db.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.data.subscription.unsubscribe();
  }, []);

  if (!ready) {
    return <div className="min-h-dvh grid place-items-center text-slate-500 text-sm">Loading...</div>;
  }
  if (!session) return <Login />;

  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 px-4 pt-5 pb-28 max-w-2xl w-full mx-auto">
        {tab === "today" ? <Today go={setTab} /> : null}
        {tab === "plan" ? <Plan /> : null}
        {tab === "jobs" ? <Jobs /> : null}
        {tab === "learn" ? <Learn /> : null}
        {tab === "log" ? <Evidence /> : null}
        {tab === "brief" ? <Brief /> : null}
      </main>
      <nav className="fixed bottom-0 inset-x-0 bg-ink-800/95 backdrop-blur border-t border-white/5 safe-bottom">
        <div className="max-w-2xl mx-auto grid grid-cols-6">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={"flex flex-col items-center gap-0.5 py-2.5 " +
                (tab === t.key ? "text-accent" : "text-slate-500")}>
              <span className="text-lg leading-none">{t.icon}</span>
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
</script>
</body>
</html>`;

Deno.serve(() => new Response(PAGE, {
  headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  },
}));
