import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Logo from '@/components/Logo';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CreateEvent = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    category: '',
    location: '',
    description: '',
    capacity: 50
  });

  const categories = ['Music', 'Sports', 'Arts', 'Food', 'Networking', 'Entertainment', 'Other'];

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate all fields
    if (!formData.name || !formData.date || !formData.category || !formData.location || !formData.description) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.capacity < 1) {
      setError('Capacity must be at least 1');
      return;
    }

    // Convert date to ISO format
    const eventData = {
      ...formData,
      date: new Date(formData.date + 'T12:00:00Z').toISOString(),
      capacity: parseInt(formData.capacity)
    };

    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/events`,
        eventData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Navigate to the created event
      navigate(`/events/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create event');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Check if user is business/venue
  if (user?.role !== 'business/venue') {
    return (
      <div className=\"min-h-screen flex items-center justify-center\">
        <div className=\"text-center\">
          <h2 className=\"text-2xl font-bold mb-2\">Access Denied</h2>
          <p className=\"text-gray-600 mb-4\">Only business/venue accounts can create events</p>
          <Button onClick={() => navigate('/events')}>Back to Events</Button>
        </div>
      </div>
    );
  }

  return (
    <div className=\"min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50\">
      {/* Header */}
      <header className=\"bg-white border-b shadow-sm\">
        <div className=\"container mx-auto px-4 py-4\">
          <div className=\"flex justify-between items-center\">
            <Logo className=\"h-10\" onClick={() => navigate('/dashboard')} />
            <nav className=\"flex items-center space-x-6\">
              <button onClick={() => navigate('/dashboard')} className=\"text-gray-600 hover:text-purple-600\">
                Dashboard
              </button>
              <button onClick={() => navigate('/events')} className=\"text-purple-600 font-semibold\">
                Events
              </button>
              <button onClick={() => navigate('/venues')} className=\"text-gray-600 hover:text-purple-600\">
                Venues
              </button>
              <button onClick={() => navigate('/jobs')} className=\"text-gray-600 hover:text-purple-600\">
                Jobs
              </button>
              <Button variant=\"outline\" onClick={handleLogout}>
                Logout
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className=\"container mx-auto px-4 py-8\">
        <div className=\"max-w-2xl mx-auto\">
          <Button 
            variant=\"outline\" 
            onClick={() => navigate('/events')} 
            className=\"mb-6\"
            data-testid=\"back-btn\"
          >
            ← Back to Events
          </Button>

          <Card data-testid=\"create-event-form\">
            <CardHeader>
              <CardTitle className=\"text-3xl\">Create New Event</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className=\"space-y-6\">
                {error && (
                  <Alert variant=\"destructive\" data-testid=\"error-alert\">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className=\"space-y-2\">
                  <Label htmlFor=\"name\">Event Name *</Label>
                  <Input
                    id=\"name\"
                    data-testid=\"name-input\"
                    placeholder=\"Summer Music Festival\"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className=\"space-y-2\">
                  <Label htmlFor=\"date\">Event Date *</Label>
                  <Input
                    id=\"date\"
                    type=\"date\"
                    data-testid=\"date-input\"
                    min={today}
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                  <p className=\"text-xs text-gray-500\">Events cannot be scheduled for past dates</p>
                </div>

                <div className=\"space-y-2\">
                  <Label htmlFor=\"category\">Category *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger data-testid=\"category-select\">
                      <SelectValue placeholder=\"Select a category\" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className=\"space-y-2\">
                  <Label htmlFor=\"location\">Location *</Label>
                  <Input
                    id=\"location\"
                    data-testid=\"location-input\"
                    placeholder=\"123 Main St, City, State\"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </div>

                <div className=\"space-y-2\">
                  <Label htmlFor=\"capacity\">Capacity *</Label>
                  <Input
                    id=\"capacity\"
                    type=\"number\"
                    data-testid=\"capacity-input\"
                    min=\"1\"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    required
                  />
                  <p className=\"text-xs text-gray-500\">Maximum number of attendees (waitlist will auto-promote)</p>
                </div>

                <div className=\"space-y-2\">
                  <Label htmlFor=\"description\">Description *</Label>
                  <Textarea
                    id=\"description\"
                    data-testid=\"description-input\"
                    placeholder=\"Tell people what this event is about...\"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={6}
                    required
                  />
                </div>

                <div className=\"flex gap-4\">
                  <Button
                    type=\"button\"
                    variant=\"outline\"
                    onClick={() => navigate('/events')}
                    className=\"flex-1\"
                    data-testid=\"cancel-btn\"
                  >
                    Cancel
                  </Button>
                  <Button
                    type=\"submit\"
                    className=\"flex-1 bg-gradient-to-r from-purple-600 to-blue-600\"
                    disabled={loading}
                    data-testid=\"submit-btn\"
                  >
                    {loading ? 'Creating...' : 'Create Event'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CreateEvent;
