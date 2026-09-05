import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, AlertCircle, TrendingUp, HelpCircle, GitBranch, ShieldCheck, Info, FileQuestion, BookOpen, ShieldAlert, Activity, Lightbulb, Share2, X, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DecisionAnalysis as DecisionAnalysisType, JournalEntry, Circle, PublicProfile } from '../types';
import { useAuth } from '../lib/AuthContext';
import { DBService } from '../services/db';
import { AIService } from '../services/ai';

export const Analysis: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const entryId = searchParams.get('entryId');
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<DecisionAnalysisType | null>(null);
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [error, setError] = useState('');
  const { user } = useAuth();
  
  const [showExpectedForm, setShowExpectedForm] = useState(false);
  const [isSavingExpected, setIsSavingExpected] = useState(false);
  const [isGeneratingPreMortem, setIsGeneratingPreMortem] = useState(false);
  const [preMortemError, setPreMortemError] = useState('');
  const preMortemLock = useRef(false);
  const [expectedForm, setExpectedForm] = useState<{
    outcome: string;
    timeframe: string;
    metric: string;
    value: string;
    confidence: 'Low' | 'Medium' | 'High';
  }>({
    outcome: '',
    timeframe: '',
    metric: '',
    value: '',
    confidence: 'Medium'
  });

  const [showShareModal, setShowShareModal] = useState(false);
  const [myCircles, setMyCircles] = useState<Circle[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState('');
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState('');
  const shareLock = useRef(false);

  const handleRunPreMortem = async () => {
    if (preMortemLock.current) return;
    preMortemLock.current = true;
    
    if (!user || !analysis || !entry) {
      preMortemLock.current = false;
      return;
    }

    setIsGeneratingPreMortem(true);
    setPreMortemError('');

    try {
      const result = await AIService.generatePreMortem({
        journalEntry: entry.content,
        category: entry.category,
        userFacts: analysis.userFacts,
        informationGaps: analysis.informationGaps
      });

      await DBService.updateAnalysis(user.uid, analysis.id, {
        preMortem: result
      });

      setAnalysis({ ...analysis, preMortem: result });
    } catch (err) {
      console.error(err);
      setPreMortemError('Failed to generate Pre-Mortem analysis. Please try again.');
    } finally {
      preMortemLock.current = false;
      setIsGeneratingPreMortem(false);
    }
  };

  const handleSaveExpected = async () => {
    if (!user || !analysis || !entry) return;
    setIsSavingExpected(true);
    try {
      const decisionId = 'd-' + Date.now();
      await DBService.createDecision(user.uid, {
        id: decisionId,
        userId: user.uid,
        journalEntryId: entry.id,
        analysisId: analysis.id,
        title: analysis.summary.split('. ')[0] || 'Decision',
        category: entry.category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'awaiting_outcome',
        expected: {
          outcome: expectedForm.outcome.trim(),
          timeframe: expectedForm.timeframe.trim() || undefined,
          metric: expectedForm.metric.trim() || undefined,
          value: expectedForm.value.trim() || undefined,
          confidence: expectedForm.confidence
        }
      });
      navigate('/replay');
    } catch (err) {
      console.error(err);
      setError('Failed to save expected outcome.');
    } finally {
      setIsSavingExpected(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (id && user) {
        try {
          const fetchedAnalysis = await DBService.getAnalysis(user.uid, id);
          if (fetchedAnalysis) {
            setAnalysis(fetchedAnalysis);
            // Fetch entry using either searchParam or journalEntryId from analysis
            const eId = entryId || fetchedAnalysis.journalEntryId;
            const fetchedEntry = await DBService.getJournalEntry(user.uid, eId);
            setEntry(fetchedEntry);
          } else {
            setError('Analysis not found.');
          }

          const circles = await DBService.getMyCircles(user.uid);
          setMyCircles(circles);
          const profile = await DBService.getPublicProfile(user.uid);
          setPublicProfile(profile);

        } catch (err) {
          console.error(err);
          setError('Failed to load analysis.');
        }
      }
    };
    fetchData();
  }, [id, user, entryId]);

  const handleShare = async () => {
    if (!user || !analysis || !entry || !selectedCircleId || shareLock.current) return;
    shareLock.current = true;
    setIsSharing(true);

    try {
      await DBService.shareDecisionSnapshot(selectedCircleId, {
        circleId: selectedCircleId,
        title: analysis.summary.split('. ')[0] || 'Decision Snapshot',
        category: entry.category,
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
      console.error('Failed to share decision', err);
    } finally {
      setIsSharing(false);
      shareLock.current = false;
    }
  };

  if (error) {
    return (
      <div className="flex justify-center items-center h-64 text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  if (!analysis || !entry) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      <div className="flex items-center justify-between mb-6">
        <Link to="/dashboard" className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Link>
        <div className="flex items-center gap-4">
          {shareSuccess && <span className="text-sm text-emerald-600 font-medium">{shareSuccess}</span>}
          <Button variant="outline" size="sm" onClick={() => setShowShareModal(true)}>
            <Share2 className="w-4 h-4 mr-2" /> Share with Circle
          </Button>
        </div>
      </div>

      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <Card className="w-full max-w-lg bg-white shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-zinc-100">
              <CardTitle>Share a decision snapshot</CardTitle>
              <button onClick={() => setShowShareModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <p className="text-sm text-zinc-600">
                Only the information you select will be shared. Your original QYVRIN decision remains private.
              </p>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Select Circle</label>
                <select 
                  className="w-full p-2 bg-white border border-zinc-200 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                  value={selectedCircleId}
                  onChange={(e) => setSelectedCircleId(e.target.value)}
                >
                  <option value="" disabled>Select a circle...</option>
                  {myCircles.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {myCircles.length === 0 && (
                  <p className="text-xs text-amber-600">You haven't joined any circles yet.</p>
                )}
              </div>

              <div className="bg-zinc-50 p-3 rounded-md border border-zinc-100 space-y-2">
                <h4 className="text-sm font-semibold text-zinc-700 mb-2">Included by Default:</h4>
                <div className="flex items-center gap-2 text-sm text-zinc-600"><Check className="w-4 h-4 text-emerald-500" /> Decision Title & Category</div>
                <div className="flex items-center gap-2 text-sm text-zinc-600"><Check className="w-4 h-4 text-emerald-500" /> Decision Summary</div>
                <div className="flex items-center gap-2 text-sm text-zinc-600"><Check className="w-4 h-4 text-emerald-500" /> Selected Assumptions</div>
                <div className="flex items-center gap-2 text-sm text-zinc-600"><Check className="w-4 h-4 text-emerald-500" /> Information Gaps</div>
                
                <h4 className="text-sm font-semibold text-zinc-700 mt-4 mb-2 border-t border-zinc-200 pt-3">Explicitly Excluded:</h4>
                <div className="flex items-center gap-2 text-sm text-zinc-600"><X className="w-4 h-4 text-rose-500" /> Journal Entry</div>
                <div className="flex items-center gap-2 text-sm text-zinc-600"><X className="w-4 h-4 text-rose-500" /> Expected/Actual Outcomes</div>
                <div className="flex items-center gap-2 text-sm text-zinc-600"><X className="w-4 h-4 text-rose-500" /> Private Financial Amounts</div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowShareModal(false)}>Cancel</Button>
                <Button 
                  onClick={handleShare} 
                  disabled={!selectedCircleId || isSharing} 
                  isLoading={isSharing}
                >
                  Confirm Share
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 mb-2">
          Decision Analysis
        </h1>
        <p className="text-zinc-500 mb-4">
          Reflect on the reasoning, financial signals, and potential risks.
        </p>
        {analysis.decisionReadiness && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 text-sm font-medium text-zinc-700">
            <Info className="w-4 h-4 text-zinc-500" />
            {analysis.decisionReadiness}
          </div>
        )}
      </div>

      {/* Original Entry */}
      <Card className="bg-zinc-50 border-transparent">
        <CardContent className="p-6">
          <p className="text-sm font-medium text-zinc-500 mb-2 uppercase tracking-wider">Your Journal Entry</p>
          <p className="text-lg text-zinc-900 leading-relaxed font-serif italic">"{entry.content}"</p>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="p-6">
          <p className="text-lg text-zinc-800 leading-relaxed">
            {analysis.summary}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Facts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-zinc-500" />
              User-Provided Facts
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {analysis.userFacts?.length > 0 ? analysis.userFacts.map((fact, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                <p className="text-sm text-zinc-700 leading-relaxed">{fact}</p>
              </div>
            )) : <p className="text-sm text-zinc-500 italic">No explicit facts provided.</p>}
          </CardContent>
        </Card>

        {/* Possible Signals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-zinc-500" />
              Possible Signals
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {analysis.possibleSignals?.map((signal, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 mt-2 flex-shrink-0" />
                <p className="text-sm text-zinc-700 leading-relaxed">{signal}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Potential Risks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-zinc-500" />
              Potential Risks
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {analysis.potentialRisks?.map((risk, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                <p className="text-sm text-zinc-700 leading-relaxed">{risk}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Assumptions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-zinc-500" />
              Assumptions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {analysis.assumptions?.map((assumption, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-2 flex-shrink-0" />
                <p className="text-sm text-zinc-700 leading-relaxed">{assumption}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Possible Patterns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-zinc-500" />
              Decision Patterns
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {analysis.decisionPatterns?.map((pattern, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <p className="text-sm text-zinc-700 leading-relaxed">{pattern}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Information Gaps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-zinc-500" />
              Information Gaps
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {analysis.informationGaps?.length > 0 ? analysis.informationGaps.map((gap, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                <p className="text-sm text-zinc-700 leading-relaxed">{gap}</p>
              </div>
            )) : <p className="text-sm text-zinc-500 italic">No significant information gaps identified.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Alternative Scenarios */}
      <div className="space-y-4 pt-4">
        <h3 className="text-xl font-medium flex items-center gap-2">
          <GitBranch className="w-5 h-5" />
          Alternative Scenarios
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {analysis.alternativeScenarios?.map(scenario => (
            <Card key={scenario.id} className="bg-zinc-50 border-transparent">
              <CardContent className="p-5">
                <h4 className="font-medium text-zinc-900 mb-2">{scenario.title}</h4>
                <p className="text-sm text-zinc-600 mb-3 leading-relaxed">{scenario.description}</p>
                <div className="text-xs font-medium text-zinc-500 bg-white px-3 py-2 rounded border border-zinc-100">
                  Impact: {scenario.financialImpact}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Questions to Validate */}
      <Card className="bg-zinc-900 text-white border-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <HelpCircle className="w-5 h-5 text-zinc-400" />
            Questions to Validate
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {analysis.questionsToValidate?.map((q, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <span className="text-zinc-500 font-mono text-sm mt-0.5">{idx + 1}.</span>
              <p className="text-zinc-300 leading-relaxed">{q}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pre-Mortem Analysis Section */}
      <div className="pt-8 border-t border-zinc-200">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold text-zinc-900 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-amber-500" />
              Pre-Mortem Analysis
            </h3>
            <p className="text-zinc-500 mt-1">
              Assume this decision did not achieve the expected outcome. What plausible factors could have contributed?
            </p>
          </div>
          {!analysis.preMortem && (
            <Button 
              onClick={handleRunPreMortem} 
              disabled={isGeneratingPreMortem} 
              isLoading={isGeneratingPreMortem}
              className="whitespace-nowrap"
            >
              Run Pre-Mortem Analysis
            </Button>
          )}
        </div>
        
        {preMortemError && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
            {preMortemError}
          </div>
        )}

        {analysis.preMortem && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Failure Scenarios */}
            <Card className="bg-amber-50/50 border-amber-100">
              <CardHeader>
                <CardTitle className="text-amber-900 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Plausible Failure Scenarios
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {analysis.preMortem.failureScenarios?.map((scenario, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-lg border border-amber-100 shadow-sm">
                    <h4 className="font-medium text-zinc-900 mb-1">{scenario.title}</h4>
                    <p className="text-sm text-zinc-700 leading-relaxed">{scenario.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Critical Assumptions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-zinc-900">
                    <AlertCircle className="w-5 h-5 text-zinc-400" />
                    Critical Assumptions
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {analysis.preMortem.criticalAssumptions?.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-2 flex-shrink-0" />
                      <p className="text-sm text-zinc-700 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Early Warning Indicators */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-zinc-900">
                    <TrendingUp className="w-5 h-5 text-amber-500" />
                    Early Warning Indicators
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {analysis.preMortem.earlyWarningIndicators?.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                      <p className="text-sm text-zinc-700 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Mitigation Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-zinc-900">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    Mitigation Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {analysis.preMortem.mitigationOptions?.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                      <p className="text-sm text-zinc-700 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Questions & Info Gaps */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-zinc-900">
                    <Lightbulb className="w-5 h-5 text-blue-500" />
                    Questions & Info Gaps
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div>
                    <h5 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">To Investigate</h5>
                    <ul className="space-y-2">
                      {analysis.preMortem.questionsToInvestigate?.map((item, idx) => (
                        <li key={idx} className="text-sm text-zinc-700 flex gap-2">
                          <span className="text-zinc-400">•</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {analysis.preMortem.informationGaps?.length > 0 && (
                    <div className="pt-2 border-t border-zinc-100">
                      <h5 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Missing Info</h5>
                      <ul className="space-y-2">
                        {analysis.preMortem.informationGaps?.map((item, idx) => (
                          <li key={idx} className="text-sm text-zinc-700 flex gap-2">
                            <span className="text-amber-400">•</span> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-4 pt-8 border-t border-zinc-200">
        {!showExpectedForm ? (
          <Button onClick={() => setShowExpectedForm(true)}>Record Expected Outcome</Button>
        ) : (
          <Card className="w-full mt-4 border-zinc-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
            <CardHeader>
              <CardTitle>What do you expect to happen?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Expected outcome *</label>
                <textarea 
                  className="w-full p-3 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-none text-sm"
                  rows={3}
                  value={expectedForm.outcome}
                  onChange={(e) => setExpectedForm({...expectedForm, outcome: e.target.value})}
                  placeholder="e.g. I expect the new laptop to reduce processing time and improve team productivity."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Expected timeframe</label>
                  <input 
                    type="text"
                    className="w-full p-2.5 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 text-sm"
                    value={expectedForm.timeframe}
                    onChange={(e) => setExpectedForm({...expectedForm, timeframe: e.target.value})}
                    placeholder="e.g. 3 months"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Success metric</label>
                  <input 
                    type="text"
                    className="w-full p-2.5 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 text-sm"
                    value={expectedForm.metric}
                    onChange={(e) => setExpectedForm({...expectedForm, metric: e.target.value})}
                    placeholder="e.g. Hours saved per month"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Expected value</label>
                  <input 
                    type="text"
                    className="w-full p-2.5 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 text-sm"
                    value={expectedForm.value}
                    onChange={(e) => setExpectedForm({...expectedForm, value: e.target.value})}
                    placeholder="e.g. 20 hours"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Confidence</label>
                  <select 
                    className="w-full p-2.5 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 text-sm"
                    value={expectedForm.confidence}
                    onChange={(e) => setExpectedForm({...expectedForm, confidence: e.target.value as 'Low'|'Medium'|'High'})}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowExpectedForm(false)} disabled={isSavingExpected}>Cancel</Button>
                <Button onClick={handleSaveExpected} disabled={!expectedForm.outcome.trim() || isSavingExpected} isLoading={isSavingExpected}>
                  Save Outcome
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
