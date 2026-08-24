import { toast } from "react-toast"
import { emailLogin, emailRegister } from "../utils/api/userService/authAPi"
import { AuthContext } from "./authContext"
import { useEffect, useState } from "react"
import type { AuthResponse, User } from "../utils/interfaces"
import { Navigate } from "react-router-dom"


function AuthProvider({ children }: { children: React.ReactNode }) {

    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [loading, setLoading] = useState<boolean>(true)
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
    const params = new URLSearchParams(window.location.search);
    const back_to_url = params.get('back_to') || "/"

    useEffect(() => {
        const token = localStorage.getItem("token")
        if (token && token !== "undefined" && user) {
            setToken(token)
            const user = localStorage.getItem("user")
            setUser(JSON.parse(user))
            setIsAuthenticated(true)
            setLoading(false)
        } else {
            logout()
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
            setUser(data.user)
            localStorage.setItem("user", JSON.stringify(data.user))
            setToken(data.access_token)
            localStorage.setItem("token", data.access_token)
            setIsAuthenticated(true)
            setLoading(false)
            console.log("data : ", data)
            console.log(back_to_url)

            toast.success("Logged in successfully")
            Navigate({ to: back_to_url })
        }).finally(() => {
            setLoading(false)
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
            if (data.access_token) {
                localStorage.setItem("token", data.access_token)
            }
            setUser(data.user)
            localStorage.setItem("user", JSON.stringify(data.user))
            setToken(data.access_token)
            setIsAuthenticated(true)
        }).finally(() => {
            setLoading(false)
        })
    }

    function logout() {
        setUser(null)
        setToken(null)
        setIsAuthenticated(false)
        setLoading(false)
        localStorage.removeItem("token")
        localStorage.removeItem("user")
    }

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    )
}


export default AuthProvider