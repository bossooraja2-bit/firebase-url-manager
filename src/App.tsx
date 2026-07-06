import { useState, useEffect, useCallback } from "react";

const CORRECT_PIN = "master1234";

async function apiFetch(method: string, body?: object, pin?: string) {
  return fetch("/api/firebase-urls", {
    method,
    headers: { "Content-Type": "application/json", "x-admin-pin": pin ?? "" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function PinGate({ onAuth }: { onAuth: (p: string) => void }) {
  const [pin, setPin] = useState(""); const [err, setErr] = useState(""); const [show, setShow] = useState(false);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin === CORRECT_PIN) onAuth(pin);
    else { setErr("Wrong PIN."); setPin(""); }
  }
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)", fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ background:"rgba(255,255,255,0.06)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:24, padding:"48px 40px 40px", width:340, boxShadow:"0 32px 80px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:64, height:64, borderRadius:18, margin:"0 auto 14px", background:"linear-gradient(145deg,#6c63ff,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, boxShadow:"0 12px 32px rgba(99,102,241,0.4)" }}>🔥</div>
          <div style={{ fontSize:20, fontWeight:800, color:"#fff" }}>Firebase URL Manager</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:4 }}>bosso-bb5e7 · Admin PIN required</div>
        </div>
        <form onSubmit={submit}>
          <div style={{ position:"relative", marginBottom:12 }}>
            <input type={show?"text":"password"} value={pin} onChange={e=>{setPin(e.target.value);setErr("");}} placeholder="Enter PIN" autoFocus
              style={{ width:"100%", boxSizing:"border-box", padding:"13px 42px 13px 14px", borderRadius:11, border:`1px solid ${err?"#f87171":"rgba(255,255,255,0.15)"}`, background:"rgba(255,255,255,0.08)", color:"#fff", fontSize:15, outline:"none" }} />
            <button type="button" onClick={()=>setShow(!show)} style={{ position:"absolute", right:11, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"rgba(255,255,255,0.4)", cursor:"pointer", fontSize:15 }}>{show?"🙈":"👁️"}</button>
          </div>
          {err && <div style={{ color:"#f87171", fontSize:12, marginBottom:10, textAlign:"center" }}>{err}</div>}
          <button type="submit" style={{ width:"100%", padding:"13px", borderRadius:11, border:"none", background:"linear-gradient(135deg,#6c63ff,#3b82f6)", color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer" }}>Unlock →</button>
        </form>
      </div>
      <style>{`input::placeholder{color:rgba(255,255,255,0.3)}`}</style>
    </div>
  );
}

function Dashboard({ pin }: { pin: string }) {
  const [current, setCurrent] = useState<{ url: string; encUrl: string; savedAt: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [copied, setCopied] = useState<string|null>(null);

  const notify = (msg: string, ok = true) => { setToast({msg,ok}); setTimeout(()=>setToast(null),3000); };
  const copy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(()=>setCopied(null),1500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch("GET", undefined, pin);
      const data = await r.json() as Record<string,any>|null;
      if (!data) { setCurrent(null); return; }
      const valid = Object.values(data).find((e:any)=>e?.encUrl);
      setCurrent(valid ? { url:valid.url??"", encUrl:valid.encUrl, savedAt:valid.savedAt??0 } : null);
    } catch { notify("Firebase se load nahi hua", false); }
    finally { setLoading(false); }
  }, [pin]);

  useEffect(()=>{ load(); },[load]);

  async function setActiveUrl(e: React.FormEvent) {
    e.preventDefault();
    const url = newUrl.trim();
    if (!url.startsWith("http")) return notify("Valid URL chahiye (http...)", false);
    setSaving(true);
    try {
      const r = await apiFetch("PUT", { url }, pin);
      if (!r.ok) throw new Error();
      notify("✓ URL Firebase mein save ho gaya!"); setNewUrl(""); await load();
    } catch { notify("Save nahi hua", false); }
    finally { setSaving(false); }
  }

  async function clearUrl() {
    if (!confirm("Firebase se URL delete karna chahte ho?")) return;
    setClearing(true);
    try { await apiFetch("DELETE", undefined, pin); notify("✓ URL delete ho gaya"); setCurrent(null); }
    catch { notify("Delete nahi hua", false); }
    finally { setClearing(false); }
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)", fontFamily:"'Inter',system-ui,sans-serif" }}>
      <style>{`*{box-sizing:border-box}input::placeholder{color:rgba(255,255,255,0.3)}input:focus{border-color:rgba(99,102,241,0.6)!important;outline:none;box-shadow:0 0 0 3px rgba(99,102,241,0.15)}@keyframes fadeDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {toast && <div style={{ position:"fixed", top:20, right:20, zIndex:999, background:toast.ok?"#22c55e":"#ef4444", color:"#fff", padding:"11px 18px", borderRadius:10, fontWeight:600, fontSize:13, boxShadow:"0 8px 24px rgba(0,0,0,0.35)", animation:"fadeDown 0.2s" }}>{toast.msg}</div>}

      <div style={{ background:"rgba(255,255,255,0.04)", borderBottom:"1px solid rgba(255,255,255,0.08)", padding:"18px 28px", display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ fontSize:26 }}>🔥</span>
        <div>
          <div style={{ fontSize:17, fontWeight:800, color:"#fff" }}>Firebase URL Manager</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>bosso-bb5e7-default-rtdb.firebaseio.com/urls</div>
        </div>
        <button onClick={load} style={{ marginLeft:"auto", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.6)", padding:"7px 14px", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600 }}>↻ Refresh</button>
      </div>

      <div style={{ maxWidth:600, margin:"40px auto", padding:"0 20px" }}>
        {/* Current URL */}
        <div style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:18, padding:24, marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.4)", letterSpacing:1, marginBottom:14, textTransform:"uppercase" }}>Current Active URL (Android yahi fetch karta hai)</div>
          {loading ? (
            <div style={{ display:"flex", alignItems:"center", gap:10, color:"rgba(255,255,255,0.4)" }}>
              <span style={{ display:"inline-block", animation:"spin 1s linear infinite" }}>⟳</span> Firebase se load ho raha hai…
            </div>
          ) : current ? (
            <>
              <div style={{ background:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.25)", borderRadius:12, padding:"14px 16px", marginBottom:10 }}>
                <div style={{ fontSize:11, color:"#818cf8", marginBottom:4, fontWeight:600 }}>🔗 Plain URL</div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ flex:1, fontSize:14, color:"#e0e7ff", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{current.url}</div>
                  <button onClick={()=>copy(current.url,"url")} style={{ flexShrink:0, padding:"6px 12px", borderRadius:7, fontSize:11, fontWeight:700, background:"rgba(129,140,248,0.2)", border:"1px solid rgba(129,140,248,0.3)", color:"#a5b4fc", cursor:"pointer" }}>{copied==="url"?"✓":"Copy"}</button>
                </div>
              </div>
              <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"12px 16px", marginBottom:12 }}>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:4, fontWeight:600 }}>🔐 encUrl (Firebase mein yahi store hota hai)</div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ flex:1, fontSize:11, color:"rgba(255,255,255,0.2)", fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{current.encUrl}</div>
                  <button onClick={()=>copy(current.encUrl,"enc")} style={{ flexShrink:0, padding:"6px 12px", borderRadius:7, fontSize:11, fontWeight:700, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.4)", cursor:"pointer" }}>{copied==="enc"?"✓":"Copy"}</button>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.2)" }}>Saved: {new Date(current.savedAt).toLocaleString()}</div>
                <button onClick={clearUrl} disabled={clearing} style={{ padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:700, background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.25)", color:"#f87171", cursor:clearing?"wait":"pointer" }}>{clearing?"Clearing…":"🗑 Clear"}</button>
              </div>
            </>
          ) : (
            <div style={{ textAlign:"center", padding:"20px 0", color:"rgba(255,255,255,0.3)", border:"1px dashed rgba(255,255,255,0.1)", borderRadius:12 }}>
              <div style={{ fontSize:28, marginBottom:8 }}>🔗</div>
              <div style={{ fontSize:14, fontWeight:600 }}>Koi URL set nahi hai</div>
              <div style={{ fontSize:12, marginTop:4 }}>Android app ke paas koi URL nahi hoga</div>
            </div>
          )}
        </div>

        {/* Set/Change URL */}
        <div style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:18, padding:24 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.4)", letterSpacing:1, marginBottom:14, textTransform:"uppercase" }}>{current?"URL Change Karo":"URL Set Karo"}</div>
          <form onSubmit={setActiveUrl} style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <input value={newUrl} onChange={e=>setNewUrl(e.target.value)} placeholder="https://mr-robot-b3w.pages.dev"
              style={{ padding:"13px 15px", borderRadius:10, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(255,255,255,0.07)", color:"#fff", fontSize:14 }} />
            <button type="submit" disabled={saving} style={{ padding:"13px", borderRadius:10, border:"none", background:saving?"rgba(99,102,241,0.4)":"linear-gradient(135deg,#6c63ff,#3b82f6)", color:"#fff", fontSize:14, fontWeight:700, cursor:saving?"wait":"pointer" }}>
              {saving?"Saving…":current?"🔄 URL Replace Karo":"🔒 Encrypt & Firebase Mein Save Karo"}
            </button>
          </form>
          <div style={{ marginTop:10, fontSize:11, color:"rgba(255,255,255,0.2)", lineHeight:1.5 }}>
            URL triple-encrypt hoke Firebase ke /urls/active_url mein save hoga. Android app wahi read karta hai.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [pin, setPin] = useState<string|null>(()=>sessionStorage.getItem("fb_pin"));
  function handleAuth(p: string) { sessionStorage.setItem("fb_pin",p); setPin(p); }
  if (!pin) return <PinGate onAuth={handleAuth} />;
  return <Dashboard pin={pin} />;
}
