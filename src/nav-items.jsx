import { HomeIcon, FileTextIcon, SettingsIcon, Compass, Link, Globe, Pyramid as Panorama, Film, Database, UserIcon, Swords, ClipboardList, ImageIcon } from 'lucide-react'
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
import User from "./pages/User.jsx";
import Repo from "./pages/Repo.jsx";
import Mission from "./pages/Mission.jsx";
import AiBattle from "./pages/AiBattle.jsx";
import RoleAssignment from "./pages/RoleAssignment.jsx";
import JobPlan from "./pages/JobPlan.jsx";
import Sitemap from "./pages/Sitemap.jsx";
import CnbOrigin from "@/ptools/cnbOrigin.jsx";
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
    title: "Sitemap",
    to: "/sitemap",
    icon: <FileTextIcon className="h-4 w-4" />,
    page: <Sitemap />,
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
    title: "任务拆解",
    to: "/jobplan",
    icon: <ClipboardList className="h-4 w-4" />,
    page: <JobPlan />,
  },
  {
    title: "Settings",
    to: "/settings",
    icon: <SettingsIcon className="h-4 w-4" />,
    page: <Settings />,
  },
  {
    title: "Info",
    to: "/info/:number/*",
    icon: <FileTextIcon className="h-4 w-4" />,
    page: <Info />,
  },
  {
    title: "Info",
    to: "/info/:number",
    icon: <FileTextIcon className="h-4 w-4" />,
    page: <Info />,
  },
  {
    title: "User",
    to: "/user",
    icon: <UserIcon className="h-4 w-4" />,
    page: <User />,
  },
  {
    title: "User",
    to: "/user/:username",
    icon: <UserIcon className="h-4 w-4" />,
    page: <User />,
  },
  {
    title: "Repo",
    to: "/repo/*",
    icon: <FileTextIcon className="h-4 w-4" />,
    page: <Repo />,
  },
  {
    title: "Mission",
    to: "/mission/*",
    icon: <FileTextIcon className="h-4 w-4" />,
    page: <Mission />,
  },
  {
    title: "AI对战",
    to: "/aibattle",
    icon: <Swords className="h-4 w-4" />,
    page: <AiBattle />,
  },
  {
    title: "角色分配",
    to: "/start",
    icon: <Swords className="h-4 w-4" />,
    page: <RoleAssignment />,
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
  {
    title: "CNB Origin",
    to: "/cnbraw/*",
    icon: <ImageIcon className="h-4 w-4" />,
    page: <CnbOrigin />,
  },
];
