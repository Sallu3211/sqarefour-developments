import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Squarefour Developments — Site Finance & Billing",
    short_name: "Squarefour",
    description: "Daily and weekly purchase, labour, and expense tracking with printable bills.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/logo.jpg",
        sizes: "387x386",
        type: "image/jpeg",
      },
      {
        src: "/logo.jpg",
        sizes: "387x386",
        type: "image/jpeg",
        purpose: "maskable",
      },
    ],
  };
}
