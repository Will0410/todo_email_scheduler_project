// frontend/src/App.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

/**
 * Monolito App.jsx — integra:
 * - Tarefas (CRUD)
 * - Chatbot inline + widget
 * - Painel Admin / Dashboard
 * - Envio de WhatsApp manual
 * - Assinaturas (agenda automática)
 *
 * Arquitetura: sidebar fixa, conteúdo muda conforme `activePage`.
 */

// ----- CONFIG -----
const API_BASE = "http://localhost:5000"; // <- ajuste se necessário
const API_TODOS = `${API_BASE}/todos`;
const API_AI = `${API_BASE}/api/ai`;
const API_SEND_WA = `${API_BASE}/api/send-whatsapp`;
const API_SUBS = `${API_BASE}/api/subscriptions`;
const API_ADMIN_OVERVIEW = `${API_BASE}/api/admin/overview`;
const API_ADMIN_LOGS = `${API_BASE}/api/admin/logs`;
const API_ADMIN_CONVS = `${API_BASE}/api/admin/conversations`;
const API_HISTORY = `${API_BASE}/api/history`;
const API_STATS_OVERVIEW = `${API_BASE}/api/stats/overview`;

// ----- UTIL -----
function nowLocalISOStringSlice16() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - tz);
  return local.toISOString().slice(0, 16);
}
function safeJsonParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

// Configure axios header if token in localStorage
const savedToken = localStorage.getItem("token");
if (savedToken) axios.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;

// ----- APP -----
export default function App() {
  // UI/navigation
  const [activePage, setActivePage] = useState("todos"); // todos | dashboard | whatsapp | subs | admin | history | login
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  // Auth / user (minimal)
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });
  const [authForm, setAuthForm] = useState({ email: "", password: "", name: "" });
  const [authError, setAuthError] = useState("");

  // Todos
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

  // Chatbot
  const [chatInput, setChatInput] = useState("");
  const [chatQuickReply, setChatQuickReply] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);
  const [typing, setTyping] = useState(false);

  // WA manual
  const [waForm, setWaForm] = useState({ to: "", text: "" });
  const [waSending, setWaSending] = useState(false);

  // Subscriptions
  const [mySubs, setMySubs] = useState([]);
  const [newSub, setNewSub] = useState({ name: "", whatsapp: "", email: "", time: "09:00", repeat: "daily" });

  // Admin / Dashboard
  const [overview, setOverview] = useState(null);
  const [logs, setLogs] = useState([]);
  const [convs, setConvs] = useState([]);
  const [stats, setStats] = useState(null);

  // History
  const [serverHistory, setServerHistory] = useState([]);

  // Theme effect
  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // ----- TODOS functions -----
  async function loadTodos() {
    try {
      const res = await axios.get(API_TODOS);
      setTodos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Erro ao carregar todos:", err);
      setTodos([]);
    }
  }
  useEffect(() => { loadTodos(); }, []);

  function addTag() {
    if (!input.tagInput || !input.tagInput.trim()) return;
    setInput(prev => ({ ...prev, tags: [...prev.tags, prev.tagInput.trim()], tagInput: "" }));
  }
  function removeTag(tag) {
    setInput(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  }
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
  }

  async function handleRemove(id) {
    try { await axios.delete(`${API_TODOS}/${id}`); loadTodos(); } catch (err) { console.error("Erro ao remover:", err); }
  }
  async function toggleCompleted(id, current) {
    try { await axios.put(`${API_TODOS}/${id}`, { completed: !current }); loadTodos(); } catch (err) { console.error(err); }
  }

  // Quick reminder actions
  async function sendReminderWhatsApp(todo) {
    const text = `Lembrete: ${todo.title}\n${todo.description || ""}`;
    try {
      await axios.post(API_SEND_WA, { to: todo.whatsapp || todo.phone || "", text });
      alert("Enfileirado envio WhatsApp.");
    } catch (err) { console.error(err); alert("Erro ao enfileirar WA"); }
  }
  async function sendReminderEmail(todo) {
    try {
      const payload = { action: "send_email", to: todo.email, subject: `Lembrete: ${todo.title}`, text: todo.description || "" };
      await axios.post(API_AI, { message: JSON.stringify(payload) });
      alert("Email agendado/enfileirado.");
    } catch (err) { console.error(err); alert("Erro ao agendar email"); }
  }

  // ----- CHATBOT functions -----
  useEffect(() => {
    if (!chatInput.trim()) { if (!widgetOpen) setChatQuickReply(""); return; }
    if (widgetOpen) return;
    const timer = setTimeout(() => askAIInline(chatInput), 600);
    return () => clearTimeout(timer);
  }, [chatInput, widgetOpen]);

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
      setChatQuickReply("❌ Erro ao se comunicar com a IA.");
      console.error(err);
    } finally { setTyping(false); }
  }

  async function sendChatMessage() {
    const text = chatInput.trim(); if (!text) return;
    setChatMessages(m => [...m, { role: "user", text }]);
    setChatInput(""); setChatLoading(true);
    try {
      const res = await axios.post(API_AI, { message: text });
      const reply = res.data?.reply || "—";
      setChatMessages(m => [...m, { role: "bot", text: typeof reply === "string" ? reply : JSON.stringify(reply) }]);
      const json = safeJsonParse(reply);
      if (json && json.action) handleAIAction(json);
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages(m => [...m, { role: "bot", text: "❌ Erro ao se comunicar com a IA." }]);
    } finally { setChatLoading(false); }
  }

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, chatLoading]);

  async function handleAIAction(json) {
    try {
      if (json.action === "send_whatsapp") {
        if (!json.to || json.body === undefined) { alert("IA pediu envio WA, faltam campos"); return; }
        const r = await axios.post(API_SEND_WA, { to: json.to, text: json.body });
        setChatMessages(m => [...m, { role: "bot", text: `📱 Enfileirado envio WA (logId: ${r.data.logId || "-"})` }]);
      } else if (json.action === "send_email") {
        const forward = await axios.post(API_AI, { message: JSON.stringify(json) });
        setChatMessages(m => [...m, { role: "bot", text: forward.data.reply }]);
      } else if (json.action === "schedule_daily") {
        try { await axios.post(API_SUBS, { name: json.name || "Auto", whatsapp: json.whatsapp, email: json.email, time: json.time || "09:00" }); loadMySubs(); setChatMessages(m => [...m, { role: "bot", text: "✅ Assinatura criada." }]); }
        catch (err) { setChatMessages(m => [...m, { role: "bot", text: "⚠️ Falha ao criar assinatura." }]); }
      } else {
        setChatMessages(m => [...m, { role: "bot", text: `Ação desconhecida: ${json.action}` }]);
      }
    } catch (err) {
      console.error("handleAIAction error:", err);
    }
  }

  // ----- WHATSAPP manual -----
  async function sendWhatsAppManual(e) {
    e && e.preventDefault();
    if (!waForm.to || !waForm.text) { alert("Preencha número e texto"); return; }
    try {
      setWaSending(true);
      const r = await axios.post(API_SEND_WA, { to: waForm.to, text: waForm.text });
      alert(`Enfileirado (logId: ${r.data.logId || "-"})`);
      setWaForm({ to: "", text: "" });
    } catch (err) {
      console.error("sendWA error:", err);
      alert("Erro ao enfileirar WhatsApp");
    } finally { setWaSending(false); }
  }

  // ----- SUBSCRIPTIONS -----
  async function loadMySubs() {
    try { const r = await axios.get(API_SUBS); setMySubs(r.data || []); } catch (err) { console.error(err); setMySubs([]); }
  }
  async function createSubscription(e) {
    e.preventDefault();
    try { await axios.post(API_SUBS, newSub); setNewSub({ name: "", whatsapp: "", email: "", time: "09:00", repeat: "daily" }); loadMySubs(); alert("Assinatura criada."); } catch (err) { console.error(err); alert("Erro ao criar assinatura"); }
  }

  // ----- ADMIN / STATS -----
  async function loadAdminOverview() {
    try { const r = await axios.get(API_ADMIN_OVERVIEW); setOverview(r.data); } catch (err) { console.error(err); setOverview(null); }
  }
  async function loadAdminLogs() { try { const r = await axios.get(API_ADMIN_LOGS); setLogs(r.data || []); } catch (err) { console.error(err); setLogs([]); } }
  async function loadConvs() { try { const r = await axios.get(API_ADMIN_CONVS); setConvs(r.data || []); } catch (err) { console.error(err); setConvs([]); } }
  async function loadStats() { try { const r = await axios.get(API_STATS_OVERVIEW); setStats(r.data); } catch (err) { console.error(err); setStats(null); } }

  // ----- HISTORY -----
  async function loadHistory() { try { const r = await axios.get(API_HISTORY + "?limit=100"); setServerHistory(r.data || []); } catch (err) { console.error(err); setServerHistory([]); } }

  // ----- AUTH (basic login/register) -----
  async function handleLogin(e) {
    e.preventDefault();
    setAuthError("");
    try {
      const r = await axios.post(`${API_BASE}/api/auth/login`, { email: authForm.email, password: authForm.password });
      localStorage.setItem("token", r.data.token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${r.data.token}`;
      localStorage.setItem("user", JSON.stringify(r.data.user));
      setUser(r.data.user);
      setActivePage("todos");
      setAuthForm({ email: "", password: "", name: "" });
    } catch (err) {
      console.error("login error:", err);
      setAuthError(err.response?.data?.error || "Falha no login");
    }
  }
  async function handleRegister(e) {
    e.preventDefault();
    setAuthError("");
    try {
      const r = await axios.post(`${API_BASE}/api/auth/register`, { email: authForm.email, password: authForm.password, name: authForm.name });
      localStorage.setItem("token", r.data.token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${r.data.token}`;
      localStorage.setItem("user", JSON.stringify(r.data.user));
      setUser(r.data.user);
      setActivePage("todos");
      setAuthForm({ email: "", password: "", name: "" });
    } catch (err) {
      console.error("register error:", err);
      setAuthError(err.response?.data?.error || "Falha no register");
    }
  }
  function handleLogout() {
    localStorage.removeItem("token"); delete axios.defaults.headers.common["Authorization"]; localStorage.removeItem("user"); setUser(null); setActivePage("login");
  }

  // Load data when changing pages
  useEffect(() => {
    if (activePage === "admin") { loadAdminOverview(); loadAdminLogs(); loadConvs(); }
    if (activePage === "stats") loadStats();
    if (activePage === "subs") loadMySubs();
    if (activePage === "history") loadHistory();
    // always refresh todos on todos view
    if (activePage === "todos") loadTodos();
  }, [activePage]);

  // ----- RENDER PIECES -----
  function Sidebar() {
    return (
      <aside className="sidebar glass">
        <div className="sidebar-top">
          <div className="logo">AI</div>
          <h3>Todo+AI</h3>
        </div>

        <nav className="sidebar-nav">
          <button className={activePage==="todos" ? "active" : ""} onClick={() => setActivePage("todos")}>📋 Tarefas</button>
          <button className={activePage==="dashboard" ? "active" : ""} onClick={() => setActivePage("dashboard")}>📊 Dashboard</button>
          <button className={activePage==="whatsapp" ? "active" : ""} onClick={() => setActivePage("whatsapp")}>📨 WhatsApp</button>
          <button className={activePage==="subs" ? "active" : ""} onClick={() => setActivePage("subs")}>⏰ Assinaturas</button>
          <button className={activePage==="history" ? "active" : ""} onClick={() => setActivePage("history")}>📜 Histórico IA</button>
          <button className={activePage==="admin" ? "active" : ""} onClick={() => setActivePage("admin")}>🛠️ Admin</button>
          <button className={activePage==="login" ? "active" : ""} onClick={() => setActivePage("login")}>{user ? "Perfil" : "Entrar"}</button>
          <div style={{ marginTop: 12 }}>
            <button className="theme-toggle" onClick={() => setTheme(t => t==="light"?"dark":"light")}>{theme==="light"?"🌙":"☀️"}</button>
            {user && <button className="btn tiny" onClick={handleLogout} style={{ marginLeft: 8 }}>Sair</button>}
          </div>
        </nav>
      </aside>
    );
  }

  function TodosView() {
    return (
      <div className="content-panel">
        <h2>{editingTodo ? "Editar tarefa" : "Nova tarefa"}</h2>
        <form className="task-form" onSubmit={handleSubmit}>
          <div className="field"><span>Título</span><input value={input.title} onChange={e => setInput({...input, title: e.target.value})} required /></div>
          <div className="field"><span>Descrição</span><textarea value={input.description} onChange={e => setInput({...input, description: e.target.value})} /></div>
          <div className="field"><span>Email</span><input type="email" value={input.email} onChange={e => setInput({...input, email: e.target.value})} /></div>
          <div className="field"><span>WhatsApp</span><input placeholder="5511999999999" value={input.whatsapp} onChange={e => setInput({...input, whatsapp: e.target.value})} /></div>
          <div className="two-col">
            <div className="field"><span>Data limite</span><input type="datetime-local" value={input.due} min={nowLocalISOStringSlice16()} onChange={e => setInput({...input, due: e.target.value})} required /></div>
            <div className="field"><span>Prioridade</span><select value={input.priority} onChange={e => setInput({...input, priority: e.target.value})}><option>Alta</option><option>Média</option><option>Baixa</option></select></div>
          </div>
          <div className="field"><span>Repetição</span><select value={input.repeat} onChange={e => setInput({...input, repeat: e.target.value})}><option value="nenhum">Nenhum</option><option value="diario">Diário</option><option value="semanal">Semanal</option><option value="mensal">Mensal</option></select></div>

          <div className="tags-row">
            {input.tags.map((tag,i) => <div key={i} className="tag" onClick={() => removeTag(tag)}>{tag} ✖</div>)}
            <input className="tag-input" placeholder="Adicionar tag" value={input.tagInput} onChange={e => setInput({...input, tagInput: e.target.value})} />
            <button type="button" className="btn tiny primary" onClick={addTag}>+</button>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn primary" type="submit">{editingTodo ? "Salvar" : "Adicionar"}</button>
            {editingTodo && <button type="button" className="btn ghost" onClick={resetForm}>Cancelar</button>}
          </div>
        </form>

        <hr />

        <h2>Tarefas</h2>
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
                    {todo.tags?.map((t,i) => <span key={i} className="pill">#{t}</span>)}
                    <span className="muted">📅 {todo.due ? new Date(todo.due).toLocaleString() : "—"}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn small primary" onClick={() => toggleCompleted(todo._id, todo.completed)}>{todo.completed ? "Desmarcar" : "Concluir"}</button>
                <button className="btn small ghost" onClick={() => handleEdit(todo)}>Editar</button>
                <button className="btn small ghost" onClick={() => handleRemove(todo._id)}>Excluir</button>
                <button className="btn small" onClick={() => sendReminderWhatsApp(todo)}>Enviar WA</button>
                <button className="btn small" onClick={() => sendReminderEmail(todo)}>Enviar Email</button>
              </div>
            </li>
          ))}
        </ul>

        {/* Inline assistant quick */}
        <div style={{ marginTop: 12 }}>
          <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Pergunte algo..." />
          <button className="btn primary" onClick={() => askAIInline(chatInput)}>{typing ? "..." : "Enviar"}</button>
          {chatQuickReply && <div className="ai-quick-reply" style={{ marginTop: 8 }}>{chatQuickReply}</div>}
        </div>
      </div>
    );
  }

  function DashboardView() {
    return (
      <div className="content-panel">
        <h2>📊 Dashboard</h2>
        <button className="btn tiny" onClick={() => { loadAdminOverview(); loadStats(); }}>Atualizar</button>

        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <div className="panel glass" style={{ flex: 1 }}>
            <h4>Overview</h4>
            {overview ? (
              <div>
                <div>Total logs: {overview.total}</div>
                <div>Enviadas: {overview.sent}</div>
                <div>Falhas: {overview.failed}</div>
                <div>Retrying: {overview.retrying}</div>
                <div>Conversas: {overview.convs}</div>
                <div>Subscriptions: {overview.subs}</div>
              </div>
            ) : <div>Sem dados</div>}
          </div>

          <div className="panel glass" style={{ flex: 1 }}>
            <h4>Estatísticas</h4>
            {stats ? (
              <div>
                <div>Tarefas ativas: {stats.active}</div>
                <div>Concluídas: {stats.completed}</div>
              </div>
            ) : <div>Nenhuma stat carregada</div>}
          </div>
        </div>
      </div>
    );
  }

  function WhatsAppView() {
    return (
      <div className="content-panel">
        <h2>📨 Enviar WhatsApp</h2>
        <form onSubmit={sendWhatsAppManual}>
          <div className="field"><span>Para</span><input value={waForm.to} onChange={e => setWaForm(f => ({...f, to: e.target.value}))} placeholder="5511999999999" /></div>
          <div className="field"><span>Mensagem</span><textarea value={waForm.text} onChange={e => setWaForm(f => ({...f, text: e.target.value}))} /></div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn primary" type="submit" disabled={waSending}>{waSending ? "Enviando..." : "Enviar"}</button>
            <button className="btn" type="button" onClick={() => setWaForm({to:"", text:""})}>Limpar</button>
          </div>
        </form>
      </div>
    );
  }

  function SubsView() {
    return (
      <div className="content-panel">
        <h2>⏰ Assinaturas</h2>
        <form onSubmit={createSubscription} style={{ display: "grid", gap: 8, maxWidth: 600 }}>
          <input placeholder="Nome" value={newSub.name} onChange={e => setNewSub(s => ({...s, name: e.target.value}))} />
          <input placeholder="WhatsApp" value={newSub.whatsapp} onChange={e => setNewSub(s => ({...s, whatsapp: e.target.value}))} />
          <input placeholder="Email" value={newSub.email} onChange={e => setNewSub(s => ({...s, email: e.target.value}))} />
          <div style={{ display: "flex", gap: 8 }}>
            <input type="time" value={newSub.time} onChange={e => setNewSub(s => ({...s, time: e.target.value}))} />
            <select value={newSub.repeat} onChange={e => setNewSub(s => ({...s, repeat: e.target.value}))}>
              <option value="daily">Diário</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option>
            </select>
            <button className="btn primary" type="submit">Criar</button>
          </div>
        </form>

        <div style={{ marginTop: 12 }}>
          <button className="btn tiny" onClick={loadMySubs}>Atualizar assinaturas</button>
          <ul>
            {mySubs.map(s => <li key={s._id}>{s.name} • {s.email} • {s.whatsapp} • {s.time} • {s.repeat}</li>)}
          </ul>
        </div>
      </div>
    );
  }

  function AdminView() {
    return (
      <div className="content-panel">
        <h2>🛠️ Admin</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }} className="panel glass">
            <h4>Últimos Logs</h4>
            <button className="btn tiny" onClick={loadAdminLogs}>Atualizar Logs</button>
            <ul style={{ maxHeight: 300, overflowY: "auto" }}>{logs.map(l => <li key={l._id}>{l.channel} → {l.to} • {l.status} • {l.attempts}</li>)}</ul>
          </div>

          <div style={{ flex: 1 }} className="panel glass">
            <h4>Conversas</h4>
            <button className="btn tiny" onClick={loadConvs}>Atualizar</button>
            <ul style={{ maxHeight: 300, overflowY: "auto" }}>{convs.map(c => <li key={c._id}>{new Date(c.createdAt).toLocaleString()} • {c.role}: {String(c.message).slice(0,200)}</li>)}</ul>
          </div>
        </div>
      </div>
    );
  }

  function HistoryView() {
    return (
      <div className="content-panel">
        <h2>📜 Histórico IA (Server)</h2>
        <button className="btn tiny" onClick={loadHistory}>Atualizar</button>
        <ul>{serverHistory.map(h => <li key={h._id}>{new Date(h.createdAt).toLocaleString()} • {h.role}: {String(h.message).slice(0,200)}</li>)}</ul>
      </div>
    );
  }

  function LoginView() {
    return (
      <div className="content-panel">
        <h2>Entrar / Registrar</h2>
        <form onSubmit={handleLogin} style={{ display: "grid", gap: 8, maxWidth: 420 }}>
          <input placeholder="email" value={authForm.email} onChange={e => setAuthForm(f => ({...f, email: e.target.value}))} />
          <input placeholder="senha" type="password" value={authForm.password} onChange={e => setAuthForm(f => ({...f, password: e.target.value}))} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn primary" type="submit">Entrar</button>
            <button className="btn" type="button" onClick={handleRegister}>Registrar</button>
          </div>
          {authError && <div style={{ color: "red" }}>{authError}</div>}
        </form>
      </div>
    );
  }

  // Chat widget bottom/right (persistent)
  function ChatWidget() {
    return (
      <div className="widget-wrap">
        {widgetOpen && (
          <div className="glass-widget">
            <div className="widget-head">
              <div className="avatar neon">AI</div>
              <div>
                <div className="widget-title">Assistente</div>
                <div className="widget-sub">Pronto para ajudar</div>
              </div>
              <div className="widget-controls">
                <button className="icon-btn" onClick={() => setChatMessages([])}>Limpar</button>
                <button className="icon-btn" onClick={() => setWidgetOpen(false)}>✕</button>
              </div>
            </div>

            <div className="widget-body">
              {chatMessages.length === 0 && <div className="widget-empty">Diga algo para começar!</div>}
              <div className="messages">
                {chatMessages.map((m,i) => <div key={i} className={`msg ${m.role === "user" ? "msg-user" : "msg-bot"}`}>{m.text}</div>)}
                <div ref={chatBottomRef} />
              </div>
            </div>

            <div className="widget-input">
              <textarea value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }}} />
              <div className="widget-input-actions">
                <button className="btn primary" onClick={sendChatMessage} disabled={chatLoading}>{chatLoading ? "..." : "Enviar"}</button>
              </div>
            </div>
          </div>
        )}

        <button className="floating-btn" onClick={() => setWidgetOpen(w => !w)}>
          <div className="floating-avatar">AI</div>
        </button>
      </div>
    );
  }

  // ----- MAIN RENDER -----
  return (
    <>
      <div className="app-glow" />
      <div className="container main-layout">
        <Sidebar />

        <main className="main-content">
          {/* Topbar */}
          <div className="topbar">
            <div className="brand">
              <div className="logo">AI</div>
              <div className="brand-text"><h1>Todo+AI</h1><span>Organização • Inteligência</span></div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {user ? <div style={{ marginRight: 8 }}>{user.name || user.email}</div> : <div>Não logado</div>}
              <button className="btn tiny" onClick={() => { setActivePage("dashboard"); }}>Dashboard</button>
              <button className="theme-toggle" onClick={() => setTheme(t => t==="light"?"dark":"light")}>{theme==="light"?"🌙":"☀️"}</button>
            </div>
          </div>

          {/* content selector */}
          <div className="content-area">
            {activePage === "todos" && <TodosView />}
            {activePage === "dashboard" && <DashboardView />}
            {activePage === "whatsapp" && <WhatsAppView />}
            {activePage === "subs" && <SubsView />}
            {activePage === "admin" && <AdminView />}
            {activePage === "history" && <HistoryView />}
            {activePage === "login" && <LoginView />}
          </div>
        </main>

        <ChatWidget />
      </div>
    </>
  );
}
