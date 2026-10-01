import { toast } from "react-toast";
import {
  emailLogin,
  emailRegister,
  get_current_user,
  googleLogin,
  user_logout,
} from "../utils/api/userService/authAPi";
import { AuthContext } from "./authContext";
import { useCallback, useEffect, useState } from "react";
import type { AuthResponse, User } from "../utils/interfaces";
import type { TokenResponse } from "@react-oauth/google";

function AuthProvider({ children }: { children: React.ReactNode }) {
  const storedUser = localStorage.getItem("user");
  const [user, setUser] = useState<User | null>(storedUser ? JSON.parse(storedUser) : null);

  // const [token, setToken] = useState<string | null>(localStorage.getItem("token") || null)
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const params = new URLSearchParams(window.location.search);
  const back_to_url = params.get("back_to") || "/";

  useEffect(() => {
    get_current_user()
      .then((user: any) => {
        setUser(user);
        localStorage.setItem("user", JSON.stringify(user));
        setIsAuthenticated(true);
        setLoading(false);
      })
      .catch((error: any) => {
        console.log("error : ", error);
        logout();
      });
  }, []);

  function login(email: string, password: string) {
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    emailLogin(email, password)
      .then((data: AuthResponse) => {
        if (data.error) {
          toast.error(data.error);
          setLoading(false);
          return;
        }
        get_current_user().then((userData: any) => {
          setUser(userData);
          localStorage.setItem("user", JSON.stringify(userData));
        });
        setIsAuthenticated(true);
        // setLoading(false)

        toast.success("Logged in successfully");
        window.location.replace(back_to_url);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function Glogin(googleResponse: TokenResponse) {
    googleLogin(googleResponse)
      .then((data) => {
        if (data.error) {
          toast.error(data.error);
          return;
        }
        get_current_user().then((userData: any) => {
          console.log("Glogin user : ", userData);
          setUser(userData);
          localStorage.setItem("user", JSON.stringify(userData));
        });
        setIsAuthenticated(true);
        setLoading(false);

        toast.success("Logged in successfully");
        window.location.replace(back_to_url);
      })
      .catch((error) => {
        console.log("error : ", error);
      });
  }

  function register(
    username: string,
    email: string,
    password: string,
    confirmPassword: string,
    firstName: string,
    lastName: string,
  ) {
    if (!username || !email || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("password and confirm password should be the same");
      return;
    }
    setLoading(true);
    emailRegister(username, email, password, firstName, lastName)
      .then((data: AuthResponse) => {
        if (data.error) {
          toast.error(data.error);
          setLoading(false);
          return;
        }
        get_current_user()
          .then((userData: any) => {
            setUser(userData);
            localStorage.setItem("user", JSON.stringify(userData));
            setIsAuthenticated(true);
          })
          .catch((error) => {
            console.log("error : ", error);
          });
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function logout() {
    setUser(null);
    setIsAuthenticated(false);
    setLoading(false);
    localStorage.removeItem("user");
    user_logout();
  }

  const setUserOverride = useCallback((userData: User) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user: user || undefined,
        isAuthenticated,
        loading,
        login,
        Glogin,
        register,
        logout,
        setUser: setUserOverride,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
