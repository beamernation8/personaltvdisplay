import { createContext, useContext } from 'react'
import { useGoogleAuth } from './useGoogleAuth.js'

/**
 * Single shared Google auth state, accessible from any widget.
 * Wrap the whole app in <AuthProvider> after <GoogleOAuthProvider>.
 */
const AuthContext = createContext({
  token: null,
  profile: null,
  isAuthed: false,
  signIn: () => {},
  signOut: () => {}
})

export function AuthProvider({ children }) {
  const value = useGoogleAuth()
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
