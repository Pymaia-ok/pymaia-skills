import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  hreflang?: Record<string, string>; // e.g. { es: url, en: url }
  geoRegion?: string; // e.g. "419" for LATAM, "US", "ES"
  aiDescription?: string;
  aiContentType?: string;
}

export function useSEO({ title, description, canonical, ogImage, jsonLd, hreflang, geoRegion, aiDescription, aiContentType }: SEOProps) {
  useEffect(() => {
    const suffix = " | Pymaia Skills";

    if (title) {
      document.title = title.length > 50 ? title : title + suffix;
    }

    const setMeta = (attr: string, key: string, value: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", value);
    };

    if (description) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
      setMeta("name", "twitter:description", description);
    }

    if (title) {
      setMeta("property", "og:title", title);
      setMeta("name", "twitter:title", title);
    }

    if (ogImage) {
      setMeta("property", "og:image", ogImage);
      setMeta("name", "twitter:image", ogImage);
    }

    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonical);
    }

    // Hreflang tags
    if (hreflang) {
      // Remove old hreflang links
      document.querySelectorAll('link[data-seo-hreflang]').forEach(el => el.remove());
      Object.entries(hreflang).forEach(([lang, url]) => {
        const link = document.createElement("link");
        link.setAttribute("rel", "alternate");
        link.setAttribute("hreflang", lang);
        link.setAttribute("href", url);
        link.setAttribute("data-seo-hreflang", "true");
        document.head.appendChild(link);
      });
      // x-default
      const xDefault = document.createElement("link");
      xDefault.setAttribute("rel", "alternate");
      xDefault.setAttribute("hreflang", "x-default");
      xDefault.setAttribute("href", hreflang["en"] || Object.values(hreflang)[0]);
      xDefault.setAttribute("data-seo-hreflang", "true");
      document.head.appendChild(xDefault);
    }

    // Geo region meta
    if (geoRegion) {
      setMeta("name", "geo.region", geoRegion);
    }

    // AI discovery meta tags
    if (aiDescription) {
      setMeta("name", "ai:description", aiDescription);
    }
    if (aiContentType) {
      setMeta("name", "ai:content_type", aiContentType);
    }

    // JSON-LD (supports single object or array)
    if (jsonLd) {
      document.querySelectorAll('script[data-seo-jsonld]').forEach(el => el.remove());
      const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      items.forEach((item, i) => {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.setAttribute("data-seo-jsonld", `true-${i}`);
        script.textContent = JSON.stringify(item);
        document.head.appendChild(script);
      });
    }

    return () => {
      document.querySelectorAll('script[data-seo-jsonld]').forEach(el => el.remove());
      document.querySelectorAll('link[data-seo-hreflang]').forEach(el => el.remove());
    };
  }, [title, description, canonical, ogImage, jsonLd, hreflang, geoRegion, aiDescription, aiContentType]);
}
