import { useEffect, useState } from "react";
import { getCharacters } from "../api/backend";

export default function CharacterSelector({ selectedCharacter, onSelect }) {
  const [characters, setCharacters] = useState([]);

  async function loadCharacters() {
    const data = await getCharacters();
    setCharacters(data);
  }

  useEffect(() => {
    loadCharacters();
  }, []);

  return (
    <div>
      <select value={selectedCharacter} onChange={(e) => onSelect(e.target.value)}>
        <option value="">Select a character</option>
        {characters.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}
