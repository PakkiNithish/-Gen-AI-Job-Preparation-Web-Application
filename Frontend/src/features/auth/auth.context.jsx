import { createContext, useState } from 'react'
import { getMe } from './services/auth.api';

export const authContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(false)

    return (
        <authContext.Provider value={{ user, setUser, loading, setLoading }}>
            {children}
        </authContext.Provider>
    )
}