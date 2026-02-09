import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/contexts/DashboardContext';
import { useMode } from '@/contexts/ModeContext';
import { supabase } from '@/integrations/supabase/client';
import { LayoutDashboard, BarChart3, Award, Users, Target, LogOut, Pencil, Check, X, Calendar, Wallet, Building2, ClipboardCheck, BrainCircuit, UsersRound, ChevronDown, FolderOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ModeToggle } from './ModeToggle';

type TabType = 'overview' | 'emissions' | 'scorecard' | 'clients' | 'netzero' | 'carbonbudget' | 'organisation' | 'organisation-documents' | 'reporting' | 'predictive' | 'users';

interface Profile {
  id: string;
  user_id: string;
  company_name: string;
  industry: string | null;
  company_size: string | null;
  currency: string;
  base_year: number | null;
}

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  profile: Profile | null;
  onProfileUpdate: (profile: Profile) => void;
  isAdmin?: boolean;
}
interface NavItem {
  id: TabType;
  label: string;
  icon: React.ElementType;
  businessOnly?: boolean;
  adminOnly?: boolean;
  subItems?: NavItem[];
}

const navItems: NavItem[] = [{
  id: 'organisation',
  label: 'Organisation',
  icon: Building2,
  subItems: [{
    id: 'organisation-documents',
    label: 'Documents Management',
    icon: FolderOpen
  }]
}, {
  id: 'emissions',
  label: 'Emissions',
  icon: BarChart3
}, {
  id: 'overview',
  label: 'Overview',
  icon: LayoutDashboard
}, {
  id: 'predictive',
  label: 'Predictive Analytics',
  icon: BrainCircuit,
  businessOnly: true
}, {
  id: 'scorecard',
  label: 'Scorecard',
  icon: Award,
  businessOnly: true
}, {
  id: 'clients',
  label: 'Clients',
  icon: Users,
  businessOnly: true
}, {
  id: 'netzero',
  label: 'Net-Zero',
  icon: Target
}, {
  id: 'carbonbudget',
  label: 'Carbon Budget',
  icon: Wallet,
  businessOnly: true
}, {
  id: 'reporting',
  label: 'Compliance',
  icon: ClipboardCheck,
  businessOnly: true
}, {
  id: 'users',
  label: 'User Management',
  icon: UsersRound,
  businessOnly: true,
  adminOnly: true
}];
const currentYear = new Date().getFullYear();
const baseYearOptions = Array.from({
  length: currentYear - 1999
}, (_, i) => currentYear - i);
export const Sidebar = ({
  activeTab,
  onTabChange,
  profile,
  onProfileUpdate,
  isAdmin = false
}: SidebarProps) => {
  const {
    signOut
  } = useAuth();
  const {
    baseYear,
    setBaseYear
  } = useDashboard();
  const {
    isPresenterMode
  } = useMode();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(profile?.company_name || '');
  const [expandedItems, setExpandedItems] = useState<Set<TabType>>(new Set());

  // Toggle expansion of a nav item
  const toggleExpand = (id: TabType) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter nav items based on mode and admin status
  const filteredNavItems = navItems.filter(item => {
    if (isPresenterMode && item.businessOnly) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });
  const handleSaveCompanyName = async () => {
    if (!profile || !editedName.trim()) return;
    const {
      error
    } = await supabase.from('profiles').update({
      company_name: editedName.trim()
    }).eq('id', profile.id);
    if (error) {
      toast.error('Failed to update company name');
    } else {
      onProfileUpdate({
        ...profile,
        company_name: editedName.trim()
      });
      toast.success('Company name updated');
    }
    setIsEditing(false);
  };
  const handleCancelEdit = () => {
    setEditedName(profile?.company_name || '');
    setIsEditing(false);
  };
  const handleBaseYearChange = async (value: string) => {
    if (!profile) return;
    const newBaseYear = value === 'none' ? null : parseInt(value);
    const {
      error
    } = await supabase.from('profiles').update({
      base_year: newBaseYear
    }).eq('id', profile.id);
    if (error) {
      toast.error('Failed to update base year');
    } else {
      setBaseYear(newBaseYear);
      onProfileUpdate({
        ...profile,
        base_year: newBaseYear
      });
      toast.success('Base year updated');
    }
  };
  return <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col fixed top-0 left-0 h-screen z-10">
      {/* Logo & Company */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-0">
          <span className="text-xl font-bold text-[#f0f0f0]">Almac</span>
          <span className="text-xl font-bold" style={{ color: '#00d084' }}>Zero</span>
        </div>
      </div>

      {/* Base Year Setting */}
      <div className="px-4 py-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Label className="text-xs text-muted-foreground">Base Year (for tracking)</Label>
        </div>
        <Select value={baseYear?.toString() || profile?.base_year?.toString() || 'none'} onValueChange={handleBaseYearChange}>
          <SelectTrigger className="h-8 bg-sidebar-accent border-sidebar-border text-sidebar-foreground text-sm">
            <SelectValue placeholder="Select base year" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            <SelectItem value="none">Not set</SelectItem>
            {baseYearOptions.map(year => <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Mode Toggle */}
      <div className="px-4 py-3 border-b border-sidebar-border">
        <ModeToggle />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {filteredNavItems.map(item => {
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedItems.has(item.id);
            const isActive = activeTab === item.id || (hasSubItems && item.subItems?.some(sub => activeTab === sub.id));
            
            return (
              <li key={item.id} className="animate-fade-in">
                <button 
                  onClick={() => {
                    if (hasSubItems) {
                      toggleExpand(item.id);
                      onTabChange(item.id);
                    } else {
                      onTabChange(item.id);
                    }
                  }} 
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300",
                    isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {hasSubItems && (
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )} />
                  )}
                </button>
                
                {/* Sub-items */}
                {hasSubItems && isExpanded && (
                  <ul className="mt-1 ml-4 space-y-1">
                    {item.subItems?.map(subItem => (
                      <li key={subItem.id}>
                        <button
                          onClick={() => onTabChange(subItem.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                            activeTab === subItem.id 
                              ? "bg-sidebar-accent text-sidebar-foreground font-medium" 
                              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                          )}
                        >
                          <subItem.icon className="h-4 w-4" />
                          {subItem.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </aside>;
};