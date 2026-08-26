import type { TokenResponse } from "@react-oauth/google";
import { axiosUserService as axios } from "../../axiosInstance";
import type { AuthResponse, User } from "../../interfaces";



export async function emailRegister(username:string, email:string, password:string): Promise<AuthResponse>{
    try {
        const res = await axios.post("/auth/register", { username, email, password })
        return res.data
    }catch(error:any) {
        console.log("error while email registering  : ", error.message)
        return {error: error.message}
    }       
}


export async function emailLogin(email: string, password: string): Promise<AuthResponse>{
    try {
        const res = await axios.post("/auth/login", {email,password})
        return res.data
    }catch(error:any){
        console.log("error while login using email : ", error.message)
        return {error: error.message}
    }
}


export async function googleLogin(token: TokenResponse): Promise<AuthResponse>{
    try {

        const res = await axios.post("/auth/google", token)
        return res.data
    }catch(error:any){
        console.log("error while login using google : ", error.message)
        return {error: error.message}
    }
}


export async function get_current_user(): Promise<User> {
    try {
        const res = await axios.get("/auth/me")
        return res.data
    } catch (error: any) {
        console.log("error whle getting current user :", error.message)
        throw new Error(error.message)
    }
}


export async function user_logout(): Promise<any> {
    try{
        const res = await axios.post("/auth/logout")
        return res.data
    }catch(error:any) {
        console.log("error while logging out :", error.message)
        throw new Error(error.message)
    }
}
