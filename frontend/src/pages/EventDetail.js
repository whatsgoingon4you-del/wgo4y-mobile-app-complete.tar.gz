import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Logo from '@/components/Logo';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EventDetail = () => {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { user, token, logout } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rsvpStatus, setRsvpStatus] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchEvent();
    checkRSVPStatus();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`${API}/events/${eventId}`);
      setEvent(response.data);
    } catch (error) {
      console.error('Failed to fetch event:', error);
      setMessage({ type: 'error', text: 'Failed to load event details' });
    } finally {
      setLoading(false);
    }
  };

  const checkRSVPStatus = async () => {
    try {
      const response = await axios.get(`${API}/events/my/rsvps`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const myRsvp = response.data.find(r => r.event.id === eventId);
      if (myRsvp) {
        setRsvpStatus(myRsvp.rsvp.status);
      }
    } catch (error) {
      console.error('Failed to check RSVP status:', error);
    }
  };

  const handleRSVP = async () => {
    setActionLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const response = await axios.post(
        `${API}/events/${eventId}/rsvp`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage({ type: 'success', text: response.data.message });
      setRsvpStatus(response.data.status);
      fetchEvent(); // Refresh event to update counts
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to RSVP' 
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRSVP = async () => {
    setActionLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const response = await axios.delete(
        `${API}/events/${eventId}/rsvp`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage({ type: 'success', text: response.data.message });
      setRsvpStatus(null);
      fetchEvent(); // Refresh event to update counts
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to cancel RSVP' 
      });
    } finally {
      setActionLoading(false);
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
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Event Not Found</h2>
          <Button onClick={() => navigate('/events')}>Back to Events</Button>
        </div>
      </div>
    );
  }

  const isFull = event.rsvp_count >= event.capacity;
  const isOwner = user?.id === event.business_id;

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
        <Button 
          variant="outline" 
          onClick={() => navigate('/events')} 
          className="mb-6"
          data-testid="back-btn"
        >
          ← Back to Events
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-2">
            <Card data-testid="event-detail-card">
              <CardHeader>
                <div className="flex justify-between items-start mb-4">
                  <Badge>{event.category}</Badge>
                  <Badge variant={isFull ? 'destructive' : 'outline'}>
                    {event.rsvp_count}/{event.capacity} {isFull ? '(Full)' : ''}
                  </Badge>
                </div>
                <CardTitle className="text-3xl mb-4">{event.name}</CardTitle>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-semibold">
                      {new Date(event.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <span>{event.location}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <h3 className="text-xl font-semibold mb-3">About this event</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
                </div>

                {event.waitlist_count > 0 && (
                  <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      <strong>{event.waitlist_count}</strong> people on the waitlist
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RSVP Card */}
          <div>
            <Card data-testid="rsvp-card">
              <CardHeader>
                <CardTitle>RSVP</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {message.text && (
                  <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                    <AlertDescription>{message.text}</AlertDescription>
                  </Alert>
                )}

                {isOwner ? (
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">You are the organizer of this event</p>
                    <Button 
                      className="w-full mt-4" 
                      onClick={() => navigate(`/events/edit/${event.id}`)}
                      data-testid="edit-event-btn"
                    >
                      Edit Event
                    </Button>
                  </div>
                ) : rsvpStatus ? (
                  <div className="space-y-4">
                    <div className={`text-center p-4 rounded-lg ${
                      rsvpStatus === 'confirmed' ? 'bg-green-50 border-2 border-green-200' : 'bg-yellow-50 border-2 border-yellow-200'
                    }`}>
                      <p className={`font-semibold ${
                        rsvpStatus === 'confirmed' ? 'text-green-800' : 'text-yellow-800'
                      }`}>
                        {rsvpStatus === 'confirmed' ? '✓ RSVP Confirmed!' : '⏳ On Waitlist'}
                      </p>
                      <p className="text-sm mt-1">
                        {rsvpStatus === 'confirmed' 
                          ? 'See you there!' 
                          : "You'll be notified if a spot opens up"}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleCancelRSVP}
                      disabled={actionLoading}
                      data-testid="cancel-rsvp-btn"
                    >
                      {actionLoading ? 'Canceling...' : 'Cancel RSVP'}
                    </Button>
                  </div>
                ) : (
                  <Button 
                    className="w-full"
                    onClick={handleRSVP}
                    disabled={actionLoading}
                    data-testid="rsvp-btn"
                  >
                    {actionLoading ? 'Processing...' : isFull ? 'Join Waitlist' : 'RSVP Now'}
                  </Button>
                )}

                <div className="pt-4 border-t space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Confirmed</span>
                    <span className="font-semibold">{event.rsvp_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Capacity</span>
                    <span className="font-semibold">{event.capacity}</span>
                  </div>
                  {event.waitlist_count > 0 && (
                    <div className="flex justify-between">
                      <span>Waitlist</span>
                      <span className="font-semibold">{event.waitlist_count}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EventDetail;
