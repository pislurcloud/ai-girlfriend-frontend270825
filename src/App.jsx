import { useState } from "react";
import CharacterSelector from "./components/CharacterSelector";
import ChatBox from "./components/ChatBox";

function App() {
  const [selectedCharacter, setSelectedCharacter] = useState("");
  const user_id = "test-user-123"; // temporary placeholder

  return (
    <div>
      <h1>AI Girlfriend Chat</h1>
      <CharacterSelector selected={selectedCharacter} onSelect={setSelectedCharacter} />
      {selectedCharacter && <ChatBox user_id={user_id} character_id={selectedCharacter} />}
    </div>
  );
}

export default App;
