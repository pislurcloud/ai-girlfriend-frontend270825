import React, { useEffect, useState } from "react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { getCharacters } from "@/api";
import { Loader2 } from "lucide-react";

const CharacterSelect = ({ onSelect }) => {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getCharacters();
        setCharacters(data || []);
      } catch (err) {
        console.error("Failed to fetch characters:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="animate-spin w-6 h-6 text-gray-500" />
        <span className="ml-2 text-gray-600">Loading characters...</span>
      </div>
    );
  }

  if (!characters.length) {
    return <p className="text-center text-gray-500">No characters found. Add one to get started!</p>;
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <Select onValueChange={(value) => onSelect(value)}>
        <SelectTrigger className="w-full border rounded-lg px-4 py-2 shadow-sm focus:ring-2 focus:ring-blue-500">
          <SelectValue placeholder="Select a character" />
        </SelectTrigger>
        <SelectContent>
          {characters.map((char) => (
            <SelectItem key={char.id} value={char.id}>
              {char.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CharacterSelect;
