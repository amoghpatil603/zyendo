import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Zynora",
  description: "Learn how Zynora handles and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-gradient">
          Privacy Policy
        </h1>
        <p className="mt-4 text-muted-foreground">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      <div className="space-y-12 leading-relaxed text-muted-foreground">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">1. Information We Collect</h2>
          <p>
            When you use Zynora, we may collect the following types of information:
          </p>
          <ul className="list-inside list-disc space-y-2 pl-4">
            <li><strong className="text-foreground">Account Information:</strong> Your email address, display name, and avatar when you sign up.</li>
            <li><strong className="text-foreground">Activity Data:</strong> Your watch history, search history, and interactions with AI recommendations.</li>
            <li><strong className="text-foreground">User Content:</strong> Reviews, ratings, and custom collections you create.</li>
            <li><strong className="text-foreground">AI Preference Data:</strong> The "Entertainment DNA" generated from your preferences to improve our AI Assistant's accuracy.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">2. Cookies and Analytics</h2>
          <p>
            We use standard functional cookies to maintain your login session, save your theme preferences (e.g., dark mode), and remember your AI Assistant chat history. We may also use basic analytics to understand how our features are used so we can improve the platform.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">3. Third-party APIs & External Data</h2>
          <p>
            Zynora acts as an entertainment discovery platform and relies on external providers for metadata. Movie, TV show, and Anime metadata, including posters and backdrops, are provided by third-party services such as <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className="text-primary hover:underline">TMDB (The Movie Database)</a> and MyAnimeList where applicable.
          </p>
          <p>
            Zynora does not share your personal account information or private collections with these third parties.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">4. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, or destruction. However, no internet transmission is entirely secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">5. Your Rights and Data Deletion</h2>
          <p>
            You retain full ownership of the content you create on Zynora. You have the right to access, update, or delete your data at any time. You can permanently delete your account and all associated data from the "Danger Zone" in your Settings page.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">6. Contact Information</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy, please contact us via our community support channels or at privacy@zynora.com.
          </p>
        </section>
      </div>
    </div>
  );
}
