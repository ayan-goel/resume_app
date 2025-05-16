import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/ui/Header";
import { AuthProvider } from "@/lib/AuthContext";
import { SupabaseAuthProvider } from "@/lib/SupabaseAuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Resume Database | Alpha Kappa Psi - Georgia Tech",
  description: "A searchable database of member resumes for Alpha Kappa Psi at Georgia Tech",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <SupabaseAuthProvider>
            <Header />
            <main>{children}</main>
          </SupabaseAuthProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
