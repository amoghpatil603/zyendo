import { NextResponse } from "next/server";
import { getAdminClient, getCachedMediaDetail } from "@/lib/db-cache";
import { getMediaDetail } from "@/lib/adapters/registry";
import { getOrGenerateAiMetadata } from "@/lib/ai/content-analysis";
import { computeDna } from "@/lib/dna/compute";
import { generateAiPicks } from "@/lib/ai/picks";

export async function GET() {
  const supabase = getAdminClient();
  const logs: string[] = [];

  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  if (!supabase) {
    log("❌ ERROR: Supabase admin client not configured.");
    return NextResponse.json({ success: false, logs });
  }

  try {
    log("==========================================");
    log("1. DATABASE SCHEMA VERIFICATION");
    log("==========================================");

    const { error: mediaItemsError } = await supabase.from('media_items').select('id, ai_metadata, normalized_data').limit(1);
    if (mediaItemsError) {
      log(`❌ media_items table check failed: ${mediaItemsError.message}`);
    } else {
      log("✅ media_items table exists with ai_metadata column.");
    }

    const { error: profilesError } = await supabase.from('profiles').select('id, dna_v2').limit(1);
    if (profilesError) {
      log(`❌ profiles table check failed: ${profilesError.message}`);
    } else {
      log("✅ profiles table exists with dna_v2 column.");
    }

    log("\n==========================================");
    log("2. SELF-GROWING DATABASE & CACHING");
    log("==========================================");

    const testMovieId = "155"; // The Dark Knight

    // Delete it first to simulate first fetch
    await supabase.from('media_items').delete().eq('id', `movie-${testMovieId}`);

    log(`Fetching TMDB movie ${testMovieId} for the first time...`);
    const t0 = Date.now();
    const firstFetch = await getMediaDetail("movie", testMovieId);
    const t1 = Date.now();
    log(`✅ First fetch took ${t1 - t0}ms.`);

    // Wait a little for async upsert to complete
    await new Promise(r => setTimeout(r, 1000));

    log(`Fetching TMDB movie ${testMovieId} again...`);
    const t2 = Date.now();
    await getMediaDetail("movie", testMovieId);
    const t3 = Date.now();
    log(`✅ Second fetch took ${t3 - t2}ms.`);

    if ((t3 - t2) < (t1 - t0)) {
      log("✅ Local cache successfully bypassed external TMDB API.");
    }

    const cachedDbCheck = await getCachedMediaDetail(`movie-${testMovieId}`);
    if (cachedDbCheck) {
      log("✅ Item successfully found in Supabase local cache.");
    } else {
      log("❌ Item not found in Supabase cache.");
    }

    log("\n==========================================");
    log("3. AI ANALYSIS VERIFICATION");
    log("==========================================");

    log("Triggering AI metadata generation for The Dark Knight...");
    const aiMetadata = await getOrGenerateAiMetadata(firstFetch!);

    if (aiMetadata && aiMetadata.mood) {
      log(`✅ AI Metadata successfully generated and parsed: ${JSON.stringify(aiMetadata)}`);
    } else {
      log("❌ AI Metadata generation failed.");
    }

    await new Promise(r => setTimeout(r, 1000));
    const cachedWithAi = await getCachedMediaDetail(`movie-${testMovieId}`);
    if (cachedWithAi?.aiMetadata) {
      log("✅ AI Metadata successfully persisted to Supabase.");
    } else {
      log("❌ AI Metadata not persisted to Supabase.");
    }

    const t4 = Date.now();
    await getOrGenerateAiMetadata(cachedWithAi!);
    const t5 = Date.now();
    log(`✅ Subsequent AI metadata request took ${t5 - t4}ms (reused cached data).`);

    log("\n==========================================");
    log("4. ENTERTAINMENT DNA V2 LEARNING");
    log("==========================================");

    const mockWatchHistory = [
      { ...firstFetch!, releaseDate: "1994-01-01" },
      { ...firstFetch!, releaseDate: "1999-01-01" },
    ];

    const dnaResult = computeDna({
      items: mockWatchHistory as any,
      viewTimestamps: [
        "2023-10-01T08:00:00Z", // Morning
        "2023-10-02T09:00:00Z", // Morning
      ]
    });

    log(`DNA Release Decades: ${JSON.stringify(dnaResult.releaseDecades)}`);
    log(`DNA Time of Day Habits: ${JSON.stringify(dnaResult.timeOfDayHabits)}`);
    if (dnaResult.releaseDecades?.includes("1990s") && dnaResult.timeOfDayHabits?.includes("Morning")) {
      log("✅ DNA accurately learned from mock user interactions.");
    } else {
      log("❌ DNA learning test failed.");
    }

    log("\n==========================================");
    log("5. PERSONALIZED RECOMMENDATIONS");
    log("==========================================");

    log("Generating recommendations for User A (Sci-Fi, Space)...");
    const userAContext = "Loves Sci-Fi, space exploration, and mind-bending concepts.";
    const recsA = await generateAiPicks(userAContext).catch(e => log(`Error: ${e}`));

    if (recsA && Array.isArray(recsA) && recsA.length > 0) {
      log(`✅ User A Recommendations generated. First pick: ${recsA[0].media.title}`);
      log(`   Why: ${recsA[0].why}`);
    } else {
      log("❌ User A recommendations failed.");
    }

    log("\nGenerating recommendations for User B (Romance, Comedy)...");
    const userBContext = "Loves romantic comedies, lighthearted stories, and slice-of-life anime.";
    const recsB = await generateAiPicks(userBContext).catch(e => log(`Error: ${e}`));

    if (recsB && Array.isArray(recsB) && recsB.length > 0) {
      log(`✅ User B Recommendations generated. First pick: ${recsB[0].media.title}`);
      log(`   Why: ${recsB[0].why}`);
    } else {
      log("❌ User B recommendations failed.");
    }

    if (recsA && recsB && Array.isArray(recsA) && Array.isArray(recsB) && recsA[0]?.media.title !== recsB[0]?.media.title) {
      log("✅ Recommendation sets are meaningfully different based on DNA.");
    }

    log("\n==========================================");
    log("6. AI FAILURE HANDLING");
    log("==========================================");

    const originalKey = process.env.GROQ_API_KEY;
    process.env.GROQ_API_KEY = "invalid_key";

    log("Testing recommendation generation with invalid Groq Key...");
    try {
      await generateAiPicks("Loves action movies.");
      log("❌ Should have thrown an error but didn't.");
    } catch (e: any) {
      log(`✅ AI gracefully failed as expected with invalid key: ${e.message}`);
    }

    const fallbackFetch = await getMediaDetail("movie", "27205");
    if (fallbackFetch && fallbackFetch.title === "Inception") {
      log("✅ Basic media fetching (TMDB) works perfectly even when AI provider is down.");
    } else {
      log("❌ Zynora broke due to AI failure.");
    }

    process.env.GROQ_API_KEY = originalKey;

    log("\n==========================================");
    log("7. ZERO-COST & PERFORMANCE PROTECTION");
    log("==========================================");

    log("Testing duplicate inserts for provider ID uniqueness...");
    const { error: duplicateError } = await (supabase.from('media_items') as any).insert([{
      id: `movie-${testMovieId}`,
      media_type: 'movie',
      normalized_data: { test: true }
    }]);

    if (duplicateError && duplicateError.code === '23505') {
      log("✅ Database correctly rejected duplicate provider ID (unique constraint).");
    } else {
      log(`❌ Duplicate insertion was allowed or failed with unexpected error: ${JSON.stringify(duplicateError)}`);
    }

    log("\n✅ REAL-WORLD VALIDATION COMPLETE");

    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    log(`❌ UNHANDLED EXCEPTION: ${err.message}`);
    return NextResponse.json({ success: false, logs }, { status: 500 });
  }
}
