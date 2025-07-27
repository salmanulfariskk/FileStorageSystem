'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  const showHeader = ['/login', '/register', '/'].includes(pathname);

  if (!showHeader) return null;

  return (
    <header className="py-4 px-4 sm:px-6 lg:px-8 bg-transparent">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/">
          <div className="relative flex items-center space-x-2">
            <Image
              src="/assets/logo.png"
              alt="Secure File Storage Logo"
              width={40}
              height={48}
              className="object-contain"
              priority
            />
            <span className="text-xl font-semibold text-gray-800 hidden sm:inline">
              File Storage
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}