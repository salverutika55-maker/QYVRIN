import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { DBService } from '../services/db';
import { SharedDecisionSnapshot, CommunityPerspective, CommunitySynthesis, PublicProfile, PerspectiveType } from '../types';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ArrowLeft, MessageSquare, AlertTriangle, Lightbulb, User, Sparkles, AlertCircle } from 'lucide-react';

export const SharedDecision: React.FC = () => {
  const { circleId, decisionId } = useParams<{ circleId: string, decisionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [snapshot, setSnapshot] = useState<SharedDecisionSnapshot | null>(null);
  const [perspectives, setPerspectives] = useState<CommunityPerspective[]>([]);
  const [synthesis, setSynthesis] = useState<CommunitySynthesis | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [newPerspectiveContent, setNewPerspectiveContent] = useState('');
  const [newPerspectiveType, setNewPerspectiveType] = useState<PerspectiveType>('perspective');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const actionLock = useRef(false);

  useEffect(() => {
    if (!user || !circleId || !decisionId) return;
    
    const fetchData = async () => {
      try {
        const snap = await DBService.getSharedDecision(circleId, decisionId);
        setSnapshot(snap);
        
        const perps = await DBService.getPerspectives(circleId, decisionId);
        setPerspectives(perps);
        
        const synth = await DBService.getCommunitySynthesis(circleId, decisionId);
        setSynthesis(synth);

        const profile = await DBService.getPublicProfile(user.uid);
        setPublicProfile(profile);
      } catch (err) {
        console.error("Failed to load shared decision", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [circleId, decisionId, user]);

  const handleSubmitPerspective = async () => {
    if (!user || !circleId || !decisionId || !newPerspectiveContent.trim() || actionLock.current) return;
    actionLock.current = true;
    setIsSubmitting(true);
    
    try {
      const p: Omit<CommunityPerspective, 'id'> = {
        sharedDecisionId: decisionId,
        authorId: user.uid,
        authorDisplayName: publicProfile?.visibility === 'COMMUNITY' && publicProfile?.displayName ? publicProfile.displayName : 'Private Member',
        content: newPerspectiveContent.trim(),
        type: newPerspectiveType,
        createdAt: new Date().toISOString()
      };
      
      const id = await DBService.createPerspective(circleId, decisionId, p);
      setPerspectives([{ ...p, id }, ...perspectives]);
      setNewPerspectiveContent('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
      actionLock.current = false;
    }
  };

  const handleSynthesize = async () => {
    if (!user || !circleId || !decisionId || !snapshot || perspectives.length === 0 || actionLock.current) return;
    actionLock.current = true;
    setIsSynthesizing(true);
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/circle-synthesis', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ circleId, decisionId, snapshot, perspectives })
      });
      
      if (!response.ok) throw new Error('Failed to synthesize');
      
      const data = await response.json();
      
      const synth: CommunitySynthesis = {
        generatedAt: new Date().toISOString(),
        analyzedPerspectiveIds: perspectives.map(p => p.id),
        keyConsiderations: data.keyConsiderations || [],
        commonRisks: data.commonRisks || [],
        alternativePerspectives: data.alternativePerspectives || [],
        areasOfAgreement: data.areasOfAgreement || [],
        areasOfDisagreement: data.areasOfDisagreement || [],
        questionsWorthExploring: data.questionsWorthExploring || []
      };
      
      await DBService.saveCommunitySynthesis(circleId, decisionId, synth);
      setSynthesis(synth);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSynthesizing(false);
      actionLock.current = false;
    }
  };

  if (isLoading) return <div className="p-8 text-center text-zinc-500">Loading decision...</div>;
  if (!snapshot) return <div className="p-8 text-center text-zinc-500">Decision not found or access denied.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 p-6">
      <Button variant="outline" size="sm" onClick={() => navigate(`/circles/${circleId}`)} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Circle
      </Button>

      <div className="space-y-4 border-b border-zinc-200 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="px-3 py-1 bg-zinc-100 text-zinc-800 text-sm font-medium rounded-full">
            {snapshot.category}
          </span>
          <span className="text-zinc-500 text-sm">{new Date(snapshot.createdAt).toLocaleDateString()}</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{snapshot.title}</h1>
        <div className="flex items-center gap-2 text-zinc-600 font-medium">
          <User className="w-4 h-4" /> Shared by {snapshot.authorDisplayName}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Decision Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-800 leading-relaxed">{snapshot.decisionSummary}</p>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-zinc-800">
                  <AlertTriangle className="w-4 h-4 text-zinc-500" /> Selected Assumptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {snapshot.selectedAssumptions.map((a, i) => (
                    <li key={i} className="text-sm text-zinc-700 flex gap-2">
                      <span className="text-zinc-400">•</span> {a}
                    </li>
                  ))}
                  {snapshot.selectedAssumptions.length === 0 && <li className="text-sm text-zinc-500 italic">None selected</li>}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-zinc-800">
                  <AlertCircle className="w-4 h-4 text-amber-500" /> Information Gaps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {snapshot.selectedInformationGaps.map((a, i) => (
                    <li key={i} className="text-sm text-zinc-700 flex gap-2">
                      <span className="text-zinc-400">•</span> {a}
                    </li>
                  ))}
                  {snapshot.selectedInformationGaps.length === 0 && <li className="text-sm text-zinc-500 italic">None selected</li>}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="pt-8 border-t border-zinc-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-zinc-900">Community Perspectives</h2>
              <span className="bg-zinc-100 px-3 py-1 rounded-full text-sm font-medium text-zinc-700">{perspectives.length}</span>
            </div>

            <Card className="mb-8 border-blue-100 bg-blue-50/30">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-medium text-blue-900">Add your perspective</h3>
                <div className="flex flex-wrap gap-2">
                  {(['perspective', 'risk', 'alternative', 'question'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setNewPerspectiveType(t)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border capitalize ${
                        newPerspectiveType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-zinc-600 border-zinc-200 hover:border-blue-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <textarea
                  className="w-full p-3 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                  rows={3}
                  value={newPerspectiveContent}
                  onChange={(e) => setNewPerspectiveContent(e.target.value)}
                  placeholder="Share your thoughts, experiences, or questions..."
                />
                <div className="flex justify-end">
                  <Button onClick={handleSubmitPerspective} disabled={!newPerspectiveContent.trim() || isSubmitting} isLoading={isSubmitting}>
                    Post Perspective
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {perspectives.map(p => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-zinc-900">{p.authorDisplayName}</span>
                        <span className="text-xs text-zinc-500">• {new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${
                        p.type === 'risk' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        p.type === 'perspective' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        p.type === 'alternative' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {p.type}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap">{p.content}</p>
                  </CardContent>
                </Card>
              ))}
              {perspectives.length === 0 && (
                <p className="text-center text-zinc-500 py-8">No perspectives shared yet. Be the first!</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="sticky top-6">
            <Card className="bg-zinc-900 text-white border-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-zinc-100">
                  <Sparkles className="w-5 h-5 text-zinc-400" />
                  Synthesis
                </CardTitle>
                <p className="text-sm text-zinc-400 mt-1">
                  Gemini analyzes perspectives to find patterns and risks.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {!synthesis ? (
                  <div className="text-center">
                    {user?.uid === snapshot.authorId ? (
                      <Button 
                        onClick={handleSynthesize} 
                        disabled={perspectives.length === 0 || isSynthesizing} 
                        isLoading={isSynthesizing}
                        variant="outline"
                        className="w-full bg-zinc-800 text-zinc-100 border-zinc-700 hover:bg-zinc-700"
                      >
                        {perspectives.length === 0 ? 'Waiting for perspectives...' : 'Generate Synthesis'}
                      </Button>
                    ) : (
                      <p className="text-sm text-zinc-400">Waiting for the author to generate a synthesis...</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs text-zinc-500">Last updated: {new Date(synthesis.generatedAt).toLocaleTimeString()}</span>
                      {user?.uid === snapshot.authorId && (
                        <Button size="sm" variant="outline" className="h-7 text-xs bg-zinc-800 text-zinc-100 border-zinc-700 hover:bg-zinc-700" onClick={handleSynthesize} disabled={isSynthesizing}>
                          Refresh
                        </Button>
                      )}
                    </div>

                    {synthesis.keyConsiderations.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Key Considerations</h4>
                        <ul className="space-y-2">
                          {synthesis.keyConsiderations.map((item, i) => (
                            <li key={i} className="text-sm text-zinc-300 flex gap-2">
                              <span className="text-blue-400">•</span> {item.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {synthesis.commonRisks.length > 0 && (
                      <div className="pt-2 border-t border-zinc-800">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Common Risks</h4>
                        <ul className="space-y-2">
                          {synthesis.commonRisks.map((item, i) => (
                            <li key={i} className="text-sm text-zinc-300 flex gap-2">
                              <span className="text-rose-400">•</span> {item.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {synthesis.alternativePerspectives.length > 0 && (
                      <div className="pt-2 border-t border-zinc-800">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Alternative Paths</h4>
                        <ul className="space-y-2">
                          {synthesis.alternativePerspectives.map((item, i) => (
                            <li key={i} className="text-sm text-zinc-300 flex gap-2">
                              <span className="text-emerald-400">•</span> {item.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
