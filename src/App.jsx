import { useEffect, useState } from "react";
import { getCharacters, getUser, createUser } from "./api";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import LoginModal from "./components/LoginModal";

export default function App() {
  const [user, setUser] = useState(null);        // logged-in user object
  const [characters, setCharacters] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loginOpen, setLoginOpen] = useState(true);

  // Load characters from backend
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

  // Handle login or new user creation
  const handleLogin = async (username) => {
    if (!username?.trim()) return;
    try {
      let existing = await getUser(username);
      if (!existing) {
        // create new user if doesn't exist
        existing = await createUser(username);
      }
      setUser(existing);
      setLoginOpen(false);
    } catch (e) {
      console.error("Login failed", e);
      alert("Failed to login. Try again.");
    }
  };

  if (loginOpen) {
    return <LoginModal onLogin={handleLogin} />;
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
        userId={user.id}          // pass the logged-in user's ID
        character={selected}
      />
    </div>
  );
}
