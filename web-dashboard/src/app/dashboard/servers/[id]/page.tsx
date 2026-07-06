'use client';

import React, { use, useState } from 'react';
import { useGuildConfig } from './_hooks/useGuildConfig';
import { useGuildMutations } from './_hooks/useGuildMutations';
import ServerDetailPage from './_components/ServerDetailPage';
import LoadingSpinner from '@/_layouts/components/LoadingSpinner';

export default function ServerDetailWrapper({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const {
    config,
    setConfig,
    loading,
    error: configError,
    refetch,
    channels,
    roles,
    databases,
    events,
    eventsLoading,
    fetchEvents,
    botConnected
  } = useGuildConfig(id);

  const {
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
    deployScoreboard
  } = useGuildMutations(id);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [testConnSuccess, setTestConnSuccess] = useState('');
  const [testConnError, setTestConnError] = useState('');
  
  const [testFbSuccess, setTestFbSuccess] = useState('');
  const [testFbError, setTestFbError] = useState('');

  const [testAnnSuccess, setTestAnnSuccess] = useState('');
  const [testAnnError, setTestAnnError] = useState('');

  const [scoreSuccess, setScoreSuccess] = useState('');
  const [scoreError, setScoreError] = useState('');

  const [deploySuccess, setDeploySuccess] = useState('');
  const [deployError, setDeployError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setError('');
    setSuccess('');
    const res = await save(config);
    if (res.success) {
      setSuccess('Configuration saved successfully!');
      refetch();
    } else {
      setError(res.error || 'Failed to save configuration.');
    }
  };

  const handleTestConnection = async () => {
    if (!config) return;
    setTestConnSuccess('');
    setTestConnError('');
    
    // Find linked connection to supply tokens
    const conn = databases.find(c => c.id === config.supabase_connection_id);
    
    const res = await testConnection({
      supabase_url: config.supabase_url || conn?.supabase_url || '',
      supabase_anon_key: config.supabase_anon_key || conn?.supabase_anon_key || '',
      supabase_login_email: config.supabase_login_email || conn?.supabase_login_email || null,
      supabase_login_password: config.supabase_login_password || conn?.supabase_login_password || null,
      supabase_access_token: conn?.supabase_access_token || null,
      supabase_refresh_token: conn?.supabase_refresh_token || null,
    });
    if (res.success) {
      setTestConnSuccess(res.message || 'Connected successfully!');
    } else {
      setTestConnError(res.error || 'Failed to connect.');
    }
  };

  const handleTestFirstBlood = async () => {
    setTestFbSuccess('');
    setTestFbError('');
    const res = await testFirstBlood();
    if (res.success) {
      setTestFbSuccess('Test alert sent to Discord.');
    } else {
      setTestFbError(res.error || 'Failed to send alert.');
    }
  };

  const handleTestAnnouncement = async () => {
    setTestAnnSuccess('');
    setTestAnnError('');
    const res = await testAnnouncement();
    if (res.success) {
      setTestAnnSuccess('Test announcement sent to Discord.');
    } else {
      setTestAnnError(res.error || 'Failed to send announcement.');
    }
  };

  const handleDeployScoreboard = async () => {
    setScoreSuccess('');
    setScoreError('');
    const res = await deployScoreboard();
    if (res.success) {
      setScoreSuccess(res.message || 'Scoreboard deployed.');
    } else {
      setScoreError(res.error || 'Failed to deploy scoreboard.');
    }
  };

  const handleDeployPanel = async () => {
    setDeploySuccess('');
    setDeployError('');
    const res = await deployPanel();
    if (res.success) {
      setDeploySuccess('Embed panel deployed to Discord.');
    } else {
      setDeployError(res.error || 'Failed to deploy panel.');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading server configuration..." />;
  }

  if (configError || !config) {
    return (
      <div className="p-4 bg-accent-red/10 border border-accent-red/20 text-accent-red rounded-xl max-w-lg mx-auto text-center mt-12">
        {configError || 'Failed to load configuration.'}
      </div>
    );
  }

  return (
    <ServerDetailPage
      id={id}
      config={config}
      setConfig={setConfig}
      channels={channels}
      roles={roles}
      databases={databases}
      events={events}
      eventsLoading={eventsLoading}
      botConnected={botConnected}
      onSave={handleSave}
      isSaving={isSaving}
      onTestConnection={handleTestConnection}
      testConnLoading={isTesting}
      testConnSuccess={testConnSuccess}
      testConnError={testConnError}
      onTestFirstBlood={handleTestFirstBlood}
      testFbLoading={testFbLoading}
      testFbSuccess={testFbSuccess}
      testFbError={testFbError}
      onTestAnnouncement={handleTestAnnouncement}
      testAnnLoading={testAnnLoading}
      testAnnSuccess={testAnnSuccess}
      testAnnError={testAnnError}
      onDeployScoreboard={handleDeployScoreboard}
      scoreLoading={scoreLoading}
      scoreSuccess={scoreSuccess}
      scoreError={scoreError}
      onDeployPanel={handleDeployPanel}
      deployLoading={deployLoading}
      deploySuccess={deploySuccess}
      deployError={deployError}
      fetchEventsList={fetchEvents}
      error={error}
      success={success}
    />
  );
}
