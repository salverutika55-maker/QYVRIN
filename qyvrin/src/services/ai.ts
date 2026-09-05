import { DecisionAnalysis, DecisionReplayAnalysis, Scenario } from '../types';
import { auth } from '../lib/firebase';

const getAuthHeaders = async () => {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('User not authenticated');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

/**
 * AI Service for QYVRIN.
 * Calls the secure server-side endpoint that uses the Gemini API.
 */
export const AIService = {
  async analyzeDecision(text: string, category: string): Promise<DecisionAnalysis> {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ text, category })
    });
    
    if (!response.ok) {
      throw new Error('Failed to analyze decision');
    }
    
    return response.json();
  },
  
  async generateDecisionReplay(payload: any): Promise<DecisionReplayAnalysis> {
    const response = await fetch('/api/replay', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate decision replay');
    }
    
    return response.json();
  },
  
  async generatePreMortem(payload: any): Promise<any> {
    const response = await fetch('/api/premortem', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate pre-mortem analysis');
    }
    
    return response.json();
  },
  
  async generateFingerprint(payload: any): Promise<any> {
    const response = await fetch('/api/fingerprint', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate fingerprint');
    }
    
    return response.json();
  },

  async generateFollowUpQuestion(context: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return "How would a 20% drop in your primary income affect your ability to sustain this choice?";
  }
};


