import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, User, Bot, Settings, Image, Mic, MicOff, Camera, Palette, Loader, Volume2 } from 'lucide-react';

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

const VOICE_OPTIONS = [
  { id: 'en-US-Studio-O', label: 'English (US) - Studio O' },
  { id: 'en-US-Studio-A', label: 'English (US) - Studio A' },
  { id: 'en-GB-Studio-O', label: 'English (UK) - Studio O' },
  { id: 'en-AU-Studio-O', label: 'English (Australia) - Studio O' },
  { id: 'fr-FR-Studio-O', label: 'French - Studio O' },
  { id: 'es-ES-Studio-O', label: 'Spanish - Studio O' },
  { id: 'de-DE-Studio-O', label: 'German - Studio O' },
  { id: 'it-IT-Studio-O', label: 'Italian - Studio O' },
  { id: 'pt-BR-Studio-O', label: 'Portuguese (Brazil) - Studio O' },
  { id: 'zh-CN-Studio-O', label: 'Chinese (Mandarin) - Studio O' },
  { id: 'ja-JP-Studio-O', label: 'Japanese - Studio O' },
  { id: 'ko-KR-Studio-O', label: 'Korean - Studio O' },
];

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
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const synthesis = window.speechSynthesis;
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

  const sendMessage = async (text, audio = null) => {
    if ((!text && !audio) || !selectedCharacter || !user) return;
  
    try {
      setIsLoading(true);
      
      // Create message object with timestamp
      const userMessage = {
        sender: 'user',
        content: text || '🎤 Voice message',
        audio: audio || null,
        timestamp: new Date().toISOString()
      };
      
      // Add user message to chat immediately
      setMessages(prev => [...prev, userMessage]);
      
      // Prepare data for API call
      const messageData = {
        user_id: user.id,
        character_id: selectedCharacter.id,
        message: text || '',
        audio: audio || undefined
      };
  
      // Send to backend
      const response = await apiCall('/chat', 'POST', messageData, user);
      
      // Add AI response to chat
      const aiMessage = {
        sender: 'ai',
        content: response.reply,
        image_url: response.image_url,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMessage]);
  
      // Speak the AI's response if voice settings are available
      if (selectedCharacter.voiceSettings) {
        speakText(response.reply, selectedCharacter.voiceSettings);
      }
  
    } catch (error) {
      console.error('Error sending message:', error);
      // Show error to user
      setMessages(prev => [...prev, { 
        sender: 'system', 
        content: 'Failed to send message. Please try again.',
        timestamp: new Date().toISOString()
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
        voiceSettings: characterData.voiceSettings || {},
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

  // Voice recording functions
  const toggleRecording = async () => {
    if (!isRecording) {
      try {
        console.log("Requesting microphone access...");
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            channelCount: 1,
            sampleRate: 16000
          } 
        });
        
        mediaRecorder.current = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
          audioBitsPerSecond: 128000
        });
        
        audioChunks.current = [];
        
        mediaRecorder.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.current.push(event.data);
          }
        };
        
        mediaRecorder.current.onstop = async () => {
          try {
            console.log("Stopped recording, processing audio...");
            const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
            
            // Convert blob to base64
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            
            reader.onloadend = async () => {
              const base64Audio = reader.result;
              console.log("Audio data size:", base64Audio.length, "chars");
              
              // Send audio to backend
              try {
                setIsLoading(true);
                const response = await apiCall('/chat', 'POST', {
                  user_id: user?.id,
                  character_id: selectedCharacter?.id,
                  audio: base64Audio
                });
                
                if (response.reply) {
                  // Add AI response to chat
                  const aiMessage = {
                    sender: 'ai',
                    content: response.reply,
                    image_url: response.image_url,
                    timestamp: new Date().toISOString()
                  };
                  setMessages(prev => [...prev, aiMessage]);
                  
                  // Speak the response
                  if (selectedCharacter?.voiceSettings) {
                    speakText(response.reply, selectedCharacter.voiceSettings);
                  }
                }
              } catch (error) {
                console.error('Error sending audio message:', error);
                setMessages(prev => [...prev, {
                  sender: 'system',
                  content: 'Failed to process audio message. Please try again.',
                  timestamp: new Date().toISOString()
                }]);
              } finally {
                setIsLoading(false);
              }
            };
            
          } catch (error) {
            console.error('Error processing audio:', error);
            setMessages(prev => [...prev, {
              sender: 'system',
              content: 'Error processing audio. Please try again.',
              timestamp: new Date().toISOString()
            }]);
          } finally {
            // Stop all tracks in the stream
            stream.getTracks().forEach(track => track.stop());
          }
        };
        
        // Start recording
        mediaRecorder.current.start(100); // Collect data every 100ms
        setIsRecording(true);
        console.log("Recording started");
        
      } catch (error) {
        console.error('Error accessing microphone:', error);
        setMessages(prev => [...prev, {
          sender: 'system',
          content: 'Could not access microphone. Please check permissions.',
          timestamp: new Date().toISOString()
        }]);
      }
    } else {
      // Stop recording
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop();
        setIsRecording(false);
        console.log("Recording stopped");
      }
    }
  };
  

  // Text-to-speech function
  const speakText = (text, voiceSettings = {}) => {
    if (!text || !window.speechSynthesis) {
      console.warn('Speech synthesis not available or no text provided');
      return;
    }
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply voice settings with defaults
      const settings = {
        voiceId: 'en-US-Studio-O',
        speed: 1.0,
        pitch: 1.0,
        ...voiceSettings
      };
      
      // Set voice if available
      if (window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        const selectedVoice = voices.find(v => v.voiceURI.includes(settings.voiceId)) || 
                            voices.find(v => v.lang.startsWith('en-'));
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }
      
      // Apply rate (speed) and pitch
      utterance.rate = Math.min(Math.max(settings.speed || 1.0, 0.5), 2.0);
      utterance.pitch = Math.min(Math.max(settings.pitch || 1.0, 0.5), 2.0);
      
      // Error handling
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
      };
      
      utterance.onend = () => {
        console.log('Speech finished');
      };
      
      // Speak
      window.speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error('Error in speech synthesis:', error);
    }
  };

  // Load voices when component mounts
  useEffect(() => {
    if (synthesis) {
      const loadVoices = () => {
        const voices = synthesis.getVoices();
        if (voices.length > 0) {
          console.log('Voices loaded:', voices);
        }
      };
      
      synthesis.onvoiceschanged = loadVoices;
      loadVoices();
      
      return () => {
        synthesis.onvoiceschanged = null;
      };
    }
  }, []);

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
      voiceSettings: {
        voiceId: 'en-US-Studio-O',
        speed: 1.0,
        pitch: 1.0
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
          
          <div className="mt-6 border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              Voice Settings
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Voice
                </label>
                <select
                  value={formData.voiceSettings.voiceId}
                  onChange={(e) => setFormData({
                    ...formData,
                    voiceSettings: {
                      ...formData.voiceSettings,
                      voiceId: e.target.value
                    }
                  })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                >
                  {VOICE_OPTIONS.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Speed: {formData.voiceSettings.speed.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={formData.voiceSettings.speed}
                  onChange={(e) => setFormData({
                    ...formData,
                    voiceSettings: {
                      ...formData.voiceSettings,
                      speed: parseFloat(e.target.value)
                    }
                  })}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pitch: {formData.voiceSettings.pitch.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={formData.voiceSettings.pitch}
                  onChange={(e) => setFormData({
                    ...formData,
                    voiceSettings: {
                      ...formData.voiceSettings,
                      pitch: parseFloat(e.target.value)
                    }
                  })}
                  className="w-full"
                />
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
              className="flex-1 p-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all text-sm"
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

  const Message = ({ message, isUser }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);

    const handlePlayAudio = () => {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } else {
          audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
      }
    };

    useEffect(() => {
      if (audioRef.current) {
        const handleEnded = () => setIsPlaying(false);
        audioRef.current.addEventListener('ended', handleEnded);
        return () => {
          if (audioRef.current) {
            audioRef.current.removeEventListener('ended', handleEnded);
          }
        };
      }
    }, [message.audio]);

    return (
      <div
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`max-w-xs lg:max-w-md xl:max-w-2xl rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-purple-600 text-white rounded-br-none'
              : 'bg-gray-100 text-gray-800 rounded-bl-none'
          }`}
        >
          {message.audio ? (
            <div className="flex items-center">
              <button
                onClick={handlePlayAudio}
                className={`p-2 rounded-full ${
                  isUser ? 'bg-purple-700' : 'bg-gray-200'
                }`}
              >
                {isPlaying ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
              <span className="ml-2">
                {isUser ? 'Voice message sent' : 'Voice message received'}
              </span>
              <audio
                ref={audioRef}
                src={message.audio}
                className="hidden"
                preload="none"
              />
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}
          
          {message.image_url && (
            <div className="mt-2">
              <img
                src={message.image_url}
                alt="Generated content"
                className="rounded-lg max-w-full h-auto"
              />
            </div>
          )}
          
          <div
            className={`text-xs mt-1 ${
              isUser ? 'text-purple-200' : 'text-gray-500'
            }`}
          >
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
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
                  <button
                    onClick={toggleRecording}
                    className={`p-2 ${isRecording ? 'bg-red-500 text-white' : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'} rounded-xl transition-colors`}
                  >
                    {isRecording ? (
                      <MicOff className="w-5 h-5" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
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
                <Message key={index} message={message} isUser={message.sender === 'user'} />
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
            <div className="p-4 bg-white/80 backdrop-blur-md border-t border-white/20">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleRecording}
                  className={`p-3 rounded-full ${
                    isRecording 
                      ? 'bg-red-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  } transition-colors`}
                  title={isRecording ? 'Stop recording' : 'Record voice message'}
                >
                  {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage(inputMessage)}
                  placeholder="Type your message..."
                  className="flex-1 p-3 border-2 border-gray-200 rounded-full focus:outline-none focus:border-purple-500"
                  disabled={isLoading}
                />
                
                <button
                  onClick={() => sendMessage(inputMessage)}
                  disabled={!inputMessage.trim() || isLoading}
                  className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </div>
              
              {/* Voice Settings Panel */}
              {showVoiceSettings && (
                <div className="mt-4 p-4 bg-white rounded-xl shadow-lg">
                  <h3 className="text-lg font-semibold mb-3">Voice Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Voice
                      </label>
                      <select
                        value={selectedCharacter?.voiceSettings?.voiceId || 'en-US-Studio-O'}
                        onChange={(e) => {
                          if (selectedCharacter) {
                            const updatedCharacter = {
                              ...selectedCharacter,
                              voiceSettings: {
                                ...selectedCharacter.voiceSettings,
                                voiceId: e.target.value
                              }
                            };
                            setSelectedCharacter(updatedCharacter);
                            // Update in database
                            apiCall(
                              `/characters/${selectedCharacter.id}`, 
                              'PUT', 
                              { voiceSettings: updatedCharacter.voiceSettings },
                              user
                            );
                          }
                        }}
                        className="w-full p-2 border rounded-lg"
                      >
                        {VOICE_OPTIONS.map(option => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Speed: {selectedCharacter?.voiceSettings?.speed?.toFixed(1) || '1.0'}x
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={selectedCharacter?.voiceSettings?.speed || 1.0}
                        onChange={(e) => {
                          if (selectedCharacter) {
                            const updatedCharacter = {
                              ...selectedCharacter,
                              voiceSettings: {
                                ...selectedCharacter.voiceSettings,
                                speed: parseFloat(e.target.value)
                              }
                            };
                            setSelectedCharacter(updatedCharacter);
                          }
                        }}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pitch: {selectedCharacter?.voiceSettings?.pitch?.toFixed(1) || '1.0'}x
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.1"
                        value={selectedCharacter?.voiceSettings?.pitch || 1.0}
                        onChange={(e) => {
                          if (selectedCharacter) {
                            const updatedCharacter = {
                              ...selectedCharacter,
                              voiceSettings: {
                                ...selectedCharacter.voiceSettings,
                                pitch: parseFloat(e.target.value)
                              }
                            };
                            setSelectedCharacter(updatedCharacter);
                          }
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center mt-2 px-2">
                <button
                  onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                  className="text-sm text-gray-500 hover:text-purple-600 flex items-center gap-1"
                >
                  <Volume2 size={16} />
                  <span>Voice Settings</span>
                </button>
                
                <div className="text-xs text-gray-400">
                  {isRecording ? 'Recording...' : isSpeaking ? 'Speaking...' : ''}
                </div>
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
