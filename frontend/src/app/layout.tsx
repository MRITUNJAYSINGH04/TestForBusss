import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "God's Eye for Business — Global Enterprise Intelligence",
  description:
    'AI-driven global enterprise reconnaissance and lead-generation console on an interactive 3D CesiumJS globe.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full w-full overflow-hidden">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/cesium/Widgets/widgets.css" />
        <script src="/cesium/Cesium.js" async={false} />
      </head>
      <body className="bg-[#0a0a0f] text-[#e8eaed] antialiased overflow-hidden select-none w-screen h-screen m-0 p-0 relative">
        {children}
      </body>
    </html>
  );
}
