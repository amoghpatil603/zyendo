const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log("Checking schema...");
  
  // Try inserting a dummy item to check if ai_metadata works
  const { data, error } = await supabase.from('media_items').upsert([{
    id: 'test-123',
    media_type: 'movie',
    normalized_data: { test: true },
    ai_metadata: { mood: ['happy'] }
  }]).select();
  
  if (error) {
    console.error("Migration 0022/0023 check failed:", error.message);
  } else {
    console.log("Migration 0022/0023 seems applied. ai_metadata is working!");
    // Clean up
    await supabase.from('media_items').delete().eq('id', 'test-123');
  }
}

checkSchema();
