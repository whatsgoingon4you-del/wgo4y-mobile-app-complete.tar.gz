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
  const { user, token, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    username: user?.username || '',
    email: user?.email || ''
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
        email: user?.email || ''
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

      setMessage({ type: 'success', text: 'Profile updated successfully! Please log in again to see changes.' });
      setIsEditing(false);
      
      // Logout after 2 seconds to refresh token
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000);
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
          <Card>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <Logo className="h-20 opacity-50" />
              </div>
              <CardTitle className="text-3xl text-center">Profile</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-12">
              <div className="space-y-4">
                <div className="inline-block px-6 py-3 bg-purple-50 rounded-lg">
                  <p className="text-lg">
                    <span className="font-semibold">{user?.full_name}</span>
                  </p>
                  <p className="text-purple-600">@{user?.username}</p>
                  <p className="text-sm text-gray-600 mt-2">{user?.email}</p>
                </div>
                
                <div className="pt-6">
                  <p className="text-gray-600 mb-2">Role: <span className="font-semibold capitalize">{user?.role?.replace('/', ' / ')}</span></p>
                  <p className="text-gray-600">Tier: <span className="font-semibold capitalize">{user?.tier}</span></p>
                </div>

                <div className="pt-8">
                  <div className="inline-flex items-center space-x-2 text-yellow-600 bg-yellow-50 px-4 py-2 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Full profile management coming soon</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Profile;
