import { useState } from "react";
import { sendMessage } from "../api/backend";

export default function ChatBox({ userId, characterId }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  async function handleSend() {
    if (!message || !characterId) return;
    const res = await sendMessage(userId, characterId, message);
    setMessages([...messages, { user: message, ai: res.reply }]);
    setMessage("");
  }

  return (
    <div style={{ marginTop: "20px" }}>
      <div style={{ maxHeight: "300px", overflowY: "scroll", border: "1px solid #ccc", padding: "10px" }}>
        {messages.map((m, i) => (
          <div key={i}>
            <b>You:</b> {m.user} <br />
            <b>AI:</b> {m.ai}
            <hr />
          </div>
        ))}
      </div>
      <input
        type="text"
        placeholder="Type a message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
