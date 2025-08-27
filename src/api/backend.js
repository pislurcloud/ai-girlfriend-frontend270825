import axios from "axios";

const BASE_URL = "https://ai-girlfriend-backend26082025.onrender.com";

export async function getCharacters() {
  const res = await axios.get(`${BASE_URL}/characters`);
  return res.data;
}

export async function addCharacter(name) {
  const res = await axios.post(`${BASE_URL}/characters`, {
    name,
    persona: { name, style: "kind and supportive" }
  });
  return res.data;
}

export async function sendMessage(user_id, character_id, message) {
  const res = await axios.post(`${BASE_URL}/chat`, {
    user_id,
    character_id,
    message
  });
  return res.data;
}
