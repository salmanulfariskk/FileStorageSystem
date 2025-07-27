import './globals.css';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'File Storage',
  description: 'A secure file storage system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <Header />
        <main>{children}</main>
        <Toaster position="top-right" />
        <footer className="text-center p-4 bg-gray-100">
          <p className="text-sm text-gray-600">© {new Date().getFullYear()} Secure File Storage. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}