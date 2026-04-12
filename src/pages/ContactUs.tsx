import Layout from "@/components/Layout";
import { PageMeta } from "@/components/PageMeta";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ContactForm } from "@/components/ContactForm";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";

const ContactUs = () => {
  const contentRef = useScrollReveal<HTMLDivElement>({ variant: "fade-up" });

  return (
    <Layout>
      <PageMeta
        title="Contact Us"
        description="Get in touch with the Arcade Champs administration for support, questions, or feedback."
        canonicalUrl="/contact"
      />

      <section className="bg-grid py-20 min-h-[calc(100vh-200px)] flex flex-col justify-center">
        <div ref={contentRef} className="container max-w-lg mx-auto">
          <div className="text-center mb-10">
            <span className="mb-3 inline-block font-arcade text-[10px] text-accent">SUPPORT</span>
            <h1 className="mb-4 font-arcade text-xl leading-relaxed text-foreground md:text-2xl">
              Contact <span className="text-primary text-glow-blue">Us</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Have a question or facing an issue? Send us a message and we'll get back to you.
            </p>
          </div>
          
          <div className="glassy-panel p-6 md:p-8 rounded-xl border border-primary/20 shadow-[0_0_15px_rgba(45,114,210,0.15)] relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 blur-[50px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-accent/20 blur-[50px] rounded-full pointer-events-none" />
            
            <div className="relative z-10">
              <GoogleReCaptchaProvider reCaptchaKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || ""}>
                <ContactForm />
              </GoogleReCaptchaProvider>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ContactUs;
