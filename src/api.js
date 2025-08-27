import axios from "axios";

// Base API
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
});

// ----------------- User APIs -----------------

/**
 * Create a new user
 * @param {string} username
 * @returns {Object} user {id, username}
 */
export async function createUser(username) {
  try {
    const res = await API.post("/users", { username });
    return res.data;
  } catch (err) {
    console.error("Failed to create user:", err.response?.data || err.message);
    throw err;
  }
}

/**
 * Fetch existing user by username
 * @param {string} username
 * @returns {Object} user {id, username}
 */
export async function getUser(username) {
  try {
    const res = await API.get("/users", { params: { username } });
    return res.data;
  } catch (err) {
    console.error("Failed to fetch user:", err.response?.data || err.message);
    throw err;
  }
}

// ----------------- Character APIs -----------------

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

// ----------------- Memories APIs -----------------

export const fetchMemories = async ({ user_id, character_id }) =>
  (await API.post("/memories", { user_id, character_id })).data;

// ----------------- Chat API -----------------

export const chat = async ({ user_id, character_id, message }) =>
  (await API.post("/chat", { user_id, character_id, message })).data;
