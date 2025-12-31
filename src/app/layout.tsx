
import type { Metadata } from "next";
import { PT_Sans, Playfair_Display, Source_Code_Pro, Oswald } from 'next/font/google';
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import Providers from "./providers";


// Font configuration
const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-pt-sans',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair-display',
});

const sourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  variable: '--font-source-code-pro',
});

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-oswald',
});

export const metadata: Metadata = {
  title: "TradeVision",
  description: "Your personal trading journal and analysis tool.",
  manifest: "/manifest.json",
  themeColor: "#F0F5FA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        "font-body antialiased min-h-screen flex flex-col",
        ptSans.variable,
        playfairDisplay.variable,
        sourceCodePro.variable,
        oswald.variable
      )}>
        <Providers>
            {children}
            <Toaster />
        </Providers>
      </body>
    </html>
  );
}
