import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard, DashboardProvider } from '@/contexts/DashboardContext';
import { useMode, ModeProvider } from '@/contexts/ModeContext';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { OverviewTab } from '@/components/dashboard/OverviewTab';
import { EmissionsTab } from '@/components/dashboard/EmissionsTab';
import { ScorecardTab } from '@/components/dashboard/ScorecardTab';
import { ClientsTab } from '@/components/dashboard/ClientsTab';
import { NetZeroTab } from '@/components/dashboard/NetZeroTab';
import { CarbonBudgetTab } from '@/components/dashboard/CarbonBudgetTab';
import { OrganisationTab } from '@/components/dashboard/OrganisationTab';
import { ReportingTab } from '@/components/dashboard/ReportingTab';
import { PredictiveAnalyticsTab } from '@/components/dashboard/PredictiveAnalyticsTab';
import { AlmacLogo } from '@/components/ui/AlmacLogo';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabType = 'overview' | 'emissions' | 'scorecard' | 'clients' | 'netzero' | 'carbonbudget' | 'organisation' | 'reporting' | 'predictive';

interface Profile {
  id: string;
  user_id: string;
  company_name: string;
  industry: string | null;
  company_size: string | null;
  currency: string;
  base_year: number | null;
}

const DashboardContent = () => {
  const { user } = useAuth();
  const { setCurrency, setBaseYear } = useDashboard();
  const { isPresenterMode } = useMode();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Reset to valid tab when switching modes
  useEffect(() => {
    const businessOnlyTabs: TabType[] = ['predictive', 'scorecard', 'clients', 'carbonbudget', 'reporting'];
    if (isPresenterMode && businessOnlyTabs.includes(activeTab)) {
      setActiveTab('overview');
    }
  }, [isPresenterMode, activeTab]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!error && data) {
        setProfile(data);
        setCurrency(data.currency);
        setBaseYear(data.base_year);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user, setCurrency, setBaseYear]);

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
    if (updatedProfile.currency) {
      setCurrency(updatedProfile.currency);
    }
    if (updatedProfile.base_year !== undefined) {
      setBaseYear(updatedProfile.base_year);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        profile={profile}
        onProfileUpdate={handleProfileUpdate}
      />
      <div className="flex-1 flex flex-col ml-64">
        {/* Top center logo */}
        <div className="w-full py-4 flex justify-center border-b bg-card">
          <AlmacLogo className="h-10" />
        </div>
        <DashboardHeader />
        <main className={cn(
          "flex-1 p-6 overflow-auto transition-all duration-300",
          "animate-fade-in"
        )}>
          {activeTab === 'organisation' && <OrganisationTab />}
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'predictive' && !isPresenterMode && <PredictiveAnalyticsTab />}
          {activeTab === 'emissions' && <EmissionsTab />}
          {activeTab === 'scorecard' && !isPresenterMode && <ScorecardTab />}
          {activeTab === 'clients' && !isPresenterMode && <ClientsTab />}
          {activeTab === 'netzero' && <NetZeroTab />}
          {activeTab === 'carbonbudget' && !isPresenterMode && <CarbonBudgetTab />}
          {activeTab === 'reporting' && !isPresenterMode && <ReportingTab />}
        </main>
      </div>
    </div>
  );
};

const Dashboard = () => {
  return (
    <ModeProvider>
      <DashboardProvider>
        <DashboardContent />
      </DashboardProvider>
    </ModeProvider>
  );
};

export default Dashboard;
