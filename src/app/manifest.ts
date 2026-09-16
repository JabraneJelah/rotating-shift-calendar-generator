import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shift Calendar",
    short_name: "Shift Calendar",
    description:
      "Plan rotating day and night shifts with a practical calendar generator.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7faf9",
    theme_color: "#176b64",
    lang: "en",
  };
}
