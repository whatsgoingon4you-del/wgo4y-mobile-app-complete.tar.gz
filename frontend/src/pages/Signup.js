import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Logo from '@/components/Logo';

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: ''
  });

  const roles = [
    { value: 'business/venue', label: 'Business/Venue', description: 'Post events, jobs, and manage your venue' },
    { value: 'entrepreneur/worker', label: 'Entrepreneur/Worker', description: 'Find jobs and showcase your services' },
    { value: 'general', label: 'General Public', description: 'Browse events and participate' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.role) {
      setError('Please select a user type');
      return;
    }

    setLoading(true);
    const result = await signup(formData);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl" data-testid="signup-form">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo className="h-16" />
          </div>
          <CardTitle className="text-3xl">Create Account</CardTitle>
          <CardDescription>Choose your account type to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive" data-testid="error-alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                data-testid="full-name-input"
                placeholder="John Doe"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                data-testid="email-input"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                data-testid="password-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <div className="space-y-3">
              <Label>I am a...</Label>
              <div className="space-y-3">
                {roles.map((role) => (
                  <div
                    key={role.value}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.role === role.value
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                    onClick={() => setFormData({ ...formData, role: role.value })}
                    data-testid={`role-option-${role.value}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          formData.role === role.value
                            ? 'border-purple-600'
                            : 'border-gray-300'
                        }`}
                      >
                        {formData.role === role.value && (
                          <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{role.label}</div>
                        <div className="text-sm text-gray-600">{role.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white"
              disabled={loading}
              data-testid="signup-submit-btn"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
