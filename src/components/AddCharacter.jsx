import { useState } from "react";
import { addCharacter } from "../api/backend";

export default function AddCharacter({ onAdd }) {
  const [name, setName] = useState("");

  async function handleAdd() {
    if (!name) return;
    await addCharacter(name);
    setName("");
    onAdd(); // refresh the dropdown
  }

  return (
    <div style={{ marginTop: "10px" }}>
      <input
        type="text"
        placeholder="Character Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button onClick={handleAdd}>Add Character</button>
    </div>
  );
}
