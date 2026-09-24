import { Sparkles, Film, Tv, Play, Users, MessageSquare, BookOpen, Star, Sparkle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Zynora",
  description: "Learn more about Zynora, your AI-powered entertainment discovery platform.",
};

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16 sm:py-24">
      {/* Hero Section */}
      <div className="mb-16 flex flex-col items-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 shadow-lg shadow-primary/5">
          <Sparkles className="size-10 text-primary" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-gradient">
          About Zynora
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
          Zynora is a next-generation, AI-powered entertainment discovery platform.
          We help you effortlessly navigate the endless sea of movies, TV shows, and anime to find exactly what you want to watch.
        </p>
      </div>

      {/* Our Mission */}
      <section className="mb-16">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Our Mission</h2>
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm sm:p-8">
          <p className="text-muted-foreground leading-relaxed">
            In an era of overwhelming content fragmentation across dozens of streaming services, finding something good to watch has become harder than watching itself. Our mission is to eliminate decision fatigue by combining powerful AI recommendations, deep metadata, and community-driven features into one seamless, unified hub for all your entertainment needs.
          </p>
        </div>
      </section>

      {/* What Zynora Offers */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-bold tracking-tight text-center">What Zynora Offers</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Sparkle, title: "AI Recommendations", desc: "Get highly personalized picks powered by advanced AI and your unique Entertainment DNA." },
            { icon: Film, title: "Movies", desc: "Discover trending, popular, and highly-rated movies across every imaginable genre." },
            { icon: Tv, title: "TV Shows", desc: "Keep track of your favorite series, upcoming episodes, and binge-worthy hidden gems." },
            { icon: Play, title: "Anime", desc: "Explore a vast database of anime, from seasonal hits to timeless classics." },
            { icon: Users, title: "Watch Together", desc: "Create synchronized watch rooms and enjoy content seamlessly with friends in real-time." },
            { icon: MessageSquare, title: "Community & Reviews", desc: "Read, write, and share reviews with a passionate community of entertainment lovers." },
            { icon: BookOpen, title: "Collections", desc: "Curate and share your own custom lists of movies and shows." },
            { icon: Star, title: "Entertainment DNA", desc: "A living profile of your unique tastes, adapting as you discover more content." },
          ].map((feature, i) => (
            <div key={i} className="glass rounded-xl border border-border/40 p-5 transition-transform hover:-translate-y-1">
              <feature.icon className="mb-3 size-6 text-primary" />
              <h3 className="mb-2 font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Zynora */}
      <section className="mb-16 text-center">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Why Zynora?</h2>
        <p className="mx-auto max-w-2xl text-muted-foreground leading-relaxed">
          Unlike traditional discovery engines, Zynora actually listens to you. Through our conversational AI Assistant and deep preference learning, Zynora understands nuance—like when you want "a visually stunning sci-fi that isn't too dark" or "a 90s comedy for movie night." It's not just a database; it's your personal movie buff friend.
        </p>
      </section>
    </div>
  );
}
