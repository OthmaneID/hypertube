import axios from "axios";


const axiosMovieService = axios.create({
    baseURL: import.meta.env.VITE_MOVIE_SERVICE_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
})



const axiosUserService = axios.create({
    baseURL: import.meta.env.VITE_USER_SERVICE_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
})



export { axiosMovieService, axiosUserService }