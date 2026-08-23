import { useContext, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "react-toast";
import { emailRegister } from "../utils/api/userService/authAPi";
import type { AuthResponse } from "../utils/interfaces";
import { UserContext } from "../global/userContext";


function Register() {
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("")
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState("")
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const { user, setUser } = useContext(UserContext)


  function submit(e: Event) {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error("password and confirm password should be the same")
      setPasswordError("password and confirm password should be the same")
      return
    }
    emailRegister(username, email, password).then((data: AuthResponse) => {
      if (data.error) {
        toast.error(data.error)
        return
      }
      if (data.access_token) {
        localStorage.setItem("accessToken", data.access_token)
      }
      setUser(data.user)
    })
  }


  if (user)
    Navigate({ to: "/" })

  return (
    <div className="min-h-screen w-full bg-inherit px-4 py-10 sm:px-6 lg:px-8 flex justify-center ">
      <div className="mx-auto flex w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-1 flex-col justify-between bg-gray-900 p-8 sm:p-10 lg:p-12">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Welcome
            </h1>
            <p className="mt-3 max-w-md text-base leading-7 text-gray-300">
              Create you account to discover new favorites, build your
              watchlist, and jump straight into your next binge.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-gray-200">
            <p className="font-medium text-white">Why Hypertube?</p>
            <ul className="mt-2 space-y-1 text-gray-300">
              <li>• Curated movie discovery</li>
              <li>• Smart watchlists and saved picks</li>
              <li>• A polished streaming-style experience</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center bg-[#06010b]/90 p-8 sm:p-10 lg:p-12">
          <div className="w-full max-w-md">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-semibold text-white">Register</h2>
              <p className="mt-2 text-sm text-gray-400">
                Create your account to continue
              </p>
            </div>

            <form className="space-y-4" onSubmit={(e: Event) => submit(e)}>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="username"
                  onChange={(e) => setUsername(e.target.value)}
                  value={username}
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-hidden transition focus:border-white focus:ring-2 focus:ring-white/30"
                />
              </div>
              <span>
                {usernameError}
              </span>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-hidden transition focus:border-white focus:ring-2 focus:ring-white/30"
                />
              </div>
              <span>
                {emailError}
              </span>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-hidden transition focus:border-white focus:ring-2 focus:ring-white/30"
                />
              </div>
              <span>
                {passwordError}
              </span>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Confirm password
                </label>
                <input
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-hidden transition focus:border-white focus:ring-2 focus:ring-white/30"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-gray-200"
              >
                Continue
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#06010b] px-3 text-xs uppercase tracking-[0.3em] text-gray-500">
                  or
                </span>
              </div>
            </div>

            {/* add 42 intra auth */}
            <button
              type="button"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-gray-200 transition hover:bg-white/10"
            >
              Continue with Google
            </button>

            <p className="mt-6 text-center text-sm text-gray-400">
              New here?{" "}
              <Link
                to="/signin"
                className="font-medium text-white hover:text-gray-300"
              >
                Already have an account ?
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
