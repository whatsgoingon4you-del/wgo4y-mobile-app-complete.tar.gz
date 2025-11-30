import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Logo from '@/components/Logo';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Profile = () => {
  const navigate = useNavigate();
  const { user, token, logout, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    username: user?.username || '',
    email: user?.email || '',
    photo_url: user?.photo_url || ''
  });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form to original values
      setFormData({
        full_name: user?.full_name || '',
        username: user?.username || '',
        email: user?.email || '',
        photo_url: user?.photo_url || ''
      });
      setMessage({ type: '', text: '' });
    }
    setIsEditing(!isEditing);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);

    try {
      // Update profile
      await axios.put(
        `${API}/users/profile`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh user data to show changes immediately
      await refreshUser();
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to update profile' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Logo className="h-10" onClick={() => navigate('/dashboard')} />
            <nav className="flex items-center space-x-6">
              <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-purple-600">
                Dashboard
              </button>
              <button onClick={() => navigate('/events')} className="text-gray-600 hover:text-purple-600">
                Events
              </button>
              <button onClick={() => navigate('/venues')} className="text-gray-600 hover:text-purple-600">
                Venues
              </button>
              <button onClick={() => navigate('/jobs')} className="text-gray-600 hover:text-purple-600">
                Jobs
              </button>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Button 
          variant="outline" 
          onClick={() => navigate('/dashboard')} 
          className="mb-6"
          data-testid="back-btn"
        >
          ← Back to Dashboard
        </Button>

        <div className="max-w-2xl mx-auto">
          <Card data-testid="profile-card">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-3xl">Profile</CardTitle>
                <Button 
                  variant={isEditing ? "outline" : "default"}
                  onClick={handleEditToggle}
                  data-testid="edit-toggle-btn"
                >
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {message.text && (
                <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}

              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-6" data-testid="edit-profile-form">
                  <div className="space-y-2">
                    <Label htmlFor="photo_url">Profile Picture</Label>
                    <Input
                      id="photo_url"
                      data-testid="photo-url-input"
                      placeholder="https://example.com/your-photo.jpg"
                      value={formData.photo_url}
                      onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">Enter a direct link to your profile picture (optional)</p>
                    {formData.photo_url && (
                      <div className="mt-2">
                        <img 
                          src={formData.photo_url} 
                          alt="Preview" 
                          className="w-24 h-24 rounded-full object-cover border-2 border-purple-200"
                          onError={(e) => {
                            e.target.src = '';
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      data-testid="full-name-input"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      data-testid="username-input"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                      required
                    />
                    <p className="text-xs text-gray-500">Letters, numbers, and underscores only</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      data-testid="email-input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Role (cannot be changed)</Label>
                    <Input
                      value={user?.role?.replace('/', ' / ')}
                      disabled
                      className="bg-gray-50 capitalize"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tier (cannot be changed)</Label>
                    <Input
                      value={user?.tier}
                      disabled
                      className="bg-gray-50 capitalize"
                    />
                    <p className="text-xs text-gray-500">Contact support to upgrade your tier</p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loading}
                    data-testid="save-btn"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              ) : (
                <div className="space-y-6" data-testid="profile-view">
                  <div className="text-center py-6">
                    {user?.photo_url ? (
                      <div className="flex justify-center mb-4">
                        <img 
                          src={user.photo_url} 
                          alt={user.full_name}
                          className="w-32 h-32 rounded-full object-cover border-4 border-purple-200 shadow-lg"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex justify-center mb-4">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                          {user?.full_name?.charAt(0) || user?.username?.charAt(0) || '?'}
                        </div>
                      </div>
                    )}
                    <div className="inline-block px-8 py-4 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-semibold mb-2">{user?.full_name}</p>
                      <p className="text-xl text-purple-600 mb-3">@{user?.username}</p>
                      <p className="text-gray-600">{user?.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-6 border-t">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Role</p>
                      <p className="font-semibold capitalize">{user?.role?.replace('/', ' / ')}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Tier</p>
                      <p className="font-semibold capitalize">{user?.tier}</p>
                    </div>
                  </div>

                  {!user?.photo_url && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>Tip:</strong> Add a profile picture to personalize your account!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Profile;
