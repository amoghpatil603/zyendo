import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use | Zynora",
  description: "Terms and conditions for using the Zynora platform.",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-gradient">
          Terms of Use
        </h1>
        <p className="mt-4 text-muted-foreground">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      <div className="space-y-12 leading-relaxed text-muted-foreground">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing and using Zynora, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to abide by these terms, please do not use this service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">2. Description of Service</h2>
          <p>
            Zynora is an AI-powered entertainment discovery platform. <strong className="text-foreground">Zynora does not host, upload, or stream any copyrighted video content.</strong> We exclusively provide metadata, recommendations, reviews, and links to official streaming providers (like Netflix, Hulu, Prime Video, etc.) based on third-party API data.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">3. User Accounts</h2>
          <p>
            To use certain features like Collections, Reviews, and Watch Together, you must create an account. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">4. Community Guidelines & User Content</h2>
          <p>
            Users can post reviews, ratings, and curate collections. By posting content, you grant Zynora a non-exclusive license to display this content on our platform. 
          </p>
          <p>
            <strong className="text-foreground">Prohibited Activities:</strong> You agree not to post content that is illegal, abusive, harassing, defamatory, or infringes on the intellectual property rights of others. We reserve the right to remove any user-generated content that violates these guidelines and suspend the offending accounts.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">5. AI Features and Watch Together</h2>
          <p>
            Zynora utilizes generative AI to provide recommendations and chat assistance. AI responses are generated automatically and may occasionally be inaccurate.
          </p>
          <p>
            The Watch Together feature synchronizes playback metadata between users. Users are responsible for ensuring they have the legal right or appropriate subscriptions to view the underlying content on the respective official platforms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">6. Intellectual Property & API Usage</h2>
          <p>
            The Zynora brand, design, and original code are the intellectual property of Zynora. Movie and TV show metadata, images, and character information are the property of their respective owners and are provided via third-party APIs (such as TMDB).
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">7. Limitation of Liability</h2>
          <p>
            Zynora is provided on an "as is" and "as available" basis. We make no warranties, expressed or implied, regarding the accuracy, reliability, or availability of the platform or the third-party data it aggregates. In no event shall Zynora be liable for any indirect, incidental, or consequential damages arising from your use of the platform.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">8. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Your continued use of the platform following the posting of changes constitutes your acceptance of such changes.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">9. Contact Information</h2>
          <p>
            For any inquiries regarding these Terms of Use, please contact us at legal@zynora.com.
          </p>
        </section>
      </div>
    </div>
  );
}
