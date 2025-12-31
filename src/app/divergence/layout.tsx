
import React from 'react';

// This layout is now a simple passthrough.
// Each page within the /divergence route will manage its own MainLayout
// to allow for page-specific header content like filter bars.
export default function DivergenceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
