// src/components/ChatWidget.jsx
import React, { useState } from "react";

export default function ChatWidget({ messages=[], onSend=()=>{}, bottomRef=null }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    await onSend(text);
    setText("");
    setSending(false);
    bottomRef?.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <div className={open ? "chat-panel open" : "chat-panel"}>
        <div className="chat-head">
          <div className="avatar">AI</div>
          <div className="chat-title">Assistente</div>
          <button className="close-chat" onClick={()=>setOpen(false)}>✕</button>
        </div>

        <div className="chat-body">
          <div className="msgs">
            {messages.map((m,i) => <div key={i} className={`chat-msg ${m.role==="user"?"user":"bot"}`}>{m.text}</div>)}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="chat-input">
          <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Pergunte algo..." />
          <button className="btn primary" onClick={handleSend} disabled={sending}>{sending?"...":"Enviar"}</button>
        </div>
      </div>

      <button className="chat-toggle" onClick={()=>setOpen(o=>!o)} title="Abrir assistente">
        <div className="floating-avatar">AI</div>
      </button>
    </>
  );
}
