'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { fetchUsers } from './api'

interface User {
  id: number
  username: string
  display_name: string
}

interface UserContextType {
  user: User | null
  setUser: (u: User | null) => void
  users: User[]
  refreshUsers: () => void
}

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  users: [],
  refreshUsers: () => {},
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])

  const refreshUsers = () => {
    fetchUsers().then((res) => setUsers(res.users ?? []))
  }

  useEffect(() => {
    refreshUsers()
  }, [])

  return (
    <UserContext.Provider value={{ user, setUser, users, refreshUsers }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
