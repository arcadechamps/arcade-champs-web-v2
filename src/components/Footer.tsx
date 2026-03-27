import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const Footer = () => (
  <footer className="border-t border-border/50 bg-secondary/30">
    <div className="container py-12">
      <div className="grid gap-8 md:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2 mb-4">
            <img src={logo} alt="Arcade Champs" className="h-9 w-9 object-contain" />
            <span className="font-arcade text-xs text-primary">ARCADE CHAMPS</span>
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The ultimate skill-based retro gaming platform. Compete, play, and win.
          </p>
        </div>

        <div>
          <h4 className="font-arcade text-[10px] text-foreground mb-4">QUICK LINKS</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
            <li><Link to="/about" className="hover:text-primary transition-colors">About</Link></li>
            <li><Link to="/games" className="hover:text-primary transition-colors">Games</Link></li>
            <li><Link to="/contest" className="hover:text-primary transition-colors">Contests</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-arcade text-[10px] text-foreground mb-4">SUPPORT</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Contact Us</a></li>
            <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-arcade text-[10px] text-foreground mb-4">COMMUNITY</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-primary transition-colors">Discord</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Twitter</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">YouTube</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Twitch</a></li>
          </ul>
        </div>
      </div>

      <div className="mt-8 border-t border-border/50 pt-6 text-center text-xs text-muted-foreground">
        © 2026 Arcade Champs. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
