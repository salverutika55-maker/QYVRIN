import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { DBService } from '../services/db';
import { PublicProfile } from '../types';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { User, Briefcase, Award, FileText, Globe, Lock } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Partial<PublicProfile>>({
    displayName: '',
    professionalRole: '',
    expertise: '',
    bio: '',
    visibility: 'PRIVATE',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const saveLock = useRef(false);

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      try {
        const p = await DBService.getPublicProfile(user.uid);
        if (p) {
          setProfile(p);
        } else if (user.displayName) {
          setProfile(prev => ({ ...prev, displayName: user.displayName! }));
        }
      } catch (error) {
        console.error("Failed to load profile", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user || saveLock.current) return;
    saveLock.current = true;
    setIsSaving(true);
    setSaveMessage('');

    try {
      await DBService.savePublicProfile(user.uid, profile);
      setSaveMessage('Profile saved successfully.');
    } catch (error) {
      console.error("Failed to save profile", error);
      setSaveMessage('Failed to save profile.');
    } finally {
      setIsSaving(false);
      saveLock.current = false;
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-zinc-500">Loading profile...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 p-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Public Profile</h1>
        <p className="text-zinc-500 mt-2">Manage your professional identity within Decision Circles.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Profile Visibility</CardTitle>
          <p className="text-sm text-zinc-500 mt-1">Your profile is private until you choose to make it visible to the QYVRIN community.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-lg border border-zinc-200 bg-zinc-50">
            <div className="p-3 bg-white rounded-full border border-zinc-200">
              {profile.visibility === 'COMMUNITY' ? <Globe className="w-6 h-6 text-blue-600" /> : <Lock className="w-6 h-6 text-zinc-500" />}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-zinc-900">{profile.visibility === 'COMMUNITY' ? 'Community Visible' : 'Private'}</h3>
              <p className="text-sm text-zinc-500">
                {profile.visibility === 'COMMUNITY' 
                  ? 'Your profile information is visible to members of your circles.' 
                  : 'You appear as "Private Member" in circles. Your details are hidden.'}
              </p>
            </div>
            <Button 
              variant={profile.visibility === 'COMMUNITY' ? 'outline' : 'primary'}
              onClick={() => setProfile({ ...profile, visibility: profile.visibility === 'COMMUNITY' ? 'PRIVATE' : 'COMMUNITY' })}
            >
              {profile.visibility === 'COMMUNITY' ? 'Make Private' : 'Make Public'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Profile Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
              <User className="w-4 h-4 text-zinc-400" /> Display Name
            </label>
            <input 
              type="text" 
              value={profile.displayName || ''} 
              onChange={e => setProfile({ ...profile, displayName: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-zinc-400" /> Professional Role
            </label>
            <input 
              type="text" 
              value={profile.professionalRole || ''} 
              onChange={e => setProfile({ ...profile, professionalRole: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g. CFO, Founder, FP&A Manager"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
              <Award className="w-4 h-4 text-zinc-400" /> Expertise
            </label>
            <input 
              type="text" 
              value={profile.expertise || ''} 
              onChange={e => setProfile({ ...profile, expertise: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g. SaaS metrics, M&A, Cost Optimization"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-400" /> Short Bio
            </label>
            <textarea 
              value={profile.bio || ''} 
              onChange={e => setProfile({ ...profile, bio: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="A brief summary of your background..."
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-4">
            {saveMessage && <span className="text-sm text-zinc-500">{saveMessage}</span>}
            <Button onClick={handleSave} disabled={isSaving} isLoading={isSaving}>
              Save Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
