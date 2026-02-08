import { useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

type AuthView = 'login' | 'signup' | 'forgot-password';

const Auth = () => {
  const [view, setView] = useState<AuthView>('login');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        {view === 'login' && (
          <LoginForm 
            onSwitchToSignup={() => setView('signup')} 
            onForgotPassword={() => setView('forgot-password')} 
          />
        )}
        {view === 'signup' && (
          <SignupForm onSwitchToLogin={() => setView('login')} />
        )}
        {view === 'forgot-password' && (
          <ForgotPasswordForm onBack={() => setView('login')} />
        )}
      </div>
    </div>
  );
};

export default Auth;
