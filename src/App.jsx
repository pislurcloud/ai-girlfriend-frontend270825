import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, User, Bot, Settings, Image, Mic, MicOff, Camera, Palette, Loader, Edit3, Trash2, X, Check, Key } from 'lucide-react';

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

// Edit Character Modal Component
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

// Confirm Delete Modal Component
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

// Settings Modal Component
const SettingsModal = ({ user, onClose, onUpdateProfile, isLoading }) => {
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

// Enhanced Character Card Component
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
  
  // New state for edit/delete/settings functionality
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [deletingCharacter, setDeletingCharacter] = useState(null);
  
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
      setAuth
