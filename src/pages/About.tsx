import Layout from "@/components/Layout";
import { PageMeta } from "@/components/PageMeta";
import { Shield, Scale, Zap, Users, Trophy, Gamepad2 } from "lucide-react";
import { useScrollReveal, staggerDelay } from "@/hooks/useScrollReveal";

const values = [
  { icon: Scale, title: "Fair Competition", desc: "Every player starts equal. No pay-to-win mechanics, no unfair advantages. Pure skill determines the winner." },
  { icon: Shield, title: "Anti-Cheat Protection", desc: "Our systems monitor gameplay integrity in real-time, ensuring every score submitted is legitimate and earned." },
  { icon: Users, title: "Community First", desc: "We're built by gamers, for gamers. Our community drives every decision we make." },
  { icon: Zap, title: "Instant Play", desc: "No downloads, no installs. Jump into any game directly in your browser within seconds." },
];

function ValueCard({ icon: Icon, title, desc, index }: { icon: React.ElementType; title: string; desc: string; index: number }) {
  const ref = useScrollReveal<HTMLDivElement>({ variant: "fade-up", delay: staggerDelay(index) });
  return (
    <div ref={ref} className="rounded-lg border border-border/50 bg-card p-6 transition-all hover:neon-border">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mb-2 font-arcade text-[11px] leading-relaxed text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function StatItem({ icon: Icon, num, label, index }: { icon: React.ElementType; num: string; label: string; index: number }) {
  const ref = useScrollReveal<HTMLDivElement>({ variant: "scale-in", delay: staggerDelay(index, 120) });
  return (
    <div ref={ref}>
      <Icon className="mx-auto mb-2 h-6 w-6 text-primary" />
      <div className="font-arcade text-lg text-primary text-glow-blue">{num}</div>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

const About = () => {
  const heroRef = useScrollReveal<HTMLDivElement>({ variant: "fade-up" });
  const valuesHeaderRef = useScrollReveal<HTMLDivElement>({ variant: "fade-up" });

  return (
    <Layout>
      <PageMeta title="About Us" description="Learn about Arcade Champs, the premier platform for competitive retro gaming with fair play and anti-cheat protection." />
      <section className="bg-grid py-20">
        <div ref={heroRef} className="container max-w-3xl text-center">
          <span className="mb-3 inline-block font-arcade text-[10px] text-accent">ABOUT US</span>
          <h1 className="mb-6 font-arcade text-xl leading-relaxed text-foreground md:text-2xl">
            Skill-Based <span className="text-primary text-glow-blue">Retro Gaming</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Arcade Champs is the premier platform for competitive retro gaming. We bring back the golden age of arcade games with modern competitive features, fair play guarantees, and a thriving community.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container">
          <div ref={valuesHeaderRef} className="mb-12 text-center">
            <span className="mb-3 inline-block font-arcade text-[10px] text-accent">OUR VALUES</span>
            <h2 className="font-arcade text-lg text-foreground">What We <span className="text-neon-pink text-glow-pink">Stand For</span></h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {values.map(({ icon, title, desc }, i) => (
              <ValueCard key={title} icon={icon} title={title} desc={desc} index={i} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/30 bg-secondary/20 py-16">
        <div className="container">
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-3">
            {[
              { icon: Gamepad2, num: "120+", label: "Retro Games" },
              { icon: Users, num: "3,200+", label: "Active Players" },
              { icon: Trophy, num: "850+", label: "Contests Completed" },
            ].map(({ icon, num, label }, i) => (
              <StatItem key={label} icon={icon} num={num} label={label} index={i} />
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
