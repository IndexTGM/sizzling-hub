import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { MenuProvider } from "@/lib/menu-context";
import { BannerProvider } from "@/lib/banner-context";
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
  title: "Ben's Tapsihan – Ordering System",
  description: "Ben's Tapsihan restaurant ordering system",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <MenuProvider>
            <BannerProvider>
              <CartProvider>
                {children}
              </CartProvider>
            </BannerProvider>
          </MenuProvider>
        </AuthProvider>
      </body>
    </html>
  );
}