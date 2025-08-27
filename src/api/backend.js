import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE;

export const getCharacters = async () => {
  const res = await axios.get(`${API_BASE}/characters`);
  return res.data;
};

export const sendChat = async ({ user_id, character_id, message }) => {
  const res = await axios.post(`${API_BASE}/chat`, {
    user_id,
    character_id,
    message
  });
  return res.data;
};

export const getMemories = async ({ user_id, character_id }) => {
  const res = await axios.post(`${API_BASE}/memories`, { user_id, character_id });
  return res.data;
};
