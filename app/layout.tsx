import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FontSizeProvider } from "@/contexts/FontSizeContext";
import TrialWarningBanner from "@/components/TrialWarningBanner";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ControlladorIA - Sistema Financeiro",
  description: "Sistema de processamento de documentos financeiros com IA",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${poppins.variable} ${inter.variable} antialiased`}
      >
        <AuthProvider>
          <OrganizationProvider>
            <ThemeProvider>
              <FontSizeProvider>
                <SubscriptionProvider>
                  <TrialWarningBanner />
                  <EmailVerificationBanner />
                  {children}
                </SubscriptionProvider>
              </FontSizeProvider>
            </ThemeProvider>
          </OrganizationProvider>
        </AuthProvider>
        <Toaster position="top-right" richColors closeButton visibleToasts={5} expand={true} />
      </body>
    </html>
  );
}
