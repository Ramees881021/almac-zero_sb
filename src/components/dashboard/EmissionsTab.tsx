import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/contexts/DashboardContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2, Trash2, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useEmissionsBulkOperations, CDP_SCORES, SBTI_STATUSES } from '@/hooks/useEmissionsBulkOperations';

interface EmissionsFormData {
  scope_1_emissions: string;
  scope_2_location_based: string;
  scope_2_market_based: string;
  scope_3_emissions: string;
  revenue: string;
  cdp_score: string;
  ecovadis_score: string;
  sbti_target_status: string;
}

export const EmissionsTab = () => {
  const { user } = useAuth();
  const { selectedYear, currencySymbol } = useDashboard();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { downloadTemplate, exportData, importData } = useEmissionsBulkOperations(user?.id, currencySymbol);
  
  const [formData, setFormData] = useState<EmissionsFormData>({
    scope_1_emissions: '',
    scope_2_location_based: '',
    scope_2_market_based: '',
    scope_3_emissions: '',
    revenue: '',
    cdp_score: '',
    ecovadis_score: '',
    sbti_target_status: '',
  });

  const resetForm = () => {
    setFormData({
      scope_1_emissions: '',
      scope_2_location_based: '',
      scope_2_market_based: '',
      scope_3_emissions: '',
      revenue: '',
      cdp_score: '',
      ecovadis_score: '',
      sbti_target_status: '',
    });
    setExistingId(null);
    setIsDirty(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);

      const { data } = await supabase
        .from('emissions_data')
        .select('*')
        .eq('user_id', user.id)
        .eq('reporting_year', selectedYear)
        .maybeSingle();

      if (data) {
        setExistingId(data.id);
        setFormData({
          scope_1_emissions: data.scope_1_emissions?.toString() || '',
          scope_2_location_based: (data as any).scope_2_location_based?.toString() || '',
          scope_2_market_based: data.scope_2_emissions?.toString() || '',
          scope_3_emissions: data.scope_3_emissions?.toString() || '',
          revenue: data.revenue?.toString() || '',
          cdp_score: data.cdp_score || '',
          ecovadis_score: data.ecovadis_score?.toString() || '',
          sbti_target_status: data.sbti_target_status || '',
        });
        setIsDirty(false);
      } else {
        setExistingId(null);
        setFormData({
          scope_1_emissions: '',
          scope_2_location_based: '',
          scope_2_market_based: '',
          scope_3_emissions: '',
          revenue: '',
          cdp_score: '',
          ecovadis_score: '',
          sbti_target_status: '',
        });
      }
      setLoading(false);
    };

    fetchData();
  }, [user, selectedYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);

    const payload = {
      user_id: user.id,
      reporting_year: selectedYear,
      scope_1_emissions: formData.scope_1_emissions ? parseFloat(formData.scope_1_emissions) : null,
      scope_2_location_based: formData.scope_2_location_based ? parseFloat(formData.scope_2_location_based) : null,
      scope_2_emissions: formData.scope_2_market_based ? parseFloat(formData.scope_2_market_based) : null,
      scope_3_emissions: formData.scope_3_emissions ? parseFloat(formData.scope_3_emissions) : null,
      revenue: formData.revenue ? parseFloat(formData.revenue) : null,
      cdp_score: formData.cdp_score || null,
      ecovadis_score: formData.ecovadis_score ? parseInt(formData.ecovadis_score) : null,
      sbti_target_status: formData.sbti_target_status || null,
    };

    let error;
    if (existingId) {
      ({ error } = await supabase.from('emissions_data').update(payload).eq('id', existingId));
    } else {
      ({ error } = await supabase.from('emissions_data').insert(payload));
    }

    if (error) {
      toast.error('Failed to save data');
    } else {
      toast.success('Data saved successfully');
      setIsDirty(false);
      // Update existingId if it was an insert
      if (!existingId) {
        const { data } = await supabase
          .from('emissions_data')
          .select('id')
          .eq('user_id', user.id)
          .eq('reporting_year', selectedYear)
          .maybeSingle();
        if (data) setExistingId(data.id);
      }
    }
    setSaving(false);
  };

  const handleClearData = async () => {
    if (!user || !existingId) return;
    
    setClearing(true);
    const { error } = await supabase
      .from('emissions_data')
      .delete()
      .eq('id', existingId);

    if (error) {
      toast.error('Failed to clear data');
    } else {
      toast.success(`Emissions data for ${selectedYear} cleared successfully`);
      resetForm();
    }
    setClearing(false);
    setShowClearConfirm(false);
  };

  const updateField = (field: keyof EmissionsFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>;
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    const result = await importData(file);
    setImporting(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Refresh current year data if import was successful
    if (result.success) {
      const { data } = await supabase
        .from('emissions_data')
        .select('*')
        .eq('user_id', user?.id)
        .eq('reporting_year', selectedYear)
        .maybeSingle();

      if (data) {
        setExistingId(data.id);
        setFormData({
          scope_1_emissions: data.scope_1_emissions?.toString() || '',
          scope_2_location_based: (data as any).scope_2_location_based?.toString() || '',
          scope_2_market_based: data.scope_2_emissions?.toString() || '',
          scope_3_emissions: data.scope_3_emissions?.toString() || '',
          revenue: data.revenue?.toString() || '',
          cdp_score: data.cdp_score || '',
          ecovadis_score: data.ecovadis_score?.toString() || '',
          sbti_target_status: data.sbti_target_status || '',
        });
        setIsDirty(false);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Emissions Data Entry</h1>
          <p className="text-muted-foreground">Enter your emissions and ESG data for {selectedYear}</p>
        </div>
        
        {/* Bulk Operations */}
        <div className="flex flex-wrap gap-2">
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={downloadTemplate}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Download Template
          </Button>
          
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Import Data
          </Button>
          
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={exportData}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>
      
      {/* Template Info */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            <strong>Bulk Entry:</strong> Download the template to enter multiple years of data at once. 
            The template includes a "Dropdown Options" sheet with valid values for CDP Score ({CDP_SCORES.join(', ')}) 
            and SBTi Status ({SBTI_STATUSES.join(', ')}). EcoVadis scores must be between 0-100.
          </p>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Emissions Section */}
        <Card>
          <CardHeader>
            <CardTitle>GHG Emissions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scope1">Scope 1 (tCO₂e)</Label>
              <Input
                id="scope1"
                type="number"
                placeholder="Direct emissions"
                value={formData.scope_1_emissions}
                onChange={(e) => updateField('scope_1_emissions', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scope2-location">Scope 2 - Location-based (tCO₂e)</Label>
              <Input
                id="scope2-location"
                type="number"
                placeholder="Location-based emissions"
                value={formData.scope_2_location_based}
                onChange={(e) => updateField('scope_2_location_based', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scope2-market">Scope 2 - Market-based (tCO₂e)</Label>
              <Input
                id="scope2-market"
                type="number"
                placeholder="Market-based emissions"
                value={formData.scope_2_market_based}
                onChange={(e) => updateField('scope_2_market_based', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Used for calculations & analytics</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scope3">Scope 3 (tCO₂e)</Label>
              <Input
                id="scope3"
                type="number"
                placeholder="Value chain"
                value={formData.scope_3_emissions}
                onChange={(e) => updateField('scope_3_emissions', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Section */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-md">
              <Label htmlFor="revenue">Revenue ({currencySymbol})</Label>
              <Input
                id="revenue"
                type="number"
                placeholder="Annual revenue"
                value={formData.revenue}
                onChange={(e) => updateField('revenue', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ESG Scores Section */}
        <Card>
          <CardHeader>
            <CardTitle>ESG Performance</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>CDP Score</Label>
              <Select value={formData.cdp_score} onValueChange={(v) => updateField('cdp_score', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select score" />
                </SelectTrigger>
                <SelectContent>
                  {CDP_SCORES.map((score) => (
                    <SelectItem key={score} value={score}>{score}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ecovadis">EcoVadis Score (0-100)</Label>
              <Input
                id="ecovadis"
                type="number"
                min="0"
                max="100"
                placeholder="0-100"
                value={formData.ecovadis_score}
                onChange={(e) => updateField('ecovadis_score', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>SBTi Status</Label>
              <Select value={formData.sbti_target_status} onValueChange={(v) => updateField('sbti_target_status', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {SBTI_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={saving} className="w-full md:w-auto">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {isDirty || !existingId ? 'Save Data' : 'Edit Data'}
          </Button>

          {existingId && (
            <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" disabled={clearing}>
                  {clearing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all emissions data for {selectedYear}. 
                    This action cannot be undone and will affect calculations across all sections.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleClearData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Clear Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </form>
    </div>
  );
};
