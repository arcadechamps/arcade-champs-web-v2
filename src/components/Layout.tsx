import Header from "./Header";
import Footer from "./Footer";
import BottomNav from "./BottomNav";
import CookieConsent from "./CookieConsent";

const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen flex-col">
    <Header />
    <main className="flex-1 pb-16 lg:pb-0">{children}</main>
    <Footer />
    <BottomNav />
    <CookieConsent />
  </div>
);

export default Layout;
