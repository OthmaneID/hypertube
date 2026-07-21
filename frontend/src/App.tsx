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

function App() {
  return (
    <div className="bg-gradient-to-tr bg-no-repeat from-[#08000e] to-[#1d002e] p-0 m-0 min-h-screen">
      <ImageConfigProvider>
        <div className="flex flex-row gap-0 w-full h-screen">
          <Router>
            <Sidebar />
            <div className="flex flex-col w-full overflow-auto">
              <Routes>
                <Route index path="/" element={<Home />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/movies" element={<Movies />} />
                <Route path="/movies/:id" element={<MovieDetails />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/register" element={<Register />} />
              </Routes>
            </div>
          </Router>
        </div>
      </ImageConfigProvider>
    </div>
  );
}

export default App;
