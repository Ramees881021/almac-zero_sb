import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, BarChart3, Target, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="animate-pulse flex items-center gap-3">
          <span className="text-xl font-bold text-primary">NetZero Platform</span>
        </div>
      </div>
    );
  }

  if (user) {
    // Redirect authenticated users to dashboard
    window.location.href = '/dashboard';
    return null;
  }

  const features = [
    {
      icon: BarChart3,
      title: 'Emissions Tracking',
      description: 'Track Scope 1, 2 & 3 emissions with multi-year analysis',
    },
    {
      icon: Target,
      title: 'Net-Zero Planning',
      description: 'Set science-based targets and visualize reduction pathways',
    },
    {
      icon: Award,
      title: 'ESG Scorecards',
      description: 'Generate performance badges and industry benchmarks',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-primary">NetZero Platform</span>
        </div>
        <Button onClick={() => window.location.href = '/auth'}>
          Get Started
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Track Your Path to
          <span className="text-primary block">Net-Zero</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          The complete sustainability platform for tracking emissions, setting science-based targets, 
          and generating ESG performance scorecards.
        </p>
        <Button size="lg" onClick={() => window.location.href = '/auth'}>
          Start Free Trial
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24">
          {features.map((feature) => (
            <div 
              key={feature.title}
              className="p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-muted-foreground text-sm">
        © {new Date().getFullYear()} NETZ. All rights reserved.
      </footer>
    </div>
  );
};

export default Index;
