import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { History, Target, Play, BrainCircuit, ArrowDown, HelpCircle, Activity, ChevronRight, Save, Share2, X, Check } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { DBService } from '../services/db';
import { AIService } from '../services/ai';
import { Decision, Circle, PublicProfile } from '../types';
import { Button } from '../components/ui/Button';

export const Replay: React.FC = () => {
  const { user } = useAuth();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);

  useEffect(() => {
    fetchDecisions();
  }, [user]);

  const fetchDecisions = async () => {
    if (!user) return;
    try {
      const data = await DBService.getDecisions(user.uid);
      setDecisions(data);
    } catch (error) {
      console.error("Failed to fetch decisions", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full"></div>
      </div>
    );
  }

  if (selectedDecision) {
    return <ReplayDetail decision={selectedDecision} onBack={() => { setSelectedDecision(null); fetchDecisions(); }} />;
  }

  const awaitingCount = decisions.filter(d => d.status === 'awaiting_outcome').length;
  const replayedCount = decisions.filter(d => d.status === 'replayed').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 mb-2">
          Decision Replay
        </h1>
        <p className="text-zinc-500">
          Learn from past choices by comparing expectations with reality.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500 mb-1">Total Tracked</p>
              <h2 className="text-3xl font-semibold text-zinc-900">{decisions.length}</h2>
            </div>
            <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-600">
              <History className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500 mb-1">Awaiting Outcome</p>
              <h2 className="text-3xl font-semibold text-zinc-900">{awaitingCount}</h2>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
              <Activity className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500 mb-1">Completed Replays</p>
              <h2 className="text-3xl font-semibold text-zinc-900">{replayedCount}</h2>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600">
              <Target className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium text-zinc-900">Your Decisions</h3>
        {decisions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-zinc-200 rounded-lg">
            <History className="w-12 h-12 text-zinc-300 mb-4" />
            <p className="text-zinc-500 font-medium text-center">No decisions tracked yet.</p>
            <p className="text-zinc-400 text-sm text-center max-w-md mt-1">Start by recording an expected outcome from any decision analysis.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {decisions.map(decision => (
              <Card 
                key={decision.id} 
                className="hover:border-zinc-300 cursor-pointer transition-colors"
                onClick={() => setSelectedDecision(decision)}
              >
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{decision.category}</span>
                      <span className="text-xs text-zinc-400">{new Date(decision.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-medium text-zinc-900">{decision.title}</h4>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={decision.status} />
                    <ChevronRight className="w-5 h-5 text-zinc-300" />
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

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'awaiting_outcome':
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium"><Activity className="w-3.5 h-3.5" /> Awaiting Outcome</span>;
    case 'outcome_recorded':
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium"><Play className="w-3.5 h-3.5" /> Outcome Recorded</span>;
    case 'replayed':
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium"><BrainCircuit className="w-3.5 h-3.5" /> Replayed</span>;
    default:
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-medium">{status}</span>;
  }
};

const ReplayDetail: React.FC<{ decision: Decision, onBack: () => void }> = ({ decision, onBack }) => {
  const { user } = useAuth();
  const [actualForm, setActualForm] = useState({
    outcome: '',
    timeframe: '',
    metric: '',
    value: '',
    surprises: '',
    differentNextTime: ''
  });
  const [isSavingActual, setIsSavingActual] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  
  const [showShareModal, setShowShareModal] = useState(false);
  const [myCircles, setMyCircles] = useState<Circle[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState('');
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState('');

  useEffect(() => {
    if (user) {
      DBService.getMyCircles(user.uid).then(setMyCircles);
      DBService.getPublicProfile(user.uid).then(setPublicProfile);
    }
  }, [user]);
  
  const handleShare = async () => {
    if (!user || !selectedCircleId || isSharing) return;
    setIsSharing(true);
    try {
      const analysis = await DBService.getAnalysis(user.uid, decision.analysisId);
      if (!analysis) throw new Error("Analysis not found");
      
      await DBService.shareDecisionSnapshot(selectedCircleId, {
        circleId: selectedCircleId,
        title: decision.title,
        category: decision.category,
        decisionSummary: analysis.summary,
        selectedAssumptions: analysis.assumptions || [],
        selectedInformationGaps: analysis.informationGaps || [],
        authorId: user.uid,
        authorDisplayName: publicProfile?.visibility === 'COMMUNITY' && publicProfile?.displayName ? publicProfile.displayName : 'Private Member',
        createdAt: new Date().toISOString(),
        perspectiveCount: 0
      });
      setShowShareModal(false);
      setShareSuccess('Decision shared successfully.');
      setTimeout(() => setShareSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to share decision.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleSaveActual = async () => {
    if (!user || !actualForm.outcome.trim()) return;
    setIsSavingActual(true);
    try {
      const actualData = {
        outcome: actualForm.outcome.trim(),
        timeframe: actualForm.timeframe.trim() || undefined,
        metric: actualForm.metric.trim() || undefined,
        value: actualForm.value.trim() || undefined,
        surprises: actualForm.surprises.trim() || undefined,
        differentNextTime: actualForm.differentNextTime.trim() || undefined
      };
      
      await DBService.updateDecision(user.uid, decision.id, {
        actual: actualData,
        status: 'outcome_recorded'
      });
      
      // Now generate Gemini replay
      setIsGenerating(true);
      const journalEntry = await DBService.getJournalEntry(user.uid, decision.journalEntryId);
      const analysis = await DBService.getAnalysis(user.uid, decision.analysisId);
      
      const replayData = await AIService.generateDecisionReplay({
        journalEntryContent: journalEntry?.content,
        analysisSummary: analysis?.summary,
        expectedOutcome: decision.expected?.outcome,
        expectedTimeframe: decision.expected?.timeframe,
        expectedMetric: decision.expected?.metric,
        expectedValue: decision.expected?.value,
        actualOutcome: actualData.outcome,
        actualTimeframe: actualData.timeframe,
        actualMetric: actualData.metric,
        actualValue: actualData.value,
        surprises: actualData.surprises,
        differentNextTime: actualData.differentNextTime
      });
      
      await DBService.updateDecision(user.uid, decision.id, {
        replay: replayData,
        status: 'replayed'
      });
      
      onBack();
    } catch (err) {
      console.error(err);
      setError('Failed to record actual outcome or generate replay. Please try again.');
    } finally {
      setIsSavingActual(false);
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-900 mb-4 transition-colors">
          &larr; Back to List
        </button>
        <div className="flex items-center gap-4">
          {shareSuccess && <span className="text-sm text-emerald-600 font-medium">{shareSuccess}</span>}
          <Button variant="outline" size="sm" onClick={() => setShowShareModal(true)}>
            <Share2 className="w-4 h-4 mr-2" /> Share with Circle
          </Button>
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 mb-1">{decision.title}</h2>
        <div className="flex items-center gap-3">
          <StatusBadge status={decision.status} />
          <span className="text-sm text-zinc-500">{new Date(decision.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
          {error}
        </div>
      )}

      {decision.status === 'awaiting_outcome' && (
        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>Record Actual Outcome</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">What actually happened? *</label>
              <textarea 
                className="w-full p-3 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-none text-sm"
                rows={3}
                value={actualForm.outcome}
                onChange={(e) => setActualForm({...actualForm, outcome: e.target.value})}
                placeholder="e.g. Processing time reduced, but team productivity didn't improve as much as expected."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Actual timeframe</label>
                <input 
                  type="text"
                  className="w-full p-2.5 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 text-sm"
                  value={actualForm.timeframe}
                  onChange={(e) => setActualForm({...actualForm, timeframe: e.target.value})}
                  placeholder="e.g. 4 months"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Actual metric</label>
                <input 
                  type="text"
                  className="w-full p-2.5 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 text-sm"
                  value={actualForm.metric}
                  onChange={(e) => setActualForm({...actualForm, metric: e.target.value})}
                  placeholder="e.g. Hours saved per month"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Actual value</label>
                <input 
                  type="text"
                  className="w-full p-2.5 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 text-sm"
                  value={actualForm.value}
                  onChange={(e) => setActualForm({...actualForm, value: e.target.value})}
                  placeholder="e.g. 10 hours"
                />
              </div>
            </div>
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">What surprised you?</label>
                <input 
                  type="text"
                  className="w-full p-2.5 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 text-sm"
                  value={actualForm.surprises}
                  onChange={(e) => setActualForm({...actualForm, surprises: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">What would you do differently?</label>
                <input 
                  type="text"
                  className="w-full p-2.5 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 text-sm"
                  value={actualForm.differentNextTime}
                  onChange={(e) => setActualForm({...actualForm, differentNextTime: e.target.value})}
                />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveActual} disabled={!actualForm.outcome.trim() || isSavingActual || isGenerating} isLoading={isSavingActual || isGenerating}>
                {isGenerating ? 'Generating QYVRIN Replay...' : 'Record & Replay'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {decision.status === 'replayed' && decision.replay && (
        <div className="max-w-3xl mx-auto space-y-6 py-4">
          <div className="relative">
            <div className="absolute left-6 top-10 bottom-[-24px] w-0.5 bg-zinc-200"></div>
            <Card className="ml-16 relative bg-zinc-50 border-transparent">
              <div className="absolute -left-16 top-4 w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 z-10">
                <Target className="w-5 h-5" />
              </div>
              <CardContent className="p-6">
                <p className="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-2">Expected</p>
                <p className="text-zinc-700 leading-relaxed mb-3">{decision.expected?.outcome}</p>
                {(decision.expected?.timeframe || decision.expected?.value) && (
                  <div className="flex gap-4 text-sm text-zinc-500 bg-white p-3 rounded-lg border border-zinc-100">
                    {decision.expected?.timeframe && <div><span className="font-medium">Timeframe:</span> {decision.expected.timeframe}</div>}
                    {decision.expected?.value && <div><span className="font-medium">Value:</span> {decision.expected.value} {decision.expected.metric && `(${decision.expected.metric})`}</div>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="relative">
            <div className="absolute left-6 top-10 bottom-[-24px] w-0.5 bg-zinc-200"></div>
            <Card className="ml-16 relative bg-white border-zinc-200 shadow-sm">
              <div className="absolute -left-16 top-4 w-12 h-12 bg-white border border-zinc-200 rounded-full flex items-center justify-center text-zinc-900 shadow-sm z-10">
                <Play className="w-5 h-5" />
              </div>
              <CardContent className="p-6">
                <p className="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-2">Actual</p>
                <p className="text-zinc-900 leading-relaxed mb-3">{decision.actual?.outcome}</p>
                {(decision.actual?.timeframe || decision.actual?.value) && (
                  <div className="flex gap-4 text-sm text-zinc-500 bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                    {decision.actual?.timeframe && <div><span className="font-medium">Timeframe:</span> {decision.actual.timeframe}</div>}
                    {decision.actual?.value && <div><span className="font-medium">Value:</span> {decision.actual.value} {decision.actual.metric && `(${decision.actual.metric})`}</div>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="relative">
            <div className="absolute left-6 top-10 bottom-[-24px] w-0.5 bg-zinc-200"></div>
            <Card className="ml-16 relative bg-white border-zinc-200 shadow-sm">
              <div className="absolute -left-16 top-4 w-12 h-12 bg-white border border-zinc-200 rounded-full flex items-center justify-center text-zinc-900 shadow-sm z-10">
                <History className="w-5 h-5" />
              </div>
              <CardContent className="p-6">
                <p className="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-2">Expectation vs Reality</p>
                <p className="text-zinc-900 leading-relaxed">{decision.replay.expectationVsReality}</p>
              </CardContent>
            </Card>
          </div>

          <div className="relative">
            <div className="absolute left-6 top-10 bottom-[-24px] w-0.5 bg-zinc-200"></div>
            <Card className="ml-16 relative bg-zinc-900 text-white border-transparent">
              <div className="absolute -left-16 top-4 w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center text-white shadow-sm z-10">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <CardContent className="p-6">
                <p className="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-2">QYVRIN Learned</p>
                <p className="text-zinc-100 leading-relaxed">{decision.replay.lessonLearned}</p>
                {decision.replay.possibleReasoningGaps?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <p className="text-xs font-medium text-zinc-500 mb-2">Possible Reasoning Gaps</p>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-zinc-300">
                      {decision.replay.possibleReasoningGaps.map((gap, i) => (
                        <li key={i}>{gap}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="relative">
            <Card className="ml-16 relative bg-white border-dashed border-zinc-300">
              <div className="absolute -left-16 top-4 w-12 h-12 bg-white border border-dashed border-zinc-300 rounded-full flex items-center justify-center text-zinc-500 z-10">
                <HelpCircle className="w-5 h-5" />
              </div>
              <CardContent className="p-6">
                <p className="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-3">Future Questions to Consider</p>
                <div className="space-y-3">
                  {decision.replay.futureQuestions?.map((q, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-zinc-400 font-mono text-sm">{i + 1}.</span>
                      <p className="text-zinc-700 leading-relaxed text-sm">{q}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <h3 className="font-semibold text-zinc-900">Share with Circle</h3>
              <button onClick={() => setShowShareModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-zinc-700">Select Circle</label>
                {myCircles.length === 0 ? (
                  <div className="p-4 border border-dashed border-zinc-200 rounded-lg text-sm text-zinc-500 text-center">
                    You haven't joined any circles yet.
                  </div>
                ) : (
                  <select 
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    value={selectedCircleId}
                    onChange={(e) => setSelectedCircleId(e.target.value)}
                  >
                    <option value="" disabled>Select a circle...</option>
                    {myCircles.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>
              
              <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                <h4 className="text-sm font-medium text-blue-900 flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-blue-600" /> What will be shared?
                </h4>
                <ul className="text-xs text-blue-800/80 space-y-1.5 ml-6 list-disc">
                  <li>Decision Summary & Category</li>
                  <li>Selected Assumptions</li>
                  <li>Information Gaps</li>
                  <li>Your identity (as "{publicProfile?.visibility === 'COMMUNITY' ? publicProfile?.displayName : 'Private Member'}")</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowShareModal(false)}>Cancel</Button>
                <Button onClick={handleShare} disabled={!selectedCircleId || isSharing} isLoading={isSharing}>Share Decision</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
