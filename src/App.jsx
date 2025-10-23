import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { navItems } from "./nav-items";
import Layout from "./components/Layout";
import { ThemeProvider } from 'next-themes';
import { useEffect } from "react";

const queryClient = new QueryClient();

// 注册Service Worker
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('Service Worker registered with scope:', registration.scope);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

// 包装页面组件以包含布局
const withLayout = (Component) => {
  return (
    <Layout>
      <Component />
    </Layout>
  );
};

const App = () => {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" themes={['light', 'dark']}>
        <TooltipProvider>
          <Toaster />
          <HashRouter>
            <Routes>
              {navItems.map(({ to, page }) => (
                <Route key={to} path={to} element={withLayout(() => page)} />
              ))}
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
