import { createContext } from "react";
import type { User } from "../utils/interfaces";

export const UserContext = createContext({
    user: {} as User,
    setUser : (user: User) =>{}
})
