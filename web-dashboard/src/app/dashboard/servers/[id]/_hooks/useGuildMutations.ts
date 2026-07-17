import { useState } from 'react';
import { GuildConfig } from '../_types';

const errorMessage = (err: unknown, fallback: string) => err instanceof Error ? err.message : fallback;

export function useGuildMutations(id: string) {
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [deployLoading, setDeployLoading] = useState(false);
  const [testFbLoading, setTestFbLoading] = useState(false);
  const [testAnnLoading, setTestAnnLoading] = useState(false);
  const [scoreLoading, setScoreLoading] = useState(false);

  const save = async (config: GuildConfig): Promise<{ success: boolean; error?: string }> => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/servers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save configuration.');
      }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: errorMessage(err, 'Error saving configuration.') };
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async (connData: {
    supabase_url: string;
    supabase_anon_key: string;
    supabase_login_email?: string | null;
    supabase_login_password?: string | null;
    supabase_access_token?: string | null;
    supabase_refresh_token?: string | null;
    supabase_connection_id?: string | null;
  }): Promise<{ success: boolean; message?: string; error?: string }> => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/servers/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify connection.');
      }
      return { success: true, message: data.message || 'Verification successful!' };
    } catch (err: unknown) {
      return { success: false, error: errorMessage(err, 'Error testing connection.') };
    } finally {
      setIsTesting(false);
    }
  };

  const deployPanel = async (): Promise<{ success: boolean; error?: string }> => {
    setDeployLoading(true);
    try {
      const res = await fetch(`/api/servers/${id}/deploy-panel`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to deploy panel.');
      }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: errorMessage(err, 'Error occurred.') };
    } finally {
      setDeployLoading(false);
    }
  };

  const testFirstBlood = async (): Promise<{ success: boolean; error?: string }> => {
    setTestFbLoading(true);
    try {
      const res = await fetch(`/api/servers/${id}/test-firstblood`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send test alert.');
      }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: errorMessage(err, 'Error occurred.') };
    } finally {
      setTestFbLoading(false);
    }
  };

  const testAnnouncement = async (): Promise<{ success: boolean; error?: string }> => {
    setTestAnnLoading(true);
    try {
      const res = await fetch(`/api/servers/${id}/test-announcement`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send test announcement.');
      }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: errorMessage(err, 'Error occurred.') };
    } finally {
      setTestAnnLoading(false);
    }
  };

  const deployScoreboard = async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    setScoreLoading(true);
    try {
      const res = await fetch(`/api/servers/${id}/deploy-scoreboard`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to deploy/update live scoreboard.');
      }
      return { success: true, message: data.message || 'Scoreboard deployed/updated successfully!' };
    } catch (err: unknown) {
      return { success: false, error: errorMessage(err, 'Error occurred.') };
    } finally {
      setScoreLoading(false);
    }
  };

  return {
    isSaving,
    isTesting,
    deployLoading,
    testFbLoading,
    testAnnLoading,
    scoreLoading,
    save,
    testConnection,
    deployPanel,
    testFirstBlood,
    testAnnouncement,
    deployScoreboard,
  };
}
