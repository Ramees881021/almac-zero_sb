import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlmacLogo } from '@/components/ui/AlmacLogo';
import facilityBackground from '@/assets/facility-background.png';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [displayText, setDisplayText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const fullText = 'Track. Reduce. Zero.';

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (loading) return;
    
    let currentIndex = 0;
    let isPaused = false;
    
    const runTyping = () => {
      const typingInterval = setInterval(() => {
        if (currentIndex <= fullText.length) {
          setDisplayText(fullText.slice(0, currentIndex));
          currentIndex++;
          if (currentIndex > fullText.length) {
            setIsTypingComplete(true);
            clearInterval(typingInterval);
            // 2 second pause then clear and restart
            setTimeout(() => {
              setDisplayText('');
              setIsTypingComplete(false);
              currentIndex = 0;
              runTyping();
            }, 2000);
          }
        }
      }, 150); // Slower typing speed
      
      return typingInterval;
    };
    
    const interval = runTyping();
    return () => clearInterval(interval);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-pulse">
          <AlmacLogo className="h-12" />
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      {/* Background Layer */}
      <div className="fixed inset-0 -z-10">
        <img 
          src={facilityBackground} 
          alt="" 
          className="w-full h-full object-cover scale-105 blur-[2px]"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/70 to-emerald-950/60" />
      </div>

      {/* Header with logo left, tabs right */}
      <header className="w-full px-6 py-4 flex items-center justify-between relative z-10">
        <AlmacLogo className="h-10" />
        <Tabs defaultValue="signin" className="w-auto">
          <TabsList className="bg-muted">
            <TabsTrigger 
              value="signin" 
              onClick={() => navigate('/auth?tab=login')}
              className="data-[state=active]:bg-background"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger 
              value="register" 
              onClick={() => navigate('/auth?tab=signup')}
              className="data-[state=active]:bg-background"
            >
              Register
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      {/* Hero - Centered content */}
      <main className="flex-1 flex items-center justify-center pb-20 relative z-10">
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
            <span className="text-white">Almac</span>
            <span style={{ color: '#00d084' }}>Zero</span>
          </h1>
          <p className="text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight">
            {displayText}
            <span 
              className={`inline-block w-1 h-12 md:h-16 lg:h-20 bg-primary ml-1 align-middle ${
                isTypingComplete ? 'animate-pulse' : 'animate-pulse'
              }`}
            />
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-4 text-center text-white/70 text-sm relative z-10">
        © {new Date().getFullYear()} Almac Group. Internal Use Only.
      </footer>
    </div>
  );
};

export default Index;
