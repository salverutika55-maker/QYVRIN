import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { DBService } from '../services/db';
import { Circle, CircleJoinRequest } from '../types';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Users, Plus, ArrowRight, UserPlus, Globe } from 'lucide-react';

export const Circles: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [myCircles, setMyCircles] = useState<Circle[]>([]);
  const [discoverableCircles, setDiscoverableCircles] = useState<Circle[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{circleId: string}[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCircleName, setNewCircleName] = useState('');
  const [newCircleDesc, setNewCircleDesc] = useState('');
  
  const requestLock = useRef(false);

  useEffect(() => {
    if (!user) return;
    const fetchCircles = async () => {
      try {
        const mine = await DBService.getMyCircles(user.uid);
        const discover = await DBService.getDiscoverableCircles(user.uid);
        const requests = await DBService.getMyPendingRequests(user.uid);
        
        setMyCircles(mine);
        setDiscoverableCircles(discover);
        setPendingRequests(requests);
      } catch (err) {
        console.error('Failed to fetch circles', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCircles();
  }, [user]);

  const handleCreateCircle = async () => {
    if (!user || requestLock.current || !newCircleName.trim()) return;
    requestLock.current = true;
    setIsCreating(true);
    
    try {
      const circleId = await DBService.createCircle(user.uid, {
        name: newCircleName,
        description: newCircleDesc
      });
      setShowCreateModal(false);
      navigate(`/circles/${circleId}`);
    } catch (err) {
      console.error('Failed to create circle', err);
    } finally {
      setIsCreating(false);
      requestLock.current = false;
    }
  };

  const handleRequestJoin = async (circleId: string) => {
    if (!user || requestLock.current) return;
    requestLock.current = true;
    try {
      await DBService.requestToJoinCircle(user.uid, circleId);
      setPendingRequests(prev => [...prev, { circleId }]);
    } catch (err) {
      console.error('Failed to request join', err);
    } finally {
      requestLock.current = false;
    }
  };

  if (isLoading) return <div className="p-8 text-center text-zinc-500">Loading circles...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Decision Circles</h1>
          <p className="text-zinc-500 mt-2">Think together. Challenge assumptions. Make better decisions.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Circle
        </Button>
      </div>

      {showCreateModal && (
        <Card className="bg-zinc-50 border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle>Create a New Circle</CardTitle>
            <p className="text-sm text-zinc-500 mt-1">Start a new private community for decision intelligence.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <input 
              className="w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
              placeholder="Circle Name (e.g. AI in Finance)"
              value={newCircleName}
              onChange={e => setNewCircleName(e.target.value)}
            />
            <textarea 
              className="w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
              placeholder="Circle Description"
              rows={3}
              value={newCircleDesc}
              onChange={e => setNewCircleDesc(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={handleCreateCircle} disabled={isCreating} isLoading={isCreating}>Create</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-zinc-900">My Circles</h2>
        {myCircles.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 bg-white border border-dashed border-zinc-200 rounded-lg">
            You haven't joined any circles yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myCircles.map(c => (
              <Card key={c.id} className="cursor-pointer hover:border-zinc-300 transition-colors" onClick={() => navigate(`/circles/${c.id}`)}>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg text-zinc-900 line-clamp-1">{c.name}</h3>
                  <p className="text-zinc-500 text-sm mt-1 line-clamp-2">{c.description}</p>
                  <div className="flex items-center gap-2 mt-4 text-xs text-zinc-400 font-medium">
                    <Users className="w-4 h-4" /> {c.memberCount} Members
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6 pt-8 border-t border-zinc-200">
        <h2 className="text-xl font-semibold text-zinc-900 flex items-center gap-2">
          <Globe className="w-5 h-5 text-zinc-400" /> Discover Circles
        </h2>
        {discoverableCircles.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No new circles available to discover.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {discoverableCircles.map(c => {
              const isPending = pendingRequests.some(r => r.circleId === c.id);
              return (
                <Card key={c.id}>
                  <CardContent className="p-6 flex flex-col h-full">
                    <h3 className="font-semibold text-lg text-zinc-900 line-clamp-1">{c.name}</h3>
                    <p className="text-zinc-500 text-sm mt-1 line-clamp-2 flex-1">{c.description}</p>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
                        <Users className="w-4 h-4" /> {c.memberCount} Members
                      </div>
                      <Button 
                        variant={isPending ? 'outline' : 'secondary'} 
                        size="sm" 
                        disabled={isPending}
                        onClick={() => handleRequestJoin(c.id)}
                      >
                        {isPending ? 'Pending' : 'Request to Join'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
