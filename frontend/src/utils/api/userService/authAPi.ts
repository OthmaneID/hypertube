import type { TokenResponse } from "@react-oauth/google";
import { axiosInstance as axios } from "../../axiosInstance";
import type { AuthResponse, User } from "../../interfaces";



export async function emailRegister(username:string, email:string, password:string, firstName: string, lastName: string): Promise<AuthResponse>{
    try {
        const res = await axios.post("/auth/register", { username, email, password, first_name: firstName, last_name: lastName })
        return res.data
    }catch(error:any) {
        return {error: error.message}
    }
}


export async function emailLogin(email: string, password: string): Promise<AuthResponse>{
    try {
        const res = await axios.post("/auth/login", {email,password})
        return res.data
    }catch(error:any){
        return {error: error.message}
    }
}


export async function googleLogin(token: TokenResponse): Promise<AuthResponse>{
    try {

        const res = await axios.post("/auth/google", token)
        return res.data
    }catch(error:any){
        return {error: error.message}
    }
}


// Resolves to null when nobody is logged in
export async function get_current_user(): Promise<User | null> {
    try {
        const res = await axios.get("/auth/me")
        return res.data
    } catch (error: any) {
        throw new Error(error.message)
    }
}


export async function user_logout(): Promise<any> {
    try{
        const res = await axios.post("/auth/logout")
        return res.data
    }catch(error:any) {
        throw new Error(error.message)
    }
}

export async function refresh_token():Promise<any> {
    try{
        const res = await axios.post("/auth/refresh")
        return res.data
    } catch (error: any) {
        throw new Error(error.message)
    }
}


export async function forgot_password(email: string): Promise<any> {
    try {
        const res = await axios.post("/auth/forgot-password", { email })
        return res.data
    } catch (error: any) {
        throw new Error(error.message)
    }
}

export async function reset_password(token: string, newPass: string): Promise<any> {
    try {
        const res = await axios.post("/auth/reset-password", { token, new_pass: newPass })
        return res.data
    } catch (error: any) {
        throw new Error(error.message);
    }
}

export async function verify_email(token: string): Promise<{ message: string; user: User }> {
    const res = await axios.get("/auth/verify-email", { params: { token } });
    return res.data;
}

export async function resend_verification_email(): Promise<{ message: string }> {
    const res = await axios.post("/auth/verify-email/resend");
    return res.data;
}