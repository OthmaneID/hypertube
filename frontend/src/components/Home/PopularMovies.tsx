import MovieCard from "../MovieCard";
import DummyData from "../../utils/data";
import { Link } from "react-router-dom";
import { BiChevronRight } from "react-icons/bi";

function PopularMovies() {
  return (
    <div className="popular-movies flex flex-col justify-center gap-4 w-[calc(100vw-120px)] h-full px-2">
      <div className="flex flex-row justify-between items-center px-2">
        <h4 className="text-4xl text-white font-thin">Popular - Movies</h4>
        <Link
          to="/movies&page=1"
          className="text-lg text-gray-400 hover:text-white transition duration-300"
        >
          See All <BiChevronRight className="inline-block ml-1" />
        </Link>
      </div>
      <div className="flex flex-row items-center h-[300px] overflow-auto gap-2 border-b-2 border-gray-600">
        {DummyData.results.map((movie, index) => (
          <MovieCard
            key={index}
            id={movie.id}
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
