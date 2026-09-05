import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { BrainCircuit, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import { Insight } from '../types';
import { DBService } from '../services/db';
import { useAuth } from '../lib/AuthContext';

export const Insights: React.FC = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      if (user) {
        try {
          const data = await DBService.getInsights(user.uid);
          setInsights(data);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchInsights();
  }, [user]);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'pattern': return <BrainCircuit className="w-5 h-5 text-blue-500" />;
      case 'improvement': return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'risk': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <Lightbulb className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 mb-2">
          Insights
        </h1>
        <p className="text-zinc-500">
          Recurring patterns and lessons learned from your financial decisions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {insights.map((insight) => (
          <Card key={insight.id} className="h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100">
                  {getIconForType(insight.type)}
                </div>
                <CardTitle className="text-base">{insight.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-zinc-600 leading-relaxed text-sm">
                {insight.description}
              </p>
              <p className="text-xs text-zinc-400 mt-4">
                Identified {new Date(insight.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
              </p>
            </CardContent>
          </Card>
        ))}
        
        {/* Placeholder for empty state / educational prompt */}
        <Card className="border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center min-h-[160px]">
          <CardContent className="text-center p-6">
            <BrainCircuit className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-zinc-600 mb-1">{loading ? 'Loading insights...' : 'More data needed'}</p>
            {!loading && (
              <p className="text-xs text-zinc-500 max-w-[250px] mx-auto">
                Continue recording decisions and their outcomes to unlock deeper psychological patterns.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
