from datetime import date
from typing import Literal

BrowseSort = Literal["popular", "rating", "year", "alpha"]

TMDB_SORTS = {
    "movie": {"popular": "popularity.desc", "rating": "vote_average.desc", "year": "primary_release_date.desc", "alpha": "title.asc"},
    "tv": {"popular": "popularity.desc", "rating": "vote_average.desc", "year": "first_air_date.desc", "alpha": "name.asc"},
}
DATE_FIELDS = {"movie": "primary_release_date", "tv": "first_air_date"}

# Without a vote floor, rating sorts/filters are topped by titles with a single 10/10 vote,
# and A-Z / newest are flooded with obscure entries that have no poster
MIN_VOTES = {"popular": 0, "rating": 200, "year": 10, "alpha": 50}
MIN_VOTES_WITH_RATING_FILTER = 50


def build_discover_params(
    kind: Literal["movie", "tv"],
    sort: BrowseSort | None,
    genre: int | None,
    min_rating: float | None,
    year_from: int | None,
    year_to: int | None,
) -> dict | None:
    """Returns the TMDB /discover params for these options, or None when none is set (plain popular feed)."""
    if not sort and not genre and not min_rating and not year_from and not year_to:
        return None

    sort = sort or "popular"
    date_field = DATE_FIELDS[kind]
    params = {"sort_by": TMDB_SORTS[kind][sort], "include_adult": "false"}

    min_votes = MIN_VOTES[sort]
    if genre:
        params["with_genres"] = genre
    if min_rating:
        params["vote_average.gte"] = min_rating
        min_votes = max(min_votes, MIN_VOTES_WITH_RATING_FILTER)
    if min_votes:
        params["vote_count.gte"] = min_votes
    if year_from:
        params[f"{date_field}.gte"] = f"{year_from}-01-01"

    # "Newest" would otherwise list announced titles that are not out yet
    latest = date.today().isoformat()
    if year_to:
        latest = min(latest, f"{year_to}-12-31")
    if year_to or sort == "year":
        params[f"{date_field}.lte"] = latest
    return params


def discover_cache_key(kind: str, params: dict, page: int, lang: str) -> str:
    options = "_".join(f"{k}={params[k]}" for k in sorted(params))
    return f"discover_{kind}_{options}_{page}_{lang}"
