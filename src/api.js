// Set this in Vercel: VITE_API_BASE=https://ai-girlfriend-backend26082025.onrender.com
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE
});

// BACKEND CONTRACT USED:
// GET    /characters
// POST   /characters          { name, persona: { name, style, bio } }
// POST   /memories            { user_id, character_id } -> returns array of { message, response, created_at? }
// POST   /chat                { user_id, character_id, message } -> { reply }

export const getCharacters = async () => (await API.get("/characters")).data;

export const createCharacter = async ({ name, style, bio }) => {
  const payload = { name, persona: { name, style, bio } };
  return (await API.post("/characters", payload)).data;
};

export const fetchMemories = async ({ user_id, character_id }) =>
  (await API.post("/memories", { user_id, character_id })).data;

export const chat = async ({ user_id, character_id, message }) =>
  (await API.post("/chat", { user_id, character_id, message })).data;+