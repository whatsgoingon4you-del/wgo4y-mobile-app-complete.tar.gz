import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">W</span>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            WGO4Y
          </h1>
        </div>
        <div className="space-x-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/login')}
            data-testid="sign-in-btn"
          >
            Sign In
          </Button>
          <Button 
            onClick={() => navigate('/signup')}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
            data-testid="create-account-btn"
          >
            Create Account
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Welcome to WGO4Y
        </h2>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Your gateway to events, venues, and entertainment
        </p>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <Card className="border-2 border-purple-100 hover:border-purple-300 transition-all hover:shadow-lg cursor-pointer" data-testid="discover-events-card">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">Discover Events</h3>
              <p className="text-gray-600 mb-6">
                Browse and RSVP to exciting events in your area
              </p>
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={() => navigate('/signup')}
                data-testid="discover-events-btn"
              >
                Get Started
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-100 hover:border-blue-300 transition-all hover:shadow-lg cursor-pointer" data-testid="find-venues-card">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">Find Venues</h3>
              <p className="text-gray-600 mb-6">
                Explore amazing venues for your next event
              </p>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => navigate('/signup')}
                data-testid="find-venues-btn"
              >
                Explore Now
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-indigo-100 hover:border-indigo-300 transition-all hover:shadow-lg cursor-pointer" data-testid="connect-talent-card">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3">Connect with Talent</h3>
              <p className="text-gray-600 mb-6">
                Find and hire talented professionals for your events
              </p>
              <Button 
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                onClick={() => navigate('/signup')}
                data-testid="connect-talent-btn"
              >
                Connect Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-600 border-t">
        <p>By continuing, you agree to our Terms of Service and Privacy Policy</p>
      </footer>
    </div>
  );
};

export default Landing;
