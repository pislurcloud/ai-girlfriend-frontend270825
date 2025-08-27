import { useState } from "react";
import AddCharacterModal from "./AddCharacterModal";

export default function Sidebar({ characters, onSelect, setCharacters }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-64 bg-white border-r shadow-md flex flex-col">
      <div className="p-4 font-bold text-xl border-b">AI Characters</div>
      <div className="flex-1 overflow-y-auto">
        {characters.map((c) => (
          <div
            key={c.id}
            onClick={() => onSelect(c)}
            className="p-3 cursor-pointer hover:bg-gray-100"
          >
            <div className="font-semibold">{c.name}</div>
            <div className="text-sm text-gray-600">{c.persona}</div>
          </div>
        ))}
      </div>
      <button
        onClick={() => setOpen(true)}
        className="p-3 bg-blue-500 text-white hover:bg-blue-600"
      >
        ➕ Add Character
      </button>
      {open && <AddCharacterModal setOpen={setOpen} setCharacters={setCharacters} />}
    </div>
  );
}
