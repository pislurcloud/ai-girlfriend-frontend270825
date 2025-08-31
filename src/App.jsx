import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, User, Bot, Settings, Image, Mic, Camera, Palette, Loader } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const apiCall = async (endpoint, method = 'GET', data = null, user = null) => {
  try {
    const config = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (user?.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }

    if (data) config.body = JSON.stringify(data);

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`API call failed: ${endpoint}`, error);
    throw error;
  }
};

const AICompanionApp = () => {
  const [user, setUser] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user?.id) {
      loadCharacters(user);
    }
  }, [user]);

  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');

  const handleLogin = async (username, password) => {
    try {
      setIsLoading(true);
      setAuthError('');
      const userData = await apiCall(`/users/login`, 'POST', { username, password });
      setUser(userData);
      setShowLoginModal(false);
      await loadCharacters(userData);
    } catch (error) {
      setAuthError('Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (username, password, email) => {
    try {
      setIsLoading(true);
      setAuthError('');
      const userData = await apiCall('/users/register', 'POST', { username, password, email });
      setUser(userData);
      setShowLoginModal(false);
      await loadCharacters(userData);
    } catch (error) {
      setAuthError(error.message || 'Registration failed. Username might already exist.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCharacters = async (userData = null) => {
    const currentUser = userData || user;
    if (!currentUser?.id) {
      console.error('No user ID available for loading characters');
      setCharacters([]);
      setSelectedCharacter(null);
      setMessages([]);
      return;
    }

    try {
      const data = await apiCall(`/characters/user/${currentUser.id}`, 'GET', null, currentUser);
      setCharacters(data.characters || []);
      if (data.characters && data.characters.length > 0) {
        setSelectedCharacter(data.characters[0]);
        await loadConversation(data.characters[0].id);
      } else {
        setSelectedCharacter(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to load characters:', error);
      setCharacters([]);
    }
  };

  const loadConversation = async (characterId) => {
    if (!user?.id || !characterId) return;

    try {
      const data = await apiCall('/memories', 'POST', {
        user_id: user.id,
        character_id: characterId,
      }, user);

      const messageHistory = [];
      if (Array.isArray(data)) {
        data.forEach((row) => {
          if (row.message) messageHistory.push({ sender: 'user', content: row.message });
          if (row.response) {
            const aiMessage = { sender: 'ai', content: row.response };
            if (row.image_url) aiMessage.image_url = row.image_url;
            messageHistory.push(aiMessage);
          }
        });
      }
      setMessages(messageHistory);
    } catch (error) {
      console.error('Failed to load conversation:', error);
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedCharacter || !user) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setMessages((prev) => [...prev, { sender: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await apiCall(
        '/chat',
        'POST',
        {
          user_id: user.id,
          character_id: selectedCharacter.id,
          message: userMessage,
        },
        user,
      );

      const aiMessage = {
        sender: 'ai',
        content: response.reply || "Sorry, I didn't understand that.",
      };

      if (response.image_url) {
        aiMessage.image_url = response.image_url;
      }

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', content: "Sorry, I'm having trouble responding right now." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const createCharacter = async (characterData) => {
    if (!user?.id) {
      alert('User not authenticated');
      return;
    }

    try {
      setIsLoading(true);

      const payload = {
        user_id: user.id,
        name: characterData.name,
        persona: {
          name: characterData.name,
          style: characterData.style,
          bio: characterData.bio,
        },
        appearance: characterData.appearance || {},
        generate_avatar: characterData.generateAvatar !== false,
      };

      await apiCall('/characters/enhanced', 'POST', payload, user);
      setShowCreateModal(false);
      await loadCharacters();
    } catch (error) {
      console.error('Character creation error:', error);
      alert('Failed to create character. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Wrapped as a proper function (fixes your original build error)
  const generateCharacterAvatar = async (characterId) => {
    if (!user?.id) {
      console.error('No user ID available for avatar generation');
      alert('User not authenticated');
      return;
    }

    try {
      setIsGeneratingImage(true);
      await apiCall(
        `/characters/${characterId}/generate-avatar`,
        'POST',
        { user_id: user.id },
        user,
      );
      await loadCharacters();
    } catch (error) {
      console.error('Avatar generation error:', error);
      alert('Failed to generate avatar. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCharacters([]);
    setSelectedCharacter(null);
    setMessages([]);
    setShowLoginModal(true);
  };

  const selectCharacter = (character) => {
    setSelectedCharacter(character);
    loadConversation(character.id);
  };

  // ----------------------
  // Login Modal
  // ----------------------
  const LoginModal = () => {
    const [formData, setFormData] = useState({ username: '', password: '', email: '' });

    const handleSubmit = (e) => {
      e.preventDefault();
      if (authMode === 'login') {
        handleLogin(formData.username, formData.password);
      } else {
        handleRegister(formData.username, formData.password, formData.email);
      }
    };

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/90 to-blue-900/90 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 w-96 shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              AI Companions
            </h1>
            <p className="text-gray-600 mt-2">{authMode === 'login' ? 'Welcome back!' : 'Create your account'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {authError && (
              <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">{authError}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                required
              />
            </div>

            {authMode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full p-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
            >
              {isLoading ? 'Processing...' : authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                  setAuthError('');
                  setFormData({ username: '', password: '', email: '' });
                }}
                className="text-purple-600 hover:text-purple-800 text-sm font-medium"
              >
                {authMode === 'login' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ----------------------
  // Create Character Modal
  // ----------------------
  const CreateCharacterModal = () => {
    const [formData, setFormData] = useState({
      name: '',
      style: 'friendly and supportive',
      bio: '',
      appearance: {
        age: '25',
        gender: 'person',
        hair_color: 'brown',
        style: 'modern casual',
        clothing: 'stylish outfit',
      },
      generateAvatar: true,
    });

    const handleSubmit = () => {
      if (!formData.name.trim()) return;
      createCharacter(formData);
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Create New Companion</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Basic Information
                </h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                  placeholder="e.g., Sarah, Alex, Maya"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Personality Style</label>
                <input
                  type="text"
                  value={formData.style}
                  onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                  placeholder="e.g., playful and witty, romantic and caring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Background & Interests</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                  placeholder="Tell me about their interests, background, hobbies..."
                />
              </div>
            </div>

            {/* Appearance Details */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Appearance Details
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                  <input
                    type="text"
                    value={formData.appearance.age}
                    onChange={(e) => setFormData({
                      ...formData,
                      appearance: { ...formData.appearance, age: e.target.value },
                    })}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                    placeholder="25"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select
                    value={formData.appearance.gender}
                    onChange={(e) => setFormData({
                      ...formData,
                      appearance: { ...formData.appearance, gender: e.target.value },
                    })}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                  >
                    <option value="person">Person</option>
                    <option value="woman">Woman</option>
                    <option value="man">Man</option>
                    <option value="non-binary person">Non-binary</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hair Color</label>
                <select
                  value={formData.appearance.hair_color}
                  onChange={(e) => setFormData({
                    ...formData,
                    appearance: { ...formData.appearance, hair_color: e.target.value },
                  })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                >
                  <option value="brown">Brown</option>
                  <option value="black">Black</option>
                  <option value="blonde">Blonde</option>
                  <option value="red">Red</option>
                  <option value="auburn">Auburn</option>
                  <option value="silver">Silver</option>
                  <option value="blue">Blue</option>
                  <option value="pink">Pink</option>
                  <option value="purple">Purple</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
                <select
                  value={formData.appearance.style}
                  onChange={(e) => setFormData({
                    ...formData,
                    appearance: { ...formData.appearance, style: e.target.value },
                  })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                >
                  <option value="modern casual">Modern Casual</option>
                  <option value="elegant formal">Elegant Formal</option>
                  <option value="artistic bohemian">Artistic Bohemian</option>
                  <option value="sporty active">Sporty Active</option>
                  <option value="vintage retro">Vintage Retro</option>
                  <option value="minimalist chic">Minimalist Chic</option>
                  <option value="gothic alternative">Gothic Alternative</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Clothing</label>
                <input
                  type="text"
                  value={formData.appearance.clothing}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      appearance: { ...formData.appearance, clothing: e.target.value },
                    })
                  }
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                  placeholder="e.g., cozy sweater, business suit, summer dress"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                <input
                  type="checkbox"
                  checked={formData.generateAvatar}
                  onChange={(e) => setFormData({ ...formData, generateAvatar: e.target.checked })}
                  className="w-5 h-5 text-purple-500"
                />
                <label className="text-sm font-medium text-gray-700">Generate AI Avatar (uses DALL-E 3)</label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={() => setShowCreateModal(false)}
              className="flex-1 p-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!formData.name.trim() || isLoading}
              className="flex-1 p-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  {formData.generateAvatar ? 'Creating & Generating Avatar...' : 'Creating...'}
                </>
              ) : (
                'Create Companion'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // IMPORTANT: Render the login modal AFTER it's defined (to avoid "cannot access before initialization")
  if (showLoginModal) {
    return <LoginModal />;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white/80 backdrop-blur-md border-r border-white/20 shadow-xl">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">My Companions</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all transform hover:scale-105"
                title="Create New Companion"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all transform hover:scale-105"
                title="Logout"
              >
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <span className="font-medium text-gray-800">{user?.username}</span>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Companions</h2>
          <div className="space-y-3">
            {characters.map((character) => (
              <div
                key={character.id}
                onClick={() => selectCharacter(character)}
                className={`p-4 rounded-2xl cursor-pointer transition-all transform hover:scale-105 ${
                  selectedCharacter?.id === character.id
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                    : 'bg-white/60 hover:bg-white/80 text-gray-800 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden ${
                      selectedCharacter?.id === character.id
                        ? 'bg-white/20 border-2 border-white/30'
                        : 'bg-gradient-to-r from-purple-500 to-blue-500'
                    }`}
                  >
                    {character.avatar_url ? (
                      <img
                        src={character.avatar_url}
                        alt={character.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <Bot className={`w-6 h-6 ${character.avatar_url ? 'hidden' : 'block'} text-white`} />
                  </div>

                  <div className="flex-1">
                    <div className="font-semibold">{character.name}</div>
                    <div className={`text-sm ${selectedCharacter?.id === character.id ? 'text-white/80' : 'text-gray-600'}`}>
                      {typeof character.persona === 'object' ? character.persona.style : character.persona}
                    </div>
                  </div>

                  {!character.avatar_url && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        generateCharacterAvatar(character.id);
                      }}
                      disabled={isGeneratingImage}
                      className={`p-2 rounded-lg transition-all ${
                        selectedCharacter?.id === character.id
                          ? 'bg-white/20 hover:bg-white/30 text-white'
                          : 'bg-purple-100 hover:bg-purple-200 text-purple-600'
                      } ${isGeneratingImage ? 'opacity-50' : ''}`}
                      title="Generate Avatar"
                    >
                      {isGeneratingImage ? <Loader className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {characters.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Bot className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="font-medium">No companions yet</p>
                <p className="text-sm">Create your first AI companion!</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all text-sm"
                >
                  Create Companion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedCharacter ? (
          <>
            {/* Chat Header */}
            <div className="p-6 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center border-3 border-white shadow-xl">
                    {selectedCharacter.avatar_url ? (
                      <img
                        src={selectedCharacter.avatar_url}
                        alt={selectedCharacter.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <Bot className={`w-10 h-10 text-white ${selectedCharacter.avatar_url ? 'hidden' : 'block'}`} />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedCharacter.name}</h2>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="text-sm">
                        {typeof selectedCharacter.persona === 'object'
                          ? selectedCharacter.persona.style
                          : selectedCharacter.persona || 'AI Companion'}
                      </span>
                      {selectedCharacter.appearance?.age && (
                        <>
                          <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                          <span className="text-sm">{selectedCharacter.appearance.age} years old</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors">
                    <Image className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors">
                    <Mic className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors">
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                    {selectedCharacter.avatar_url ? (
                      <img src={selectedCharacter.avatar_url} alt={selectedCharacter.name} className="w-full h-full object-cover" />
                    ) : (
                      <Bot className="w-10 h-10 text-white" />
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Say hello to {selectedCharacter.name}!</h3>
                  <p className="text-gray-600">Start a conversation with your AI companion</p>
                  <p className="text-sm text-purple-600 mt-2">💡 Try asking me to create or show you an image!</p>
                </div>
              )}

              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs lg:max-w-md rounded-3xl shadow-sm ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                        : 'bg-white text-gray-800 shadow-md'
                    }`}
                  >
                    <div className="px-6 py-4">{message.content}</div>

                    {message.image_url && (
                      <div className="px-4 pb-4">
                        <img
                          src={message.image_url}
                          alt="AI generated content"
                          className="w-full rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all transform hover:scale-105"
                          style={{ maxWidth: '500px', minWidth: '300px' }}
                          onClick={() => window.open(message.image_url, '_blank')}
                          title="Click to view full size"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 shadow-md px-6 py-4 rounded-3xl">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-600">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 bg-white/80 backdrop-blur-md border-t border-white/20">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message... (try asking for an image!)"
                  className="flex-1 p-4 border-2 border-gray-200 rounded-2xl focus:border-purple-500 focus:outline-none transition-colors bg-white/80"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="p-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl hover:from-purple-600 hover:to-blue-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-2 text-center">
                <p className="text-xs text-gray-500">💡 Ask your companion to "show me", "create", or "generate" images!</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-purple-300 to-blue-300 rounded-full mx-auto mb-6 flex items-center justify-center">
                <Bot className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to AI Companions</h2>
              <p className="text-gray-600 mb-6">Select a companion from the sidebar or create a new one to start chatting</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl hover:from-purple-600 hover:to-blue-600 transition-all transform hover:scale-105"
              >
                Create Your First Companion
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && <CreateCharacterModal />}
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Play, Pause, Settings, Loader, Waves } from 'lucide-react';

// Voice Recording Hook
const useVoiceRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const chunks = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const clearRecording = () => {
    setAudioBlob(null);
  };

  return {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    clearRecording
  };
};

// Voice Chat Component
const VoiceChatInterface = ({ user, selectedCharacter, onVoiceMessage, isProcessing }) => {
  const { isRecording, audioBlob, startRecording, stopRecording, clearRecording } = useVoiceRecording();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioSettings, setAudioSettings] = useState({
    autoPlay: true,
    speed: 1.0,
    volume: 0.8
  });
  const audioRef = useRef(null);

  const handleVoiceSubmit = async () => {
    if (!audioBlob || !selectedCharacter || !user) return;

    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1]; // Remove data:audio/webm;base64, prefix
        
        await onVoiceMessage({
          user_id: user.id,
          character_id: selectedCharacter.id,
          audio_data: base64Audio,
          format: 'webm'
        });
        
        clearRecording();
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Voice submission error:', error);
      alert('Failed to process voice message');
    }
  };

  const playAudio = (audioData) => {
    try {
      const audioBlob = new Blob([
        Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
      ], { type: 'audio/mp3' });
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.volume = audioSettings.volume;
      audio.playbackRate = audioSettings.speed;
      
      audio.onplay = () => setIsPlayingAudio(true);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => {
        setIsPlayingAudio(false);
        console.error('Audio playback error');
      };
      
      audioRef.current = audio;
      audio.play();
    } catch (error) {
      console.error('Audio playback error:', error);
      alert('Could not play audio response');
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Waves className="w-5 h-5 text-purple-500" />
          Voice Chat
        </h3>
        
        {/* Audio Settings */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Volume2 className="w-4 h-4 text-gray-500" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={audioSettings.volume}
              onChange={(e) => setAudioSettings(prev => ({...prev, volume: parseFloat(e.target.value)}))}
              className="w-16 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          <button
            onClick={() => setAudioSettings(prev => ({...prev, autoPlay: !prev.autoPlay}))}
            className={`p-2 rounded-lg transition-all ${
              audioSettings.autoPlay 
                ? 'bg-purple-100 text-purple-600' 
                : 'bg-gray-100 text-gray-500'
            }`}
            title={`Auto-play: ${audioSettings.autoPlay ? 'On' : 'Off'}`}
          >
            {audioSettings.autoPlay ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      {/* Recording Interface */}
      <div className="flex items-center justify-center mb-4">
        <div className="relative">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all transform hover:scale-105 disabled:opacity-50 ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 shadow-lg animate-pulse'
                : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg'
            }`}
          >
            {isProcessing ? (
              <Loader className="w-8 h-8 text-white animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-8 h-8 text-white" />
            ) : (
              <Mic className="w-8 h-8 text-white" />
            )}
          </button>
          
          {isRecording && (
            <div className="absolute -inset-2 border-4 border-red-400 rounded-full animate-ping opacity-50"></div>
          )}
        </div>
      </div>
      
      <div className="text-center mb-4">
        <p className="text-sm text-gray-600">
          {isRecording 
            ? 'Recording... Click to stop and send' 
            : isProcessing 
              ? 'Processing your voice message...'
              : audioBlob 
                ? 'Ready to send voice message'
                : 'Hold to record voice message'
          }
        </p>
      </div>
      
      {/* Audio Preview & Controls */}
      {audioBlob && !isProcessing && (
        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            onClick={clearRecording}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={handleVoiceSubmit}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all flex items-center gap-2"
          >
            <Mic className="w-4 h-4" />
            Send Voice Message
          </button>
        </div>
      )}
      
      {/* Audio Playback Controls */}
      {isPlayingAudio && (
        <div className="flex items-center justify-center gap-3 p-3 bg-blue-50 rounded-xl">
          <Waves className="w-5 h-5 text-blue-500 animate-pulse" />
          <span className="text-sm text-blue-700 font-medium">Playing AI response...</span>
          <button
            onClick={stopAudio}
            className="p-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

// Voice Settings Modal
const VoiceSettingsModal = ({ character, onClose, onUpdate, availableVoices, isLoading }) => {
  const [voiceConfig, setVoiceConfig] = useState({
    voice: character.persona?.voice_config?.voice || 'alloy',
    speed: character.persona?.voice_config?.speed || 1.0,
    pitch: character.persona?.voice_config?.pitch || 1.0,
    auto_play: character.persona?.voice_config?.auto_play !== false
  });
  const [testingVoice, setTestingVoice] = useState(false);

  const testVoice = async (voiceId) => {
    setTestingVoice(true);
    try {
      const response = await fetch(`${API_BASE}/voice/test-tts?text=Hello! This is how I sound.&voice=${voiceId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Play test audio
        const audioBlob = new Blob([
          Uint8Array.from(atob(data.audio_data), c => c.charCodeAt(0))
        ], { type: 'audio/mp3' });
        
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
      }
    } catch (error) {
      console.error('Voice test error:', error);
    } finally {
      setTestingVoice(false);
    }
  };

  const handleSave = () => {
    onUpdate({
      character_id: character.id,
      user_id: character.user_id,
      voice_config: voiceConfig
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <Volume2 className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Voice Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Voice Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Voice Character</label>
            <div className="grid grid-cols-2 gap-3">
              {availableVoices.map((voice) => (
                <div
                  key={voice.id}
                  className={`p-3 border-2 rounded-xl cursor-pointer transition-all ${
                    voiceConfig.voice === voice.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setVoiceConfig(prev => ({...prev, voice: voice.id}))}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{voice.name}</div>
                      <div className="text-xs text-gray-500">{voice.gender}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        testVoice(voice.id);
                      }}
                      disabled={testingVoice}
                      className="p-1 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                      title="Test Voice"
                    >
                      {testingVoice ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{voice.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Speed Control */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Speech Speed: {voiceConfig.speed}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={voiceConfig.speed}
              onChange={(e) => setVoiceConfig(prev => ({...prev, speed: parseFloat(e.target.value)}))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Slow</span>
              <span>Normal</span>
              <span>Fast</span>
            </div>
          </div>

          {/* Auto-play Setting */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <div className="font-medium text-gray-800">Auto-play Responses</div>
              <div className="text-sm text-gray-600">Automatically play AI voice responses</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={voiceConfig.auto_play}
                onChange={(e) => setVoiceConfig(prev => ({...prev, auto_play: e.target.checked}))}
                className="sr-only"
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${
                voiceConfig.auto_play ? 'bg-purple-500' : 'bg-gray-300'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full transition-transform transform ${
                  voiceConfig.auto_play ? 'translate-x-5' : 'translate-x-0.5'
                } mt-0.5`}></div>
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 p-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 p-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Enhanced Message Component with Voice Playback
const VoiceMessage = ({ message, character, onPlayAudio, isPlaying }) => {
  const [showTranscript, setShowTranscript] = useState(false);

  return (
    <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs lg:max-w-md rounded-3xl shadow-sm ${
          message.sender === 'user'
            ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
            : 'bg-white text-gray-800 shadow-md'
        }`}
      >
        {/* Text Content */}
        <div className="px-6 py-4">
          {message.content}
        </div>
        
        {/* Voice Controls for AI Messages */}
        {message.sender === 'ai' && message.audio_data && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <button
                onClick={() => onPlayAudio(message.audio_data)}
                disabled={isPlaying}
                className={`p-2 rounded-lg transition-all ${
                  isPlaying 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                }`}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
              
              <div className="flex-1">
                <div className="text-xs text-gray-600">
                  Voice Response • {message.voice_used || 'AI Voice'}
                </div>
                {isPlaying && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-1 h-3 bg-blue-400 rounded animate-pulse"></div>
                    <div className="w-1 h-2 bg-blue-400 rounded animate-pulse" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-1 h-4 bg-blue-400 rounded animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-1 h-2 bg-blue-400 rounded animate-pulse" style={{animationDelay: '0.3s'}}></div>
                    <div className="w-1 h-3 bg-blue-400 rounded animate-pulse" style={{animationDelay: '0.4s'}}></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Voice Input Indicator for User Messages */}
        {message.sender === 'user' && message.interaction_type === 'voice' && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 text-white/70 text-xs">
              <Mic className="w-3 h-3" />
              <span>Voice message</span>
            </div>
          </div>
        )}

        {/* Image Display */}
        {message.image_url && (
          <div className="px-4 pb-4">
            <img 
              src={message.image_url}
              alt="AI generated content"
              className="w-full rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all transform hover:scale-105"
              style={{ maxWidth: '500px', minWidth: '300px' }}
              onClick={() => window.open(message.image_url, '_blank')}
              title="Click to view full size"
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Voice Input Component (Alternative to Text Input)
const VoiceInputBox = ({ onVoiceMessage, isProcessing, user, selectedCharacter }) => {
  const { isRecording, audioBlob, startRecording, stopRecording, clearRecording } = useVoiceRecording();
  const [inputMode, setInputMode] = useState('text'); // 'text' or 'voice'
  const [textMessage, setTextMessage] = useState('');

  const handleVoiceSubmit = async () => {
    if (!audioBlob) return;

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1];
        
        await onVoiceMessage({
          user_id: user.id,
          character_id: selectedCharacter.id,
          audio_data: base64Audio,
          format: 'webm'
        });
        
        clearRecording();
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Voice submission error:', error);
    }
  };

  const handleTextSubmit = () => {
    if (!textMessage.trim()) return;
    onVoiceMessage({ message: textMessage.trim(), type: 'text' });
    setTextMessage('');
  };

  return (
    <div className="p-6 bg-white/80 backdrop-blur-md border-t border-white/20">
      {/* Mode Toggle */}
      <div className="flex justify-center mb-4">
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setInputMode('text')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              inputMode === 'text' 
                ? 'bg-white shadow-sm text-purple-600 font-medium' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            Text
          </button>
          <button
            onClick={() => setInputMode('voice')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              inputMode === 'voice' 
                ? 'bg-white shadow-sm text-purple-600 font-medium' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Mic className="w-4 h-4" />
            Voice
          </button>
        </div>
      </div>

      {inputMode === 'text' ? (
        /* Text Input */
        <div className="flex gap-3">
          <input
            type="text"
            value={textMessage}
            onChange={(e) => setTextMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
            placeholder="Type your message..."
            className="flex-1 p-4 border-2 border-gray-200 rounded-2xl focus:border-purple-500 focus:outline-none transition-colors bg-white/80"
            disabled={isProcessing}
          />
          <button
            onClick={handleTextSubmit}
            disabled={!textMessage.trim() || isProcessing}
            className="p-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl hover:from-purple-600 hover:to-blue-600 transition-all transform hover:scale-105 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      ) : (
        /* Voice Input */
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-105 ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 shadow-lg animate-pulse'
                    : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg'
                }`}
              >
                {isProcessing ? (
                  <Loader className="w-6 h-6 text-white animate-spin" />
                ) : isRecording ? (
                  <MicOff className="w-6 h-6 text-white" />
                ) : (
                  <Mic className="w-6 h-6 text-white" />
                )}
              </button>
              
              {isRecording && (
                <div className="absolute -inset-2 border-4 border-red-400 rounded-full animate-ping opacity-50"></div>
              )}
            </div>
          </div>
          
          {audioBlob && (
            <div className="flex justify-center gap-3">
              <button
                onClick={clearRecording}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleVoiceSubmit}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all"
              >
                Send Voice Message
              </button>
            </div>
          )}
          
          <p className="text-sm text-gray-600 mt-3">
            {isRecording 
              ? 'Recording... Click to stop' 
              : audioBlob 
                ? 'Voice message ready to send'
                : 'Click to record voice message'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export { VoiceChatInterface, VoiceSettingsModal, VoiceMessage, VoiceInputBox };

export default AICompanionApp;
