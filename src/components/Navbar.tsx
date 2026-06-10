'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const path = usePathname()

  const links = [
    { href: '/', label: 'Betting' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/audit', label: 'Audit' },
    { href: '/admin', label: 'Admin' },
  ]

  return (
    <nav className="navbar">
      <Link href="/" className="navbar-brand">FIFA Pool</Link>
      <div className="navbar-links">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`navbar-link ${path === l.href ? 'active' : ''}`}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
