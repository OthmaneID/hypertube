import "./App.css";
import Sidebar from "./components/Sidebar";

import { BrowserRouter as Router,Routes, Route } from "react-router-dom";
import Home from "./page/Home";
import Settings from "./page/Settings";
import NavBar from "./components/NavBar";

function App() {
  return (
    <div className="bg-gradient-to-tr bg-no-repeat from-[#00071a] to-[#001c64] p-0 m-0 min-h-screen">
      <div className="app flex flex-row justify-start items-start gap-0 w-full h-full">
        <Router>
          <Sidebar />
          <div className="flex flex-col w-full h-full">
            <NavBar/>
            <Routes>
              <Route index path="/" element={<Home />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </Router>

      </div>
    </div>
  );
}

export default App;
