import './globals.css';

export const metadata = {
  title: 'JC Commercial Time Clock',
  description: 'Clock in and out at JC Commercial sites',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
