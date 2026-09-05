import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { DBService } from '../services/db';
import { Circle, SharedDecisionSnapshot, CircleJoinRequest } from '../types';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Users, ArrowLeft, MessageSquare, Check, X, User } from 'lucide-react';

export const CircleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [circle, setCircle] = useState<Circle | null>(null);
  const [decisions, setDecisions] = useState<SharedDecisionSnapshot[]>([]);
  const [requests, setRequests] = useState<CircleJoinRequest[]>([]);
  const [members, setMembers] = useState<{userId: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  
  const actionLock = useRef(false);

  useEffect(() => {
    if (!user || !id) return;
    
    const fetchDetail = async () => {
      try {
        const c = await DBService.getCircle(id);
        if (c) {
          setCircle(c);
          setIsOwner(c.ownerId === user.uid);
          
          const decs = await DBService.getSharedDecisions(id);
          setDecisions(decs);

          const mems = await DBService.getCircleMembers(id);
          setMembers(mems);
          
          if (c.ownerId === user.uid) {
            const reqs = await DBService.getCircleRequests(id);
            setRequests(reqs);
          }
        }
      } catch (err) {
        console.error("Failed to load circle", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [id, user]);

  const handleApprove = async (userId: string) => {
    if (!id || actionLock.current) return;
    actionLock.current = true;
    try {
      await DBService.approveJoinRequest(id, userId);
      setRequests(prev => prev.filter(r => r.userId !== userId));
      setCircle(prev => prev ? { ...prev, memberCount: prev.memberCount + 1 } : null);
    } catch (err) {
      console.error(err);
    } finally {
      actionLock.current = false;
    }
  };

  if (isLoading) return <div className="p-8 text-center text-zinc-500">Loading circle details...</div>;
  if (!circle) return <div className="p-8 text-center text-zinc-500">Circle not found or access denied.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 p-6">
      <Button variant="outline" size="sm" onClick={() => navigate('/circles')} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Circles
      </Button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-zinc-200 pb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{circle.name}</h1>
          <p className="text-zinc-500 mt-2 max-w-2xl">{circle.description}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-full text-sm font-medium text-zinc-700">
          <Users className="w-4 h-4" />
          {circle.memberCount} Members
        </div>
      </div>

      {isOwner && requests.length > 0 && (
        <Card className="border-blue-100 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-blue-900">Pending Requests ({requests.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.map(req => (
              <div key={req.userId} className="flex items-center justify-between p-3 bg-white rounded-md border border-blue-100">
                <span className="text-sm font-medium text-zinc-700">User ID: {req.userId.substring(0, 8)}...</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApprove(req.userId)}>
                    <Check className="w-4 h-4 mr-1" /> Approve
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {members.length > 0 && (
        <div className="pt-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">Circle Members</h3>
          <div className="flex flex-wrap gap-2">
            {members.map(m => (
              <div key={m.userId} className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-full text-xs font-medium text-zinc-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                {m.userId === user.uid ? 'You' : `User ${m.userId.substring(0, 6)}`}
                {m.userId === circle.ownerId && <span className="text-amber-600 font-semibold">(Owner)</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-6">Shared Decisions</h2>
        {decisions.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-zinc-200 rounded-lg bg-zinc-50">
            <h3 className="text-lg font-medium text-zinc-900">No decisions shared yet</h3>
            <p className="text-zinc-500 mt-2 max-w-sm mx-auto">
              Members can share snapshots of their private decisions with the circle to get perspectives.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {decisions.map(decision => (
              <Card 
                key={decision.id} 
                className="cursor-pointer hover:border-zinc-300 transition-colors"
                onClick={() => navigate(`/circles/${id}/decision/${decision.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 text-xs font-medium rounded-full">
                          {decision.category}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {new Date(decision.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-semibold text-lg text-zinc-900 line-clamp-1 mt-1">{decision.title}</h3>
                      <p className="text-sm text-zinc-600 line-clamp-2 mt-2">{decision.decisionSummary}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 text-zinc-500 text-sm font-medium bg-zinc-50 px-3 py-1.5 rounded-md border border-zinc-100">
                        <MessageSquare className="w-4 h-4" />
                        {decision.perspectiveCount || 0} Perspectives
                      </div>
                      <span className="text-xs text-zinc-400">By {decision.authorDisplayName}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
