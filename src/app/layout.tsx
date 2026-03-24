import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FieldCast - Speak your harvest. Sell it faster.",
  description:
    "FieldCast turns a 30-second harvest voice note into a buyer-ready listing, so direct-market farmers can publish what's available while still in the field.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background text-text antialiased">
        {children}
      </body>
    </html>
  );
}
