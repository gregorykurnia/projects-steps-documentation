import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "AI Build Log", template: "%s · AI Build Log" },
  description: "Models, tokens, cost and time for every step of my AI projects.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const saved = (await cookies()).get("theme")?.value;
  const theme = saved === "dark" || saved === "light" ? saved : "";
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} ${theme}`}>
      <body>
        <AppShell>{children}</AppShell>
        <Toaster
          position="bottom-center"
          toastOptions={{
            classNames: {
              toast: "!rounded-card !border !border-border !bg-surface !text-text !shadow-none",
              actionButton: "!bg-accent !text-on-accent",
            },
          }}
        />
      </body>
    </html>
  );
}
