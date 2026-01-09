import './globals.css';
import type { Metadata } from 'next';
import { Zen_Kaku_Gothic_New } from 'next/font/google';
import ClientLogger from './components/ClientLogger';
import ServiceWorkerRegister from './components/ServiceWorkerRegister';

const heading = Zen_Kaku_Gothic_New({
  weight: ['500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading'
});

export const metadata: Metadata = {
  title: 'MyReal – AI×ARで自分だけのゆるキャラ生成＆撮影',
  description:
    '30–60秒で描いた線画からAIがゆるキャラ化。QRで受け取り、会場でWebAR撮影。',
  manifest: '/manifest.json'
};

export const viewport = {
  themeColor: '#101114'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={heading.variable}>
      <body>
        <ClientLogger />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
