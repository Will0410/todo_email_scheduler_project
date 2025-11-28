// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

import Sidebar from "./components/Sidebar";
import MobileMenu from "./components/MobileMenu";
import HamburgerButton from "./components/HamburgerButton";
import ChatWidget from "./components/ChatWidget";

import { saveAuth, getToken, getUser, clearAuth } from "./utils/auth";

import "./App.css";

/**
 * App.jsx — atualizado com Login/Register JWT (Opção A)
 */
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const API_TODOS = `${API_BASE}/todos`;
const API_AI = `${API_BASE}/api/ai`;
const API_SEND_WA = `${API_BASE}/api/send-whatsapp`;
const API_SUBS = `${API_BASE}/api/subscriptions`;
const API_ADMIN_OVERVIEW = `${API_BASE}/api/admin/overview`;
const API_ADMIN_LOGS = `${API_BASE}/api/admin/logs`;
const API_ADMIN_CONVS = `${API_BASE}/api/admin/conversations`;
const API_HISTORY = `${API_BASE}/api/history`;
const API_STATS_OVERVIEW = `${API_BASE}/api/stats/overview`;
const API_AUTH_LOGIN = `${API_BASE}/api/auth/login`;      // adjust if your backend uses /auth instead of /api/auth
const API_AUTH_REGISTER = `${API_BASE}/api/auth/register`;

function nowLocalISOStringSlice16() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - tz);
  return local.toISOString().slice(0, 16);
}
function safeJsonParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

export default function App() {
  // layout + navigation
  const [activePage, setActivePage] = useState("todos");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  // todos state
  const [todos, setTodos] = useState([]);
  const [editingTodo, setEditingTodo] = useState(null);
  const [input, setInput] = useState({
    title: "",
    description: "",
    due: nowLocalISOStringSlice16(),
    priority: "Média",
    tags: [],
    tagInput: "",
    email: "",
    whatsapp: "",
    repeat: "nenhum",
  });

  // chat quick + widget messages
  const [chatInput, setChatInput] = useState("");
  const [chatQuickReply, setChatQuickReply] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [typing, setTyping] = useState(false);

  // widget open controlled inside ChatWidget (but we also can control here)
  const chatBottomRef = useRef(null);

  // auth/user
  const [user, setUser] = useState(() => getUser());
  const [authError, setAuthError] = useState("");

  // misc admin/subs/history
  const [mySubs, setMySubs] = useState([]);
  const [overview, setOverview] = useState(null);
  const [logs, setLogs] = useState([]);
  const [convs, setConvs] = useState([]);
  const [serverHistory, setServerHistory] = useState([]);
  const [stats, setStats] = useState(null);

  // theme effect
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // set axios auth header if token exists on app start
  useEffect(() => {
    const token = getToken();
    if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }, []);

  // load todos
  useEffect(() => { loadTodos(); }, []);

  async function loadTodos() {
    try {
      const res = await axios.get(API_TODOS);
      setTodos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Erro ao carregar todos:", err);
      setTodos([]);
    }
  }

  // todo form handlers
  function addTag() {
    if (!input.tagInput || !input.tagInput.trim()) return;
    setInput(prev => ({ ...prev, tags: [...prev.tags, prev.tagInput.trim()], tagInput: "" }));
  }
  function removeTag(tag) { setInput(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) })); }
  function resetForm() {
    setEditingTodo(null);
    setInput({
      title: "",
      description: "",
      due: nowLocalISOStringSlice16(),
      priority: "Média",
      tags: [],
      tagInput: "",
      email: "",
      whatsapp: "",
      repeat: "nenhum",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (new Date(input.due) < new Date()) { alert("Escolha uma data futura!"); return; }
    try {
      if (editingTodo) {
        await axios.put(`${API_TODOS}/${editingTodo._id}`, input);
      } else {
        await axios.post(API_TODOS, input);
      }
      resetForm(); loadTodos();
    } catch (err) {
      console.error("Erro ao salvar:", err);
      alert("Erro ao salvar.");
    }
  }

  function handleEdit(todo) {
    setEditingTodo(todo);
    setInput({
      title: todo.title,
      description: todo.description,
      due: todo.due ? todo.due.slice(0,16) : nowLocalISOStringSlice16(),
      priority: todo.priority,
      tags: todo.tags || [],
      tagInput: "",
      email: todo.email || "",
      whatsapp: todo.whatsapp || "",
      repeat: todo.repeat || "nenhum"
    });
    setActivePage("todos");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleRemove(id) { try { await axios.delete(`${API_TODOS}/${id}`); loadTodos(); } catch (err) { console.error(err); } }
  async function toggleCompleted(id, current) { try { await axios.put(`${API_TODOS}/${id}`, { completed: !current }); loadTodos(); } catch (err) { console.error(err); } }

  // AI quick ask (auto call while typing)
  useEffect(() => {
    if (!chatInput.trim()) { setChatQuickReply(""); return; }
    const timer = setTimeout(() => askAIInline(chatInput), 650);
    return () => clearTimeout(timer);
    // eslint-disable-next-line
  }, [chatInput]);

  async function askAIInline(text) {
    if (!text || !text.trim()) return;
    try {
      setTyping(true);
      const res = await axios.post(API_AI, { message: text });
      const reply = res.data?.reply || "";
      setChatQuickReply(typeof reply === "string" ? reply : JSON.stringify(reply));
      const json = safeJsonParse(reply);
      if (json && json.action) handleAIAction(json);
    } catch (err) {
      console.error("askAIInline error:", err);
      setChatQuickReply("❌ Erro ao se comunicar com a IA.");
    } finally {
      setTyping(false);
    }
  }

  // chat widget explicit send
  async function sendChatMessage(text) {
    if (!text || !text.trim()) return;
    setChatMessages(m => [...m, { role: "user", text }]);
    try {
      const res = await axios.post(API_AI, { message: text });
      const reply = res.data?.reply || "—";
      setChatMessages(m => [...m, { role: "bot", text: typeof reply === "string" ? reply : JSON.stringify(reply) }]);
      const json = safeJsonParse(reply);
      if (json && json.action) handleAIAction(json);
    } catch (err) {
      console.error("sendChatMessage err:", err);
      setChatMessages(m => [...m, { role: "bot", text: "❌ Erro ao falar com a IA." }]);
    } finally {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  async function handleAIAction(json) {
    try {
      if (json.action === "send_whatsapp") {
        if (!json.to || json.body === undefined) { alert("IA pediu WA mas faltam campos"); return; }
        const r = await axios.post(API_SEND_WA, { to: json.to, text: json.body });
        setChatMessages(m => [...m, { role: "bot", text: `📱 WA enfileirado (logId: ${r.data.logId||"-"})` }]);
      } else if (json.action === "send_email") {
        // forward to AI route which handles sending
        const forward = await axios.post(API_AI, { message: JSON.stringify(json) });
        setChatMessages(m => [...m, { role: "bot", text: forward.data.reply }]);
      } else if (json.action === "schedule_daily") {
        await axios.post(API_SUBS, { name: json.name || "Auto", whatsapp: json.whatsapp, email: json.email, time: json.time || "09:00" });
        setChatMessages(m => [...m, { role: "bot", text: "✅ Assinatura criada." }]);
        loadMySubs();
      } else {
        setChatMessages(m => [...m, { role: "bot", text: `Ação desconhecida: ${json.action}` }]);
      }
    } catch (err) {
      console.error("handleAIAction:", err);
      setChatMessages(m => [...m, { role: "bot", text: "⚠️ Falha ao executar ação solicitada pela IA." }]);
    }
  }

  // send WhatsApp quick (for a todo)
  async function sendReminderWhatsApp(todo) {
    const text = `Lembrete: ${todo.title}\n${todo.description || ""}`;
    try {
      await axios.post(API_SEND_WA, { to: todo.whatsapp || todo.phone || "", text });
      alert("Enfileirado envio WhatsApp.");
    } catch (err) { console.error(err); alert("Erro ao enfileirar WA"); }
  }

  // send email quick (via AI route which expects JSON action)
  async function sendReminderEmail(todo) {
    try {
      const payload = { action: "send_email", to: todo.email, subject: `Lembrete: ${todo.title}`, text: todo.description || "" };
      const res = await axios.post(API_AI, { message: JSON.stringify(payload) });
      alert(res.data?.reply || "Solicitação enviada");
    } catch (err) { console.error(err); alert("Erro ao enviar email"); }
  }

  // subscriptions
  async function loadMySubs() {
    try { const r = await axios.get(API_SUBS); setMySubs(r.data || []); } catch (err) { console.error(err); setMySubs([]); }
  }
  async function createSubscription(data) {
    try { await axios.post(API_SUBS, data); loadMySubs(); alert("Assinatura criada"); } catch (err) { console.error(err); alert("Erro ao criar"); }
  }

  // admin / dashboard / history loaders (basic)
  async function loadAdminOverview(){ try { const r = await axios.get(API_ADMIN_OVERVIEW); setOverview(r.data); } catch(e){ console.error(e); } }
  async function loadAdminLogs(){ try { const r = await axios.get(API_ADMIN_LOGS); setLogs(r.data||[]); } catch(e){ console.error(e); } }
  async function loadConvs(){ try { const r = await axios.get(API_ADMIN_CONVS); setConvs(r.data||[]); } catch(e){ console.error(e); } }
  async function loadHistory(){ try { const r = await axios.get(API_HISTORY + "?limit=100"); setServerHistory(r.data||[]); } catch(e){ console.error(e); } }
  async function loadStats(){ try { const r = await axios.get(API_STATS_OVERVIEW); setStats(r.data); } catch(e){ console.error(e); } }

  // ----- AUTH (login/register/logout) -----
  async function handleLoginRequest(email, password) {
    setAuthError("");
    try {
      const r = await axios.post(API_AUTH_LOGIN, { email, password });
      const token = r.data.token || r.data?.token;
      const u = r.data.user || r.data?.user;
      if (!token || !u) throw new Error("Resposta inválida do servidor");
      saveAuth({ token, user: u });
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser(u);
      setActivePage("todos");
      return { ok: true };
    } catch (err) {
      console.error("login error:", err);
      const msg = err.response?.data?.error || err.message || "Falha no login";
      setAuthError(msg);
      return { ok: false, error: msg };
    }
  }

  async function handleRegisterRequest(name, email, password) {
    setAuthError("");
    try {
      const r = await axios.post(API_AUTH_REGISTER, { name, email, password });
      // some backends return user directly, others return { token, user }
      // try login after register
      const login = await handleLoginRequest(email, password);
      if (!login.ok) throw new Error(login.error || "Registro OK mas falha no login automático");
      return { ok: true };
    } catch (err) {
      console.error("register error:", err);
      const msg = err.response?.data?.error || err.message || "Falha no registro";
      setAuthError(msg);
      return { ok: false, error: msg };
    }
  }

  function handleLogout() {
    clearAuth();
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
    setActivePage("login");
  }

  // Protect pages: redirect to login if not authenticated
  const privatePages = ["todos", "dashboard", "whatsapp", "subs", "admin", "history"];
  useEffect(() => {
    if (!user && privatePages.includes(activePage)) setActivePage("login");
    // eslint-disable-next-line
  }, [user, activePage]);

  // ----- UI Components (inline small helpers) -----
  function Topbar() {
    return (
      <header className="topbar">
        <div className="brand">
          <div className="logo-square">AI</div>
          <div className="brand-text">
            <h1>Todo+AI</h1>
            <small>Organização • Inteligência</small>
          </div>
        </div>

        <div className="top-actions">
          <button className="btn tiny" onClick={() => { setActivePage("dashboard"); loadStats(); }}>Dashboard</button>
          <button className="theme-toggle" onClick={() => setTheme(t => t==="dark"?"light":"dark")}>{theme==="dark"?"☀️":"🌙"}</button>
          <HamburgerButton onClick={() => setMobileOpen(true)} />
        </div>
      </header>
    );
  }

  // ... (TodosView, DashboardView, WhatsAppView, SubsView, AdminView, HistoryView)
  // For brevity reuse your existing view functions (they are unchanged)
  // Insert the view functions you already have below or keep the ones from your original App.jsx
  // I'll re-use the same TodosView, DashboardView, WhatsAppView, SubsView, AdminView, HistoryView from your original code:
  // (Paste them here or rely on earlier code — since you submitted your App.jsx before, those functions remain the same.)
  // For the user's convenience I will include TodosView and LoginRegisterView below, and keep other views referenced similarly.

  function TodosView() {
    return (
      <div className="content-panel">
        <h2>{editingTodo ? "Editar tarefa" : "Nova tarefa"}</h2>
        <form className="task-form" onSubmit={handleSubmit}>
          <div className="field"><label>Título</label><input value={input.title} onChange={e => setInput({...input, title: e.target.value})} required /></div>
          <div className="field"><label>Descrição</label><textarea value={input.description} onChange={e => setInput({...input, description: e.target.value})} /></div>
          <div className="two-col">
            <div className="field"><label>Email</label><input type="email" value={input.email} onChange={e => setInput({...input, email: e.target.value})} /></div>
            <div className="field"><label>WhatsApp</label><input placeholder="5511999999999" value={input.whatsapp} onChange={e => setInput({...input, whatsapp: e.target.value})} /></div>
          </div>
          <div className="two-col">
            <div className="field"><label>Data limite</label><input type="datetime-local" value={input.due} min={nowLocalISOStringSlice16()} onChange={e => setInput({...input, due: e.target.value})} required /></div>
            <div className="field"><label>Prioridade</label><select value={input.priority} onChange={e => setInput({...input, priority: e.target.value})}><option>Alta</option><option>Média</option><option>Baixa</option></select></div>
          </div>

          <div className="tags-row">
            {input.tags.map((t,i) => <div key={i} className="tag" onClick={() => removeTag(t)}>{t} ✖</div>)}
            <input className="tag-input" placeholder="Adicionar tag" value={input.tagInput} onChange={e => setInput({...input, tagInput: e.target.value})} />
            <button type="button" className="btn tiny primary" onClick={addTag}>+</button>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn primary" type="submit">{editingTodo ? "Salvar" : "Adicionar"}</button>
            {editingTodo && <button type="button" className="btn ghost" onClick={resetForm}>Cancelar</button>}
          </div>
        </form>

        <hr />

        <h3>Tarefas</h3>
        <ul className="todo-list">
          {todos.map(todo => (
            <li key={todo._id} className="todo-item">
              <div className="todo-main">
                <div className={`priority-dot ${todo.priority === "Alta" ? "p-high" : todo.priority === "Média" ? "p-medium" : "p-low"}`} />
                <div className="todo-info">
                  <div className="todo-title">{todo.title}</div>
                  <div className="todo-desc">{todo.description}</div>
                  <div className="todo-meta">
                    <span className="muted">📧 {todo.email || "—"}</span>
                    <span className="muted">📱 {todo.whatsapp || "—"}</span>
                    <span className="pill">{todo.priority}</span>
                    {(todo.tags||[]).map((t,i)=> <span key={i} className="pill">#{t}</span>)}
                    <span className="muted">📅 {todo.due ? new Date(todo.due).toLocaleString() : "—"}</span>
                  </div>
                </div>
              </div>

              <div className="todo-actions">
                <button className="btn small primary" onClick={() => toggleCompleted(todo._id, todo.completed)}>{todo.completed ? "Desmarcar" : "Concluir"}</button>
                <button className="btn small ghost" onClick={() => handleEdit(todo)}>Editar</button>
                <button className="btn small ghost" onClick={() => handleRemove(todo._id)}>Excluir</button>
                <button className="btn small" onClick={() => sendReminderWhatsApp(todo)}>Enviar WA</button>
                <button className="btn small" onClick={() => sendReminderEmail(todo)}>Enviar Email</button>
              </div>
            </li>
          ))}
        </ul>

        <div className="ai-inline">
          <input placeholder="Pergunte algo..." value={chatInput} onChange={e => setChatInput(e.target.value)} />
          <button className="btn primary" onClick={() => askAIInline(chatInput)}>{typing ? "..." : "Enviar"}</button>
          {chatQuickReply && <div className="ai-quick-reply">{chatQuickReply}</div>}
        </div>
      </div>
    );
  }

  // LOGIN + REGISTER view (component included inside App for simplicity)
  function LoginRegisterView() {
    const [mode, setMode] = useState("login"); // "login" | "register"
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [localError, setLocalError] = useState("");

    useEffect(() => {
      setLocalError(authError || "");
    }, [authError]);

    async function onSubmitLogin(e) {
      e.preventDefault();
      setLocalError("");
      setLoading(true);
      const res = await handleLoginRequest(email, password);
      setLoading(false);
      if (!res.ok) setLocalError(res.error || "Erro ao logar");
    }

    async function onSubmitRegister(e) {
      e.preventDefault();
      setLocalError("");
      if (!name || !email || !password) { setLocalError("Preencha todos os campos"); return; }
      setLoading(true);
      const res = await handleRegisterRequest(name, email, password);
      setLoading(false);
      if (!res.ok) setLocalError(res.error || "Erro ao registrar");
    }

    return (
      <div className="content-panel auth-panel" style={{ maxWidth: 480 }}>
        <h2>{mode === "login" ? "Entrar" : "Criar Conta"}</h2>

        <div className="auth-tabs" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button className={mode === "login" ? "btn primary" : "btn"} onClick={() => setMode("login")}>Entrar</button>
          <button className={mode === "register" ? "btn primary" : "btn"} onClick={() => setMode("register")}>Registrar</button>
        </div>

        {localError && <div style={{ color: "red", marginBottom: 8 }}>{localError}</div>}

        {mode === "login" ? (
          <form onSubmit={onSubmitLogin} style={{ display: "grid", gap: 8 }}>
            <input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
            <input placeholder="Senha" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn primary" type="submit" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
              <button type="button" className="btn" onClick={() => { setMode("register"); setLocalError(""); }}>Registrar</button>
            </div>
          </form>
        ) : (
          <form onSubmit={onSubmitRegister} style={{ display: "grid", gap: 8 }}>
            <input placeholder="Nome" value={name} onChange={e=>setName(e.target.value)} required />
            <input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
            <input placeholder="Senha" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn primary" type="submit" disabled={loading}>{loading ? "Registrando..." : "Registrar"}</button>
              <button type="button" className="btn" onClick={() => { setMode("login"); setLocalError(""); }}>Voltar</button>
            </div>
          </form>
        )}

        <div style={{ marginTop: 12, color: "#999", fontSize: 13 }}>
          Ao registrar, você será autenticado automaticamente.
        </div>
      </div>
    );
  }

  // Minimal placeholders for other views (keep yours if you prefer)
  function DashboardView(){ return (<div className="content-panel"><h2>📊 Dashboard</h2><div style={{display:"flex",gap:12}}><div className="panel glass" style={{flex:1}}>{overview ? (<div><div>Total logs: {overview.total}</div><div>Enviadas: {overview.sent}</div><div>Falhas: {overview.failed}</div></div>) : <div>Sem dados</div>}</div><div className="panel glass" style={{flex:1}}>{stats ? <div><div>Ativas: {stats.active}</div><div>Completas: {stats.completed}</div></div> : <div>—</div>}</div></div></div>); }
  function WhatsAppView(){ return (<div className="content-panel"><h2>📨 Enviar WhatsApp</h2><div>Use o formulário de envio</div></div>); }
  function SubsView(){ return (<div className="content-panel"><h2>⏰ Assinaturas</h2><div>Minhas assinaturas</div></div>); }
  function AdminView(){ return (<div className="content-panel"><h2>🛠️ Admin</h2><div>Admin</div></div>); }
  function HistoryView(){ return (<div className="content-panel"><h2>📜 Histórico IA</h2><div>Histórico</div></div>); }
  function ProfileView(){ return (<div className="content-panel"><h2>👤 Perfil</h2><div>{user ? `${user.name} • ${user.email}` : "Não logado"}</div></div>); }

  // final render
  return (
    <div className="app-root">
      <Sidebar
        active={activePage}
        onNavigate={p=>{ setActivePage(p); setMobileOpen(false); }}
        theme={theme}
        onToggleTheme={()=>setTheme(t=>t==="dark"?"light":"dark")}
        user={user}
        onLogout={handleLogout}
      />

      <MobileMenu
        open={mobileOpen}
        onClose={()=>setMobileOpen(false)}
        active={activePage}
        onNavigate={p=>{ setActivePage(p); setMobileOpen(false); }}
        user={user}
        onLogout={handleLogout}
      />

      <div className="main-shell">
        <Topbar />
        <div className="page-body">
          {activePage === "todos" && <TodosView />}
          {activePage === "dashboard" && <DashboardView />}
          {activePage === "whatsapp" && <WhatsAppView />}
          {activePage === "subs" && <SubsView />}
          {activePage === "admin" && <AdminView />}
          {activePage === "history" && <HistoryView />}
          {activePage === "login" && !user && <LoginRegisterView />}
          {activePage === "profile" && user && <ProfileView />}
          {!user && activePage !== "login" && privatePages.includes(activePage) && (
            <div style={{ padding: 24 }}>Você precisa entrar para acessar esta página.</div>
          )}
        </div>
      </div>

      <ChatWidget messages={chatMessages} onSend={sendChatMessage} bottomRef={chatBottomRef} />
    </div>
  );
}
