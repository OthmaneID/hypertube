import { useEffect, useState } from "react";
import { Check, MailCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../global/authContext";
import {
  resend_verification_email,
  verify_email,
} from "../utils/api/userService/authAPi";
import { useTranslation } from "react-i18next";

function EmailVerification() {
  const { t } = useTranslation();
  const { isAuthenticated, setUser, user } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [isVerifying, setIsVerifying] = useState(Boolean(token));
  const [isVerified, setIsVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    let isCurrent = true;
    setIsVerifying(true);
    verify_email(token)
      .then((response) => {
        if (!isCurrent) return;
        setUser(response.user);
        setIsVerified(true);
      })
      .catch((requestError: any) => {
        if (!isCurrent) return;
        setError(
          requestError?.response?.data?.detail ||
            t("emailVerification.invalidLink"),
        );
      })
      .finally(() => {
        if (isCurrent) setIsVerifying(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [setUser, token]);

  async function resendVerification() {
    setError("");
    setMessage("");
    setIsResending(true);
    try {
      const response = await resend_verification_email();
      setMessage(response.message);
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.detail ||
          t("emailVerification.resendError"),
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <main className="flex min-h-full items-center justify-center px-6 py-16">
      <section className="w-full max-w-lg border border-white/10 bg-white/3 p-8 text-center sm:p-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-amber-300/20 bg-amber-300/10 text-amber-200">
          {isVerified ? (
            <Check size={26} aria-hidden="true" />
          ) : (
            <MailCheck size={26} aria-hidden="true" />
          )}
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-white">
          {isVerifying
            ? t("emailVerification.verifying")
            : isVerified
              ? t("emailVerification.verified")
              : t("emailVerification.verifyPrompt")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-400">
          {isVerifying
            ? t("emailVerification.verifyingDesc")
            : isVerified
              ? t("emailVerification.verifiedDesc")
              : t("emailVerification.unverifiedDesc")}
          {!isVerified && user?.email ? (
            <>
              {" "}
              {t("emailVerification.registeredWith")}{" "}
              <span className="text-gray-200">{user.email}</span>.
            </>
          ) : null}
        </p>
        {error && (
          <p className="mt-4 text-sm text-red-300" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4 text-sm text-emerald-200" role="status">
            {message}
          </p>
        )}

        {!isVerifying && isVerified && (
          <Link
            to={isAuthenticated ? "/" : "/signin"}
            className="mt-7 inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-gray-200"
          >
            {isAuthenticated ? t("emailVerification.continueToHypertube") : t("emailVerification.signIn")}
          </Link>
        )}

        {!isVerifying &&
          !isVerified &&
          isAuthenticated &&
          user?.oauth_provider === "email" && (
            <button
              type="button"
              onClick={resendVerification}
              disabled={isResending}
              className="mt-7 rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-wait disabled:opacity-60"
            >
              {isResending ? t("emailVerification.sending") : t("emailVerification.resendLink")}
            </button>
          )}

        {!isVerifying && !isVerified && !isAuthenticated && (
          <Link
            to="/signin"
            className="mt-7 inline-block text-sm text-gray-300 underline underline-offset-4 hover:text-white"
          >
            {t("emailVerification.backToSignIn")}
          </Link>
        )}
      </section>
    </main>
  );
}

export default EmailVerification;
