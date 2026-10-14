import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Genvity",
    short_name: "Genvity",
    description: "Saúde conectada entre médicos, pacientes e farmácias.",
    start_url: "/entrar",
    display: "standalone",
    background_color: "#f4f4f4",
    theme_color: "#9448bd",
    lang: "pt-BR",
    icons: [{ src: "/brand/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
