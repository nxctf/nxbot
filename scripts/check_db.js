// Run this from the project root: node scripts/check_db.js
// It uses discord-bot's node_modules for dependencies

const path = require('path');

// Resolve modules from discord-bot/node_modules
const modulePath = path.join(__dirname, '..', 'discord-bot', 'node_modules');
const { createClient } = require(path.join(modulePath, '@supabase/supabase-js'));
const sqlite = require(path.join(modulePath, 'better-sqlite3'));

// Open the SQLite database
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data/nxbot.db');
console.log('📂 Database path:', dbPath);

const db = new sqlite(dbPath);

// Check tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('📋 Tables:', tables.map(t => t.name).join(', '));

// Get connections
const connections = db.prepare('SELECT * FROM supabase_connections').all();
console.log(`\n🔗 Found ${connections.length} Supabase connection(s):`);
connections.forEach((c, i) => {
  console.log(`  [${i}] name=${c.name}, url=${c.supabase_url}`);
  console.log(`      email=${c.supabase_login_email || '(none)'}`);
  console.log(`      access_token=${c.supabase_access_token ? c.supabase_access_token.substring(0, 20) + '...' : '(null)'}`);
  console.log(`      refresh_token=${c.supabase_refresh_token ? c.supabase_refresh_token.substring(0, 20) + '...' : '(null)'}`);
});

// Get guilds
const guilds = db.prepare(`
  SELECT g.id, g.guild_name, g.supabase_connection_id, g.enable_firstblood, g.channel_firstblood, 
         g.channel_announcements, g.is_active,
         c.supabase_url, c.supabase_anon_key, c.supabase_login_email, c.supabase_login_password,
         c.supabase_access_token, c.supabase_refresh_token
  FROM guilds g
  LEFT JOIN supabase_connections c ON g.supabase_connection_id = c.id
`).all();

console.log(`\n🏰 Found ${guilds.length} guild(s):`);
guilds.forEach((g, i) => {
  console.log(`  [${i}] ${g.guild_name} (${g.id})`);
  console.log(`      active=${g.is_active}, connection_id=${g.supabase_connection_id || '(none)'}`);
  console.log(`      firstblood=${g.enable_firstblood}, fb_channel=${g.channel_firstblood || '(none)'}`);
  console.log(`      announce_channel=${g.channel_announcements || '(none)'}`);
  console.log(`      supabase_url=${g.supabase_url || '(none)'}`);
  console.log(`      has_access_token=${!!g.supabase_access_token}`);
  console.log(`      has_refresh_token=${!!g.supabase_refresh_token}`);
});

if (guilds.length === 0 || !guilds[0].supabase_url) {
  console.error('\n❌ No guild with Supabase connection found.');
  process.exit(1);
}

// Test realtime with first guild that has a connection
const guild = guilds.find(g => g.supabase_url);
console.log(`\n🧪 Testing realtime with: ${guild.guild_name}`);

const client = createClient(guild.supabase_url, guild.supabase_anon_key, {
  auth: { persistSession: false, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 10 } }
});

async function run() {
  // Try auth
  if (guild.supabase_access_token && guild.supabase_refresh_token) {
    console.log('🔑 Trying setSession with saved tokens...');
    const { error } = await client.auth.setSession({
      access_token: guild.supabase_access_token,
      refresh_token: guild.supabase_refresh_token,
    });
    if (error) {
      console.warn('⚠️  setSession failed:', error.message);
    } else {
      const { data: { user } } = await client.auth.getUser();
      console.log('✅ Authenticated as:', user?.email || user?.id);
    }
  } else if (guild.supabase_login_email && guild.supabase_login_password) {
    console.log('🔑 Trying signInWithPassword...');
    const { data, error } = await client.auth.signInWithPassword({
      email: guild.supabase_login_email,
      password: guild.supabase_login_password,
    });
    if (error) {
      console.warn('⚠️  signInWithPassword failed:', error.message);
    } else {
      console.log('✅ Authenticated as:', data.user?.email);
    }
  } else {
    console.log('ℹ️  No auth credentials. Running as anon.');
  }

  // Check current auth state
  const { data: { session } } = await client.auth.getSession();
  console.log('🔒 Current session:', session ? `authenticated (${session.user.email})` : 'ANONYMOUS (no session)');

  // Test direct SELECT on solves
  console.log('\n📊 Testing direct SELECT on solves...');
  const { data: solves, error: solvesErr } = await client.from('solves').select('*').limit(3);
  if (solvesErr) {
    console.error('❌ solves SELECT error:', solvesErr.message);
  } else {
    console.log(`✅ solves SELECT returned ${solves.length} row(s):`, JSON.stringify(solves, null, 2));
  }

  // Test direct SELECT on notifications
  console.log('\n📊 Testing direct SELECT on notifications...');
  const { data: notifs, error: notifsErr } = await client.from('notifications').select('*').limit(3);
  if (notifsErr) {
    console.error('❌ notifications SELECT error:', notifsErr.message);
  } else {
    console.log(`✅ notifications SELECT returned ${notifs.length} row(s):`, JSON.stringify(notifs, null, 2));
  }

  // Subscribe to realtime
  console.log('\n📡 Subscribing to realtime channels...');

  const ch1 = client.channel('diag-solves');
  ch1.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'solves' }, (payload) => {
    console.log('\n🩸 ==========================================');
    console.log('🩸 REALTIME SOLVE EVENT RECEIVED!');
    console.log('🩸 payload.new:', JSON.stringify(payload.new, null, 2));
    console.log('🩸 ==========================================');
  }).subscribe((status) => {
    console.log('  solves channel:', status);
  });

  const ch2 = client.channel('diag-notifications');
  ch2.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
    console.log('\n📢 ==========================================');
    console.log('📢 REALTIME NOTIFICATION EVENT RECEIVED!');
    console.log('📢 payload.new:', JSON.stringify(payload.new, null, 2));
    console.log('📢 ==========================================');
  }).subscribe((status) => {
    console.log('  notifications channel:', status);
  });

  console.log('\n⏳ Waiting for realtime events... (insert a row in solves or notifications to test)');
  console.log('   Press Ctrl+C to exit.\n');
}

run().catch(console.error);
