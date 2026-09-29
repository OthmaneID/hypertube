import { useState, type FormEvent } from "react";
import { ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { reset_password } from "../utils/api/userService/authAPi";

function ResetPass() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError(
        "This reset link is missing its token. Request a new one to continue.",
      );
      return;
    }

    if (password !== confirmPass) {
      setError("Your passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await reset_password(token, password);
      if (response?.message) {
        setMessage(
          "Your password has been updated. You can now sign in with it.",
        );
      } else {
        setError(
          response?.error ||
            "This reset link is invalid or has expired. Request a new one to continue.",
        );
      }
    } catch {
      setError(
        "We couldn't reset your password. Please try again or request a new link.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl backdrop-blur-xl">
        <div className="hidden flex-1 flex-col justify-between bg-gray-900 p-10 md:flex lg:p-12">
          <div>
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white">
              <KeyRound size={22} aria-hidden="true" />
            </div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-400">
              Account recovery
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white lg:text-5xl">
              A fresh start,
              <br />
              one step away.
            </h1>
            <p className="mt-5 max-w-sm text-base leading-7 text-gray-300">
              Choose a new password to get back to your watchlist and everything
              waiting there.
            </p>
          </div>
          <p className="text-sm text-gray-400">
            Your reset link can only be used once.
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center bg-[#06010b]/90 px-6 py-10 sm:p-10 lg:p-12">
          <div className="w-full max-w-md">
            <Link
              to="/signin"
              className="mb-8 inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to sign in
            </Link>

            {message ? (
              <div className="py-4" role="status" aria-live="polite">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
                  <KeyRound size={22} aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-semibold text-white">
                  Password updated
                </h2>
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  {message}
                </p>
                <Link
                  to="/signin"
                  className="mt-7 block w-full rounded-xl bg-white px-4 py-3 text-center font-semibold text-black transition hover:bg-gray-200"
                >
                  Continue to sign in
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-7">
                  <h2 className="text-2xl font-semibold text-white">
                    Set a new password
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Make it something memorable to you, and new to everyone
                    else.
                  </p>
                </div>

                <form className="space-y-5" onSubmit={submit}>
                  <div>
                    <label
                      htmlFor="new-password"
                      className="mb-2 block text-sm font-medium text-gray-300"
                    >
                      New password
                    </label>
                    <div className="relative">
                      <input
                        id="new-password"
                        autoComplete="new-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter a new password"
                        required
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white outline-none transition placeholder:text-gray-600 focus:border-white/40 focus:ring-2 focus:ring-white/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={
                          showPassword
                            ? "Hide new password"
                            : "Show new password"
                        }
                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-400 transition hover:text-white"
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="confirm-password"
                      className="mb-2 block text-sm font-medium text-gray-300"
                    >
                      Confirm new password
                    </label>
                    <div className="relative">
                      <input
                        id="confirm-password"
                        autoComplete="new-password"
                        type={showConfirmPass ? "text" : "password"}
                        value={confirmPass}
                        onChange={(event) => setConfirmPass(event.target.value)}
                        placeholder="Enter it again"
                        required
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white outline-none transition placeholder:text-gray-600 focus:border-white/40 focus:ring-2 focus:ring-white/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        aria-label={
                          showConfirmPass
                            ? "Hide confirmation password"
                            : "Show confirmation password"
                        }
                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-400 transition hover:text-white"
                      >
                        {showConfirmPass ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm leading-5 text-red-300" role="alert">
                      {error}
                    </p>
                  )}

                  {!token && !error && (
                    <p className="text-sm leading-5 text-gray-400">
                      This link is incomplete.{" "}
                      <Link
                        to="/forgot-password"
                        className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white"
                      >
                        Request a new reset link
                      </Link>
                      .
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || !token}
                    className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? "Updating password..." : "Update password"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default ResetPass;
