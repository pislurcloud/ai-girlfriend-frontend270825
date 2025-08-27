import { useEffect, useState } from "react";
import { getCharacters } from "./api";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import LoginModal from "./components/LoginModal";

export default function App() {
  const [user, setUser] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [selected, setSelected] = useState(null);

  async function loadCharacters() {
    try {
      const data = await getCharacters();
      setCharacters(data);
      if (!selected && data?.length) setSelected(data[0]);
    } catch (e) {
      console.error("Failed to load characters", e);
    }
  }

  useEffect(() => {
    if (user) loadCharacters();
  }, [user]);

  return (
    <div className="flex h-screen">
      {!user && <LoginModal onLogin={setUser} />}
      {user && (
        <>
          <Sidebar
            characters={characters}
            onSelect={setSelected}
            selectedId={selected?.id}
            reload={loadCharacters}
          />
          <ChatWindow
            userId={user.id}
            character={selected}
          />
        </>
      )}
    </div>
  );
}
