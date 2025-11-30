import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Logo from '@/components/Logo';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const VenueDetail = () => {
  const navigate = useNavigate();
  const { venueId } = useParams();
  const { user, logout } = useAuth();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [venueEvents, setVenueEvents] = useState([]);

  useEffect(() => {
    fetchVenue();
    fetchVenueEvents();
  }, [venueId]);

  const fetchVenue = async () => {
    try {
      const response = await axios.get(`${API}/venues/${venueId}`);
      setVenue(response.data);
    } catch (error) {
      console.error('Failed to fetch venue:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVenueEvents = async () => {
    try {
      // Fetch events at this venue location
      const response = await axios.get(`${API}/events`, {
        params: { search: venue?.name }
      });
      setVenueEvents(response.data.slice(0, 3)); // Show only 3 upcoming events
    } catch (error) {
      console.error('Failed to fetch venue events:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading venue...</p>
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Venue Not Found</h2>
          <Button onClick={() => navigate('/venues')}>Back to Venues</Button>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === venue.business_id;

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
        <Button 
          variant="outline" 
          onClick={() => navigate('/venues')} 
          className="mb-6"
          data-testid="back-btn"
        >
          ← Back to Venues
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Venue Details */}
          <div className="lg:col-span-2">
            <Card data-testid="venue-detail-card">
              {venue.photo_url && (
                <div className="h-96 bg-gray-200 overflow-hidden rounded-t-lg">
                  <img 
                    src={venue.photo_url} 
                    alt={venue.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.parentElement.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex justify-between items-start mb-4">
                  <Badge>{venue.venue_type}</Badge>
                </div>
                <CardTitle className="text-3xl mb-4">{venue.name}</CardTitle>
                <div className="flex items-start text-gray-600">
                  <svg className="w-5 h-5 mr-2 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <span>{venue.address}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <h3 className="text-xl font-semibold mb-3">About this venue</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{venue.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Events at this Venue */}
            {venueEvents.length > 0 && (
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>Upcoming Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {venueEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => navigate(`/events/${event.id}`)}
                      >
                        <div>
                          <h4 className="font-semibold">{event.name}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(event.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <Badge>{event.category}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Actions Card */}
          <div>
            <Card data-testid="actions-card">
              <CardHeader>
                <CardTitle>Venue Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isOwner && (
                  <div className="space-y-3">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">You manage this venue</p>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => navigate(`/venues/edit/${venue.id}`)}
                      data-testid="edit-venue-btn"
                    >
                      Edit Venue
                    </Button>
                  </div>
                )}

                <div className="pt-4 border-t space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Venue Type</p>
                    <p className="font-semibold">{venue.venue_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Address</p>
                    <p className="font-semibold">{venue.address}</p>
                  </div>
                </div>

                <Button 
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => navigate('/events', { state: { venueFilter: venue.name } })}
                  data-testid="view-events-btn"
                >
                  View Events at this Venue
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VenueDetail;
