import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  BrainCircuit, 
  PenLine, 
  Search, 
  History, 
  ShieldCheck,
  ChevronRight,
  PlaySquare,
  LineChart,
  Lightbulb,
  Lock,
  Server,
  Users
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../lib/AuthContext';
import { loginWithGoogle } from '../lib/firebase';
import { QyvrinLogo } from '../components/ui/QyvrinLogo';

export const LandingPage: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      if ((location.state as any)?.from) {
        const from = (location.state as any).from.pathname;
        navigate(from, { replace: true });
      }
    }
  }, [user, loading, navigate, location]);

  const handleLogin = async () => {
    if (user) {
      navigate('/dashboard');
      return;
    }
    setIsLoggingIn(true);
    await loginWithGoogle();
    navigate('/dashboard');
    setIsLoggingIn(false);
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-zinc-100 selection:text-zinc-900">
      {/* Header/Nav */}
      <header className="px-6 py-6 md:px-12 flex justify-between items-center max-w-7xl mx-auto">
        <div 
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => navigate('/')}
        >
          <QyvrinLogo className="h-8 w-auto md:h-10" />
          <span 
            className="text-xl md:text-[1.65rem] font-semibold tracking-[0.08em] leading-none mt-0.5"
            style={{
              color: '#3f3f46',
              textShadow: '-0.5px -0.5px 0 rgba(255,255,255,0.8), 1px 1px 0 #18181b, 2px 2px 0 #09090b, 3px 3px 5px rgba(0,0,0,0.35)'
            }}
          >
            QYVRIN
          </span>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm">
              Go to Dashboard
            </Button>
          ) : (
            <Button onClick={handleLogin} variant="outline" size="sm" isLoading={isLoggingIn || loading}>
              Sign In
            </Button>
          )}
        </div>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="px-6 pt-20 pb-24 md:pt-32 md:pb-32 max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-[5.5rem] font-semibold text-zinc-900 mb-6 leading-[1.05] tracking-[-0.04em]">
            Think beyond <br className="hidden md:block" /> the numbers.
          </h1>
          
          <h2 className="text-2xl md:text-[1.75rem] text-zinc-500 font-light tracking-[-0.01em] mb-10 leading-snug">
            Turn financial decisions into learning.
          </h2>
          
          <p className="text-lg md:text-xl text-zinc-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            QYVRIN helps you challenge assumptions, explore risks, compare expectations with reality, and learn from the decisions you make.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="w-full sm:w-auto text-base px-8" onClick={handleLogin} isLoading={isLoggingIn || loading}>
              Start thinking
            </Button>
            <a href="#how-it-works" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full text-base px-8">
                See how it works
              </Button>
            </a>
          </div>
        </section>

        {/* DECISION INTELLIGENCE LOOP */}
        <section id="how-it-works" className="py-24 bg-zinc-50 border-y border-zinc-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900 mb-4">
                Every decision tells a story.
              </h2>
              <p className="text-lg text-zinc-600 leading-relaxed">
                QYVRIN helps you capture the reasoning behind a decision — and learn what happens after it.
              </p>
            </div>

            <div className="flex flex-col lg:flex-row items-start justify-between gap-8 relative">
              {/* Connector line for desktop */}
              <div className="hidden lg:block absolute top-8 left-8 right-8 h-0.5 bg-zinc-200 z-0" />
              
              {/* Stage 1 */}
              <div className="relative z-10 flex flex-col items-center lg:items-start text-center lg:text-left flex-1 group">
                <div className="w-16 h-16 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center mb-6 shadow-sm transition-transform group-hover:-translate-y-1">
                  <PenLine className="w-6 h-6 text-zinc-900" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">1. Decide</h3>
                <p className="text-zinc-600 text-sm leading-relaxed">Record the decision and context.</p>
              </div>

              {/* Stage 2 */}
              <div className="relative z-10 flex flex-col items-center lg:items-start text-center lg:text-left flex-1 group">
                <div className="w-16 h-16 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center mb-6 shadow-sm transition-transform group-hover:-translate-y-1">
                  <Search className="w-6 h-6 text-zinc-900" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">2. Challenge</h3>
                <p className="text-zinc-600 text-sm leading-relaxed">Identify assumptions, risks and information gaps.</p>
              </div>

              {/* Stage 3 */}
              <div className="relative z-10 flex flex-col items-center lg:items-start text-center lg:text-left flex-1 group">
                <div className="w-16 h-16 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center mb-6 shadow-sm transition-transform group-hover:-translate-y-1">
                  <Lightbulb className="w-6 h-6 text-zinc-900" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">3. Predict</h3>
                <p className="text-zinc-600 text-sm leading-relaxed">Record what you expect to happen.</p>
              </div>

              {/* Stage 4 */}
              <div className="relative z-10 flex flex-col items-center lg:items-start text-center lg:text-left flex-1 group">
                <div className="w-16 h-16 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center mb-6 shadow-sm transition-transform group-hover:-translate-y-1">
                  <PlaySquare className="w-6 h-6 text-zinc-900" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">4. Replay</h3>
                <p className="text-zinc-600 text-sm leading-relaxed">Compare expectations with actual outcomes.</p>
              </div>

              {/* Stage 5 */}
              <div className="relative z-10 flex flex-col items-center lg:items-start text-center lg:text-left flex-1 group">
                <div className="w-16 h-16 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center mb-6 shadow-sm transition-transform group-hover:-translate-y-1">
                  <LineChart className="w-6 h-6 text-zinc-900" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">5. Learn</h3>
                <p className="text-zinc-600 text-sm leading-relaxed">Identify recurring patterns across decisions.</p>
              </div>
            </div>
          </div>
        </section>

        {/* THREE CORE DIFFERENTIATORS */}
        <section className="py-24 max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-white border border-zinc-100 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center mb-6 border border-zinc-100">
                <Search className="w-6 h-6 text-zinc-900" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-zinc-900">Challenge the decision</h3>
              <p className="text-zinc-600 leading-relaxed">
                QYVRIN uses Gemini to examine assumptions, surface potential risks and highlight information gaps before you commit.
              </p>
            </div>
            
            <div className="p-8 rounded-3xl bg-white border border-zinc-100 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center mb-6 border border-zinc-100">
                <History className="w-6 h-6 text-zinc-900" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-zinc-900">Replay the outcome</h3>
              <p className="text-zinc-600 leading-relaxed">
                Record what you expected, compare it with what actually happened, and understand where reality differed from your assumptions.
              </p>
            </div>
            
            <div className="p-8 rounded-3xl bg-white border border-zinc-100 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="w-12 h-12 flex items-center justify-center mb-6">
                <QyvrinLogo className="h-8 w-auto" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-zinc-900">Learn from the pattern</h3>
              <p className="text-zinc-600 leading-relaxed">
                Decision Fingerprint helps reveal recurring patterns across your documented decisions.
              </p>
            </div>
          </div>
        </section>

        {/* PRODUCT PREVIEW */}
        <section className="py-12 max-w-5xl mx-auto px-6 overflow-hidden">
          <div className="bg-white border border-zinc-200 rounded-2xl md:rounded-[2rem] shadow-xl p-2 md:p-4 bg-zinc-50/50">
            <div className="bg-white border border-zinc-100 rounded-xl md:rounded-2xl overflow-hidden shadow-sm">
              {/* Fake App Header */}
              <div className="h-12 border-b border-zinc-100 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-zinc-200" />
                  <div className="w-3 h-3 rounded-full bg-zinc-200" />
                  <div className="w-3 h-3 rounded-full bg-zinc-200" />
                </div>
                <div className="mx-auto text-xs font-medium text-zinc-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  qyvrin.app / analysis
                </div>
              </div>
              {/* Fake App Content */}
              <div className="p-6 md:p-10 flex flex-col md:flex-row gap-8 bg-zinc-50">
                <div className="flex-1 space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">Original Decision</h4>
                    <p className="text-zinc-900 font-medium text-lg leading-relaxed bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                      "I'm considering liquidating 20% of my tech index holdings to fund a down payment on a rental property in Austin. The market seems to be cooling down, making it a good time to buy."
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                      <div className="flex items-center gap-2 text-rose-600 mb-2">
                        <ShieldCheck className="w-5 h-5" />
                        <h4 className="font-semibold">Pre-Mortem Risk</h4>
                      </div>
                      <p className="text-zinc-700 text-sm leading-relaxed">
                        If this decision fails in 2 years, it's likely because the rental market in Austin cooled faster than expected, leading to prolonged vacancy, while the tech index rebounded sharply, resulting in significant opportunity cost.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="md:w-72 space-y-4">
                  <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                    <h4 className="text-sm font-semibold text-zinc-900 mb-4">Identified Assumptions</h4>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2 text-sm text-zinc-600">
                        <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                        Austin property prices have hit their floor.
                      </li>
                      <li className="flex items-start gap-2 text-sm text-zinc-600">
                        <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                        Rental yield will outpace tech index growth over 5 years.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECURITY / TRUST */}
        <section className="py-24 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-zinc-50 rounded-2xl mb-6 border border-zinc-100">
            <ShieldCheck className="w-6 h-6 text-zinc-900" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 mb-10">
            Built with privacy and security in mind.
          </h2>
          
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-zinc-600">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span className="text-sm font-medium">Authenticated access</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">User-isolated decisions</span>
            </div>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              <span className="text-sm font-medium">Server-side Gemini protection</span>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-24 bg-zinc-900 text-white text-center md:rounded-t-[4rem] rounded-t-[2rem] mt-12 mx-2 md:mx-6 mb-0">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Think beyond the numbers.
            </h2>
            <p className="text-xl text-zinc-400 font-light mb-10">
              Start turning financial decisions into something you can learn from.
            </p>
            <Button 
              size="lg" 
              onClick={handleLogin} 
              isLoading={isLoggingIn || loading}
              className="bg-white text-zinc-900 hover:bg-zinc-100 hover:text-zinc-900 border-transparent text-base px-10 h-14 transition-transform hover:scale-105"
            >
              Start thinking
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};
