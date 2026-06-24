import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, History, Plus, Pencil, Trash2 } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  entry_id: string;
  action: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  reason: string | null;
  created_at: string;
}

export const AuditTrailTab = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  useEffect(() => {
    const fetchLogs = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('carbon_audit_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500);

      if (!error && data) {
        setLogs(data as AuditLogEntry[]);
      }
      setLoading(false);
    };
    fetchLogs();
  }, [user]);

  const filteredLogs = logs.filter(log => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const newVals = JSON.stringify(log.new_values || {}).toLowerCase();
      const oldVals = JSON.stringify(log.old_values || {}).toLowerCase();
      const reason = (log.reason || '').toLowerCase();
      return newVals.includes(search) || oldVals.includes(search) || reason.includes(search) || log.entry_id.includes(search);
    }
    return true;
  });

  const actionIcon = (action: string) => {
    if (action === 'create') return <Plus className="h-3.5 w-3.5 text-green-600" />;
    if (action === 'update') return <Pencil className="h-3.5 w-3.5 text-blue-600" />;
    if (action === 'delete') return <Trash2 className="h-3.5 w-3.5 text-destructive" />;
    return null;
  };

  const actionBadge = (action: string) => {
    const variants: Record<string, string> = {
      create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return <Badge variant="outline" className={`text-[10px] ${variants[action] || ''}`}>{action}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Audit Trail
          </h1>
          <p className="text-muted-foreground">
            Complete history of all changes to carbon calculator entries
          </p>
        </div>
        <Badge variant="secondary">{filteredLogs.length} records</Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search entries, reasons..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Created</SelectItem>
            <SelectItem value="update">Updated</SelectItem>
            <SelectItem value="delete">Deleted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredLogs.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center">
            <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-1">No Audit Records</h3>
            <p className="text-sm text-muted-foreground">
              Audit records will appear here after you save changes in the Carbon Calculator.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Change Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredLogs.map(log => (
                <div key={log.id} className="p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {actionIcon(log.action)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {actionBadge(log.action)}
                          <span className="text-xs text-muted-foreground font-mono truncate">
                            Entry: {log.entry_id.slice(0, 8)}...
                          </span>
                        </div>
                        {log.reason && (
                          <p className="text-xs mt-1 text-foreground">
                            <span className="text-muted-foreground">Reason:</span> {log.reason}
                          </p>
                        )}
                        {log.action === 'update' && log.old_values && log.new_values && (
                          <div className="mt-2 text-xs space-y-1">
                            {Object.keys(log.new_values).map(key => {
                              const oldVal = log.old_values?.[key];
                              const newVal = log.new_values?.[key];
                              if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return null;
                              return (
                                <p key={key} className="text-muted-foreground">
                                  <span className="font-medium text-foreground">{key}:</span>{' '}
                                  <span className="line-through text-destructive/70">{typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal ?? '')}</span>
                                  {' → '}
                                  <span className="text-green-700 dark:text-green-400">{typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal ?? '')}</span>
                                </p>
                              );
                            })}
                          </div>
                        )}
                        {log.action === 'create' && log.new_values && (
                          <p className="text-xs mt-1 text-muted-foreground">
                            Scope {log.new_values.scope} · {log.new_values.category} · {log.new_values.amount_tco2e?.toFixed(3)} tCO₂e
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
