import { useState } from "react";
import { createCharacter } from "../api";

export default function AddCharacterModal({ onClose, onSaved }) {
  const [name, setName] = useState("");
  const [style, setStyle] = useState("kind and supportive");
  const [bio, setBio] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createCharacter({ name, style, bio });
      onSaved?.();
      onClose?.();
    } catch (e) {
      console.error("Create character failed", e);
      alert("Failed to create character. Check backend logs.");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-md p-6 rounded-xl shadow-lg space-y-4"
      >
        <h2 className="text-xl font-bold">Add Character</h2>
        <div className="space-y-2">
          <label className="text-sm font-medium">Name</label>
          <input
            className="w-full border rounded p-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Maya"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Style</label>
          <input
            className="w-full border rounded p-2"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            placeholder="e.g., playful, flirty, supportive"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Bio / Persona</label>
          <textarea
            className="w-full border rounded p-2"
            rows="4"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Short description, interests, vibe..."
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="px-4 py-2 border rounded" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}