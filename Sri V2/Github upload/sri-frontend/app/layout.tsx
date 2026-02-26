import './globals.css';

export const metadata = {
  title: 'SRI — Soluciones Rurales Integradas',
  description: 'Auditoría forense y control de gestión para productores agropecuarios.',
  icons: {
    icon: '/sri_logo_v2.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
