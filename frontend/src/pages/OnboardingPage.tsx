import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/base/Button';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { RecoveryCodeDisplay } from '@/components/profile/RecoveryCodeDisplay';

type Step = 'welcome' | 'profile' | 'recovery';

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('welcome');
  const [recoveryCode, setRecoveryCode] = useState('');

  function handleProfileSuccess(code: string) {
    setRecoveryCode(code);
    setStep('recovery');
  }

  function handleContinue() {
    navigate('/discover', { replace: true });
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        {step === 'welcome' && (
          <div className="text-center space-y-8 animate-in fade-in">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 mb-4">
                <span className="text-3xl">🚀</span>
              </div>
              <h1 className="text-4xl font-bold text-white tracking-tight">
                Welcome to Nodo
              </h1>
              <p className="text-lg text-muted max-w-md mx-auto leading-relaxed">
                Find your team, build something great. Nodo matches you with talented
                people based on your skills and interests.
              </p>
            </div>

            <div className="space-y-3 max-w-sm mx-auto text-left">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-panel border border-border">
                <span className="text-green text-lg">✓</span>
                <span className="text-sm text-white">Create your profile with your skills</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-panel border border-border">
                <span className="text-green text-lg">✓</span>
                <span className="text-sm text-white">Get matched with teams that need you</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-panel border border-border">
                <span className="text-green text-lg">✓</span>
                <span className="text-sm text-white">Start building together</span>
              </div>
            </div>

            <Button onClick={() => setStep('profile')} className="px-8">
              Get Started
            </Button>
          </div>
        )}

        {step === 'profile' && (
          <div className="animate-in fade-in">
            <ProfileForm onSuccess={handleProfileSuccess} />
          </div>
        )}

        {step === 'recovery' && (
          <div className="animate-in fade-in">
            <RecoveryCodeDisplay code={recoveryCode} onContinue={handleContinue} />
          </div>
        )}
      </div>
    </div>
  );
}
