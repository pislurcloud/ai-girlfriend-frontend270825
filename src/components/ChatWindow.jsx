import { useEffect, useState, useRef } from "react";
import { fetchMemories, chat } from "../api";
import MessageInput from "./MessageInput";

export default function ChatWindow({ userId, character }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const scroller = useRef(null);

  async function loadMemories() {
    if (!userId || !character?.id) return;
    try {
      const data = await fetchMemories({ user_id: userId, character_id: character.id });
      // data is array of rows: { message, response, created_at? }
      const flat = [];
      for (const row of data) {
        if (row.message) flat.push({ sender: "you", text: row.message });
        if (row.response) flat.push({ sender: "ai", text: row.response });
      }
      setMessages(flat);
      // scroll after render
      setTimeout(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }), 0);
    } catch (e) {
      console.error("Failed to fetch memories", e);
    }
  }

  useEffect(() => { loadMemories(); }, [userId, character?.id]);

  async function handleSend(text) {
    if (!text?.trim() || !character?.id) return;
    setLoading(true);
    const optimistic = [...messages, { sender: "you", text }];
    setMessages(optimistic);
    try {
      const res = await chat({ user_id: userId, character_id: character.id, message: text });
      const next = [...optimistic, { sender: "ai", text: res.reply }];
      setMessages(next);
      setTimeout(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }), 0);
    } catch (e) {
      console.error("Chat failed", e);
      alert("Chat failed. Check backend logs.");
    } finally {
      setLoading(false);
    }
  }

  if (!character) {
    return (
      <main className="flex flex-1 items-center justify-center text-gray-500">
        Select a character to start chatting
      </main>
    );
  }

  return (
    <main className="flex flex-col flex-1">
      <header className="p-4 border-b bg-white">
        <div className="font-bold text-lg">{character.name}</div>
        <div className="text-sm text-gray-600">
          {typeof character.persona === "object"
            ? [character.persona.style, character.persona.bio].filter(Boolean).join(" • ")
            : (character.persona || "")}
        </div>
      </header>
      <div ref={scroller} className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[75%] p-3 rounded-2xl ${
              m.sender === "you" ? "ml-auto bg-blue-600 text-white" : "mr-auto bg-white shadow"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>
      <MessageInput onSend={handleSend} disabled={loading} />
    </main>
  );
}