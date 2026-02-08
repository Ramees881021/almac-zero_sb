import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlmacLogo } from '@/components/ui/AlmacLogo';

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
    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setIsTypingComplete(true);
      }
    }, 100);

    return () => clearInterval(typingInterval);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between">
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
      <main className="flex-1 flex items-center justify-center pb-20">
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
            <span className="text-foreground">Almac</span>
            <span style={{ color: '#cf2e2e' }}>Zero</span>
          </h1>
          <p className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tight">
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
      <footer className="w-full px-6 py-4 text-center text-muted-foreground text-sm">
        © {new Date().getFullYear()} Almac Group. Internal Use Only.
      </footer>
    </div>
  );
};

export default Index;
