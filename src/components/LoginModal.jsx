import { useState } from "react";
import { getUser, createUser } from "../api";

export default function LoginModal({ onLogin }) {
  const [inputName, setInputName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!inputName.trim()) return;
    setLoading(true);

    try {
      // Attempt to fetch existing user
      let user = await getUser(inputName.trim());
      
      // If user not found, create a new one
      if (!user) {
        user = await createUser({ name: inputName.trim() });
      }

      // Notify parent component
      onLogin(user);
    } catch (err) {
      console.error("Login failed", err);
      alert("Login failed. Check backend logs.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-[350px] shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-center">Login / Create User</h2>
        <input
          type="text"
          value={inputName}
          onChange={(e) => setInputName(e.target.value)}
          placeholder="Enter your name"
          className="w-full p-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
        >
          {loading ? "Processing..." : "Continue"}
        </button>
      </div>
    </div>
  );
}
