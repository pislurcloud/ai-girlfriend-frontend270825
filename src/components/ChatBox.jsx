import { useState, useEffect } from "react";
import { sendChat, getMemories } from "../api/backend";

export default function ChatBox({ user_id, character_id }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (user_id && character_id) {
      getMemories({ user_id, character_id }).then(setMessages);
    }
  }, [user_id, character_id]);

  const handleSend = async () => {
    if (!input) return;
    const res = await sendChat({ user_id, character_id, message: input });
    setMessages([...messages, { message: input, response: res.reply }]);
    setInput("");
  };

  return (
    <div>
      <div style={{ maxHeight: "300px", overflowY: "scroll" }}>
        {messages.map((m, i) => (
          <div key={i}>
            <strong>You:</strong> {m.message} <br />
            <strong>AI:</strong> {m.response}
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message..."
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
