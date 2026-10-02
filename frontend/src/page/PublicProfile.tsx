import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, CircleUserRound, Film, ShieldX, Tv } from "lucide-react";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import Card from "../components/Card";
import { getMovieDetails } from "../utils/api/movieService/moviesApi";
import { getSerieDetails } from "../utils/api/movieService/seriesApi";
import { getUserById } from "../utils/api/userService/userApi";

function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);
  const isValidUserId = Number.isInteger(userId) && userId > 0;

  const profileQuery = useQuery({
    queryKey: ["public-user-profile", userId],
    enabled: isValidUserId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const user = await getUserById(userId);
      const [favoriteMovies, favoriteSeries] = await Promise.all([
        Promise.all((user.favorite_movies ?? []).map(getMovieDetails)),
        Promise.all((user.favorite_series ?? []).map(getSerieDetails)),
      ]);

      return {
        user,
        favoriteMovies: favoriteMovies.filter((movie) => !movie.error),
        favoriteSeries: favoriteSeries.filter((serie) => !serie.error),
      };
    },
  });

  if (!isValidUserId) {
    return (
      <ProfileMessage
        title="Profile not found"
        message="That profile address is invalid."
      />
    );
  }

  if (profileQuery.isPending) {
    return (
      <ProfileMessage
        title="Loading profile"
        message="Fetching profile information and favorites..."
      />
    );
  }

  if (profileQuery.isError) {
    return (
      <ProfileMessage
        title="Profile unavailable"
        message="We couldn't load this profile."
      />
    );
  }

  const { user, favoriteMovies, favoriteSeries } = profileQuery.data;
  const picture = user.picture
    ? user.picture.startsWith("http")
      ? user.picture
      : `${import.meta.env.VITE_BACKEND_URL}${user.picture}`
    : "/Default_pfp.svg";

  return (
    <main className="mx-auto min-h-full w-full max-w-6xl px-5 py-10 text-gray-100 sm:px-8">
      <section className="flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-center">
        <img
          src={picture}
          alt={`${user.username ?? "User"}'s profile`}
          className="h-28 w-28 rounded-full border border-white/15 bg-gray-900 object-cover"
          referrerPolicy="no-referrer"
          onError={(event) => {
            event.currentTarget.src = "/Default_pfp.svg";
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold">
              {[user.first_name, user.last_name].filter(Boolean).join(" ") ||
                user.username}
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-sm ${
                user.is_verified
                  ? "border-emerald-400/30 text-emerald-300"
                  : "border-gray-500/40 text-gray-400"
              }`}
            >
              {user.is_verified ? (
                <BadgeCheck size={16} />
              ) : (
                <ShieldX size={16} />
              )}
              {user.is_verified ? "Verified" : "Not verified"}
            </span>
          </div>
          <p className="mt-1 text-gray-400">@{user.username}</p>
        </div>
      </section>

      <section className="grid gap-x-10 gap-y-5 border-b border-white/10 py-7 sm:grid-cols-2 lg:grid-cols-3">
        <ProfileInfo
          label="Name"
          value={[user.first_name, user.last_name].filter(Boolean).join(" ")}
          icon={<CircleUserRound size={17} />}
        />
        <ProfileInfo
          label="Username"
          value={user.username ? `@${user.username}` : undefined}
          icon={<CircleUserRound size={17} />}
        />
      </section>

      <section className="pt-8">
        <div className="mb-5 flex items-center gap-3">
          <Film size={20} className="text-gray-400" />
          <h2 className="text-xl font-semibold">Favorite movies</h2>
          <span className="text-sm text-gray-500">{favoriteMovies.length}</span>
        </div>
        {favoriteMovies.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-8 sm:justify-start">
            {favoriteMovies.map((movie) => (
              <Card
                key={movie.id}
                url={`/movies/${movie.id}`}
                id={movie.id}
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
            No favorite movies yet.
          </p>
        )}
      </section>

      <section className="pt-10">
        <div className="mb-5 flex items-center gap-3">
          <Tv size={20} className="text-gray-400" />
          <h2 className="text-xl font-semibold">Favorite series</h2>
          <span className="text-sm text-gray-500">{favoriteSeries.length}</span>
        </div>
        {favoriteSeries.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-8 sm:justify-start">
            {favoriteSeries.map((serie) => (
              <Card
                key={serie.id}
                url={`/series/${serie.id}`}
                id={serie.id}
                poster={serie.poster_path}
                title={serie.name}
                vote={serie.vote_average}
                year={serie.first_air_date?.slice(0, 4)}
              />
            ))}
          </div>
        ) : (
          <p className="border-t border-white/10 py-6 text-sm text-gray-400">
            No favorite series yet.
          </p>
        )}
      </section>
    </main>
  );
}

function ProfileInfo({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      {icon && <span className="mt-0.5 text-gray-500">{icon}</span>}
      <div>
        <p className="text-xs uppercase text-gray-500">{label}</p>
        <p className="mt-1 text-sm text-gray-200">{value || "Not provided"}</p>
      </div>
    </div>
  );
}

function ProfileMessage({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold text-gray-100">{title}</h1>
      <p className="mt-2 text-sm text-gray-400">{message}</p>
    </main>
  );
}

export default PublicProfile;
