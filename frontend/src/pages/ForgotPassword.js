import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Logo from '@/components/Logo';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md" data-testid="forgot-password-form">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">W</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              WGO4Y
            </h1>
          </div>
          <CardTitle className="text-3xl">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email and we'll send you a reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200" data-testid="success-alert">
                <AlertDescription className="text-green-800">
                  If the email exists, a reset link has been sent. Please check your inbox.
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => navigate('/login')}
                className="w-full"
                data-testid="back-to-login-btn"
              >
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive" data-testid="error-alert">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  data-testid="email-input"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                disabled={loading}
                data-testid="submit-btn"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <p className="text-center text-sm text-gray-600">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-purple-600 hover:underline font-semibold"
                  data-testid="login-link"
                >
                  Sign In
                </button>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
