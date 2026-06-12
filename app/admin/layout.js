'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/logs', label: 'Logs & Reports' },
  { href: '/admin/sites', label: 'Sites & QR Codes' },
  { href: '/admin/contractors', label: 'Contractors' },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();

  if (pathname === '/admin/login') return children;

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    // Full page load so the cleared cookie takes effect immediately.
    window.location.href = '/admin/login';
  }

  return (
    <>
      <nav className="admin-nav">
        <span className="brand">JC Time Clock</span>
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={pathname === n.href ? 'active' : ''}
          >
            {n.label}
          </Link>
        ))}
        <button className="logout" onClick={logout}>Log out</button>
      </nav>
      <main className="admin-main">{children}</main>
    </>
  );
}
