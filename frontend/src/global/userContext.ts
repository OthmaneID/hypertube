import { createContext } from "react";
import type { User } from "../utils/interfaces";

export const UserContext = createContext({
    user: null as User | null,
    setUser : (user: User) =>{}
})
