import type { Metadata } from "next";
import { Space_Grotesk, Work_Sans } from "next/font/google";
import "./globals.css";
import { TemplateProvider } from "./context/TemplateContext";
import { AuthProvider } from "./context/AuthContext";

const workSans = Work_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GooseNest",
  description:
    "GooseNest helps University of Waterloo students plan degrees, prerequisites, and schedules.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${workSans.variable} ${spaceGrotesk.variable} antialiased font-body`}
      >
        <AuthProvider>
          <TemplateProvider>{children}</TemplateProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
