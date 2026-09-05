import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../lib/AuthContext';
import { logout } from '../lib/firebase';
import { LogOut } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 mb-2">
            Settings
          </h1>
          <p className="text-zinc-500">
            Manage your account and preferences.
          </p>
        </div>
        <Button variant="outline" className="text-zinc-600 hover:text-zinc-900" onClick={logout}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
              <input 
                type="text" 
                defaultValue={user?.displayName || ''}
                disabled
                className="w-full max-w-md px-3 py-2 border border-zinc-200 rounded-md bg-zinc-50 text-zinc-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
              <input 
                type="email" 
                defaultValue={user?.email || ''}
                disabled
                className="w-full max-w-md px-3 py-2 border border-zinc-200 rounded-md bg-zinc-50 text-zinc-500" 
              />
            </div>
          </CardContent>
        </Card>


        <Card>
          <CardHeader>
            <CardTitle>AI Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-900">Cognitive Bias Detection</p>
                <p className="text-sm text-zinc-500">Identify potential behavioral patterns in your reasoning.</p>
              </div>
              <div className="w-11 h-6 bg-zinc-900 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-900">Devil's Advocate Mode</p>
                <p className="text-sm text-zinc-500">Always present the strongest counter-argument to your decision.</p>
              </div>
              <div className="w-11 h-6 bg-zinc-200 rounded-full relative cursor-pointer">
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-900">Delete Account</p>
                <p className="text-sm text-zinc-500">Permanently remove your account and all data.</p>
              </div>
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">Delete</Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 p-4 bg-zinc-50 rounded-lg text-sm text-zinc-500 leading-relaxed border border-zinc-100">
          <p className="font-medium text-zinc-700 mb-1">Disclaimer</p>
          <p>
            QYVRIN provides educational financial reflection and scenario analysis. 
            It does not provide personalised investment, tax or legal advice. 
            Always consult with a qualified professional before making significant financial decisions.
          </p>
        </div>
      </div>
    </div>
  );
};
