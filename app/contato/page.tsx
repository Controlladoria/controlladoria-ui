'use client';

import ContactForm from "@/components/ContactForm";
import Sidebar from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";

export default function ContatoPage() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden lg:pt-0">
        {/* Top Nav Bar with Gradient */}
        <div className="hidden lg:block h-2 bg-gradient-to-r from-[#095a5e] via-[#0d767b] to-[#1a9da3] dark:from-[#d15a12] dark:via-[#f86a15] dark:to-[#fa8c4a]"></div>

        <header className="bg-card/80 backdrop-blur-md border-b-2 border-border shadow-lg">
          <div className="px-4 sm:px-6 lg:px-8 pt-16 lg:pt-4 pb-4 sm:py-6">
            <div className="text-center lg:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">📧 Contato</h1>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-1">Entre em contato conosco</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">
            <ContactForm />
          </div>
        </main>
      </div>
    </div>
  );
}
