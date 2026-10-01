import { axiosInstance as axios } from "../../axiosInstance";
import type { User } from "../../interfaces";

export async function getUserProfile(): Promise<User> {
    try {
        const res = await axios.get("/user/me");
        return res.data;
    } catch (error: any) {
        console.log("Error while getting user profile:", error.message);
        throw new Error(error.message);
    }
}

export async function updateUserProfile(userUpdate: Partial<User>): Promise<User> {
    try {
        const res = await axios.patch("/user/me", userUpdate);
        return res.data;
    } catch (error: any) {
        console.log("Error while updating user profile:", error.message);
        throw new Error(error.message);
    }
}

export async function updateProfilePicture(file: File): Promise<User> {
    try {
        const formData = new FormData();
        formData.append("file", file);
        
        const res = await axios.patch("/user/me/picture", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return res.data;
    } catch (error: any) {
        console.log("Error while updating profile picture:", error.message);
        throw new Error(error.message);
    }
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<any> {
    try {
        const res = await axios.patch("/user/password-change", {
            old_pass: oldPassword,
            new_pass: newPassword,
        });
        return res.data;
    } catch (error: any) {
        console.log("Error while changing password:", error.message);
        throw new Error(error.message);
    }
}
