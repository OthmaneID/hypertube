import "./App.css";
import Sidebar from "./components/Sidebar";

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./page/Home";
import Settings from "./page/Settings";
import MovieDetails from "./page/MovieDetails";
import { ImageConfigProvider } from "./global/imageConfigProvider";
import Movies from "./page/Movies";
import SignIn from "./page/SignIn";
import Register from "./page/Register";
import Series from "./page/Series";
import SerieDetails from "./page/SerieDetails";
import { UserProvider } from "./global/userProvider";
import { ToastContainer } from "react-toast";

function App() {
  return (
    <div className="bg-black p-0 m-0 min-h-screen">
      <UserProvider>
        <ImageConfigProvider>
          <div className="flex flex-row gap-0 w-full h-screen">
            <Router>
              <Sidebar />
              <div
                className="flex flex-col w-full overflow-y-auto overflow-x-hidden scroll-smooth"
                id="scrollContainer"
              >
                <Routes>
                  <Route index path="/" element={<Home />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/movies" element={<Movies />} />
                  <Route path="/series" element={<Series />} />
                  {/* <Route path="/discover" element={<Discover/>} */}
                  <Route path="/movies/:id" element={<MovieDetails />} />
                  <Route path="/series/:id" element={<SerieDetails />} />
                  <Route path="/signin" element={<SignIn />} />
                  <Route path="/register" element={<Register />} />
                </Routes>
              </div>
            </Router>
          </div>
        </ImageConfigProvider>
      </UserProvider>
      <ToastContainer position="bottom-right" />
    </div>
  );
}

export default App;
