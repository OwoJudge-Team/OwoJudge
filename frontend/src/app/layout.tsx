import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "OwoJudge",
  description: "(Owo)b Online Judge",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AuthGuard />
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
