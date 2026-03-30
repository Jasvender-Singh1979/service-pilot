'use client';

import "./globals.css";
import { AppGenProvider } from "@/components/appgen-provider";
import ToastContainer from "@/app/components/ToastContainer";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <title>ServicePilot</title>
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400&display=swap" />
        <script src="https://unpkg.com/@phosphor-icons/web"></script>
        
        {/* Custom App Icons - Service Pilot */}
        <link rel="icon" href="/assets/Service_pilot.png" />
        <link rel="apple-touch-icon" href="/assets/Service_pilot.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ServicePilot" />
        <meta name="theme-color" content="#654321" />
      </head>
      <body className="antialiased">
        <AppGenProvider>
          {children}
          <ToastContainer />
        </AppGenProvider>
      </body>
    </html>
  );
}
