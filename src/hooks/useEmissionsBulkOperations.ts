import { useCallback } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const CDP_SCORES = ['A', 'A-', 'B', 'B-', 'C', 'C-', 'D', 'D-', 'Not Rated'];
export const SBTI_STATUSES = ['Committed', 'Targets Set', 'Near-term Targets', 'Long-term Targets', 'None'];

interface EmissionsRow {
  reporting_year: number;
  scope_1_emissions: number | null;
  scope_2_location_based: number | null;
  scope_2_emissions: number | null; // Market-based (used for calculations)
  scope_3_emissions: number | null;
  revenue: number | null;
  cdp_score: string | null;
  ecovadis_score: number | null;
  sbti_target_status: string | null;
}

export const useEmissionsBulkOperations = (userId: string | undefined, currencySymbol: string) => {
  
  const downloadTemplate = useCallback(() => {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Sample data with headers
    const templateData = [
      {
        'Reporting Year': new Date().getFullYear() - 1,
        'Scope 1 Emissions (tCO₂e)': '',
        'Scope 2 Location-based (tCO₂e)': '',
        'Scope 2 Market-based (tCO₂e)': '',
        'Scope 3 Emissions (tCO₂e)': '',
        [`Revenue (${currencySymbol})`]: '',
        'CDP Score': '',
        'EcoVadis Score (0-100)': '',
        'SBTi Status': '',
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Reporting Year
      { wch: 22 }, // Scope 1
      { wch: 28 }, // Scope 2 Location-based
      { wch: 28 }, // Scope 2 Market-based
      { wch: 22 }, // Scope 3
      { wch: 18 }, // Revenue
      { wch: 12 }, // CDP Score
      { wch: 20 }, // EcoVadis
      { wch: 20 }, // SBTi
    ];

    // Add data validation sheet for dropdowns
    const validationData = [
      ['CDP Scores', 'SBTi Status'],
      ...CDP_SCORES.map((score, i) => [score, SBTI_STATUSES[i] || '']),
    ];
    const wsValidation = XLSX.utils.aoa_to_sheet(validationData);
    
    XLSX.utils.book_append_sheet(wb, ws, 'Emissions Data');
    XLSX.utils.book_append_sheet(wb, wsValidation, 'Dropdown Options');
    
    // Download
    XLSX.writeFile(wb, `emissions_template_${currencySymbol}.xlsx`);
    toast.success('Template downloaded successfully');
  }, [currencySymbol]);

  const exportData = useCallback(async () => {
    if (!userId) {
      toast.error('Please log in to export data');
      return;
    }

    const { data, error } = await supabase
      .from('emissions_data')
      .select('*')
      .eq('user_id', userId)
      .order('reporting_year', { ascending: true });

    if (error) {
      toast.error('Failed to export data');
      return;
    }

    if (!data || data.length === 0) {
      toast.error('No emissions data to export');
      return;
    }

    const exportRows = data.map(row => ({
      'Reporting Year': row.reporting_year,
      'Scope 1 Emissions (tCO₂e)': row.scope_1_emissions ?? '',
      'Scope 2 Location-based (tCO₂e)': (row as any).scope_2_location_based ?? '',
      'Scope 2 Market-based (tCO₂e)': row.scope_2_emissions ?? '',
      'Scope 3 Emissions (tCO₂e)': row.scope_3_emissions ?? '',
      [`Revenue (${currencySymbol})`]: row.revenue ?? '',
      'CDP Score': row.cdp_score ?? '',
      'EcoVadis Score (0-100)': row.ecovadis_score ?? '',
      'SBTi Status': row.sbti_target_status ?? '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);
    
    ws['!cols'] = [
      { wch: 15 },
      { wch: 22 },
      { wch: 28 },
      { wch: 28 },
      { wch: 22 },
      { wch: 18 },
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Emissions Data');
    XLSX.writeFile(wb, `emissions_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`Exported ${data.length} records successfully`);
  }, [userId, currencySymbol]);

  const importData = useCallback(async (file: File): Promise<{ success: boolean; count: number }> => {
    if (!userId) {
      toast.error('Please log in to import data');
      return { success: false, count: 0 };
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            toast.error('No data found in the file');
            resolve({ success: false, count: 0 });
            return;
          }

          const rows: EmissionsRow[] = [];
          const errors: string[] = [];

          jsonData.forEach((row: any, index: number) => {
            const reportingYear = parseInt(row['Reporting Year']);
            
            if (isNaN(reportingYear) || reportingYear < 1900 || reportingYear > 2100) {
              errors.push(`Row ${index + 2}: Invalid reporting year`);
              return;
            }

            // Validate CDP Score
            const cdpScore = row['CDP Score']?.toString().trim() || null;
            if (cdpScore && !CDP_SCORES.includes(cdpScore)) {
              errors.push(`Row ${index + 2}: Invalid CDP Score "${cdpScore}". Must be one of: ${CDP_SCORES.join(', ')}`);
              return;
            }

            // Validate SBTi Status
            const sbtiStatus = row['SBTi Status']?.toString().trim() || null;
            if (sbtiStatus && !SBTI_STATUSES.includes(sbtiStatus)) {
              errors.push(`Row ${index + 2}: Invalid SBTi Status "${sbtiStatus}". Must be one of: ${SBTI_STATUSES.join(', ')}`);
              return;
            }

            // Validate EcoVadis Score
            const ecovadisRaw = row['EcoVadis Score (0-100)'];
            let ecovadisScore: number | null = null;
            if (ecovadisRaw !== '' && ecovadisRaw !== undefined && ecovadisRaw !== null) {
              ecovadisScore = parseInt(ecovadisRaw);
              if (isNaN(ecovadisScore) || ecovadisScore < 0 || ecovadisScore > 100) {
                errors.push(`Row ${index + 2}: EcoVadis Score must be between 0 and 100`);
                return;
              }
            }

            // Parse numeric values dynamically for revenue column
            const revenueKey = Object.keys(row).find(k => k.startsWith('Revenue'));
            const revenue = revenueKey && row[revenueKey] !== '' ? parseFloat(row[revenueKey]) : null;

            rows.push({
              reporting_year: reportingYear,
              scope_1_emissions: row['Scope 1 Emissions (tCO₂e)'] !== '' ? parseFloat(row['Scope 1 Emissions (tCO₂e)']) : null,
              scope_2_location_based: row['Scope 2 Location-based (tCO₂e)'] !== '' ? parseFloat(row['Scope 2 Location-based (tCO₂e)']) : null,
              scope_2_emissions: row['Scope 2 Market-based (tCO₂e)'] !== '' ? parseFloat(row['Scope 2 Market-based (tCO₂e)']) : null,
              scope_3_emissions: row['Scope 3 Emissions (tCO₂e)'] !== '' ? parseFloat(row['Scope 3 Emissions (tCO₂e)']) : null,
              revenue: revenue,
              cdp_score: cdpScore,
              ecovadis_score: ecovadisScore,
              sbti_target_status: sbtiStatus,
            });
          });

          if (errors.length > 0) {
            toast.error(`Validation errors:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? `\n...and ${errors.length - 3} more` : ''}`);
            resolve({ success: false, count: 0 });
            return;
          }

          // Upsert data - update existing years, insert new ones
          let successCount = 0;
          
          for (const row of rows) {
            // Check if record exists for this year
            const { data: existing } = await supabase
              .from('emissions_data')
              .select('id')
              .eq('user_id', userId)
              .eq('reporting_year', row.reporting_year)
              .maybeSingle();

            const payload = {
              user_id: userId,
              ...row,
            };

            let error;
            if (existing) {
              ({ error } = await supabase
                .from('emissions_data')
                .update(payload)
                .eq('id', existing.id));
            } else {
              ({ error } = await supabase
                .from('emissions_data')
                .insert(payload));
            }

            if (!error) successCount++;
          }

          if (successCount === rows.length) {
            toast.success(`Successfully imported ${successCount} records`);
            resolve({ success: true, count: successCount });
          } else {
            toast.warning(`Imported ${successCount} of ${rows.length} records`);
            resolve({ success: true, count: successCount });
          }
        } catch (err) {
          console.error('Import error:', err);
          toast.error('Failed to parse the file. Please use the provided template.');
          resolve({ success: false, count: 0 });
        }
      };

      reader.onerror = () => {
        toast.error('Failed to read the file');
        resolve({ success: false, count: 0 });
      };

      reader.readAsArrayBuffer(file);
    });
  }, [userId]);

  return {
    downloadTemplate,
    exportData,
    importData,
  };
};
