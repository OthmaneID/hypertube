import PopularMovies from "../components/Home/PopularMovies";
import PopularSeries from "../components/Home/PopularSeries";
import NavBar from "../components/NavBar";

function Home() {
    return (
      <div className="home flex flex-col w-full h-full">
        <NavBar />

        <div className="flex flex-col w-full h-full">
          <PopularMovies />
          <PopularSeries />
        </div>
      </div>
    );
}

export default Home;