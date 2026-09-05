import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BrainCircuit, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { DBService } from '../services/db';
import { AIService } from '../services/ai';
import { Button } from '../components/ui/Button';
import { Decision, FingerprintDocument, FingerprintPattern } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export const Fingerprint: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [cachedFingerprint, setCachedFingerprint] = useState<FingerprintDocument | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const fingerprintLock = useRef(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const replayedDecisions = await DBService.getReplayedDecisions(user.uid);
        setDecisions(replayedDecisions);
        
        const fp = await DBService.getFingerprint(user.uid);
        setCachedFingerprint(fp);
      } catch (err) {
        console.error('Error fetching fingerprint data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const currentDecisionIds = useMemo(() => decisions.map(d => d.id).sort(), [decisions]);
  
  const hasUpdates = useMemo(() => {
    if (!cachedFingerprint) return true;
    const cachedIds = [...cachedFingerprint.analyzedDecisionIds].sort();
    return JSON.stringify(currentDecisionIds) !== JSON.stringify(cachedIds);
  }, [cachedFingerprint, currentDecisionIds]);

  const deterministicSummary = useMemo(() => {
    let sameMetricCount = 0;
    let actualExceededExpected = 0;
    let actualBelowExpected = 0;
    
    decisions.forEach(d => {
      if (d.expected?.metric && d.expected.metric === d.actual?.metric) {
        const expectedVal = parseFloat(d.expected.value || '');
        const actualVal = parseFloat(d.actual?.value || '');
        if (!isNaN(expectedVal) && !isNaN(actualVal)) {
          sameMetricCount++;
          if (actualVal > expectedVal) actualExceededExpected++;
          if (actualVal < expectedVal) actualBelowExpected++;
        }
      }
    });

    return {
      total: decisions.length,
      sameMetricCount,
      actualExceededExpected,
      actualBelowExpected,
    };
  }, [decisions]);

  const handleGenerate = async () => {
    if (fingerprintLock.current) return;
    if (decisions.length < 3) return; // Enforce minimum 3
    if (!user) return;

    fingerprintLock.current = true;
    setIsGenerating(true);
    setError('');

    try {
      const payloadDecisions = decisions.map(d => ({
        decisionId: d.id,
        title: d.title,
        category: d.category,
        confidence: d.expected?.confidence || 'Unknown',
        expectedOutcome: `${d.expected?.outcome || ''} (Metric: ${d.expected?.metric || 'None'}, Value: ${d.expected?.value || 'None'})`,
        actualOutcome: `${d.actual?.outcome || ''} (Metric: ${d.actual?.metric || 'None'}, Value: ${d.actual?.value || 'None'})`,
        numericComparison: (d.expected?.metric && d.expected.metric === d.actual?.metric && !isNaN(parseFloat(d.expected.value || '')) && !isNaN(parseFloat(d.actual?.value || ''))) 
          ? `Expected ${d.expected.value}, Actual ${d.actual?.value}` 
          : 'Incompatible or missing numeric metrics',
        possibleReasoningGaps: d.replay?.possibleReasoningGaps || [],
        whatWentWell: d.replay?.whatWentWell || [],
        lessonLearned: d.replay?.lessonLearned || '',
      }));

      const generated = await AIService.generateFingerprint({ decisions: payloadDecisions, deterministicSummary });

      const newDoc: FingerprintDocument = {
        generatedAt: new Date().toISOString(),
        analyzedDecisionIds: currentDecisionIds,
        completedDecisionCount: decisions.length,
        deterministicSummary,
        fingerprint: generated,
      };

      await DBService.saveFingerprint(user.uid, newDoc);
      setCachedFingerprint(newDoc);
    } catch (err) {
      console.error(err);
      setError('Failed to generate fingerprint. Please try again.');
    } finally {
      fingerprintLock.current = false;
      setIsGenerating(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading fingerprint...</div>;
  }

  const renderPatternList = (patterns: FingerprintPattern[]) => {
    if (!patterns || patterns.length === 0) return <p className="text-zinc-500 italic text-sm">Insufficient evidence</p>;
    return (
      <ul className="space-y-4">
        {patterns.map((item, idx) => (
          <li key={idx} className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
            <p className="text-zinc-800 font-medium text-sm mb-3">{item.pattern || (item as any).strength}</p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-zinc-500 py-1">Observed in:</span>
              {item.observedIn.map((id, i) => {
                const decIndex = decisions.findIndex(d => d.id === id);
                const dec = decisions[decIndex];
                
                let displayText = dec?.title?.trim();
                if (!displayText) {
                  displayText = `Decision ${decIndex !== -1 ? decIndex + 1 : 'Unknown'}`;
                } else if (displayText.length > 40) {
                  displayText = displayText.substring(0, 40) + '...';
                }

                return (
                  <span key={i} className="text-xs px-2.5 py-1 bg-zinc-100 text-zinc-700 rounded-full font-medium" title={dec?.title}>
                    {displayText}
                  </span>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const getSubheading = () => {
    if (decisions.length < 3) return `Complete at least 3 decisions to unlock your Fingerprint. (${decisions.length}/3 completed)`;
    if (decisions.length <= 4) return `Emerging patterns — based on a small sample of ${decisions.length} decisions.`;
    return `Observed patterns — based on ${decisions.length} completed decisions.`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 p-6">
      <div className="flex items-center gap-4 mb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Decision Fingerprint</h1>
          <p className="text-zinc-500">{getSubheading()}</p>
        </div>
      </div>

      {decisions.length < 3 ? (
        <Card className="bg-zinc-50/50 border-dashed border-2 border-zinc-200">
          <CardContent className="pt-6 text-center space-y-4 py-16">
            <BrainCircuit className="w-16 h-16 text-zinc-300 mx-auto" />
            <div className="text-zinc-500 text-lg">
              Your Decision Fingerprint requires more completed evidence.
              <br/>
              Record outcomes for more decisions to unlock insights.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          {(!cachedFingerprint || hasUpdates) && (
            <Card className="bg-blue-50/80 border-blue-100 shadow-sm">
              <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 gap-4">
                <div className="flex items-start sm:items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-blue-500 mt-1 sm:mt-0 shrink-0" />
                  <div>
                    <h3 className="font-medium text-blue-900 text-lg">
                      {!cachedFingerprint ? 'Generate your first fingerprint' : 'Your decision history has changed'}
                    </h3>
                    <p className="text-sm text-blue-700 mt-1">
                      {!cachedFingerprint 
                        ? 'Synthesize patterns from your completed decisions.'
                        : 'Update your fingerprint to include recently completed decisions.'}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleGenerate} 
                  disabled={isGenerating} 
                  isLoading={isGenerating}
                  className="whitespace-nowrap w-full sm:w-auto"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {cachedFingerprint ? 'Update Fingerprint' : 'Generate Fingerprint'}
                </Button>
              </CardContent>
            </Card>
          )}

          {cachedFingerprint && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-zinc-900">Expectation Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-zinc-700 leading-relaxed mb-6">{cachedFingerprint.fingerprint.expectationAccuracySummary}</p>
                  
                  {cachedFingerprint.deterministicSummary.sameMetricCount > 0 && (
                    <div className="space-y-4">
                      <div className="text-sm font-medium text-zinc-500">
                        {cachedFingerprint.deterministicSummary.sameMetricCount} of {cachedFingerprint.completedDecisionCount} decisions had directly comparable numeric metrics:
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 p-5 bg-zinc-50 rounded-xl border border-zinc-100 text-sm">
                        <div className="flex-1 text-center sm:border-r border-zinc-200 pb-4 sm:pb-0">
                          <div className="text-3xl font-semibold text-zinc-900">{cachedFingerprint.deterministicSummary.sameMetricCount}</div>
                          <div className="text-zinc-500 text-xs uppercase tracking-wider mt-1 font-medium">Comparable Metrics</div>
                        </div>
                        <div className="flex-1 text-center sm:border-r border-zinc-200 pb-4 sm:pb-0">
                          <div className="text-3xl font-semibold text-emerald-600">{cachedFingerprint.deterministicSummary.actualExceededExpected}</div>
                          <div className="text-zinc-500 text-xs uppercase tracking-wider mt-1 font-medium">Actual &gt; Expected</div>
                        </div>
                        <div className="flex-1 text-center">
                          <div className="text-3xl font-semibold text-rose-600">{cachedFingerprint.deterministicSummary.actualBelowExpected}</div>
                          <div className="text-zinc-500 text-xs uppercase tracking-wider mt-1 font-medium">Actual &lt; Expected</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-amber-50/30 border-amber-100">
                <CardHeader><CardTitle className="text-amber-900">Recurring Assumptions</CardTitle></CardHeader>
                <CardContent>{renderPatternList(cachedFingerprint.fingerprint.recurringAssumptions)}</CardContent>
              </Card>

              <Card className="bg-emerald-50/30 border-emerald-100">
                <CardHeader><CardTitle className="text-emerald-900">Decision Strengths</CardTitle></CardHeader>
                <CardContent>{renderPatternList(cachedFingerprint.fingerprint.decisionStrengths)}</CardContent>
              </Card>

              <Card className="bg-blue-50/30 border-blue-100">
                <CardHeader><CardTitle className="text-blue-900">Information Gaps</CardTitle></CardHeader>
                <CardContent>{renderPatternList(cachedFingerprint.fingerprint.informationGaps)}</CardContent>
              </Card>

              <Card className="bg-indigo-50/30 border-indigo-100">
                <CardHeader><CardTitle className="text-indigo-900">Emerging Patterns</CardTitle></CardHeader>
                <CardContent>{renderPatternList(cachedFingerprint.fingerprint.emergingPatterns)}</CardContent>
              </Card>
              
              <Card className="md:col-span-2">
                <CardHeader><CardTitle className="text-zinc-900">Confidence Calibration</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-zinc-700 leading-relaxed bg-zinc-50 p-4 rounded-lg border border-zinc-100">
                    {cachedFingerprint.fingerprint.confidenceCalibration || 'Insufficient evidence to evaluate confidence calibration.'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
          <div className="text-center pt-8 pb-4 text-sm text-zinc-400 font-medium">
            Your fingerprint evolves as you complete more decisions.
          </div>
        </div>
      )}
    </div>
  );
};
