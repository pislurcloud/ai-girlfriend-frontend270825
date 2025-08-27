import { useState } from "react";

export default function LoginModal({ onLogin }) {
  const [username, setUsername] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    onLogin(username.trim());
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white rounded-xl shadow-lg p-8 w-96">
        <h2 className="text-2xl font-bold mb-4 text-center">Welcome!</h2>
        <p className="mb-6 text-center text-gray-600">
          Enter your username to continue or create a new account.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            type="submit"
            className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 transition"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
