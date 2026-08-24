import { createContext, useContext } from "react";
import type { AuthContextType } from "../utils/interfaces";

export const AuthContext = createContext({} as AuthContextType)



export const useAuth = () => {
    const ctx = useContext(AuthContext)
    if (!ctx) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return ctx
}


