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

const Venues = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [venueType, setVenueType] = useState('');

  const venueTypes = ['Concert Hall', 'Restaurant', 'Club', 'Bar', 'Theater', 'Stadium', 'Park', 'Hotel', 'Gallery', 'Other'];

  useEffect(() => {
    fetchVenues();
  }, [venueType]);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const params = {};
      if (venueType) params.venue_type = venueType;
      if (search) params.search = search;

      const response = await axios.get(`${API}/venues`, { params });
      setVenues(response.data);
    } catch (error) {
      console.error('Failed to fetch venues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchVenues();
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
              <button onClick={() => navigate('/events')} className="text-gray-600 hover:text-purple-600">
                Events
              </button>
              <button onClick={() => navigate('/venues')} className="text-purple-600 font-semibold">
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
            <h1 className="text-4xl font-bold mb-2" data-testid="venues-title">Venues</h1>
            <p className="text-gray-600">Explore amazing venues in your area</p>
          </div>
          {user?.role === 'business/venue' && (
            <div className="flex space-x-3">
              <Button onClick={() => navigate('/venues/my-venues')} variant="outline" data-testid="my-venues-btn">
                My Venues
              </Button>
              <Button onClick={() => navigate('/venues/create')} data-testid="create-venue-btn">
                Add Venue
              </Button>
            </div>
          )}
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Search venues by name, address, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
                data-testid="search-input"
              />
              <Button type="submit" data-testid="search-btn">Search</Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge
                variant={!venueType ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setVenueType('')}
                data-testid="type-all"
              >
                All Types
              </Badge>
              {venueTypes.map((type) => (
                <Badge
                  key={type}
                  variant={venueType === type ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setVenueType(type)}
                  data-testid={`type-${type.toLowerCase().replace(' ', '-')}`}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </form>
        </div>

        {/* Venues Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading venues...</p>
          </div>
        ) : venues.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm" data-testid="no-venues">
            <div className="flex justify-center mb-4">
              <Logo className="h-24 opacity-50" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No venues found</h3>
            <p className="text-gray-600 mb-6">
              {venueType || search ? 'Try adjusting your filters' : 'Be the first to add a venue!'}
            </p>
            {user?.role === 'business/venue' && (
              <Button onClick={() => navigate('/venues/create')}>Add Venue</Button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues.map((venue) => (
              <Card
                key={venue.id}
                className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                onClick={() => navigate(`/venues/${venue.id}`)}
                data-testid={`venue-card-${venue.id}`}
              >
                {venue.photo_url && (
                  <div className="h-48 bg-gray-200 overflow-hidden">
                    <img 
                      src={venue.photo_url} 
                      alt={venue.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge>{venue.venue_type}</Badge>
                  </div>
                  <CardTitle className="text-xl">{venue.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <span className="line-clamp-1">{venue.address}</span>
                    </div>
                    <p className="line-clamp-2 mt-3">{venue.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Venues;
