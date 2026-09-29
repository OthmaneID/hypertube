import { useState, type SubmitEvent } from "react";
import { ArrowLeft, Check, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { forgot_password } from "../utils/api/userService/authAPi";

function ForgotPass() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await forgot_password(email);
      if (response?.message) {
        setIsSent(true);
      } else {
        setError("We couldn't send a reset link right now. Please try again.");
      }
    } catch {
      setError("We couldn't send a reset link right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-inherit px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-center bg-[#06010b]/90 p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-md">
            <Link
              to="/signin"
              className="mb-8 inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to sign in
            </Link>

            {isSent ? (
              <div className="py-4" role="status" aria-live="polite">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
                  <Check size={22} aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-semibold text-white">
                  Check your inbox
                </h2>
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  If an account is associated with{" "}
                  <span className="text-gray-200">{email}</span>, a reset link
                  is on its way.
                </p>
                <button
                  type="button"
                  onClick={() => setIsSent(false)}
                  className="mt-6 text-sm font-medium text-gray-300 underline underline-offset-4 hover:text-white"
                >
                  Send another link
                </button>
              </div>
            ) : (
              <>
                <div className="mb-7">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white">
                    <Mail size={20} aria-hidden="true" />
                  </div>
                  <h2 className="text-2xl font-semibold text-white">
                    Forgot your password?
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Enter your email and we’ll send you a secure link to choose
                    a new password.
                  </p>
                </div>

                <form className="space-y-5" onSubmit={submit}>
                  <div>
                    <label
                      htmlFor="recovery-email"
                      className="mb-2 block text-sm font-medium text-gray-300"
                    >
                      Email address
                    </label>
                    <input
                      id="recovery-email"
                      autoComplete="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-white/40 focus:ring-2 focus:ring-white/15"
                    />
                  </div>

                  {error && (
                    <p className="text-sm leading-5 text-red-300" role="alert">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isSubmitting ? "Sending link..." : "Send reset link"}
                  </button>
                </form>

                <p className="mt-6 text-center text-xs leading-5 text-gray-500">
                  For your security, we won’t reveal whether an email is
                  registered.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPass;
