import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { AlmacLogo } from '@/components/ui/AlmacLogo';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type AuthView = 'login' | 'signup' | 'forgot-password';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [view, setView] = useState<AuthView>(tabParam === 'signup' ? 'signup' : 'login');

  useEffect(() => {
    if (tabParam === 'signup') {
      setView('signup');
    } else if (tabParam === 'login') {
      setView('login');
    }
  }, [tabParam]);

  if (view === 'forgot-password') {
    return (
      <div className="min-h-screen flex flex-col bg-white">
      <header className="w-full px-6 py-4 flex justify-start">
        <a href="/" className="flex items-center gap-1">
          <AlmacLogo className="h-10" />
          <span style={{ color: '#cf2e2e' }} className="text-2xl font-bold">Zero</span>
        </a>
      </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <ForgotPasswordForm onBack={() => setView('login')} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="w-full px-6 py-4 flex justify-start">
        <a href="/" className="flex items-center gap-1">
          <AlmacLogo className="h-10" />
          <span style={{ color: '#cf2e2e' }} className="text-2xl font-bold">Zero</span>
        </a>
      </header>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Tabs value={view} onValueChange={(v) => setView(v as AuthView)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm 
                onSwitchToSignup={() => setView('signup')} 
                onForgotPassword={() => setView('forgot-password')} 
              />
            </TabsContent>
            <TabsContent value="signup">
              <SignupForm onSwitchToLogin={() => setView('login')} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Auth;
