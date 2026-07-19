import MovieCard from "../MovieCard";
import DummyData from "../../utils/data";

function PopularMovies() {
  return (
    <div className="popular-movies flex flex-col justify-center gap-4 w-[calc(100vw-120px)] h-full px-2">
      <div>
        <h3 className="text-4xl text-white font-semibold">Popular - Movies</h3>
      </div>
      <div className="flex flex-row items-center h-[300px] overflow-auto gap-2 border-b-2 border-gray-600">
        {DummyData.results.map((movie, index) => (
          <MovieCard
            key={index}
            poster={movie.poster_path}
            title={movie.title}
            vote={movie.vote_average}
          />
        ))}
      </div>
    </div>
  );
}

export default PopularMovies;
