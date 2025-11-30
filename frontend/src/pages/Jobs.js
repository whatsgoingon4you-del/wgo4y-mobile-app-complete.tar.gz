import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/Logo';

const Jobs = () => {
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
              <button onClick={() => navigate('/jobs')} className="text-purple-600 font-semibold">
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
              <CardTitle className="text-3xl text-center">Job Board</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-12">
              <div className="space-y-4">
                <div className="inline-flex items-center space-x-2 text-blue-600 bg-blue-50 px-6 py-3 rounded-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-lg font-semibold">Job Board Coming Soon</span>
                </div>
                
                <p className="text-gray-600 max-w-md mx-auto pt-4">
                  The job board will allow businesses to post opportunities and {user?.role === 'entrepreneur/worker' ? 'you' : 'entrepreneurs'} to apply with cover letters and experience.
                </p>

                <div className="pt-6 text-sm text-gray-500">
                  <p>Features include:</p>
                  <ul className="mt-2 space-y-1">
                    <li>• Browse and filter job postings</li>
                    <li>• Apply with cover letter & experience</li>
                    <li>• Track application status</li>
                    <li>• Role matching with badges</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Jobs;
