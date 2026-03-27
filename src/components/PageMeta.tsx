import { Helmet } from 'react-helmet-async';

const BASE_URL = "https://play.arcadechamps.com";

interface PageMetaProps {
  title: string;
  description?: string;
  schema?: Record<string, any>;
  ogImage?: string;
  canonicalUrl?: string;
}

export function PageMeta({ title, description, schema, ogImage, canonicalUrl }: PageMetaProps) {
  const defaultDescription = "Play fun arcade games, compete in contests, and win prizes on the ultimate retro gaming platform.";
  const desc = description || defaultDescription;

  const fullTitle = title === "Home" 
    ? "Arcade Champs - Skill-Based Retro Gaming"
    : `${title} | Arcade Champs`;

  const resolvedOgImage = ogImage
    ? (ogImage.startsWith("http") ? ogImage : `${BASE_URL}${ogImage}`)
    : `${BASE_URL}/og-image.png`;

  const resolvedCanonical = canonicalUrl
    ? (canonicalUrl.startsWith("http") ? canonicalUrl : `${BASE_URL}${canonicalUrl}`)
    : undefined;

  // Auto-generate a WebPage schema when no custom schema is provided
  const effectiveSchema = schema || {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": fullTitle,
    "description": desc,
    ...(resolvedCanonical ? { "url": resolvedCanonical } : {}),
    "isPartOf": {
      "@type": "WebSite",
      "name": "Arcade Champs",
      "url": BASE_URL,
    },
  };

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />

      {/* Canonical */}
      {resolvedCanonical && <link rel="canonical" href={resolvedCanonical} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={resolvedOgImage} />
      <meta property="og:type" content="website" />
      {resolvedCanonical && <meta property="og:url" content={resolvedCanonical} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={resolvedOgImage} />
      <meta name="twitter:site" content="@ArcadeChamps" />

      {/* JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify(effectiveSchema)}
      </script>
    </Helmet>
  );
}
