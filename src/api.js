import axios from "axios";

// Set this in Vercel: VITE_API_BASE=https://ai-girlfriend-backend26082025.onrender.com
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
});

// ----------------- Users -----------------

/**
 * Create a new user in the backend
 * @param {string} username
 * @returns {object} created user object
 */
export const createUser = async (username) => {
  try {
    const payload = { username };
    const res = await API.post("/users", payload);
    return res.data.user;
  } catch (err) {
    console.error("Failed to create user:", err);
    throw err;
  }
};

/**
 * Get an existing user by username
 * @param {string} username
 * @returns {object|null} user object or null if not found
 */
export const getUser = async (username) => {
  try {
    const res = await API.get(`/users?username=${encodeURIComponent(username)}`);
    return res.data.user || null;
  } catch (err) {
    console.error("Failed to get user:", err);
    return null;
  }
};

// ----------------- Characters -----------------

export async function getCharacters() {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/characters`);
    if (!res.ok) throw new Error(`Failed to fetch characters: ${res.statusText}`);
    const data = await res.json();
    return data.characters || [];
  } catch (err) {
    console.error("Error fetching characters:", err);
    return [];
  }
}

export const createCharacter = async ({ name, style, bio }) => {
  const payload = { name, persona: { name, style, bio } };
  return (await API.post("/characters", payload)).data;
};

// ----------------- Memories -----------------

export const fetchMemories = async ({ user_id, character_id }) =>
  (await API.post("/memories", { user_id, character_id })).data;

// ----------------- Chat -----------------

export const chat = async ({ user_id, character_id, message }) =>
  (await API.post("/chat", { user_id, character_id, message })).data;
