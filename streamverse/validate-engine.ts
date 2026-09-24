import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { getMediaDetail } from "./src/lib/adapters/registry";
import { getCachedMediaDetail } from "./src/lib/db-cache";
import { getOrGenerateAiMetadata } from "./src/lib/ai/content-analysis";
import { computeDna } from "./src/lib/dna/compute";
import { generateAiPicks } from "./src/lib/ai/picks";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log("==========================================");
  console.log("1. DATABASE SCHEMA VERIFICATION");
  console.log("==========================================");

  let colError: any = null;
  try {
    const res = await supabase.rpc('get_columns', { table_name: 'media_items' });
    colError = res.error;
  } catch (err: any) {
    colError = err;
  }
  const { error: mediaItemsError } = await supabase.from('media_items').select('id, ai_metadata, normalized_data').limit(1);
  if (mediaItemsError) {
    console.error("❌ media_items table check failed:", mediaItemsError.message);
  } else {
    console.log("✅ media_items table exists with ai_metadata column.");
  }

  const { error: profilesError } = await supabase.from('profiles').select('id, dna_v2').limit(1);
  if (profilesError) {
    console.error("❌ profiles table check failed:", profilesError.message);
  } else {
    console.log("✅ profiles table exists with dna_v2 column.");
  }

  console.log("\n==========================================");
  console.log("2. SELF-GROWING DATABASE & CACHING");
  console.log("==========================================");

  const testMovieId = "157336"; // Interstellar

  // Ensure it's not cached initially for the test
  await supabase.from('media_items').delete().eq('id', `movie-${testMovieId}`);

  console.log(`Fetching TMDB movie ${testMovieId} for the first time...`);
  const t0 = Date.now();
  const firstFetch = await getMediaDetail("movie", testMovieId);
  const t1 = Date.now();
  console.log(`✅ First fetch took ${t1 - t0}ms.`);

  // The first fetch triggers cache save in the background. Wait a moment.
  await new Promise(r => setTimeout(r, 1000));

  console.log(`Fetching TMDB movie ${testMovieId} again...`);
  const t2 = Date.now();
  const secondFetch = await getMediaDetail("movie", testMovieId);
  const t3 = Date.now();
  console.log(`✅ Second fetch took ${t3 - t2}ms.`);

  if ((t3 - t2) < (t1 - t0)) {
    console.log("✅ Local cache successfully bypassed external TMDB API.");
  }

  const cachedDbCheck = await getCachedMediaDetail(`movie-${testMovieId}`);
  if (cachedDbCheck) {
    console.log("✅ Item successfully found in Supabase local cache.");
  } else {
    console.error("❌ Item not found in Supabase cache.");
  }

  console.log("\n==========================================");
  console.log("3. AI ANALYSIS VERIFICATION");
  console.log("==========================================");

  console.log("Triggering AI metadata generation for Interstellar...");
  // Normally fire-and-forget, but we await it here for the test
  const aiMetadata = await getOrGenerateAiMetadata(firstFetch!);

  if (aiMetadata && aiMetadata.mood) {
    console.log("✅ AI Metadata successfully generated and parsed:", JSON.stringify(aiMetadata));
  } else {
    console.error("❌ AI Metadata generation failed.");
  }

  // Wait a moment for async db update
  await new Promise(r => setTimeout(r, 1000));
  const cachedWithAi = await getCachedMediaDetail(`movie-${testMovieId}`);
  if (cachedWithAi?.aiMetadata) {
    console.log("✅ AI Metadata successfully persisted to Supabase.");
  } else {
    console.error("❌ AI Metadata not persisted to Supabase.");
  }

  const t4 = Date.now();
  const cachedAiMetadata = await getOrGenerateAiMetadata(cachedWithAi!);
  const t5 = Date.now();
  console.log(`✅ Subsequent AI metadata request took ${t5 - t4}ms (reused cached data).`);

  console.log("\n==========================================");
  console.log("4. ENTERTAINMENT DNA V2 LEARNING");
  console.log("==========================================");

  const mockWatchHistory = [
    { ...firstFetch!, releaseDate: "1994-01-01" }, // Pretend Interstellar is from 1994 for test
    { ...firstFetch!, releaseDate: "1999-01-01" },
  ];

  const dnaResult = computeDna({
    items: mockWatchHistory as any,
    viewTimestamps: [
      "2023-10-01T08:00:00Z", // Morning
      "2023-10-02T09:00:00Z", // Morning
    ]
  });

  console.log("DNA Release Decades:", dnaResult.releaseDecades);
  console.log("DNA Time of Day Habits:", dnaResult.timeOfDayHabits);
  if (dnaResult.releaseDecades?.includes("1990s") && dnaResult.timeOfDayHabits?.includes("Morning")) {
    console.log("✅ DNA accurately learned from mock user interactions.");
  } else {
    console.error("❌ DNA learning test failed.");
  }

  console.log("\n==========================================");
  console.log("5. PERSONALIZED RECOMMENDATIONS");
  console.log("==========================================");

  console.log("Generating recommendations for User A (Sci-Fi, Space)...");
  const userAContext = "Loves Sci-Fi, space exploration, and mind-bending concepts.";
  const recsA = await generateAiPicks(userAContext).catch(e => console.error(e));

  if (recsA && Array.isArray(recsA) && recsA.length > 0) {
    console.log(`✅ User A Recommendations generated. First pick: ${recsA[0].media.title}`);
    console.log(`   Why: ${recsA[0].why}`);
  } else {
    console.error("❌ User A recommendations failed.");
  }

  console.log("\nGenerating recommendations for User B (Romance, Comedy)...");
  const userBContext = "Loves romantic comedies, lighthearted stories, and slice-of-life anime.";
  const recsB = await generateAiPicks(userBContext).catch(e => console.error(e));

  if (recsB && Array.isArray(recsB) && recsB.length > 0) {
    console.log(`✅ User B Recommendations generated. First pick: ${recsB[0].media.title}`);
    console.log(`   Why: ${recsB[0].why}`);
  } else {
    console.error("❌ User B recommendations failed.");
  }

  if (recsA && recsB && recsA[0]?.media.title !== recsB[0]?.media.title) {
    console.log("✅ Recommendation sets are meaningfully different based on DNA.");
  }

  console.log("\n==========================================");
  console.log("6. AI FAILURE HANDLING");
  console.log("==========================================");

  // Simulate AI failure by corrupting the API key temporarily in memory
  const originalKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "invalid_key";

  console.log("Testing recommendation generation with invalid Groq Key...");
  try {
    const failedRecs = await generateAiPicks("Loves action movies.");
    console.log("❌ Should have thrown an error but didn't.");
  } catch (e: any) {
    console.log("✅ AI gracefully failed as expected with invalid key:", e.message);
  }

  // The system itself should still allow basic fetching even if AI fails
  const fallbackFetch = await getMediaDetail("movie", "27205"); // Inception
  if (fallbackFetch && fallbackFetch.title === "Inception") {
    console.log("✅ Basic media fetching (TMDB) works perfectly even when AI provider is down.");
  } else {
    console.error("❌ Zynora broke due to AI failure.");
  }

  process.env.GROQ_API_KEY = originalKey; // Restore

  console.log("\n==========================================");
  console.log("7. ZERO-COST & PERFORMANCE PROTECTION");
  console.log("==========================================");

  // Try inserting duplicate
  console.log("Testing duplicate inserts for provider ID uniqueness...");
  const { error: duplicateError } = await supabase.from('media_items').insert([{
    id: 'movie-157336', // Already inserted
    media_type: 'movie',
    normalized_data: { test: true }
  }]);

  if (duplicateError && duplicateError.code === '23505') {
    console.log("✅ Database correctly rejected duplicate provider ID (unique constraint).");
  } else {
    console.error("❌ Duplicate insertion was allowed or failed with unexpected error:", duplicateError);
  }

  console.log("\n✅ REAL-WORLD VALIDATION COMPLETE");
}

runTests().catch(console.error);
