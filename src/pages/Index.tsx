import { Link, useNavigate } from "react-router-dom";
import { Gamepad2, Trophy, Target, Users, Zap, Star, ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeaturedGamesShowcase } from "@/components/FeaturedGamesShowcase";
import { PageMeta } from "@/components/PageMeta";
import Layout from "@/components/Layout";
import { games as staticGames } from "@/data/games";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Game, ContestGame, Contest as ContestType } from "@/types/database";
import { toast } from "sonner";
import heroBg from "@/assets/hero-bg.jpg";
import community1 from "@/assets/community-1.jpg";
import community2 from "@/assets/community-2.jpg";
import { useEffect, useRef, useState, useCallback } from "react";
import { useScrollReveal, staggerDelay } from "@/hooks/useScrollReveal";
import ContestNotStartedDialog from "@/components/ContestNotStartedDialog";
import { withEffectiveStatus } from "@/utils/contestStatus";

function AnimatedCounter({ target, label }: { target: number; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

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
    <div ref={ref} className="text-center">
      <div className="font-arcade text-2xl text-primary text-glow-blue md:text-3xl">
        {count.toLocaleString()}+
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, index }: { icon: React.ElementType; title: string; desc: string; index: number }) {
  const ref = useScrollReveal<HTMLDivElement>({ variant: "fade-up", delay: staggerDelay(index) });
  return (
    <div ref={ref} className="group rounded-lg border border-border/50 bg-card p-6 text-center transition-all hover:neon-border">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <h3 className="mb-2 font-arcade text-[11px] leading-relaxed text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

const Index = () => {
  const [featuredGames, setFeaturedGames] = useState<Game[]>([]);
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});
  const [topPlayers, setTopPlayers] = useState<Record<string, string>>({});
  const [contestGameMap, setContestGameMap] = useState<Record<string, string>>({});
  const [contestMap, setContestMap] = useState<Record<string, ContestType>>({});
  const [contestDialog, setContestDialog] = useState<{ contestTitle: string; startsAt: string | null; endsAt: string | null; gameSlug: string; variant: "upcoming" | "closed" } | null>(null);
  const [stats, setStats] = useState({ topScores: 0, totalGames: 0, activePlayers: 0, contestsHeld: 0 });
  const [topWinners, setTopWinners] = useState<{ rank: number; name: string; avatar_url: string | null; score: number; game: string; payout: number }[]>([]);
  const [winnersLoading, setWinnersLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterError, setNewsletterError] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Scroll reveal refs
  const heroRef = useScrollReveal<HTMLDivElement>({ variant: "fade-up", delay: 0 });
  const communityTextRef = useScrollReveal<HTMLDivElement>({ variant: "fade-left" });
  const communityImgRef = useScrollReveal<HTMLDivElement>({ variant: "fade-right", delay: 150 });
  const statsRef = useScrollReveal<HTMLDivElement>({ variant: "scale-in" });
  const gamesHeaderRef = useScrollReveal<HTMLDivElement>({ variant: "scale-in" });
  const leaderboardRef = useScrollReveal<HTMLDivElement>({ variant: "fade-up" });
  const newsletterRef = useScrollReveal<HTMLDivElement>({ variant: "fade-up" });

  useEffect(() => {
    // Fetch games, session counts, top players, and contest info in parallel
    const loadData = async () => {
      const [gamesRes, sessionsRes, contestGamesRes, contestsRes] = await Promise.all([
        supabase.from("games").select("*").eq("is_active", true),
        supabase.from("game_sessions").select("game_id"),
        supabase.from("contest_games").select("contest_id, game_id").eq("is_active", true),
        supabase.from("contests").select("*").in("status", ["active", "upcoming"]),
      ]);

      const allGames = (gamesRes.data as unknown as Game[]) ?? [];
      const sessions = sessionsRes.data ?? [];
      const cGames = (contestGamesRes.data as unknown as ContestGame[]) ?? [];
      const contests = ((contestsRes.data as unknown as ContestType[]) ?? []).map(withEffectiveStatus);

      // Count plays per game
      const counts: Record<string, number> = {};
      sessions.forEach((s: any) => { counts[s.game_id] = (counts[s.game_id] || 0) + 1; });
      setPlayCounts(counts);

      // Sort games by most played
      const sorted = [...allGames].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));
      setFeaturedGames(sorted.slice(0, 6));

      // Build contest map: game_id -> contest slug (first active/upcoming)
      const cMap: Record<string, ContestType> = {};
      contests.forEach(c => { cMap[c.id] = c; });
      setContestMap(cMap);

      const cgMap: Record<string, string> = {};
      cGames.forEach(cg => {
        if (cMap[cg.contest_id] && !cgMap[cg.game_id]) {
          cgMap[cg.game_id] = cMap[cg.contest_id].slug;
        }
      });
      setContestGameMap(cgMap);

      // Fetch stats for the counters section
      const [scoresCountRes, uniquePlayersRes, contestsCountRes] = await Promise.all([
        supabase.from("game_sessions").select("id", { count: "exact", head: true }).not("score", "is", null).gt("score", 0),
        supabase.from("game_sessions").select("user_id", { count: "exact", head: true }),
        supabase.from("contests").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        topScores: scoresCountRes.count ?? 0,
        totalGames: allGames.length,
        activePlayers: uniquePlayersRes.count ?? 0,
        contestsHeld: contestsCountRes.count ?? 0,
      });

      // Fetch top player per game (highest score)
      const topScoresRes = await supabase
        .from("game_sessions")
        .select("game_id, score, user_id")
        .not("score", "is", null)
        .order("score", { ascending: false });

      const topScores = topScoresRes.data ?? [];
      const bestPerGame: Record<string, string> = {};
      const userIdsNeeded = new Set<string>();
      topScores.forEach((s: any) => {
        if (!bestPerGame[s.game_id]) {
          bestPerGame[s.game_id] = s.user_id;
          userIdsNeeded.add(s.user_id);
        }
      });

      if (userIdsNeeded.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, username")
          .in("user_id", Array.from(userIdsNeeded));

        const nameMap: Record<string, string> = {};
        (profiles ?? []).forEach((p: any) => {
          nameMap[p.user_id] = p.display_name || p.username || "Anonymous";
        });

        const topPlayerMap: Record<string, string> = {};
        Object.entries(bestPerGame).forEach(([gameId, userId]) => {
          topPlayerMap[gameId] = nameMap[userId] || "Anonymous";
        });
        setTopPlayers(topPlayerMap);
      }

      // Fetch top winners from contest_winners (publicly readable), keeping only one best entry per player
      const { data: topContestWinners } = await supabase
        .from("contest_winners")
        .select("user_id, winning_score, contest_id, payout_cents")
        .gt("winning_score", 0)
        .order("winning_score", { ascending: false })
        .limit(200);

      if (topContestWinners && topContestWinners.length > 0) {
        const bestPerPlayer = new Map<string, typeof topContestWinners[number]>();
        for (const winner of topContestWinners) {
          if (!bestPerPlayer.has(winner.user_id)) {
            bestPerPlayer.set(winner.user_id, winner);
          }
        }

        const uniqueWinners = [...bestPerPlayer.values()].slice(0, 5);
        const winnerUserIds = [...new Set(uniqueWinners.map((winner) => winner.user_id))];
        const winnerContestIds = [...new Set(uniqueWinners.map((winner) => winner.contest_id))];

        const [{ data: winnerProfiles }, { data: winnerContests }] = await Promise.all([
          supabase.rpc("get_display_names", { user_ids: winnerUserIds }),
          supabase.from("contests").select("id, title").in("id", winnerContestIds),
        ]);

        const pMap: Record<string, { name: string; avatar_url: string | null }> = {};
        (winnerProfiles ?? []).forEach((p: any) => { pMap[p.user_id] = { name: p.display_name || p.username || "", avatar_url: p.avatar_url || null }; });
        const contestTitleMap: Record<string, string> = {};
        (winnerContests ?? []).forEach((contest: any) => { contestTitleMap[contest.id] = contest.title; });

        setTopWinners(uniqueWinners.map((winner, i) => ({
          rank: i + 1,
          name: pMap[winner.user_id]?.name || "ArcadeChamps Player",
          avatar_url: pMap[winner.user_id]?.avatar_url || null,
          score: Number(winner.winning_score ?? 0),
          game: contestTitleMap[winner.contest_id] || "Contest",
          payout: Number(winner.payout_cents ?? 0),
        })));
      } else {
        setTopWinners([]);
      }
      setWinnersLoading(false);
    };

    loadData();
  }, []);

  const handleContestClick = useCallback(async (gameSlug: string, contestSlugVal: string) => {
    if (!user) { navigate("/login"); return; }

    const contest = Object.values(contestMap).find(c => c.slug === contestSlugVal);
    if (!contest) { toast.error("Contest not found"); return; }

    if (contest.status === "upcoming") {
      setContestDialog({ contestTitle: contest.title, startsAt: contest.starts_at, endsAt: contest.ends_at, gameSlug, variant: "upcoming" });
      return;
    }

    if (contest.status === "closed") {
      setContestDialog({ contestTitle: contest.title, startsAt: contest.starts_at, endsAt: contest.ends_at, gameSlug, variant: "closed" });
      return;
    }

    // Check if already joined
    const { data: existing } = await supabase
      .from("contest_participants")
      .select("contest_id")
      .eq("contest_id", contest.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      // Join the contest first
      const { error } = await supabase.from("contest_participants").insert({
        contest_id: contest.id,
        user_id: user.id,
      });
      if (error) { toast.error("Failed to join contest: " + error.message); return; }
      toast.success("You've joined the contest!");
    }

    // Fee deduction happens in ContestPlay after the user confirms rules
    navigate(`/contest-play/${contestSlugVal}/${gameSlug}`);
  }, [user, contestMap, navigate, queryClient]);

  const features = [
    { icon: Target, title: "Master Every Game", desc: "Practice and perfect your skills in classic retro games with our free play mode." },
    { icon: Gamepad2, title: "Play More", desc: "Dozens of NES and arcade titles to choose from. New games added weekly." },
    { icon: Trophy, title: "Win More", desc: "Enter skill-based contests and compete for top spots on the leaderboard." },
  ];

  return (
    <Layout>
      <PageMeta
        title="Home"
        description="Play fun arcade games, compete in contests, and win prizes on the ultimate retro gaming platform."
        canonicalUrl="/"
        schema={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Arcade Champs",
          "url": "https://play.arcadechamps.com",
          "logo": "https://play.arcadechamps.com/logo.png",
          "description": "Skill-based retro gaming platform with contests, leaderboards, and prizes.",
          "sameAs": ["https://twitter.com/ArcadeChamps"],
        }}
      />
      {/* Hero */}
      <section className="relative overflow-hidden md:-mt-20 min-h-[80vh]">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>
        <div className="bg-grid relative md:pt-20">
          <div ref={heroRef} className="container flex flex-col items-center justify-center pt-20 pb-16 text-center">
            {/* <span className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
              🎮 Skill-Based Retro Gaming
            </span> */}
            <h1 className="mb-6 max-w-3xl font-arcade text-2xl leading-relaxed text-foreground md:text-4xl lg:text-5xl">
              Play fun <span className="text-primary text-glow-blue">arcade games</span>
            </h1>
            <p className="mb-8 max-w-xl text-lg text-muted-foreground">
              Compete in classic retro games, climb the leaderboards, and win real prizes. Fair play guaranteed.
            </p>
            <div className="flex flex-wrap gap-4 justify-center ">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/80 neon-border gap-2" asChild>
                <Link to="/games">
                  View Games <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-accent text-accent hover:bg-accent/10" asChild>
                <Link to='/contest'>
                  Enter Contest
                </Link>
              </Button>
            </div>

            {/* Quick Hero Previews Grid (3 cards) */}
            <FeaturedGamesShowcase
              games={featuredGames}
              limit={3}
              playCounts={playCounts}
              topPlayers={topPlayers}
              contestGameMap={contestGameMap}
              onContestClick={handleContestClick}
              showAttentionBanner={false}
              showViewAllButton={false}
              className="mt-4"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-border/30 bg-secondary/20 py-20">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Community */}
      <section className="py-20">
        <div className="container">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div ref={communityTextRef}>
              <span className="mb-3 inline-block font-arcade text-[10px] text-accent">OUR COMMUNITY</span>
              <h2 className="mb-4 font-arcade text-lg leading-relaxed text-foreground md:text-xl">
                Best Gaming <span className="text-primary text-glow-blue">Community</span>
              </h2>
              <p className="mb-6 text-muted-foreground leading-relaxed">
                Join thousands of retro gaming enthusiasts competing in fair, skill-based tournaments. Our anti-cheat system ensures every match is legitimate.
              </p>
              <ul className="space-y-3">
                {["Fair Competition Guaranteed", "Anti-Cheat Protection", "Active Discord Community", "Weekly Tournaments"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-foreground">
                    <Zap className="h-4 w-4 text-neon-pink" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div ref={communityImgRef} className="grid grid-cols-2 gap-4">
              <img src={community1} alt="Gaming community" className="rounded-lg border border-border/50 object-cover aspect-square" loading="lazy" />
              <img src={community2} alt="Gaming tournament" className="rounded-lg border border-border/50 object-cover aspect-square mt-8" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/30 bg-secondary/20 py-16">
        <div className="container">
          <div ref={statsRef} className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <AnimatedCounter target={123250} label="Top Scores" />
            <AnimatedCounter target={290} label="Video Games" />
            <AnimatedCounter target={450} label="Active Players" />
            <AnimatedCounter target={580} label="Contests Held" />
          </div>
        </div>
      </section>

      {/* Most Played Games Showcase (Original Lower Location - 6 cards) */}
      <FeaturedGamesShowcase
        games={featuredGames}
        limit={6}
        playCounts={playCounts}
        topPlayers={topPlayers}
        contestGameMap={contestGameMap}
        onContestClick={handleContestClick}
        badge="TOP PICKS"
        title={<h2 className="font-arcade text-lg text-foreground md:text-xl">
          Most Played <span className="text-primary text-glow-blue">Games</span>
        </h2>}
        showAttentionBanner={false}
        showViewAllButton={true}
        className="py-20"
      />

      {/* Leaderboard */}
      <section className="border-t border-border/30 bg-secondary/20 py-20">
        <div ref={leaderboardRef} className="container max-w-2xl">
          <div className="mb-8 text-center">
            <span className="mb-3 inline-block font-arcade text-[10px] text-accent">HALL OF FAME</span>
            <h2 className="font-arcade text-lg text-foreground md:text-xl">
              Top <span className="text-neon-pink text-glow-pink">Winners</span>
            </h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-border/50 bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 text-xs text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">Rank</th>
                  <th className="px-4 py-3 text-left font-medium">Player</th>
                  <th className="px-4 py-3 text-left font-medium">Contest</th>
                  <th className="px-4 py-3 text-right font-medium">Score</th>
                  <th className="px-4 py-3 text-right font-medium">Prize</th>
                </tr>
              </thead>
              <tbody>
                {winnersLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <svg className="h-5 w-5 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-sm">Loading leaderboard…</span>
                      </div>
                    </td>
                  </tr>
                ) : topWinners.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No scores yet. Be the first!</td>
                  </tr>
                ) : topWinners.map((entry) => (
                  <tr key={entry.rank} className="border-b border-border/30 last:border-0 transition-colors hover:bg-primary/5">
                    <td className="px-4 py-4">
                      <span className={`font-arcade text-xs ${entry.rank <= 3 ? "text-neon-pink" : "text-muted-foreground"}`}>
                        #{entry.rank}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-muted">
                          {entry.avatar_url ? (
                            <img src={entry.avatar_url} alt={entry.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
                              {entry.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-foreground">{entry.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">{entry.game}</td>
                    <td className="px-4 py-4 text-right font-arcade text-xs text-primary">{entry.score.toLocaleString()}</td>
                    <td className="px-4 py-4 text-right text-sm font-semibold text-neon-green">{entry.payout > 0 ? `$${(entry.payout / 100).toLocaleString()}` : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      <ContestNotStartedDialog
        open={!!contestDialog}
        onClose={() => setContestDialog(null)}
        contestTitle={contestDialog?.contestTitle ?? ""}
        startsAt={contestDialog?.startsAt ?? null}
        endsAt={contestDialog?.endsAt ?? null}
        gameSlug={contestDialog?.gameSlug ?? null}
        variant={contestDialog?.variant ?? "upcoming"}
      />
    </Layout>
  );
};

function StaggeredGameCard({ game, index, playCounts, topPlayers, contestGameMap, onContestClick }: {
  game: Game; index: number; playCounts: Record<string, number>; topPlayers: Record<string, string>;
  contestGameMap: Record<string, string>; onContestClick: (slug: string, contestSlug: string) => void;
}) {
  const ref = useScrollReveal<HTMLDivElement>({ variant: "fade-up", delay: staggerDelay(index) });
  return (
    <div ref={ref}>
      <GameCard
        slug={game.slug}
        title={game.title}
        thumbnailPath={game.thumbnail_path}
        previewPath={game.preview_path}
        previewEnabled={game.preview_enabled}
        description={game.description}
        playCount={playCounts[game.id] || 0}
        topPlayer={topPlayers[game.id]}
        contestSlug={contestGameMap[game.id]}
        onContestClick={() => contestGameMap[game.id] && onContestClick(game.slug, contestGameMap[game.id])}
      />
    </div>
  );
}

export default Index;
