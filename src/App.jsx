import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, User, Bot, Settings, Image, Mic, MicOff, Camera, Palette, Loader } from 'lucide-react';

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fixed: Only load characters when user is properly set
  useEffect(() => {
    if (user?.id) {
      loadCharacters(user);
    }
  }, [user]);

  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');

  // Fixed: Pass userData directly to loadCharacters to avoid null user issues
  const handleLogin = async (username, password) => {
    try {
      setIsLoading(true);
      setAuthError('');
      const userData = await apiCall(`/users/login`, 'POST', { username, password });
      setUser(userData);
      setShowLoginModal(false);
      // Pass userData directly since state might not be updated yet
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
      // Pass userData directly since state might not be updated yet
      await loadCharacters(userData);
    } catch (error) {
      setAuthError(error.message || 'Registration failed. Username might already exist.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fixed: Handle user parameter properly and add null checks
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
        character_id: characterId
      }, user);
      
      const messageHistory = [];
      if (Array.isArray(data)) {
        data.forEach(row => {
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
    setMessages(prev => [...prev, { sender: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await apiCall('/chat', 'POST', {
        user_id: user.id,
        character_id: selectedCharacter.id,
        message: userMessage
      }, user);

      const aiMessage = { 
        sender: 'ai', 
        content: response.reply || 'Sorry, I didn\'t understand that.' 
      };
      
      // Add image if AI generated one
      if (response.image_url) {
        aiMessage.image_url = response.image_url;
      }

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        content: 'Sorry, I\'m having trouble responding right now.' 
      }]);
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
      
      // Use enhanced character creation endpoint
      const payload = {
        user_id: user.id,
        name: characterData.name,
        persona: {
          name: characterData.name,
          style: characterData.style,
          bio: characterData.bio
        },
        appearance: characterData.appearance || {},
        generate_avatar: characterData.generateAvatar !== false
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

  // Fixed: Use request body approach for avatar generation
  const generateCharacterAvatar = async (characterId) => {
    if (!user?.id) {
      console.error('No user ID available for avatar generation');
      alert('User not authenticated');
      return;
    }

    try {
      setIsGeneratingImage(true);
      // Use request body approach with proper user context
      await apiCall(`/characters/${characterId}/generate-avatar`, 'POST', {
        user_id: user.id
      }, user);
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

  // Login Modal Component
  const LoginModal = () => {
    const [formData, setFormData] = useState({
      username: '',
      password: '',
      email: ''
    });

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
            <p className="text-gray-600 mt-2">
              {authMode === 'login' ? 'Welcome back!' : 'Create your account'}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {authError && (
              <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                {authError}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
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
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
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
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full p-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
            >
              {isLoading ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
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
                {authMode === 'login' 
                  ? "Don't have an account? Create one" 
                  : 'Already have an account? Sign in'
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Enhanced Create Character Modal
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
        clothing: 'stylish outfit'
      },
      generateAvatar: true
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
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Create New Companion
            </h2>
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
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                  placeholder="e.g., Sarah, Alex, Maya"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Personality Style</label>
                <input
                  type="text"
                  value={formData.style}
                  onChange={(e) => setFormData({...formData, style: e.target.value})}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                  placeholder="e.g., playful and witty, romantic and caring"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Background & Interests</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
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
                      appearance: {...formData.appearance, age: e.target.value}
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
                      appearance: {...formData.appearance, gender: e.target.value}
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
                    appearance: {...formData.appearance, hair_color: e.target.value}
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
                    appearance: {...formData.appearance, style: e.target.value}
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
                  onChange={(e) => setFormData({
                    ...formData, 
                    appearance: {...formData.appearance, clothing: e.target.value}
                  })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                  placeholder="e.g., cozy sweater, business suit, summer dress"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                <input
                  type="checkbox"
                  checked={formData.generateAvatar}
                  onChange={(e) => setFormData({...formData, generateAvatar: e.target.checked})}
                  className="w-5 h-5 text-purple-500"
                />
                <label className="text-sm font-medium text-gray-700">
                  Generate AI Avatar (uses DALL-E 3)
                </label>
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

  if (showLoginModal) {
    return <LoginModal />;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white/80 backdrop-blur-md border-r border-white/20 shadow-xl">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              My Companions
            </h1>
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
                  {/* Character Avatar - Made Larger */}
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden ${
                    selectedCharacter?.id === character.id ? 'bg-white/20 border-2 border-white/30' : 'bg-gradient-to-r from-purple-500 to-blue-500'
                  }`}>
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
                    <Bot className={`w-6 h-6 ${character.avatar_url ? 'hidden' : 'block'} ${selectedCharacter?.id === character.id ? 'text-white' : 'text-white'}`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-semibold">{character.name}</div>
                    <div className={`text-sm ${selectedCharacter?.id === character.id ? 'text-white/80' : 'text-gray-600'}`}>
                      {typeof character.persona === 'object' ? character.persona.style : character.persona}
                    </div>
                  </div>
                  
                  {/* Generate Avatar Button */}
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
                      {isGeneratingImage ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
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
            {/* Enhanced Chat Header */}
            <div className="p-6 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Character Avatar - Made Much Larger */}
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
                          : selectedCharacter.persona || 'AI Companion'
                        }
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

            {/* Messages with Image Support */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                    {selectedCharacter.avatar_url ? (
                      <img 
                        src={selectedCharacter.avatar_url} 
                        alt={selectedCharacter.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Bot className="w-10 h-10 text-white" />
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Say hello to {selectedCharacter.name}!
                  </h3>
                  <p className="text-gray-600">Start a conversation with your AI companion</p>
                  <p className="text-sm text-purple-600 mt-2">💡 Try asking me to create or show you an image!</p>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md rounded-3xl shadow-sm ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                        : 'bg-white text-gray-800 shadow-md'
                    }`}
                  >
                    <div className="px-6 py-4">
                      {message.content}
                    </div>
                    
                    {/* Display AI-generated images - Made Even Larger & Clickable */}
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
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-sm text-gray-600">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-6 bg-white/80 backdrop-blur-md border-t border-white/20">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
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
                <p className="text-xs text-gray-500">
                  💡 Ask your companion to "show me", "create", or "generate" images!
                </p>
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

import React, { useState } from 'react';
import { Edit3, Trash2, Settings, User, Key, Palette, Camera, Loader, Check, X } from 'lucide-react';

// Add these components to your App.jsx file (These are recent changes, delete them if you face error

const EditCharacterModal = ({ character, onClose, onUpdate, isLoading }) => {
  const [formData, setFormData] = useState({
    name: character.name,
    style: character.persona?.style || 'friendly and supportive',
    bio: character.persona?.bio || '',
    appearance: {
      age: character.appearance?.age || '25',
      gender: character.appearance?.gender || 'person',
      hair_color: character.appearance?.hair_color || 'brown',
      style: character.appearance?.style || 'modern casual',
      clothing: character.appearance?.clothing || 'stylish outfit'
    },
    regenerateAvatar: false
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    
    onUpdate({
      name: formData.name,
      persona: {
        name: formData.name,
        style: formData.style,
        bio: formData.bio
      },
      appearance: formData.appearance,
      regenerate_avatar: formData.regenerateAvatar
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <Edit3 className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Edit {character.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
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
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="e.g., Sarah, Alex, Maya"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Personality Style</label>
              <input
                type="text"
                value={formData.style}
                onChange={(e) => setFormData({...formData, style: e.target.value})}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="e.g., playful and witty, romantic and caring"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Background & Interests</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
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
                    appearance: {...formData.appearance, age: e.target.value}
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
                    appearance: {...formData.appearance, gender: e.target.value}
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
                  appearance: {...formData.appearance, hair_color: e.target.value}
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
                  appearance: {...formData.appearance, style: e.target.value}
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
                onChange={(e) => setFormData({
                  ...formData, 
                  appearance: {...formData.appearance, clothing: e.target.value}
                })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="e.g., cozy sweater, business suit, summer dress"
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
              <input
                type="checkbox"
                checked={formData.regenerateAvatar}
                onChange={(e) => setFormData({...formData, regenerateAvatar: e.target.checked})}
                className="w-5 h-5 text-purple-500"
              />
              <label className="text-sm font-medium text-gray-700">
                Regenerate Avatar (based on new appearance)
              </label>
            </div>
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
            onClick={handleSubmit}
            disabled={!formData.name.trim() || isLoading}
            className="flex-1 p-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                {formData.regenerateAvatar ? 'Updating & Regenerating...' : 'Updating...'}
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Update Companion
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfirmDeleteModal = ({ character, onClose, onConfirm, isLoading }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <Trash2 className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Delete Companion</h2>
        <p className="text-gray-600">
          Are you sure you want to delete <strong>{character.name}</strong>? 
          This will permanently remove all conversations and images.
        </p>
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 p-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              Delete
            </>
          )}
        </button>
      </div>
    </div>
  </div>
);

const SettingsModal = ({ user, onClose, onUpdateProfile, onPasswordReset, isLoading }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    username: user.username,
    email: user.email || ''
  });
  const [passwordData, setPasswordData] = useState({
    username: user.username,
    email: user.email || ''
  });
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleProfileUpdate = () => {
    onUpdateProfile(profileData);
  };

  const handlePasswordReset = async () => {
    try {
      const response = await fetch(`${API_BASE}/users/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData)
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        if (data.reset_token) {
          setResetToken(data.reset_token);
        }
      } else {
        alert('Password reset request failed');
      }
    } catch (error) {
      alert('Error requesting password reset');
    }
  };

  const handlePasswordUpdate = async () => {
    if (!resetToken || !newPassword) {
      alert('Please request a reset token first and enter a new password');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/users/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: passwordData.username,
          new_password: newPassword,
          reset_token: resetToken
        })
      });
      
      if (response.ok) {
        alert('Password updated successfully!');
        setResetToken('');
        setNewPassword('');
      } else {
        const error = await response.json();
        alert(error.detail || 'Password update failed');
      }
    } catch (error) {
      alert('Error updating password');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 p-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'profile' 
                ? 'bg-white shadow-sm text-purple-600 font-medium' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <User className="w-4 h-4" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 p-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'password' 
                ? 'bg-white shadow-sm text-purple-600 font-medium' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Key className="w-4 h-4" />
            Password
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={profileData.username}
                onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              />
            </div>
            
            <button
              onClick={handleProfileUpdate}
              disabled={isLoading}
              className="w-full p-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Update Profile
                </>
              )}
            </button>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-xl mb-4">
              <p className="text-sm text-blue-700">
                <strong>Step 1:</strong> Request a reset token, then <strong>Step 2:</strong> Set your new password
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={passwordData.username}
                onChange={(e) => setPasswordData({...passwordData, username: e.target.value})}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={passwordData.email}
                onChange={(e) => setPasswordData({...passwordData, email: e.target.value})}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              />
            </div>
            
            <button
              onClick={handlePasswordReset}
              className="w-full p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4" />
              Request Reset Token
            </button>
            
            {resetToken && (
              <div className="space-y-3 p-4 bg-green-50 rounded-xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reset Token (received)</label>
                  <input
                    type="text"
                    value={resetToken}
                    readOnly
                    className="w-full p-2 text-xs bg-gray-100 border border-gray-300 rounded-lg font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                    placeholder="Enter new password"
                  />
                </div>
                
                <button
                  onClick={handlePasswordUpdate}
                  disabled={!newPassword}
                  className="w-full p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Update Password
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Character Card Component with Edit/Delete
const CharacterCard = ({ 
  character, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete, 
  onGenerateAvatar, 
  isGeneratingImage 
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      onClick={() => onSelect(character)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className={`p-4 rounded-2xl cursor-pointer transition-all transform hover:scale-105 relative ${
        isSelected
          ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
          : 'bg-white/60 hover:bg-white/80 text-gray-800 shadow-sm'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Character Avatar */}
        <div className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden ${
          isSelected ? 'bg-white/20 border-2 border-white/30' : 'bg-gradient-to-r from-purple-500 to-blue-500'
        }`}>
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
          <Bot className={`w-6 h-6 ${character.avatar_url ? 'hidden' : 'block'} ${isSelected ? 'text-white' : 'text-white'}`} />
        </div>
        
        <div className="flex-1">
          <div className="font-semibold">{character.name}</div>
          <div className={`text-sm ${isSelected ? 'text-white/80' : 'text-gray-600'}`}>
            {typeof character.persona === 'object' ? character.persona.style : character.persona}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className={`flex gap-1 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
          {!character.avatar_url && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerateAvatar(character.id);
              }}
              disabled={isGeneratingImage}
              className={`p-2 rounded-lg transition-all ${
                isSelected 
                  ? 'bg-white/20 hover:bg-white/30 text-white' 
                  : 'bg-purple-100 hover:bg-purple-200 text-purple-600'
              } ${isGeneratingImage ? 'opacity-50' : ''}`}
              title="Generate Avatar"
            >
              {isGeneratingImage ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(character);
            }}
            className={`p-2 rounded-lg transition-all ${
              isSelected 
                ? 'bg-white/20 hover:bg-white/30 text-white' 
                : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
            }`}
            title="Edit Character"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(character);
            }}
            className={`p-2 rounded-lg transition-all ${
              isSelected 
                ? 'bg-white/20 hover:bg-white/30 text-white' 
                : 'bg-red-100 hover:bg-red-200 text-red-600'
            }`}
            title="Delete Character"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Example usage of these components in your main App component:
const ExampleMainApp = () => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [deletingCharacter, setDeletingCharacter] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEditCharacter = (character) => {
    setEditingCharacter(character);
    setShowEditModal(true);
  };

  const handleDeleteCharacter = (character) => {
    setDeletingCharacter(character);
    setShowDeleteModal(true);
  };

  const updateCharacter = async (updateData) => {
    if (!editingCharacter || !user?.id) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/characters/${editingCharacter.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          user_id: user.id,
          ...updateData
        })
      });

      if (response.ok) {
        await loadCharacters();
        setShowEditModal(false);
        setEditingCharacter(null);
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to update character');
      }
    } catch (error) {
      console.error('Character update error:', error);
      alert('Failed to update character');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCharacter = async () => {
    if (!deletingCharacter || !user?.id) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/characters/${deletingCharacter.id}?user_id=${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (response.ok) {
        await loadCharacters();
        setShowDeleteModal(false);
        setDeletingCharacter(null);
        
        // Clear selection if deleted character was selected
        if (selectedCharacter?.id === deletingCharacter.id) {
          setSelectedCharacter(null);
          setMessages([]);
        }
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to delete character');
      }
    } catch (error) {
      console.error('Character deletion error:', error);
      alert('Failed to delete character');
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserProfile = async (profileData) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/users/${user.id}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          user_id: user.id,
          ...profileData
        })
      });

      if (response.ok) {
        const data = await response.json();
        setUser(prev => ({ ...prev, ...data.user }));
        alert('Profile updated successfully!');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      alert('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Replace your character mapping in the sidebar with:
  return (
    <div className="space-y-3">
      {characters.map((character) => (
        <CharacterCard
          key={character.id}
          character={character}
          isSelected={selectedCharacter?.id === character.id}
          onSelect={selectCharacter}
          onEdit={handleEditCharacter}
          onDelete={handleDeleteCharacter}
          onGenerateAvatar={generateCharacterAvatar}
          isGeneratingImage={isGeneratingImage}
        />
      ))}
      
      {/* Add Settings Button in Header */}
      <button
        onClick={() => setShowSettingsModal(true)}
        className="p-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all transform hover:scale-105"
        title="Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Modals */}
      {showEditModal && editingCharacter && (
        <EditCharacterModal
          character={editingCharacter}
          onClose={() => {
            setShowEditModal(false);
            setEditingCharacter(null);
          }}
          onUpdate={updateCharacter}
          isLoading={isLoading}
        />
      )}

      {showDeleteModal && deletingCharacter && (
        <ConfirmDeleteModal
          character={deletingCharacter}
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingCharacter(null);
          }}
          onConfirm={deleteCharacter}
          isLoading={isLoading}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          user={user}
          onClose={() => setShowSettingsModal(false)}
          onUpdateProfile={updateUserProfile}
          onPasswordReset={() => {}}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};
export default AICompanionApp;
