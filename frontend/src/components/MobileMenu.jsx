// src/components/MobileMenu.jsx
import React from "react";

export default function MobileMenu({ open=false, onClose=()=>{}, active="todos", onNavigate=()=>{} }) {
  return (
    <>
      <div className={open ? "mobile-overlay show" : "mobile-overlay"} onClick={onClose} />
      <aside className={open ? "mobile-drawer open" : "mobile-drawer"}>
        <div className="drawer-head">
          <div className="logo-square">AI</div>
          <button className="close-drawer" onClick={onClose}>✕</button>
        </div>

        <nav className="drawer-nav">
          <button className={active==="todos"?"drawer-item active":"drawer-item"} onClick={()=>onNavigate("todos")}>📋 Tarefas</button>
          <button className={active==="dashboard"?"drawer-item active":"drawer-item"} onClick={()=>onNavigate("dashboard")}>📊 Dashboard</button>
          <button className={active==="whatsapp"?"drawer-item active":"drawer-item"} onClick={()=>onNavigate("whatsapp")}>📨 WhatsApp</button>
          <button className={active==="subs"?"drawer-item active":"drawer-item"} onClick={()=>onNavigate("subs")}>⏰ Assinaturas</button>
          <button className={active==="history"?"drawer-item active":"drawer-item"} onClick={()=>onNavigate("history")}>📜 Histórico</button>
          <button className={active==="admin"?"drawer-item active":"drawer-item"} onClick={()=>onNavigate("admin")}>🛠️ Admin</button>
        </nav>
      </aside>
    </>
  );
}
