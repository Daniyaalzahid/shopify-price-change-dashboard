import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Price Desk | Bismillah Electronics",
  description: "Internal Shopify price management dashboard — UI preview.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
