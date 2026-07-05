const { createClient } = require('@supabase/supabase-js');
const sqlite = require('better-sqlite3');
const path = require('path');

// Open the SQLite database to read connection credentials
const dbPath = path.join(__dirname, 'data/nxbot.db');
console.log('Loading database from:', dbPath);

const db = new sqlite(dbPath);
const connection = db.prepare('SELECT * FROM supabase_connections LIMIT 1').get();

if (!connection) {
  console.error('No Supabase connection configured in database! Please configure one in the dashboard.');
  process.exit(1);
}

console.log('Using Supabase Config:');
console.log('URL:', connection.supabase_url);
console.log('Email:', connection.supabase_login_email);

const client = createClient(connection.supabase_url, connection.supabase_anon_key, {
  auth: {
    persistSession: false,
    autoRefreshToken: true
  }
});

async function run() {
  // Test authentication
  if (connection.supabase_login_email && connection.supabase_login_password) {
    console.log('Attempting auth sign-in with email/password...');
    const { data, error } = await client.auth.signInWithPassword({
      email: connection.supabase_login_email,
      password: connection.supabase_login_password
    });
    
    if (error) {
      console.warn('Auth Sign-In Failed:', error.message);
      console.log('Continuing as Anonymous client...');
    } else {
      console.log('Auth Sign-In Successful!');
      console.log('User UID:', data.user.id);
    }
  } else {
    console.log('No email/password configured. Continuing as Anonymous client...');
  }

  // Subscribe to solves realtime channel
  const solveChannel = client.channel('test-solves');
  
  solveChannel
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'solves' }, (payload) => {
      console.log('----------------------------------------');
      console.log('🩸 REALTIME SOLVE EVENT RECEIVED!');
      console.log('Payload:', JSON.stringify(payload, null, 2));
      console.log('----------------------------------------');
    })
    .subscribe((status) => {
      console.log('Realtime solves subscription status:', status);
    });

  // Subscribe to notifications realtime channel
  const notifChannel = client.channel('test-notifications');
  
  notifChannel
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
      console.log('----------------------------------------');
      console.log('📢 REALTIME NOTIFICATION EVENT RECEIVED!');
      console.log('Payload:', JSON.stringify(payload, null, 2));
      console.log('----------------------------------------');
    })
    .subscribe((status) => {
      console.log('Realtime notifications subscription status:', status);
    });

  console.log('Listening for realtime events... Press Ctrl+C to exit.');
}

run().catch(console.error);
