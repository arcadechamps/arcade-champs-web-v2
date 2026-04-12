import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";

const Footer = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  return (
    <footer className="border-t border-border/50 bg-secondary/30">
      <div className={`container ${isDashboard ? 'py-6' : 'py-12'}`}>
        {!isDashboard && (
          <div className="flex flex-col md:flex-row flex-wrap justify-center items-center md:items-start gap-12 md:gap-24 text-center">
            <div className="flex flex-col items-center max-w-xs">
              <Link to="/" className="logo-link flex items-center justify-center gap-2 mb-4">
                <img src={logo} alt="Arcade Champs" className="h-9 w-9 object-contain" />
                <span className="logo-text font-arcade text-xs text-primary">ARCADE CHAMPS</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The ultimate skill-based retro gaming platform. Compete, play, and win.
              </p>
            </div>

            <div className="flex flex-col items-center">
              <h4 className="font-arcade text-[10px] text-foreground mb-4">QUICK LINKS</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
                <li><Link to="/about" className="hover:text-primary transition-colors">About</Link></li>
                <li><Link to="/games" className="hover:text-primary transition-colors">Games</Link></li>
                <li><Link to="/contest" className="hover:text-primary transition-colors">Contests</Link></li>
              </ul>
            </div>

            <div className="flex flex-col items-center">
              <h4 className="font-arcade text-[10px] text-foreground mb-4">SUPPORT</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
                <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
                <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              </ul>
            </div>

            <div className="flex flex-col items-center">
              <h4 className="font-arcade text-[10px] text-foreground mb-4">COMMUNITY</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Discord</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">YouTube</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Twitch</a></li>
              </ul>
            </div>
          </div>
        )}

        <div className={`${!isDashboard ? 'mt-8 border-t border-border/50 pt-6' : ''} text-center text-xs text-muted-foreground`}>
          © 2026 Arcade Champs. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
