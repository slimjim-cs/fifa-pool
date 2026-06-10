'use client'

import { useState } from 'react'
import { useUser } from '@/lib/UserContext'
import { registerUser } from '@/lib/api'

export default function UserSwitcher() {
  const { user, setUser, users, refreshUsers } = useUser()
  const [showRegister, setShowRegister] = useState(false)
  const [form, setForm] = useState({ username: '', display_name: '' })

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await registerUser(form.username, form.display_name)
    if (res.user) {
      setUser(res.user)
      setForm({ username: '', display_name: '' })
      setShowRegister(false)
      refreshUsers()
    }
  }

  return (
    <div className="user-switcher">
      {user ? (
        <span className="current-user">
          Betting as: <strong>{user.display_name}</strong>
          <button className="change-user-btn" onClick={() => setUser(null)}>Change</button>
        </span>
      ) : users.length > 0 ? (
        <select
          className="user-select"
          onChange={(e) => {
            const u = users.find((u) => u.id === Number(e.target.value))
            setUser(u ?? null)
          }}
          value=""
        >
          <option value="" disabled>Select user...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.display_name}</option>
          ))}
        </select>
      ) : (
        <span className="no-users">No users yet</span>
      )}
      <button className="register-btn" onClick={() => setShowRegister(!showRegister)}>
        + Register
      </button>
      {showRegister && (
        <form className="register-form" onSubmit={handleRegister}>
          <input
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <input
            placeholder="Display name"
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            required
          />
          <button type="submit">Join</button>
        </form>
      )}
    </div>
  )
}
