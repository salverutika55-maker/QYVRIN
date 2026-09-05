import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { DecisionCategory, JournalEntry, DecisionAnalysis } from '../types';
import { useAuth } from '../lib/AuthContext';
import { DBService } from '../services/db';
import { AIService } from '../services/ai';

export const NewEntry: React.FC = () => {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<DecisionCategory>('Other');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analyzingLock = useRef(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const categories: DecisionCategory[] = [
    'Personal', 'Business', 'Purchase', 'Saving', 'Debt', 'Investment', 'Career', 'Other'
  ];

  const handleAnalyze = async () => {
    if (analyzingLock.current) return;
    analyzingLock.current = true;
    
    if (!content.trim()) {
      setError('Journal entry cannot be empty.');
      return;
    }
    if (content.length > 5000) {
      setError('Journal entry is too long (max 5000 characters).');
      return;
    }
    if (!user) return;
    
    setIsAnalyzing(true);
    setError('');

    let entryId = 'j-' + Date.now();
    try {
      const entry: JournalEntry = {
        id: entryId,
        userId: user.uid,
        content: content.trim(),
        category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'analysing'
      };

      // Save journal entry with 'analysing' status
      await DBService.createJournalEntry(user.uid, entry);

      // Call AI Service
      const aiResponse = await AIService.analyzeDecision(content.trim(), category);
      
      const analysisId = 'a-' + Date.now();
      const analysis: DecisionAnalysis = {
        ...aiResponse,
        id: analysisId,
        journalEntryId: entryId,
        createdAt: new Date().toISOString()
      };

      // Save analysis
      await DBService.saveAnalysis(user.uid, analysis);

      // Update journal entry status to 'analysed'
      await DBService.updateJournalEntry(user.uid, entryId, { status: 'analysed' });

      // Navigate to analysis page
      navigate(`/analysis/${analysisId}?entryId=${entryId}`);
    } catch (err) {
      console.error(err);
      setError('Failed to analyze decision. Please try again or check your network connection.');
      // Attempt to update status to error if we managed to save it initially
      try {
        await DBService.updateJournalEntry(user.uid, entryId, { status: 'error' });
      } catch (updateErr) {
        console.error('Also failed to update entry status to error', updateErr);
      }
    } finally {
      analyzingLock.current = false;
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 mb-2">
          What's on your financial mind?
        </h1>
        <p className="text-zinc-500">
          Capture your thinking. QYVRIN will help you structure it.
        </p>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <div>
          <textarea
            className="w-full h-64 p-6 bg-white border border-zinc-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-none text-lg leading-relaxed placeholder:text-zinc-400"
            placeholder="Tell QYVRIN about a financial decision you're considering, have recently made, or want to understand..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isAnalyzing}
            maxLength={5000}
          />
          <div className="text-right mt-2 text-xs text-zinc-400">
            {content.length}/5000
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-zinc-700 mb-3">Category (Optional)</p>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                disabled={isAnalyzing}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  category === c 
                    ? 'bg-zinc-900 text-white' 
                    : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-6 flex justify-end">
          <Button 
            size="lg" 
            onClick={handleAnalyze} 
            disabled={!content.trim() || isAnalyzing}
            isLoading={isAnalyzing}
          >
            {!isAnalyzing && <BrainCircuit className="w-5 h-5 mr-2" />}
            Analyse with QYVRIN
          </Button>
        </div>
      </div>
    </div>
  );
};
