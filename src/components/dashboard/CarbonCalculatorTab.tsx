import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/contexts/DashboardContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Save, Loader2, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { SiteManager, type Site } from './carbon-calculator/SiteManager';
import { Scope1Form, type Scope1Entry } from './carbon-calculator/Scope1Form';
import { Scope2Form, type Scope2Entry } from './carbon-calculator/Scope2Form';
import { Scope3Form, type Scope3Entry } from './carbon-calculator/Scope3Form';
import { ResultsSummary } from './carbon-calculator/ResultsSummary';


type ScopeTab = 'results' | 'sites' | 'scope1' | 'scope2' | 'scope3';

export const CarbonCalculatorTab = () => {
  const { user } = useAuth();
  const { selectedYear } = useDashboard();
  const [activeScope, setActiveScope] = useState<ScopeTab>('sites');
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  // Scope 1/2 entries keyed by siteId
  const [scope1BySite, setScope1BySite] = useState<Record<string, Scope1Entry[]>>({});
  const [scope2BySite, setScope2BySite] = useState<Record<string, Scope2Entry[]>>({});
  // Scope 3 entries (can be global or per-site)
  const [scope3Entries, setScope3Entries] = useState<Scope3Entry[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load saved data
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);

      // Load sites
      const { data: sitesData } = await supabase
        .from('sites')
        .select('*')
        .eq('user_id', user.id);

      const loadedSites: Site[] = (sitesData || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        country: s.country || '',
        state: s.grid_region || s.location || '',
      }));
      setSites(loadedSites);
      if (loadedSites.length > 0 && !selectedSiteId) {
        setSelectedSiteId(loadedSites[0].id);
      }

      // Load carbon entries
      const { data, error } = await supabase
        .from('carbon_calc_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('reporting_year', selectedYear);

      if (!error && data) {
        const s1Map: Record<string, Scope1Entry[]> = {};
        const s2Map: Record<string, Scope2Entry[]> = {};
        const s3: Scope3Entry[] = [];

        data.forEach((row: any) => {
          const ad = row.activity_data || {};
          if (row.scope === 1) {
            const siteId = row.site_id || 'unknown';
            if (!s1Map[siteId]) s1Map[siteId] = [];
            s1Map[siteId].push({
              id: row.id,
              subCategory: row.category as any,
              type: ad.type || '',
              quantity: ad.quantity || 0,
              unit: ad.unit || '',
              tco2e: row.amount_tco2e || 0,
              description: row.description || '',
            });
          } else if (row.scope === 2) {
            const siteId = row.site_id || 'unknown';
            if (!s2Map[siteId]) s2Map[siteId] = [];
            s2Map[siteId].push({
              id: row.id,
              subCategory: row.category as any,
              gridRegion: ad.gridRegion || '',
              quantity: ad.quantity || 0,
              unit: ad.unit || 'kWh',
              method: ad.method || 'location',
              tco2e: row.amount_tco2e || 0,
              description: row.description || '',
              renewablePercentage: ad.renewablePercentage || 0,
            });
          } else if (row.scope === 3) {
            s3.push({
              id: row.id,
              categoryCode: row.category,
              type: ad.type || '',
              quantity: ad.quantity || 0,
              unit: ad.unit || '',
              tco2e: row.amount_tco2e || 0,
              description: row.description || '',
              siteId: row.site_id || null,
            });
          }
        });

        setScope1BySite(s1Map);
        setScope2BySite(s2Map);
        setScope3Entries(s3);
      }
      setLoading(false);
    };
    load();
  }, [user, selectedYear]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    // Load existing entries for audit diff
    const { data: existingEntries } = await supabase
      .from('carbon_calc_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('reporting_year', selectedYear);

    const existingMap = new Map((existingEntries || []).map((e: any) => [e.id, e]));

    // Save sites first
    await supabase.from('sites').delete().eq('user_id', user.id);
    if (sites.length > 0) {
      await supabase.from('sites').insert(
        sites.map(s => ({
          id: s.id,
          user_id: user.id,
          name: s.name,
          country: s.country,
          grid_region: s.state,
          location: s.state ? `${s.state}, ${s.country}` : s.country,
        }))
      );
    }

    // Delete existing entries for this year
    await supabase
      .from('carbon_calc_entries')
      .delete()
      .eq('user_id', user.id)
      .eq('reporting_year', selectedYear);

    // Build insert rows
    const rows: any[] = [];

    // Scope 1 entries per site
    Object.entries(scope1BySite).forEach(([siteId, entries]) => {
      entries.forEach(e => {
        rows.push({
          user_id: user.id,
          reporting_year: selectedYear,
          scope: 1,
          category: e.subCategory,
          description: e.description,
          activity_data: { type: e.type, quantity: e.quantity, unit: e.unit },
          amount_tco2e: e.tco2e,
          data_quality: 'primary_metered',
          site_id: siteId,
        });
      });
    });

    // Scope 2 entries per site
    Object.entries(scope2BySite).forEach(([siteId, entries]) => {
      entries.forEach(e => {
        rows.push({
          user_id: user.id,
          reporting_year: selectedYear,
          scope: 2,
          category: e.subCategory,
          description: e.description,
          activity_data: { type: e.subCategory, quantity: e.quantity, unit: e.unit, gridRegion: e.gridRegion, method: e.method, renewablePercentage: e.renewablePercentage },
          amount_tco2e: e.tco2e,
          data_quality: 'primary_metered',
          site_id: siteId,
        });
      });
    });

    // Scope 3 entries (global or per-site)
    scope3Entries.forEach(e => {
      rows.push({
        user_id: user.id,
        reporting_year: selectedYear,
        scope: 3,
        category: e.categoryCode,
        description: e.description,
        activity_data: { type: e.type, quantity: e.quantity, unit: e.unit },
        amount_tco2e: e.tco2e,
        data_quality: e.siteId ? 'average_data' : 'average_data',
        site_id: e.siteId || null,
      });
    });

    if (rows.length > 0) {
      const { error, data: insertedData } = await supabase.from('carbon_calc_entries').insert(rows).select();
      if (error) {
        toast.error('Failed to save calculator data');
        console.error(error);
      } else {
        toast.success(`Saved ${rows.length} entries for ${selectedYear}`);

        // Write audit log entries
        const auditRows: any[] = [];

        // Log deletions (entries that existed before but are gone now)
        existingMap.forEach((oldEntry, oldId) => {
          auditRows.push({
            user_id: user.id,
            entry_id: oldId,
            action: 'delete',
            old_values: { scope: oldEntry.scope, category: oldEntry.category, amount_tco2e: oldEntry.amount_tco2e, description: oldEntry.description },
            new_values: null,
          });
        });

        // Log creates for all new entries
        (insertedData || []).forEach((newEntry: any) => {
          auditRows.push({
            user_id: user.id,
            entry_id: newEntry.id,
            action: 'create',
            old_values: null,
            new_values: { scope: newEntry.scope, category: newEntry.category, amount_tco2e: newEntry.amount_tco2e, description: newEntry.description },
          });
        });

        if (auditRows.length > 0) {
          await supabase.from('carbon_audit_log').insert(auditRows);
        }
      }
    } else {
      toast.success('All entries cleared');
      // Log all deletions
      if (existingMap.size > 0) {
        const deleteAuditRows = Array.from(existingMap.entries()).map(([oldId, oldEntry]) => ({
          user_id: user.id,
          entry_id: oldId,
          action: 'delete',
          old_values: { scope: (oldEntry as any).scope, category: (oldEntry as any).category, amount_tco2e: (oldEntry as any).amount_tco2e },
          new_values: null,
        }));
        await supabase.from('carbon_audit_log').insert(deleteAuditRows);
      }
    }

    setSaving(false);
  };

  // Compute totals across all sites
  const allScope1 = Object.values(scope1BySite).flat();
  const allScope2 = Object.values(scope2BySite).flat();
  const totalEmissions = allScope1.reduce((s, e) => s + e.tco2e, 0) +
    allScope2.reduce((s, e) => s + e.tco2e, 0) +
    scope3Entries.reduce((s, e) => s + e.tco2e, 0);

  const currentScope1 = selectedSiteId ? (scope1BySite[selectedSiteId] || []) : [];
  const currentScope2 = selectedSiteId ? (scope2BySite[selectedSiteId] || []) : [];

  const scopeTabs: { key: ScopeTab; label: string; count: number }[] = [
    { key: 'results', label: '📊 Results', count: 0 },
    { key: 'sites', label: '🏢 Sites', count: sites.length },
    { key: 'scope1', label: 'Scope 1', count: allScope1.length },
    { key: 'scope2', label: 'Scope 2', count: allScope2.length },
    { key: 'scope3', label: 'Scope 3', count: scope3Entries.length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedSite = sites.find(s => s.id === selectedSiteId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            Carbon Calculator
          </h1>
          <p className="text-muted-foreground">
            Measure your carbon footprint across Scope 1, 2 & 3 for {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {totalEmissions > 0 && (
            <div className="text-right mr-2">
              <p className="text-2xl font-bold">{totalEmissions.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">tCO₂e total</p>
            </div>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save All
          </Button>
        </div>
      </div>

      {/* Scope tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {scopeTabs.map(tab => (
          <Button
            key={tab.key}
            variant={activeScope === tab.key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveScope(tab.key)}
            className="gap-1"
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 bg-background/20 text-xs rounded-full px-1.5 py-0.5">{tab.count}</span>
            )}
          </Button>
        ))}
      </div>

      {/* Content */}
      {activeScope === 'results' && (
        <ResultsSummary
          scope1Entries={allScope1}
          scope2Entries={allScope2}
          scope3Entries={scope3Entries}
          sites={sites}
          scope1BySite={scope1BySite}
          scope2BySite={scope2BySite}
        />
      )}

      {activeScope === 'sites' && (
        <SiteManager
          sites={sites}
          onChange={setSites}
          selectedSiteId={selectedSiteId}
          onSelectSite={setSelectedSiteId}
        />
      )}

      {activeScope === 'scope1' && (
        <div className="space-y-4">
          {sites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-lg font-medium mb-1">Add sites first</p>
              <p className="text-sm">Scope 1 emissions are entered per-site. Go to the Sites tab to add your sites.</p>
            </div>
          ) : (
            <>
              <SiteSelectorBar sites={sites} selectedSiteId={selectedSiteId} onSelect={setSelectedSiteId} />
              {selectedSiteId && (
                <Scope1Form
                  entries={currentScope1}
                  onChange={entries => setScope1BySite(prev => ({ ...prev, [selectedSiteId]: entries }))}
                />
              )}
            </>
          )}
        </div>
      )}

      {activeScope === 'scope2' && (
        <div className="space-y-4">
          {sites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-lg font-medium mb-1">Add sites first</p>
              <p className="text-sm">Scope 2 emissions are entered per-site. Go to the Sites tab to add your sites.</p>
            </div>
          ) : (
            <>
              <SiteSelectorBar sites={sites} selectedSiteId={selectedSiteId} onSelect={setSelectedSiteId} />
              {selectedSiteId && (
                <Scope2Form
                  entries={currentScope2}
                  onChange={entries => setScope2BySite(prev => ({ ...prev, [selectedSiteId]: entries }))}
                  site={selectedSite}
                />
              )}
            </>
          )}
        </div>
      )}

      {activeScope === 'scope3' && (
        <Scope3Form
          entries={scope3Entries}
          onChange={setScope3Entries}
          sites={sites}
          scope1BySite={scope1BySite}
          scope2BySite={scope2BySite}
        />
      )}
    </div>
  );
};

// Reusable site selector bar for Scope 1/2
const SiteSelectorBar = ({ sites, selectedSiteId, onSelect }: { sites: Site[]; selectedSiteId: string | null; onSelect: (id: string) => void }) => {
  return (
    <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/30 border">
      <span className="text-xs text-muted-foreground self-center mr-2">Select site:</span>
      {sites.map(site => (
        <Button
          key={site.id}
          variant={selectedSiteId === site.id ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelect(site.id)}
        >
          {site.name}
          {site.country && <span className="ml-1 text-xs opacity-70">({site.state && site.country === 'US' ? `${site.state}, ` : ''}{site.country})</span>}
        </Button>
      ))}
    </div>
  );
};
