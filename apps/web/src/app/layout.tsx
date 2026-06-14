import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { BranchProvider } from "@/lib/branch-context";
import { CartProvider } from "@/lib/cart-context";
import { MenuProvider } from "@/lib/menu-context";
import { BannerProvider } from "@/lib/banner-context";
import { ToastProvider } from "@/app/_components/Toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sizzling Hub – Ordering System",
  description: "Sizzling Hub restaurant ordering system",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Preconnect to Supabase Storage for faster image loading */}
        {supabaseUrl && (
          <link rel="preconnect" href={supabaseUrl} crossOrigin="anonymous" />
        )}
        {/* Also preconnect to the CDN origin (supabase.co) */}
        <link rel="preconnect" href="https://supabase.co" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <AuthProvider>
            <BranchProvider>
              <MenuProvider>
                <BannerProvider>
                  <CartProvider>
                    {children}
                  </CartProvider>
                </BannerProvider>
              </MenuProvider>
            </BranchProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
