import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/Logo';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Logo className="h-10" onClick={() => navigate('/dashboard')} />
          <div className="flex items-center space-x-4">
            <span className="text-gray-600" data-testid="user-email">{user?.email}</span>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-2" data-testid="welcome-message">
            Welcome back, {user?.full_name}!
          </h2>
          <p className="text-gray-600 mb-2">
            <span className="text-purple-600 font-semibold">@{user?.username}</span>
          </p>
          <p className="text-gray-600 mb-8">
            Role: <span className="font-semibold capitalize" data-testid="user-role">{user?.role?.replace('/', ' / ')}</span>
            {' '}•{' '}
            Tier: <span className="font-semibold capitalize" data-testid="user-tier">{user?.tier}</span>
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow" data-testid="events-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Browse and RSVP to upcoming events</p>
                <Button className="w-full" onClick={() => navigate('/events')} data-testid="view-events-btn">
                  View Events
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow" data-testid="venues-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  Venues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Explore venues in your area</p>
                <Button className="w-full" onClick={() => navigate('/venues')} data-testid="view-venues-btn">
                  View Venues
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow" data-testid="jobs-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Jobs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Browse job opportunities</p>
                <Button className="w-full" onClick={() => navigate('/jobs')} data-testid="view-jobs-btn">
                  View Jobs
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow" data-testid="profile-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Manage your profile and settings</p>
                <Button className="w-full" onClick={() => navigate('/profile')} data-testid="view-profile-btn">
                  View Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
