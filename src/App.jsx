import { useEffect, useState } from "react";
import { getCharacters } from "./api";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";

const USER_ID = import.meta.env.VITE_USER_ID || "test-user-123"; // set in Vercel

export default function App() {
  const [characters, setCharacters] = useState([]);
  const [selected, setSelected] = useState(null);

  async function loadCharacters() {
    try {
      const data = await getCharacters();
      setCharacters(data);
      // auto-select first character if none selected
      if (!selected && data?.length) setSelected(data[0]);
    } catch (e) {
      console.error("Failed to load characters", e);
    }
  }

  useEffect(() => { loadCharacters(); }, []);

  return (
    <div className="flex h-screen">
      <Sidebar
        characters={characters}
        onSelect={setSelected}
        selectedId={selected?.id}
        reload={loadCharacters}
      />
      <ChatWindow
        userId={USER_ID}
        character={selected}
      />
    </div>
  );
}