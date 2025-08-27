import { useEffect, useState } from "react";
import { getCharacters } from "../api/backend";

export default function CharacterSelector({ selected, onSelect }) {
  const [characters, setCharacters] = useState([]);

  useEffect(() => {
    getCharacters().then(setCharacters);
  }, []);

  return (
    <select value={selected} onChange={(e) => onSelect(e.target.value)}>
      <option value="">Select a character</option>
      {characters.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
