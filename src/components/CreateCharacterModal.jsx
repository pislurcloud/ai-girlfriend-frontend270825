import { useState } from "react";

export default function CreateCharacterModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [style, setStyle] = useState("");
  const [bio, setBio] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return alert("Name required");
    onSave({ name, persona: { name, style, bio } });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white p-6 rounded w-full max-w-md space-y-3">
        <h3 className="text-lg font-bold">Create character</h3>
        <input className="input" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <input className="input" placeholder="Style (e.g. playful, kind)" value={style} onChange={e => setStyle(e.target.value)} />
        <textarea className="input" placeholder="Bio" value={bio} onChange={e => setBio(e.target.value)} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" className="btn">Save</button>
        </div>
      </form>
    </div>
  );
}
