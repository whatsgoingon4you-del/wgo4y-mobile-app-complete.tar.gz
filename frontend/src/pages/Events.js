import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Logo from '@/components/Logo';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Events = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const categories = ['Music', 'Sports', 'Arts', 'Food', 'Networking', 'Entertainment', 'Other'];

  useEffect(() => {
    fetchEvents();
  }, [category]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = {};
      if (category) params.category = category;
      if (search) params.search = search;

      const response = await axios.get(`${API}/events`, { params });
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchEvents();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
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
              <button onClick={() => navigate('/events')} className="text-purple-600 font-semibold">
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2" data-testid="events-title">Events</h1>
            <p className="text-gray-600">Discover and RSVP to exciting events</p>
          </div>
          {user?.role === 'business/venue' && (
            <div className="flex space-x-3">
              <Button onClick={() => navigate('/events/my-events')} variant="outline" data-testid="my-events-btn">
                My Events
              </Button>
              <Button onClick={() => navigate('/events/create')} data-testid="create-event-btn">
                Create Event
              </Button>
            </div>
          )}
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Search events by name, location, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
                data-testid="search-input"
              />
              <Button type="submit" data-testid="search-btn">Search</Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge
                variant={!category ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setCategory('')}
                data-testid="category-all"
              >
                All Categories
              </Badge>
              {categories.map((cat) => (
                <Badge
                  key={cat}
                  variant={category === cat ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setCategory(cat)}
                  data-testid={`category-${cat.toLowerCase()}`}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </form>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm" data-testid="no-events">
            <div className="flex justify-center mb-4">
              <Logo className="h-24 opacity-50" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No events found</h3>
            <p className="text-gray-600 mb-6">
              {category || search ? 'Try adjusting your filters' : 'Be the first to create an event!'}
            </p>
            {user?.role === 'business/venue' && (
              <Button onClick={() => navigate('/events/create')}>Create Event</Button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Card
                key={event.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/events/${event.id}`)}
                data-testid={`event-card-${event.id}`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge>{event.category}</Badge>
                    <Badge variant={event.rsvp_count >= event.capacity ? 'destructive' : 'outline'}>
                      {event.rsvp_count}/{event.capacity}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{event.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(event.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {event.location}
                    </div>
                    <p className="line-clamp-2 mt-3">{event.description}</p>
                  </div>
                  {event.waitlist_count > 0 && (
                    <Badge variant="secondary" className="mt-3">
                      {event.waitlist_count} on waitlist
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Events;
