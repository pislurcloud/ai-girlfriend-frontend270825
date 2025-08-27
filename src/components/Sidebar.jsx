import { useEffect, useState } from "react";
import { getCharacters } from "../api";

export default function Sidebar() {
  const [characters, setCharacters] = useState([]);

  useEffect(() => {
    async function loadCharacters() {
      try {
        const chars = await getCharacters();
        console.log("Characters API result:", chars); // 👀 debug
        setCharacters(Array.isArray(chars) ? chars : []);
      } catch (err) {
        console.error("Failed to load characters:", err);
      }
    }
    loadCharacters();
  }, []);

  return (
    <div className="sidebar">
      <h2>Characters</h2>
      {characters.length > 0 ? (
        characters.map((c) => <div key={c.id}>{c.name}</div>)
      ) : (
        <p>No characters found</p>
      )}
    </div>
  );
}
