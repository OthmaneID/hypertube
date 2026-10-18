import { axiosInstance as axios } from "../../axiosInstance";
import type { User } from "../../interfaces";

export async function getUserProfile(): Promise<User> {
    try {
        const res = await axios.get("/user/me");
        return res.data;
    } catch (error: any) {
        throw new Error(error.message);
    }
}

export async function getUserById(userId: number): Promise<User> {
    try {
        const res = await axios.get(`/user/${userId}`);
        return res.data;
    } catch (error: any) {
        throw new Error(error.message);
    }
}

export async function updateUserProfile(userUpdate: Partial<User>): Promise<User> {
    try {
        const res = await axios.patch("/user/me", userUpdate);
        return res.data;
    } catch (error: any) {
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
        throw new Error(error.message);
    }
}


export async function addFavorite(id: number, type: "movie" | "series"): Promise<any> {
    try {
        const res = await axios.post(`user/favorites`, {
            favorite_id : id,
            favorite_type : type,
        });
        return res.data;
    } catch (error: any) {
        throw new Error(error.message);
    }
}

export async function removeFavorite(favorite_id: number, favorite_type: "movie" | "series"): Promise<any> {
    try {
        const res = await axios.delete(`user/favorites`, { data: { favorite_id, favorite_type } });
        return res.data;
    } catch (error: any) {
        throw new Error(error.message);
    }

};


export async function updateEmail(email: string): Promise<any> {
    try {
        const res = await axios.patch("/user/email", { email: email });
        return res.data
    } catch (error: any) {
        throw new Error (error.message)
    }
}