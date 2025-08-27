import { useEffect, useState } from "react";
import { getCharacters } from "./api";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import LoginModal from "./components/LoginModal";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null); // logged-in user
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

  useEffect(() => { loadCharacters(); }, []);

  if (!currentUser) {
    return <LoginModal onLogin={setCurrentUser} />;
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        characters={characters}
        onSelect={setSelected}
        selectedId={selected?.id}
        reload={loadCharacters}
      />
      <ChatWindow
        userId={currentUser.id}
        character={selected}
      />
    </div>
  );
}
