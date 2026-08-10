import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Whisker Tracker",
  description: "Cat colony management for rescue teams and caretakers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
