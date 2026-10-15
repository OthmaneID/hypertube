import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Card from "../Card";
import { getContinueWatching, type ContinueWatchingItem } from "../../utils/api/userService/historyApi";

export function useContinueWatching(limit = 20) {
  return useQuery({
    queryKey: ["continue-watching", limit],
    queryFn: () => getContinueWatching(limit),
    // Coming back from the player must show the new position
    staleTime: 0,
    refetchOnMount: "always",
  });
}

// A finished item opens without a time, so the player starts it over
function resumePath(item: ContinueWatchingItem) {
  const start = Math.floor(item.position);
  if (item.completed || start <= 0) return item.watch_path;
  return `${item.watch_path}${item.watch_path.includes("?") ? "&" : "?"}t=${start}`;
}

export function ContinueWatchingCards({ items }: { items: ContinueWatchingItem[] }) {
  const { t } = useTranslation();

  const subtitleFor = (item: ContinueWatchingItem) => {
    if (item.media_type === "tv") {
      if (item.episode_title) return item.episode_title;
      if (item.season !== null && item.episode !== null) return `S${item.season} E${item.episode}`;
    }
    if (item.completed) return undefined;
    if (item.duration) {
      return t("home.minutesLeft", { count: Math.max(1, Math.round((item.duration - item.position) / 60)) });
    }
    return undefined;
  };

  return (
    <>
      {items.map((item) => (
        <Card
          key={`${item.media_type}-${item.tmdb_id}`}
          url={resumePath(item)}
          tmdb_id={item.tmdb_id}
          poster={item.poster_path ?? undefined}
          title={item.title ?? undefined}
          progress={item.progress}
          subtitle={subtitleFor(item)}
        />
      ))}
    </>
  );
}

function ContinueWatching() {
  const { t } = useTranslation();
  const { data: items } = useContinueWatching();

  if (!items || items.length === 0) return null;

  return (
    <div className="continue-watching flex flex-col py-4 gap-4 w-[calc(100vw-120px)] h-full px-2">
      <div className="flex flex-row justify-between items-center px-2">
        <h4 className="text-4xl text-white font-thin">{t("home.continueWatching")}</h4>
      </div>
      <div className="flex flex-row items-center h-85 shrink-0 overflow-auto gap-2 border-b-2 border-gray-600 px-2">
        <ContinueWatchingCards items={items} />
      </div>
    </div>
  );
}

export default ContinueWatching;
