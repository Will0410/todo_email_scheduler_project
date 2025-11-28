import { useState, useRef, useEffect } from "react";

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef();

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const res = await fetch("http://localhost:5000/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();

      const botMsg = {
        role: "assistant",
        content: data.reply || "Erro ao responder 😢",
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Erro de conexão com o servidor." },
      ]);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="bg-zinc-800 w-full max-w-md h-[90vh] rounded-2xl shadow-xl flex flex-col overflow-hidden border border-zinc-700">

      {/* Header */}
      <div className="bg-zinc-900 p-4 text-lg font-semibold border-b border-zinc-700">
        🤖 Chat IA
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-2 max-w-[80%] rounded-xl ${
              msg.role === "user"
                ? "bg-green-600 text-white self-end ml-auto"
                : "bg-zinc-700 text-gray-200"
            }`}
          >
            {msg.content}
          </div>
        ))}
        <div ref={bottomRef}></div>
      </div>

      {/* Footer input */}
      <div className="p-3 bg-zinc-900 border-t border-zinc-700 flex gap-2">
        <input
          className="flex-1 p-2 rounded-lg bg-zinc-700 text-white outline-none"
          placeholder="Digite sua mensagem..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          className="bg-green-600 px-4 rounded-lg font-semibold hover:bg-green-500"
          onClick={sendMessage}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
