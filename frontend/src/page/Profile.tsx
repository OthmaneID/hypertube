import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../global/authContext";
import {
  getUserProfile,
  getUserById,
  updateUserProfile,
  updateProfilePicture,
  changePassword,
} from "../utils/api/userService/userApi";
import { getMovieDetails } from "../utils/api/movieService/moviesApi";
import { getSerieDetails } from "../utils/api/movieService/seriesApi";
import type { User } from "../utils/interfaces";
import {
  User as UserIcon,
  Globe,
  Lock,
  Save,
  Camera,
  X,
  Film,
  Tv,
  History as HistoryIcon,
} from "lucide-react";
import { toast } from "react-toast";
import { nameError, passwordError, usernameError } from "../utils/validation";
import Card from "../components/Card";
import { ContinueWatchingCards, useContinueWatching } from "../components/Home/ContinueWatching";
import ApiAccess from "../components/Profile/ApiAccess";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

function Profile() {
  const { t } = useTranslation();
  const { user: authUser, setUser: setAuthUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    first_name: "",
    last_name: "",
    preferred_language: "en",
  });

  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
  const [updating, setUpdating] = useState(false);
  const isEmailAccount = user?.oauth_provider?.toLowerCase() === "email";
  const profileUserId = user?.id;
  const favoritesQuery = useQuery({
    queryKey: ["profile-favorites", profileUserId],
    enabled: typeof profileUserId === "number",
    queryFn: async () => {
      if (typeof profileUserId !== "number") {
        throw new Error("User ID is unavailable");
      }
      const profile = await getUserById(profileUserId);
      const [favoriteMovies, favoriteSeries] = await Promise.all([
        Promise.all((profile.favorite_movies ?? []).map(getMovieDetails)),
        Promise.all((profile.favorite_series ?? []).map(getSerieDetails)),
      ]);

      return {
        favoriteMovies: favoriteMovies.filter((movie) => !movie.error),
        favoriteSeries: favoriteSeries.filter((serie) => !serie.error),
      };
    },
  });

  const historyQuery = useContinueWatching(50);

  const getProviderLabel = () => {
    switch (user?.oauth_provider?.toLowerCase()) {
      case "google":
        return t("profile.providerGoogle");
      case "42":
        return t("profile.provider42");
      case "email":
        return t("profile.providerEmail");
      default:
        return t("profile.providerUnknown");
    }
  };

  useEffect(() => {
    // Initialize with auth user data if available
    if (authUser) {
      setUser(authUser);
      setFormData({
        username: authUser.username || "",
        first_name: authUser.first_name || "",
        last_name: authUser.last_name || "",
        preferred_language: authUser.preferred_language || "en",
      });
      setLoading(false);
    } else {
      // Fetch from API if no auth user
      fetchUserProfile();
    }
  }, [authUser]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const userData = await getUserProfile();
      setUser(userData);
      setFormData({
        username: userData.username || "",
        first_name: userData.first_name || "",
        last_name: userData.last_name || "",
        preferred_language: userData.preferred_language || "en",
      });
    } catch {
      toast.error(t("profile.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error(t("profile.invalidFileType"));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(t("profile.fileTooLarge"));
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfilePictureUpload = async () => {
    if (!selectedFile) return;

    try {
      setUpdating(true);
      const updatedUser = await updateProfilePicture(selectedFile);
      setUser(updatedUser);
      setAuthUser(updatedUser);
      setPreviewImage(null);
      setSelectedFile(null);
      toast.success(t("profile.pictureUpdated"));
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || "Failed to update profile picture",
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    const invalid =
      usernameError(formData.username) ??
      nameError(formData.first_name) ??
      nameError(formData.last_name);
    if (invalid) {
      toast.error(t(invalid));
      return;
    }

    try {
      setUpdating(true);
      const updatedUser = await updateUserProfile({
        ...formData,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
      });
      setUser(updatedUser);
      setAuthUser(updatedUser);
      i18n.changeLanguage(formData.preferred_language);
      toast.success(t("profile.profileUpdated"));
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t("profile.passwordMismatch"));
      return;
    }

    const weakPassword = passwordError(passwordData.newPassword);
    if (weakPassword) {
      toast.error(t(weakPassword));
      return;
    }

    try {
      setUpdating(true);
      const result = await changePassword(
        isEmailAccount ? passwordData.oldPassword : "",
        passwordData.newPassword,
      );
      // The backend answers 200 with an error field for a wrong current password
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      const updatedUser = user ? { ...user, oauth_provider: "email" } : user;
      setUser(updatedUser);
      if (updatedUser) setAuthUser(updatedUser);
      toast.success(
        isEmailAccount
          ? t("profile.passwordChanged")
          : t("profile.passwordAdded"),
      );
      setPasswordData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to change password");
    } finally {
      setUpdating(false);
    }
  };

  const getProfilePictureUrl = () => {
    if (previewImage) return previewImage;
    if (user?.picture && user.picture !== "Default_pfp.svg") {
      return user.picture.startsWith("http")
        ? user.picture
        : `${import.meta.env.VITE_BACKEND_URL}${user.picture}`;
    }
    return "/default-avatar.svg";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          <span className="text-gray-300">{t("profile.loadingProfile")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-inherit px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold text-white mb-2">
            {t("profile.title")}
          </h1>
          <p className="text-gray-400">
            {t("profile.subtitle")}
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                <img
                  src={getProfilePictureUrl()}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = "/default-avatar.svg";
                  }}
                />
              </div>
              <label
                htmlFor="profile-picture"
                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
              >
                <Camera className="w-8 h-8 text-white" />
              </label>
              <input
                id="profile-picture"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h2 className="text-2xl font-semibold text-white">
                  {user?.first_name} {user?.last_name}
                </h2>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-gray-200">
                  {getProviderLabel()}
                </span>
              </div>
              <p className="text-gray-400">@{user?.username}</p>
              <span className="mb-4 block text-sm text-gray-500">
                {user?.email}
              </span>

              {previewImage && (
                <div className="flex gap-2 justify-center sm:justify-start">
                  <button
                    onClick={handleProfilePictureUpload}
                    disabled={updating}
                    className="px-4 py-2 bg-white text-black rounded-xl font-medium hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {updating ? t("profile.uploadingPicture") : t("profile.savePicture")}
                  </button>
                  <button
                    onClick={() => {
                      setPreviewImage(null);
                      setSelectedFile(null);
                    }}
                    className="px-4 py-2 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    {t("profile.cancel")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-6 py-3 rounded-xl font-medium transition ${
              activeTab === "profile"
                ? "bg-white text-black"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <UserIcon className="w-4 h-4 inline mr-2" />
            {t("profile.tabProfile")}
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`px-6 py-3 rounded-xl font-medium transition ${
              activeTab === "security"
                ? "bg-white text-black"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <Lock className="w-4 h-4 inline mr-2" />
            {t("profile.tabSecurity")}
          </button>
        </div>

        {activeTab === "profile" && (
          <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 sm:p-8">
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    <UserIcon className="w-4 h-4 inline mr-2" />
                    {t("profile.usernameLabel")}
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-hidden transition focus:border-white focus:ring-2 focus:ring-white/30"
                    placeholder="Username"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    {t("profile.firstNameLabel")}
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-hidden transition focus:border-white focus:ring-2 focus:ring-white/30"
                    placeholder="First Name"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    {t("profile.lastNameLabel")}
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-hidden transition focus:border-white focus:ring-2 focus:ring-white/30"
                    placeholder="Last Name"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    <Globe className="w-4 h-4 inline mr-2" />
                    {t("profile.preferredLanguage")}
                  </label>
                  <select
                    value={formData.preferred_language}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preferred_language: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-hidden transition focus:border-white focus:ring-2 focus:ring-white/30"
                  >
                    <option value="en">{t("profile.langEn")}</option>
                    <option value="fr">{t("profile.langFr")}</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 py-3 bg-white text-black rounded-xl font-medium hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {updating ? t("profile.saving") : t("profile.saveChanges")}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "security" && (
          <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 sm:p-8">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">
                <Lock className="w-5 h-5 inline mr-2" />
                {t("profile.changePasswordTitle")}
              </h3>
              <p className="text-gray-400 text-sm">
                {isEmailAccount
                  ? t("profile.changePasswordDescEmail")
                  : t("profile.changePasswordDescOAuth")}
              </p>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-6">
              {isEmailAccount && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    {t("profile.currentPassword")}
                  </label>
                  <input
                    type="password"
                    value={passwordData.oldPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        oldPassword: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-hidden transition focus:border-white focus:ring-2 focus:ring-white/30"
                    placeholder="Enter current password"
                    required
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  {t("profile.newPassword")}
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-hidden transition focus:border-white focus:ring-2 focus:ring-white/30"
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  {t("profile.confirmNewPassword")}
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-hidden transition focus:border-white focus:ring-2 focus:ring-white/30"
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 py-3 bg-white text-black rounded-xl font-medium hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  {updating
                    ? t("profile.saving")
                    : isEmailAccount
                      ? t("profile.changePasswordBtn")
                      : t("profile.addPasswordBtn")}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "security" && <ApiAccess />}

        <section className="mt-10 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl sm:p-8">
          <div className="mb-7 flex items-center gap-3">
            <HistoryIcon size={22} className="text-gray-400" />
            <h2 className="text-2xl font-semibold text-white">{t("profile.watchHistory")}</h2>
            {historyQuery.data && (
              <span className="text-sm text-gray-500">{historyQuery.data.length}</span>
            )}
          </div>
          {historyQuery.isPending ? (
            <p className="text-sm text-gray-400">{t("profile.loadingHistory")}</p>
          ) : historyQuery.isError ? (
            <p className="text-sm text-gray-400">{t("profile.errorHistory")}</p>
          ) : historyQuery.data.length > 0 ? (
            <div className="flex flex-nowrap justify-center gap-x-5 gap-y-8 sm:justify-start w-full overflow-x-auto py-3">
              <ContinueWatchingCards items={historyQuery.data} />
            </div>
          ) : (
            <p className="border-t border-white/10 py-6 text-sm text-gray-400">
              {t("profile.noHistory")}
            </p>
          )}
        </section>

        <section className="mt-10 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl sm:p-8">
          <h2 className="mb-7 text-2xl font-semibold text-white">{t("profile.favoritesTitle")}</h2>
          {favoritesQuery.isPending ? (
            <p className="text-sm text-gray-400">{t("profile.loadingFavorites")}</p>
          ) : favoritesQuery.isError ? (
            <p className="text-sm text-gray-400">
              {t("profile.errorFavorites")}
            </p>
          ) : (
            <>
              <div className="mb-8">
                <div className="mb-5 flex items-center gap-3">
                  <Film size={20} className="text-gray-400" />
                  <h3 className="text-xl font-semibold text-white">
                    {t("profile.favoriteMovies")}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {favoritesQuery.data.favoriteMovies.length}
                  </span>
                </div>
                {favoritesQuery.data.favoriteMovies.length > 0 ? (
                  <div className="flex flex-nowrap justify-center gap-x-5 gap-y-8 sm:justify-start w-full overflow-x-auto">
                    {favoritesQuery.data.favoriteMovies.map((movie) => (
                      <Card
                        key={movie.id}
                        url={`/movies/${movie.id}`}
                        tmdb_id={movie.id}
                        poster={movie.poster_path}
                        title={movie.title}
                        vote={movie.vote_average}
                        year={
                          movie.release_date
                            ? String(movie.release_date).slice(0, 4)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="border-t border-white/10 py-6 text-sm text-gray-400">
                    {t("profile.noFavoriteMovies")}
                  </p>
                )}
              </div>

              <div>
                <div className="mb-5 flex items-center gap-3">
                  <Tv size={20} className="text-gray-400" />
                  <h3 className="text-xl font-semibold text-white">
                    {t("profile.favoriteSeries")}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {favoritesQuery.data.favoriteSeries.length}
                  </span>
                </div>
                {favoritesQuery.data.favoriteSeries.length > 0 ? (
                  <div className="flex flex-nowrap justify-center gap-x-5 gap-y-8 sm:justify-start w-full overflow-x-auto">
                    {favoritesQuery.data.favoriteSeries.map((serie) => (
                      <Card
                        key={serie.id}
                        url={`/series/${serie.id}`}
                        tmdb_id={serie.id}
                        poster={serie.poster_path}
                        title={serie.name}
                        vote={serie.vote_average}
                        year={serie.first_air_date?.slice(0, 4)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="border-t border-white/10 py-6 text-sm text-gray-400">
                    {t("profile.noFavoriteSeries")}
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default Profile;
