import type { Metadata, Viewport } from "next";
import { Manrope, Caveat, Patrick_Hand } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Toaster } from "@/components/ui/toaster";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Notebook handwriting voices for the learning modules (school-paper feel)
const caveat = Caveat({
  variable: "--font-hand",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const patrickHand = Patrick_Hand({
  variable: "--font-note",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Saathy — Learning, with you. | VidhyaSaathy",
  description:
    "Saathy is the AI learning companion of VidhyaSaathy. Grounded in your teacher's notes, personalised to your learning evidence — explain, solve, practise and summarise, step by step.",
  keywords: ["Saathy", "VidhyaSaathy", "AI learning companion", "Class 9", "CBSE", "tutor"],
  authors: [{ name: "VidhyaSaathy" }],
  icons: { icon: "/saathy/logo_vs.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FFF9F5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${caveat.variable} ${patrickHand.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
