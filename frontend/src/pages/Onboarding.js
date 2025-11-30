import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Logo from '@/components/Logo';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, token, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadMethod, setUploadMethod] = useState('upload'); // 'upload' or 'url'
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const totalSteps = 2;
  const progress = (step / totalSteps) * 100;

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSkipPhoto = () => {
    setStep(2);
  };

  const handleSavePhoto = async () => {
    // If no photo selected, just skip
    if (uploadMethod === 'upload' && !selectedFile) {
      setStep(2);
      return;
    }
    if (uploadMethod === 'url' && !photoUrl) {
      setStep(2);
      return;
    }

    setLoading(true);
    try {
      if (uploadMethod === 'upload' && selectedFile) {
        // Upload file
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        await axios.post(
          `${API}/upload/profile-picture`,
          formData,
          { 
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            } 
          }
        );
      } else if (uploadMethod === 'url' && photoUrl) {
        // Save URL
        await axios.put(
          `${API}/users/profile`,
          { photo_url: photoUrl },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      await refreshUser();
      setStep(2);
    } catch (error) {
      console.error('Failed to save photo:', error);
      setStep(2); // Continue anyway
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    try {
      const response = await axios.put(
        `${API}/users/profile`,
        { onboarding_completed: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Onboarding update response:', response.data);
      
      // Wait a bit for the update to propagate
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh user data
      const refreshResult = await refreshUser();
      console.log('Refresh result:', refreshResult);
      
      // Force navigate to dashboard
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      // Force navigate anyway
      navigate('/dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const getRoleSpecificMessage = () => {
    switch (user?.role) {
      case 'business/venue':
        return {
          title: "Ready to create events and post jobs!",
          suggestions: [
            "Create your first event to attract attendees",
            "Add your venue to help people find you",
            "Post job opportunities to find talent"
          ]
        };
      case 'entrepreneur/worker':
        return {
          title: "Let's showcase your talents!",
          suggestions: [
            "Browse events and RSVP to network",
            "Find job opportunities that match your skills",
            "Complete your profile to stand out"
          ]
        };
      default:
        return {
          title: "Welcome to WGO4Y!",
          suggestions: [
            "Discover exciting events in your area",
            "Explore venues and entertainment options",
            "Connect with the community"
          ]
        };
    }
  };

  const roleMessage = getRoleSpecificMessage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl" data-testid="onboarding-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo className="h-16" />
          </div>
          <CardTitle className="text-3xl">Welcome to WGO4Y!</CardTitle>
          <CardDescription>Let's get your profile set up</CardDescription>
          <div className="mt-6">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-gray-600 mt-2">Step {step} of {totalSteps}</p>
          </div>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-6" data-testid="step-photo">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Add Your Profile Picture</h3>
                <p className="text-gray-600">Help others recognize you (optional)</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-center">
                  {(previewUrl || photoUrl) ? (
                    <img 
                      src={previewUrl || photoUrl} 
                      alt="Profile preview"
                      className="w-32 h-32 rounded-full object-cover border-4 border-purple-200"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white text-5xl font-bold">
                      {user?.full_name?.charAt(0) || user?.username?.charAt(0) || '?'}
                    </div>
                  )}
                </div>

                {/* Upload Method Toggle */}
                <div className="flex gap-2 justify-center">
                  <Button
                    type="button"
                    variant={uploadMethod === 'upload' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUploadMethod('upload')}
                    data-testid="upload-method-btn"
                  >
                    Upload File
                  </Button>
                  <Button
                    type="button"
                    variant={uploadMethod === 'url' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUploadMethod('url')}
                    data-testid="url-method-btn"
                  >
                    Use URL
                  </Button>
                </div>

                {uploadMethod === 'upload' ? (
                  <div className="space-y-2">
                    <Label htmlFor="file_upload">Choose Photo</Label>
                    <div className="flex gap-2">
                      <Input
                        id="file_upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        data-testid="file-input"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-gray-500">Upload JPEG, PNG, GIF, or WebP (max 5MB)</p>
                    {selectedFile && (
                      <p className="text-xs text-green-600">✓ {selectedFile.name} selected</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="photo_url">Photo URL</Label>
                    <Input
                      id="photo_url"
                      data-testid="photo-url-input"
                      placeholder="https://example.com/your-photo.jpg"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">Enter a direct link to your profile picture</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkipPhoto}
                  className="flex-1"
                  data-testid="skip-photo-btn"
                >
                  Skip for Now
                </Button>
                <Button
                  type="button"
                  onClick={handleSavePhoto}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600"
                  data-testid="save-photo-btn"
                >
                  {loading ? 'Saving...' : 'Continue'}
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6" data-testid="step-complete">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold mb-2">{roleMessage.title}</h3>
                <p className="text-gray-600 mb-6">Here's what you can do next:</p>
              </div>

              <div className="bg-purple-50 rounded-lg p-6 space-y-3">
                {roleMessage.suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start">
                    <svg className="w-5 h-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-700">{suggestion}</span>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> You can always update your profile, add more details, or upload a new photo anytime from the Profile page.
                </p>
              </div>

              <Button
                onClick={handleCompleteOnboarding}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-lg py-6"
                data-testid="complete-onboarding-btn"
              >
                {loading ? 'Loading...' : 'Get Started!'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
