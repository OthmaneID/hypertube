import { toast } from "react-toast"
import { emailLogin, emailRegister, get_current_user, googleLogin, user_logout } from "../utils/api/userService/authAPi"
import { AuthContext } from "./authContext"
import { useEffect, useState } from "react"
import type { AuthResponse, User } from "../utils/interfaces"
import { Navigate } from "react-router-dom"
import type { TokenResponse } from "@react-oauth/google"


function AuthProvider({ children }: { children: React.ReactNode }) {

    const [user, setUser] = useState<User | null>(localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null)
    // const [token, setToken] = useState<string | null>(localStorage.getItem("token") || null)
    const [loading, setLoading] = useState<boolean>(true)
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
    const params = new URLSearchParams(window.location.search);
    const back_to_url = params.get('back_to') || "/"

    useEffect(() => {
        if (user) {
            // setToken(token)
            const user = localStorage.getItem("user")
            setUser(JSON.parse(user))
            setIsAuthenticated(true)
            setLoading(false)
        } else {
            get_current_user().then((user) => {
                setUser(user)
                setIsAuthenticated(true)
                setLoading(false)
            }).catch((error: any) => {
                console.log("error : ", error)
                logout()
            })
        }
    }, [])

    function login(email: string, password: string) {
        if (!email || !password) {
            toast.error("Please fill in all fields")
            return
        }
        setLoading(true)
        emailLogin(email, password).then((data: AuthResponse) => {

            if (data.error) {
                toast.error(data.error)
                setLoading(false)
                return
            }
            get_current_user().then((user) => {
                setUser(user)
                localStorage.setItem("user", JSON.stringify(user))
            })
            setIsAuthenticated(true)
            setLoading(false)

            toast.success("Logged in successfully")
            Navigate({ to: back_to_url })
        }).finally(() => {
            setLoading(false)
        })
    }


    function Glogin(googleResponse: TokenResponse) {
        googleLogin(googleResponse).then((data)=>{
            if (data.error) {
                toast.error(data.error)
                return
            }
            get_current_user().then((user: User) => {
                setUser(user)
                localStorage.setItem("user", JSON.stringify(user))
            })
            setIsAuthenticated(true)
            setLoading(false)

            toast.success("Logged in successfully")
            Navigate({ to: back_to_url })
        }).catch((error)=>{
            console.log("error : ", error)
        })
    }

    function register(username: string, email: string, password: string, confirmPassword: string) {

        if (!username || !email || !password || !confirmPassword) {
            toast.error("Please fill in all fields")
            return
        }
        if (password !== confirmPassword) {
            toast.error("password and confirm password should be the same")
            return
        }
        setLoading(true)
        emailRegister(username, email, password).then((data: AuthResponse) => {
            if (data.error) {
                toast.error(data.error)
                setLoading(false)
                return
            }
            get_current_user().then((user) => {
                setUser(user)
                localStorage.setItem("user", JSON.stringify(user))
                setIsAuthenticated(true)
            }).catch((error) => {
                console.log("error : ", error)
            })
        }).finally(() => {
            setLoading(false)
        })
    }

    function logout() {
        setUser(null)
        setIsAuthenticated(false)
        setLoading(false)
        localStorage.removeItem("user")
        user_logout()
    }

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, loading, login, Glogin, register, logout }}>
            {children}
        </AuthContext.Provider>
    )
}


export default AuthProvider