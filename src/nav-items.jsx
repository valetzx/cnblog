import { HomeIcon, FileTextIcon, SettingsIcon, Compass, Link, Globe, Pyramid as Panorama, Film, Database } from 'lucide-react'
import Index from "./pages/Index.jsx";
import Commit from "./pages/Commit.jsx";
import Settings from "./pages/Settings.jsx";
import Info from "./pages/Info.jsx";
import Ideas from "./pages/Ideas.jsx";
import MovieCard from "./pages/movieCard.jsx";
import LongUrlConverter from "@/ptools/LongUrlConverter.jsx";
import WebView from "@/ptools/WebView.jsx";
import OverallView from "@/ptools/OverallView.jsx";
import LocalStorage from "@/ptools/LocalStorage.jsx";

/**
 * Central place for defining the navigation items. Used for navigation components and routing.
 */
export const navItems = [
  {
    title: "Home",
    to: "/",
    icon: <HomeIcon className="h-4 w-4" />,
    page: <Index />,
  },
  {
    title: "Ideas",
    to: "/ideas",
    icon: <Compass className="h-4 w-4" />,
    page: <Ideas />,
  },
  {
    title: "Commit",
    to: "/commit",
    icon: <FileTextIcon className="h-4 w-4" />,
    page: <Commit />,
  },
  {
    title: "Settings",
    to: "/settings",
    icon: <SettingsIcon className="h-4 w-4" />,
    page: <Settings />,
  },
  {
    title: "Info",
    to: "/info/:number",
    icon: <FileTextIcon className="h-4 w-4" />,
    page: <Info />,
  },
  {
    title: "LongUrlConverter",
    to: "/long/:number?",
    icon: <Link className="h-4 w-4" />,
    page: <LongUrlConverter />,
  },
  {
    title: "WebView",
    to: "/webview/:url",
    icon: <Globe className="h-4 w-4" />,
    page: <WebView />,
  },
  {
    title: "OverallView",
    to: "/overallview/:url",
    icon: <Panorama className="h-4 w-4" />,
    page: <OverallView />,
  },
  {
    title: "MovieCard",
    to: "/movie",
    icon: <Film className="h-4 w-4" />,
    page: <MovieCard />,
  },
  {
    title: "LocalStorage",
    to: "/localstorage",
    icon: <Database className="h-4 w-4" />,
    page: <LocalStorage />,
  },
];
