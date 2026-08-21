import { createContext } from "react";
import type { AuthState } from "../utils/interfaces";



export const AuthContext = createContext({
    authState: {} as AuthState,
    setAuthState: (authstate:AuthState) => {}
})

