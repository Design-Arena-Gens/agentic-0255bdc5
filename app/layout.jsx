export const metadata = {
  title: 'Engineered Elegance ? Tyre Studio',
  description: 'Ultra-premium tyre render with studio lighting',
};

import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
