import { useEffect, useState } from "react";
import { getCharactersForUser, createCharacterForUser } from "../api";
import { useAuth } from "../AuthContext";
import CreateCharacterModal from "./CreateCharacterModal";

export default function CharacterList({ onSelect }) {
  const { user } = useAuth();
  const [characters, setCharacters] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!user) return setCharacters([]);
    setLoading(true);
    const list = await getCharactersForUser(user.id);
    setCharacters(list || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user]);

  async function handleCreate(payload) {
    await createCharacterForUser({ user_id: user.id, ...payload });
    setOpen(false);
    load();
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold">Your characters</h3>
        <button onClick={() => setOpen(true)} className="btn">+ New</button>
      </div>

      {loading ? <div>Loading…</div> : (
        <div className="space-y-2">
          {characters.map(c => (
            <button key={c.id} onClick={() => onSelect(c)} className="p-3 border rounded w-full text-left">
              <div className="font-semibold">{c.name}</div>
              <div className="text-sm text-gray-600">{typeof c.persona === 'object' ? c.persona.style : c.persona}</div>
            </button>
          ))}
          {!characters.length && <div className="text-sm text-gray-500">No characters yet.</div>}
        </div>
      )}

      {open && <CreateCharacterModal onClose={() => setOpen(false)} onSave={handleCreate} />}
    </div>
  );
}
