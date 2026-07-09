import { useState, useEffect } from 'react';
import { GuildConfig, DiscordChannel, DiscordRole, DatabaseConnection, EventItem, DiscordGuildInfo } from '../_types';

export function useGuildConfig(id: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<GuildConfig | null>(null);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setDiscordRoles] = useState<DiscordRole[]>([]);
  const [databases, setDatabases] = useState<DatabaseConnection[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [botConnected, setBotConnected] = useState(false);
  const [discordGuildInfo, setDiscordGuildInfo] = useState<DiscordGuildInfo | null>(null);

  const fetchEvents = async (url: string, key: string) => {
    if (!url || !key) {
      setEvents([]);
      return;
    }
    setEventsLoading(true);
    try {
      const cleanUrl = url.replace(/\/$/, '');
      const res = await fetch(`${cleanUrl}/rest/v1/events?select=id,name`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
      });
      if (res.ok) {
        setEvents(await res.json());
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.warn('Could not fetch events from Supabase connection:', err);
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchConfig = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Databases
      const dbRes = await fetch('/api/databases');
      if (dbRes.ok) {
        setDatabases(await dbRes.json());
      }

      // 2. Guild Config
      const res = await fetch(`/api/servers/${id}`);
      if (!res.ok) {
        throw new Error('Failed to load server configuration.');
      }
      const configData = await res.json() as GuildConfig;
      setConfig(configData);

      // 3. Discord Channels & Roles
      const chanRes = await fetch(`/api/servers/${id}/channels`);
      if (chanRes.ok) {
        setChannels(await chanRes.json());
        setBotConnected(true);
      } else {
        setBotConnected(false);
      }

      const rolesRes = await fetch(`/api/servers/${id}/roles`);
      if (rolesRes.ok) {
        setDiscordRoles(await rolesRes.json());
      }

      // 4. Discord Guild Info
      const guildRes = await fetch(`/api/servers/${id}/discord-info`);
      if (guildRes.ok) {
        setDiscordGuildInfo(await guildRes.json());
      }

      // 5. Events
      if (configData.supabase_url && configData.supabase_anon_key) {
        await fetchEvents(configData.supabase_url, configData.supabase_anon_key);
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchConfig();
    }
  }, [id]);

  return {
    config,
    setConfig,
    loading,
    error,
    refetch: fetchConfig,
    channels,
    roles,
    databases,
    events,
    eventsLoading,
    fetchEvents,
    botConnected,
    discordGuildInfo
  };
}
