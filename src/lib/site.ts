const LOCAL_SITE_URL = "http://localhost:3000";

function parseSiteUrl(value: string): URL {
  const url = new URL(value);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use http or https.");
  }

  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an origin without a path.");
  }

  return url;
}

export const siteConfig = {
  name: "Shift Calendar",
  description:
    "Plan rotating day and night shifts with a fast, practical calendar generator.",
  url: parseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL ?? LOCAL_SITE_URL),
};
