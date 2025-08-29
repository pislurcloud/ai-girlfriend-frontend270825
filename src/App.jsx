import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, User, Bot, Settings, Image, Mic, MicOff } from 'lucide-react';

// Mock API functions - replace with your actual API calls
// const API_BASE = process.env.VITE_API_BASE || 'http://localhost:8000';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';


const apiCall = async (endpoint, method = 'GET', data = null, user = null) => {
  try {
    const config = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    // Add JWT token if user is logged in
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
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Authentication states
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authError, setAuthError] = useState('');

  // Login existing user
  const handleLogin = async (username, password) => {
    try {
      setIsLoading(true);
      setAuthError('');
      const userData = await apiCall(`/users/login`, 'POST', { username, password }, user);
      setUser(userData);
      setShowLoginModal(false);
      loadCharacters(userData);
    } catch (error) {
      setAuthError('Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  // Register new user
  const handleRegister = async (username, password, email) => {
    try {
      setIsLoading(true);
      setAuthError('');
      const userData = await apiCall('/users/register', 'POST', { username, password, email }, user);
      setUser(userData);
      setShowLoginModal(false);
      loadCharacters(userData);
    } catch (error) {
      setAuthError(error.response?.data?.detail || 'Registration failed. Username might already exist.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load user-specific characters
  const loadCharacters = async () => {
    try {
      const data = await apiCall(`/characters/user/${user.id}`);
      setCharacters(data.characters || []);
      if (data.characters && data.characters.length > 0) {
        setSelectedCharacter(data.characters[0]);
        loadConversation(data.characters[0].id);
      } else {
        setSelectedCharacter(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to load characters:', error);
      setCharacters([]);
    }
  };

  // Load conversation history
  const loadConversation = async (characterId) => {
    if (!user?.id || !characterId) return;
    
    try {
      const data = await apiCall('/memories', 'POST', {
        user_id: user.id,
        character_id: characterId
      });
      
      const messageHistory = [];
      if (Array.isArray(data)) {
        data.forEach(row => {
          if (row.message) messageHistory.push({ sender: 'user', content: row.message });
          if (row.response) messageHistory.push({ sender: 'ai', content: row.response });
        });
      }
      setMessages(messageHistory);
    } catch (error) {
      console.error('Failed to load conversation:', error);
      setMessages([]);
    }
  };

  // Send message
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
      });

      setMessages(prev => [...prev, { 
        sender: 'ai', 
        content: response.reply || 'Sorry, I didn\'t understand that.' 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        content: 'Sorry, I\'m having trouble responding right now.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Create character (user-specific)
  const createCharacter = async (characterData) => {
    try {
      setIsLoading(true);
      await apiCall('/characters', 'POST', {
        ...characterData,
        user_id: user.id  // Associate character with current user
      });
      setShowCreateModal(false);
      await loadCharacters();
    } catch (error) {
      alert('Failed to create character. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const handleLogout = () => {
    setUser(null);
    setCharacters([]);
    setSelectedCharacter(null);
    setMessages([]);
    setShowLoginModal(true);
  };

  // Select character
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

  // Create Character Modal
  const CreateCharacterModal = () => {
    const [formData, setFormData] = useState({
      name: '',
      style: 'friendly and supportive',
      bio: ''
    });

    const handleSubmit = () => {
      if (!formData.name.trim()) return;
      createCharacter({
        name: formData.name,
        persona: {
          name: formData.name,
          style: formData.style,
          bio: formData.bio
        }
      });
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
          <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Create New Companion
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="e.g., Sarah, Alex"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Personality Style</label>
              <input
                type="text"
                value={formData.style}
                onChange={(e) => setFormData({...formData, style: e.target.value})}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="e.g., playful, romantic, supportive"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Background & Interests</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                rows={4}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="Tell me about their interests, background, or any specific traits..."
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 p-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.name.trim() || isLoading}
                className="flex-1 p-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
              >
                {isLoading ? 'Creating...' : 'Create'}
              </button>
            </div>
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
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    selectedCharacter?.id === character.id ? 'bg-white/20' : 'bg-gradient-to-r from-purple-500 to-blue-500'
                  }`}>
                    <Bot className={`w-6 h-6 ${selectedCharacter?.id === character.id ? 'text-white' : 'text-white'}`} />
                  </div>
                  <div>
                    <div className="font-semibold">{character.name}</div>
                    <div className={`text-sm ${selectedCharacter?.id === character.id ? 'text-white/80' : 'text-gray-600'}`}>
                      {typeof character.persona === 'object' ? character.persona.style : character.persona}
                    </div>
                  </div>
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
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedCharacter.name}</h2>
                    <p className="text-gray-600">
                      {typeof selectedCharacter.persona === 'object' 
                        ? [selectedCharacter.persona.style, selectedCharacter.persona.bio].filter(Boolean).join(' • ')
                        : selectedCharacter.persona || 'AI Companion'
                      }
                    </p>
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
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Bot className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Say hello to {selectedCharacter.name}!
                  </h3>
                  <p className="text-gray-600">Start a conversation with your AI companion</p>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-6 py-4 rounded-3xl shadow-sm ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                        : 'bg-white text-gray-800 shadow-md'
                    }`}
                  >
                    {message.content}
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
                      <span className="text-sm text-gray-600">Typing...</span>
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
                  placeholder="Type your message..."
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

export default AICompanionApp;
