import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../global/authContext";
import { useGoogleLogin, type TokenResponse } from "@react-oauth/google";
import { useTranslation } from "react-i18next";

function Register() {
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { register, Glogin } = useAuth();
  const { t } = useTranslation();

  function submit(e: Event) {
    e.preventDefault();
    register(username, email, password, confirmPassword, firstName, lastName);
  }

  const google_login = useGoogleLogin({
    onSuccess: (response: TokenResponse) => {
      Glogin(response);
    },
  });

  return (
    <div className="min-h-screen w-full bg-inherit px-4 py-10 sm:px-6 lg:px-8 flex justify-center ">
      <div className="mx-auto flex w-full max-w-5xl overflow-hidden rounded-4xl border border-white/10 bg-black/40 shadow-2xl backdrop-blur-xl">
        <div className="max-md:hidden flex flex-1 flex-col justify-between bg-gray-900 p-8 sm:p-10 lg:p-12">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {t("register.title")}
            </h1>
            <p className="mt-3 max-w-md text-base leading-7 text-gray-300">
              {t("register.subtitle")}
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-gray-200">
            <p className="font-medium text-white">{t("register.whyTitle")}</p>
            <ul className="mt-2 space-y-1 text-gray-300">
              <li>{t("register.feature1")}</li>
              <li>{t("register.feature2")}</li>
              <li>{t("register.feature3")}</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center bg-[#06010b]/90 p-8 sm:p-10 lg:p-12">
          <div className="w-full max-w-md">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-semibold text-white">{t("register.heading")}</h2>
              <p className="mt-2 text-sm text-gray-400">
                {t("register.subheading")}
              </p>
            </div>

            <form className="space-y-4" onSubmit={(e: any) => submit(e)}>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  {t("register.usernameLabel")}
                </label>
                <input
                  autoComplete="username"
                  type="text"
                  placeholder="username"
                  onChange={(e) => setUsername(e.target.value)}
                  value={username}
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-hidden transition focus:border-white focus:ring-2 focus:ring-white/30"
                />
              </div>
              <span>{usernameError}</span>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  {t("register.firstNameLabel")}
                </label>
                <input
                  autoComplete="given-name"
                  type="text"
                  placeholder="First Name"
                  onChange={(e) => setFirstName(e.target.value)}
                  value={firstName}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-hidden transition focus:border-white focus:ring-2 focus:ring-white/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  {t("register.lastNameLabel")}
                </label>
                <input
                  autoComplete="family-name"
                  type="text"
                  placeholder="Last Name"
                  onChange={(e) => setLastName(e.target.value)}
                  value={lastName}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-hidden transition focus:border-white focus:ring-2 focus:ring-white/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  {t("register.emailLabel")}
                </label>
                <input
                  autoComplete="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-hidden transition focus:border-white focus:ring-2 focus:ring-white/30"
                />
              </div>
              <span>{emailError}</span>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  {t("register.passwordLabel")}
                </label>
                <input
                  autoComplete="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-hidden transition focus:border-white focus:ring-2 focus:ring-white/30"
                />
              </div>
              <span>{passwordError}</span>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  {t("register.confirmPasswordLabel")}
                </label>
                <input
                  autoComplete="new-password"
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
                {t("register.continueBtn")}
              </button>
            </form>

            <p className="mt-4 text-right text-sm">
              <Link
                to="/forgot-password"
                className="text-gray-400 transition hover:text-white"
              >
                {t("register.forgotPassword")}
              </Link>
            </p>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#06010b] px-3 text-xs uppercase tracking-[0.3em] text-gray-500">
                  {t("register.orDivider")}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => google_login()}
                className="w-full cursor-pointer hover:brightness-110 active:scale-110 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-gray-200 transition hover:bg-white/10"
              >
                {t("register.googleBtn")}
              </button>
              <a
                href="/oauth/login/"
                className="w-full flex flex-row flex-nowrap items-center justify-center cursor-pointer hover:brightness-110 active:scale-110 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-gray-200 transition hover:bg-white/10"
              >
                {t("register.continueBtn")} with
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 -200 960 960"
                  width="20"
                  height="20"
                  className="dark:text-white text-black ml-2"
                  style={{ marginLeft: "8px" }}
                >
                  <path
                    fill="white"
                    d="M32 412.6h330.1V578h164.7V279.1H197.3L526.8-51.1H362.1L32 279.1zm565.9-298.4L762.7-51.1H597.9zm164.8 0L597.9 279.1v164.8h164.8V279.1L928 114.2V-51.1H762.7z"
                  ></path>
                  <path fill="white" d="M928 279.1L762.7 443.9H928z"></path>
                </svg>
              </a>
            </div>

            <p className="mt-6 text-center text-sm text-gray-400">
              {t("register.alreadyHaveAccount")}{" "}
              <Link
                to="/signin"
                className="font-medium text-white hover:text-gray-300"
              >
                {t("signIn.heading")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
