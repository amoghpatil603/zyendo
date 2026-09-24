require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDb() {
  console.log("Checking DB...");
  const { data: m, error: me } = await supabase.from('media_items').select('id').limit(1);
  if (me) console.error("media_items missing:", me.message);
  else console.log("✅ media_items exists!");

  const { data: s, error: se } = await supabase.from('search_cache').select('query').limit(1);
  if (se) console.error("search_cache missing:", se.message);
  else console.log("✅ search_cache exists!");

  const { data: p, error: pe } = await supabase.from('profiles').select('dna_v2').limit(1);
  if (pe) console.error("profiles.dna_v2 missing:", pe.message);
  else console.log("✅ profiles.dna_v2 exists!");
}

checkDb();
