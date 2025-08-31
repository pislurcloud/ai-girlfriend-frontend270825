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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [deletingCharacter, setDeletingCharacter] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const editCharacter = async (characterId, characterData) => {
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
          bio: characterData.bio
        },
        appearance: characterData.appearance || {}
      };

      await apiCall(`/characters/${characterId}`, 'PUT', payload, user);
      setShowEditModal(false);
      setEditingCharacter(null);
      await loadCharacters();
    } catch (error) {
      console.error('Character edit error:', error);
      alert('Failed to update character. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCharacter = async (characterId) => {
    if (!user?.id) {
      alert('User not authenticated');
      return;
    }

    try {
      setIsLoading(true);
      await apiCall(`/characters/${characterId}`, 'DELETE', { user_id: user.id }, user);
      if (selectedCharacter?.id === characterId) {
        setSelectedCharacter(null);
        setMessages([]);
      }
      setShowDeleteModal(false);
      setDeletingCharacter(null);
      await loadCharacters();
    } catch (error) {
      console.error('Character delete error:', error);
      alert('Failed to delete character. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateCharacterAvatar = async (characterId) => {
    if (!user?.id) {
      console.error('No user ID available for avatar generation');
      alert('User not authenticated');
      return;
    }

    try {
      setIsGeneratingImage(true);
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

  const requestPasswordReset = async (email) => {
    try {
      setIsLoading(true);
      setAuthError('');
      await apiCall('/users/reset-password', 'POST', { email });
      alert('Password reset instructions sent to your email!');
      setShowPasswordResetModal(false);
    } catch (error) {
      setAuthError('Failed to send reset email. Please check your email address.');
    } finally {
      setIsLoading(false);
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

  // --- LoginModal, CreateCharacterModal, EditCharacterModal, DeleteCharacterModal, PasswordResetModal ---
  // (omitted here for brevity, but identical to your working version with authError, authMode, etc.)

  if (showLoginModal) {
    return <LoginModal />;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex">
      {/* ... sidebar, chat area, etc. ... */}

      {/* Modals */}
      {showCreateModal && <CreateCharacterModal />}
      {showEditModal && <EditCharacterModal />}
      {showDeleteModal && <DeleteCharacterModal />}
      {showPasswordResetModal && <PasswordResetModal />}
    </div>
  );
};

export default AICompanionApp;
