import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Target, FileText, ArrowRight, BrainCircuit, Lightbulb } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { DBService } from '../services/db';
import { JournalEntry, Goal, Insight } from '../types';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  return 'Evening';
};

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [replayedDecisionsCount, setReplayedDecisionsCount] = useState<number>(0);
  const [hasFingerprint, setHasFingerprint] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        try {
          const [fetchedEntries, fetchedGoals, fetchedReplayed, fp] = await Promise.all([
            DBService.getJournalEntries(user.uid),
            DBService.getGoals(user.uid),
            DBService.getReplayedDecisions(user.uid),
            DBService.getFingerprint(user.uid)
          ]);
          setEntries(fetchedEntries);
          setGoals(fetchedGoals);
          setReplayedDecisionsCount(fetchedReplayed.length);
          setHasFingerprint(!!fp);
        } catch (error) {
          console.error('Failed to fetch data', error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchData();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 mb-1">
            Good {getGreeting()}, {user?.displayName?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-zinc-500">Here's a summary of your financial thinking.</p>
        </div>
        <Link to="/new-entry">
          <Button>
            <FileText className="w-4 h-4 mr-2" />
            New Journal Entry
          </Button>
        </Link>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-zinc-500 mb-1">Total Decisions</p>
            <p className="text-3xl font-semibold">{loading ? '-' : entries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-zinc-500 mb-1">Decisions Analysed</p>
            <p className="text-3xl font-semibold">{loading ? '-' : entries.filter(e => e.status === 'analysed').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-zinc-500 mb-1">Active Goals</p>
            <p className="text-3xl font-semibold">{loading ? '-' : goals.filter(g => g.status === 'active').length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Decisions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Recent Entries</h2>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              <p className="text-sm text-zinc-500">Loading entries...</p>
            ) : entries.length === 0 ? (
              <Card className="border-dashed border-zinc-300 bg-zinc-50 shadow-none">
                <CardContent className="p-8 text-center">
                  <FileText className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-zinc-600 mb-1">No entries yet</p>
                  <p className="text-xs text-zinc-500 mb-4">Start recording your financial decisions to see them here.</p>
                  <Link to="/new-entry">
                    <Button variant="outline" size="sm">Create Entry</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              entries.slice(0, 3).map(entry => (
                <Card key={entry.id} className="hover:border-zinc-300 transition-colors cursor-pointer">
                  {/* Note: In a real app we'd route based on whether it has an analysis, but the flow expects them to be analyzed automatically. We'll try to find its analysis or pass entryId */}
                  <Link to={`/analysis/a-${entry.id.split('-')[1]}?entryId=${entry.id}`}>
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-zinc-100 text-xs font-medium text-zinc-600">
                          {entry.category}
                        </span>
                        <span className="text-xs text-zinc-400">{formatDate(entry.createdAt)}</span>
                      </div>
                      <p className="text-zinc-900 line-clamp-2 text-sm leading-relaxed">
                        "{entry.content}"
                      </p>
                    </CardContent>
                  </Link>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Goals & Patterns */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Active Goals</h2>
            {loading ? (
              <p className="text-sm text-zinc-500">Loading goals...</p>
            ) : goals.length === 0 ? (
              <Card className="border-dashed border-zinc-300 bg-zinc-50 shadow-none">
                <CardContent className="p-6 text-center">
                  <Target className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">No active goals yet.</p>
                </CardContent>
              </Card>
            ) : (
              goals.map(goal => (
                <Card key={goal.id}>
                  <CardContent className="p-5">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-zinc-500" />
                        <span className="font-medium text-sm">{goal.title}</span>
                      </div>
                      <span className="text-sm text-zinc-500">
                        {formatCurrency(goal.currentAmount || 0)} / {formatCurrency(goal.targetAmount || 0)}
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-1.5">
                      <div 
                        className="bg-zinc-900 h-1.5 rounded-full" 
                        style={{ width: `${Math.min(100, ((goal.currentAmount || 0) / (goal.targetAmount || 1)) * 100)}%` }}
                      ></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-medium">Decision Fingerprint</h2>
            {loading ? (
              <p className="text-sm text-zinc-500">Loading...</p>
            ) : replayedDecisionsCount < 3 ? (
              <Card className="border-dashed border-zinc-300 bg-zinc-50 shadow-none">
                <CardContent className="p-6 text-center">
                  <BrainCircuit className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500 mb-4">
                    Complete at least 3 decisions to unlock your Fingerprint. ({replayedDecisionsCount}/3)
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/fingerprint">View Fingerprint</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-zinc-900 text-white border-transparent">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-zinc-800 rounded-lg">
                        <BrainCircuit className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-medium mb-1">
                          {hasFingerprint ? 'Decision Fingerprint' : 'Fingerprint Unlocked'}
                        </h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                          Based on {replayedDecisionsCount} completed decisions.
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0 bg-transparent border-zinc-700 text-white hover:bg-zinc-800 hover:text-white" asChild>
                      <Link to="/fingerprint">View</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
