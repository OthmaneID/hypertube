import { axiosUserService as axios } from "../../axiosInstance";
import type { AuthResponse } from "../../interfaces";



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



