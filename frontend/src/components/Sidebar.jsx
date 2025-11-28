// src/components/Sidebar.jsx
import React from "react";

export default function Sidebar({ active="todos", onNavigate=()=>{}, theme="dark", onToggleTheme=()=>{} }) {
  return (
    <aside className="sidebar side-dark">
      <div className="sidebar-top">
        <div className="logo-square">AI</div>
        <div className="brand">
          <strong>Todo+AI</strong>
          <small>Organização • Inteligência</small>
        </div>
      </div>

      <nav className="nav">
        <button className={active==="todos"?"nav-item active":"nav-item"} onClick={()=>onNavigate("todos")}>📋 Tarefas</button>
        <button className={active==="dashboard"?"nav-item active":"nav-item"} onClick={()=>onNavigate("dashboard")}>📊 Dashboard</button>
        <button className={active==="whatsapp"?"nav-item active":"nav-item"} onClick={()=>onNavigate("whatsapp")}>📨 WhatsApp</button>
        <button className={active==="subs"?"nav-item active":"nav-item"} onClick={()=>onNavigate("subs")}>⏰ Assinaturas</button>
        <button className={active==="history"?"nav-item active":"nav-item"} onClick={()=>onNavigate("history")}>📜 Histórico</button>
        <button className={active==="admin"?"nav-item active":"nav-item"} onClick={()=>onNavigate("admin")}>🛠️ Admin</button>
        <div className="nav-footer">
          <button className="nav-item" onClick={onToggleTheme}>🌓 Tema</button>
        </div>
      </nav>
    </aside>
  );
}
