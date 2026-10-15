import { Film, Mail } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

function Footer() {
  const { pathname } = useLocation();

  // The player is a full-screen view; a footer under it only adds a scrollbar.
  if (pathname.startsWith("/watch")) return null;

  return (
    <footer className="w-full shrink-0 border-t border-gray-800 bg-black px-6 py-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Logo & tagline */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="flex items-center gap-2 text-white">
            <Film size={22} />
            <span className="text-lg font-semibold tracking-wide">Hypertube</span>
          </div>
          <p className="text-gray-500 text-sm text-center md:text-left">
            Stream torrents directly in your browser.
          </p>
        </div>

        {/* Links */}
        <nav className="flex flex-wrap justify-center gap-8 text-sm">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors">
            Home
          </Link>
          <Link to="/movies" className="text-gray-400 hover:text-white transition-colors">
            Movies
          </Link>
          <Link to="/series" className="text-gray-400 hover:text-white transition-colors">
            Series
          </Link>
          <a
            href="https://github.com/OthmaneID/hypertube"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors"
          >
            GitHub
          </a>
        </nav>

        {/* Email icon */}
        <div className="flex items-center gap-4">
          <a
            href="mailto:contact@hypertube.app"
            className="text-gray-500 hover:text-white transition-colors"
            aria-label="Email"
          >
            <Mail size={18} />
          </a>
        </div>
      </div>

      {/* Copyright */}
      <div className="max-w-7xl mx-auto mt-6 pt-4 border-t border-gray-800/60 text-center">
        <p className="text-gray-600 text-xs">
          &copy; {new Date().getFullYear()} Hypertube. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
