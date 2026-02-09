import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DocumentsManagement } from './organisation/DocumentsManagement';
import { Loader2 } from 'lucide-react';

interface Credential {
  id: string;
  credential_type: string;
  logo_url: string | null;
}

export const DocumentsManagementTab = () => {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCredentials();
  }, [user]);

  const fetchCredentials = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('sustainability_credentials')
      .select('id, credential_type, logo_url')
      .eq('user_id', user.id);

    if (!error && data) {
      setCredentials(data);
    }
    setLoading(false);
  };

  const handleLogoUpdate = (credentialType: string, logoUrl: string | null) => {
    setCredentials(prev => 
      prev.map(c => 
        c.credential_type === credentialType 
          ? { ...c, logo_url: logoUrl } 
          : c
      )
    );
  };

  const handleCredentialAdd = async (credentialType: string, label: string) => {
    if (!user) return;

    // Add a placeholder credential with the new type
    const { data, error } = await supabase
      .from('sustainability_credentials')
      .insert({
        user_id: user.id,
        credential_type: credentialType,
        credential_name: label,
        status: 'active',
        display_order: credentials.length
      })
      .select('id, credential_type, logo_url')
      .single();

    if (!error && data) {
      setCredentials(prev => [...prev, data]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DocumentsManagement
      credentials={credentials}
      onLogoUpdate={handleLogoUpdate}
      onCredentialAdd={handleCredentialAdd}
    />
  );
};
