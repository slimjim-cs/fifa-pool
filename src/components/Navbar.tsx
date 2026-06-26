'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useStage } from '@/lib/StageContext'

export default function Navbar() {
  const path = usePathname()
  const { stage, setStage } = useStage()

  const links = [
    { href: '/', label: 'Betting' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/audit', label: 'Audit' },
    { href: '/admin', label: 'Admin' },
  ]

  return (
    <nav className="navbar">
      <Link href="/" className="navbar-brand">FIFA Pool</Link>
      <div className="navbar-stage-toggle">
        <button
          className={`stage-pill ${stage === 'group' ? 'active' : ''}`}
          onClick={() => setStage('group')}
        >
          Group
        </button>
        <button
          className={`stage-pill ${stage === 'knockout' ? 'active' : ''}`}
          onClick={() => setStage('knockout')}
        >
          Knockout
        </button>
      </div>
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
