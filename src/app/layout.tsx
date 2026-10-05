import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/ui/themes";
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});
const space = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  display: "swap",
});
export const metadata: Metadata = {
  title: { default: "Framehouse Studio", template: "%s — Framehouse Studio" },
  description: "A focused home for creative projects and teams.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${space.variable}`}>
      <body>
        <ClerkProvider
          appearance={{
            theme: dark,
            variables: {
              colorPrimary: "#d1fe17",
              colorBackground: "#171a1d",
              borderRadius: "0.75rem",
              fontFamily: "var(--font-inter)",
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
