import Layout from "@/components/Layout";
import { PageMeta } from "@/components/PageMeta";
import { Shield, Scale, Zap, Users, Trophy, Gamepad2, Brain, LayoutDashboard, Gift, BarChart, Mail } from "lucide-react";
import { useScrollReveal, staggerDelay } from "@/hooks/useScrollReveal";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function AnimatedCounter({ target, label, icon: Icon, index }: { target: number; label: string; icon: React.ElementType; index: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const revealRef = useScrollReveal<HTMLDivElement>({ variant: "scale-in", delay: staggerDelay(index, 120) });

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const step = Math.ceil(target / 40);
          const timer = setInterval(() => {
            start += step;
            if (start >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(start);
            }
          }, 30);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={revealRef}>
      <div ref={ref} className="text-center">
        <Icon className="mx-auto mb-3 h-8 w-8 text-primary" />
        <div className="font-arcade text-2xl text-primary text-glow-blue md:text-3xl">
          {count.toLocaleString()}+
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

const values = [
  { icon: Scale, title: "Fair Competition", desc: "Every player starts equal. No pay-to-win mechanics, no unfair advantages. Pure skill determines the winner." },
  { icon: Brain, title: "AI Score Detection & Anti-Cheat", desc: "Our advanced AI-powered systems monitor gameplay integrity in real-time, instantly detecting anomalies and ensuring every score submitted is legitimate and earned fairly." },
  { icon: Gift, title: "Play to Earn Reality", desc: "Compete in tournaments to earn real rewards, including cash prizes and gift cards. Your gaming skills finally pay off." },
  { icon: BarChart, title: "Global Leaderboards", desc: "Climb the ranks and make your mark on our competitive leaderboards across dozens of classic arcade titles." },
  { icon: LayoutDashboard, title: "Personal Dashboard", desc: "Track your progress, view your contest history, manage your earnings, and analyze your stats all from a comprehensive personal dashboard." },
  { icon: Zap, title: "Instant Play", desc: "No downloads, no installs. Jump into any game directly in your browser within seconds." },
];

function ValueCard({ icon: Icon, title, desc, index }: { icon: React.ElementType; title: string; desc: string; index: number }) {
  const ref = useScrollReveal<HTMLDivElement>({ variant: "fade-up", delay: staggerDelay(index) });
  return (
    <div ref={ref} className="rounded-lg border border-border/50 bg-card p-6 transition-all hover:neon-border flex flex-col items-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <h3 className="mb-3 font-arcade text-[12px] leading-relaxed text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

const About = () => {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterError, setNewsletterError] = useState("");

  const newsletterRef = useScrollReveal<HTMLDivElement>({ variant: "fade-up" });
  const heroRef = useScrollReveal<HTMLDivElement>({ variant: "fade-up" });
  const valuesHeaderRef = useScrollReveal<HTMLDivElement>({ variant: "fade-up" });
  const statsHeaderRef = useScrollReveal<HTMLDivElement>({ variant: "fade-up" });
  const storyRef = useScrollReveal<HTMLDivElement>({ variant: "fade-left" });

  return (
    <Layout>
      <PageMeta title="About Us" description="Learn about Arcade Champs, the premier platform for competitive retro gaming with fair play and AI anti-cheat protection." />
      
      {/* Hero Section */}
      <section className="bg-grid py-24">
        <div ref={heroRef} className="container max-w-4xl text-center">
          <h1 className="mb-6 font-arcade text-2xl leading-relaxed text-foreground md:text-4xl">
            Skill-Based <span className="text-primary text-glow-blue">Retro Gaming</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed md:text-xl">
            Arcade Champs is the premier platform for competitive retro gaming. We bring back the golden age of arcade games with modern features like AI-powered anti-cheat, play-to-earn rewards, global leaderboards, and a thriving community.
          </p>
        </div>
      </section>

      {/* Story / Context Section */}
      <section className="py-16 bg-secondary/10 border-y border-border/30">
        <div className="container max-w-5xl">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div ref={storyRef}>
              <h2 className="mb-6 font-arcade text-lg text-foreground md:text-xl">
                The Arcade <span className="text-neon-pink text-glow-pink">Revolution</span>
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  We built Arcade Champs because we felt the modern gaming landscape had lost something crucial: the pure, unadulterated thrill of skill-based arcade competition.
                </p>
                <p>
                  Today, we provide a definitive platform where classic gaming meets cutting-edge technology. Our custom-built AI score detection ensures that every match is fair, protecting the integrity of our leaderboards.
                </p>
                <p>
                  Whether you're looking to casually beat your high score from your personalized dashboard or compete in high-stakes tournaments for cash and gift cards, Arcade Champs is your home for retro gaming excellence.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-4">
                <div className="h-40 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Gamepad2 className="h-12 w-12 text-primary opacity-50" />
                </div>
                <div className="h-32 rounded-lg bg-neon-pink/20 border border-neon-pink/30 flex items-center justify-center">
                  <Trophy className="h-10 w-10 text-neon-pink opacity-50" />
                </div>
              </div>
              <div className="flex flex-col gap-4 pt-8">
                <div className="h-32 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
                  <Users className="h-10 w-10 text-accent opacity-50" />
                </div>
                <div className="h-40 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Brain className="h-12 w-12 text-primary opacity-50" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values & Features Section */}
      <section className="py-24">
        <div className="container">
          <div ref={valuesHeaderRef} className="mb-16 text-center">
            <span className="mb-3 inline-block font-arcade text-[10px] text-accent">OUR PLATFORM</span>
            <h2 className="font-arcade text-xl text-foreground md:text-2xl">What We <span className="text-primary text-glow-blue">Offer</span></h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground leading-relaxed text-sm md:text-base">
              Experience the best of both worlds: timeless arcade gameplay enhanced by modern competitive infrastructure and robust reward systems.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {values.map(({ icon, title, desc }, i) => (
              <ValueCard key={title} icon={icon} title={title} desc={desc} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Stats / Counters Section */}
      <section className="border-t border-border/30 bg-secondary/20 py-20">
        <div className="container">
          <div ref={statsHeaderRef} className="mb-12 text-center">
            <span className="mb-3 inline-block font-arcade text-[10px] text-accent">BY THE NUMBERS</span>
            <h2 className="font-arcade text-lg text-foreground md:text-xl">Growing Every <span className="text-neon-pink text-glow-pink">Day</span></h2>
          </div>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <AnimatedCounter target={123250} label="Top Scores" icon={Trophy} index={0} />
            <AnimatedCounter target={290} label="Video Games" icon={Gamepad2} index={1} />
            <AnimatedCounter target={450} label="Active Players" icon={Users} index={2} />
            <AnimatedCounter target={580} label="Contests Held" icon={Zap} index={3} />
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20">
        <div ref={newsletterRef} className="container max-w-xl text-center">
          <Mail className="mx-auto mb-4 h-10 w-10 text-primary" />
          <h2 className="mb-3 font-arcade text-sm text-foreground md:text-base">Get Updated News</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Subscribe to get the latest contest announcements and game releases.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (newsletterLoading) return;
              const trimmed = newsletterEmail.trim().toLowerCase();
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                setNewsletterError("Please enter a valid email address");
                return;
              }
              setNewsletterError("");
              setNewsletterLoading(true);
              const { error } = await supabase.from("newsletter_subscribers").insert({ email: trimmed });
              setNewsletterLoading(false);
              if (error) {
                if (error.code === "23505") {
                  setNewsletterError("You're already subscribed!");
                } else {
                  toast.error("Something went wrong. Please try again.");
                }
                return;
              }
              toast.success("You're subscribed! 🎉");
              setNewsletterEmail("");
              setNewsletterError("");
            }}
            className="flex flex-col gap-2"
          >
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                value={newsletterEmail}
                onChange={(e) => { setNewsletterEmail(e.target.value); if (newsletterError) setNewsletterError(""); }}
                required
                maxLength={255}
                className={`flex-1 rounded-lg border ${newsletterError ? "border-destructive" : "border-border"} bg-secondary/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`}
              />
              <Button type="submit" disabled={newsletterLoading} className="bg-accent text-accent-foreground hover:bg-accent/80 neon-border-pink">
                {newsletterLoading ? "..." : "Subscribe"}
              </Button>
            </div>
            {newsletterError && <p className="text-xs text-destructive text-left">{newsletterError}</p>}
          </form>
        </div>
      </section>
    </Layout>
  );
};

export default About;

