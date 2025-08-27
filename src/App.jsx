import { useState } from "react";
import CharacterSelector from "./components/CharacterSelector";
import AddCharacter from "./components/AddCharacter";
import ChatBox from "./components/ChatBox";

const USER_ID = "<your_sample_user_id_here>"; // replace with a valid user_id from your DB

function App() {
  const [selectedCharacter, setSelectedCharacter] = useState("");

  return (
    <div style={{ padding: "20px" }}>
      <h1>AI Girlfriend Chat</h1>
      <CharacterSelector selectedCharacter={selectedCharacter} onSelect={setSelectedCharacter} />
      <AddCharacter onAdd={() => setSelectedCharacter("")} />
      {selectedCharacter && <ChatBox userId={USER_ID} characterId={selectedCharacter} />}
    </div>
  );
}

export default App;
