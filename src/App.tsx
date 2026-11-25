import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AppNotFound } from './components/AppNotFound';
import { HomePage } from './pages/HomePage';
import { AppsCatalogPage } from './pages/AppsCatalogPage';
import { AppDetailPage } from './pages/AppDetailPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { AboutPage } from './pages/AboutPage';
import { ScriptsAndAppsPage } from './pages/ScriptsAndAppsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AppService } from './services/appService';
import { AppItem } from './types/app';

// Component for handling detail view with AppService data lookup and 404 fallback
function AppDetailView({
  slug,
  onNavigate,
}: {
  slug: string;
  onNavigate: (path: string) => void;
}) {
  const { language } = useLanguage();
  const [app, setApp] = useState<AppItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    AppService.getAppBySlug(slug)
      .then(result => {
        if (isMounted) {
          setApp(result);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Error fetching app by slug:', err);
        if (isMounted) {
          setApp(null);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-[#f6cf3f] animate-spin" />
        <span className="text-xs font-mono font-bold text-zinc-300">
          {language === 'uk' ? 'Завантаження інформації про програму...' : 'Loading application details...'}
        </span>
      </div>
    );
  }

  if (!app) {
    return (
      <AppNotFound
        onBackToCatalog={() => onNavigate('/apps')}
        onGoHome={() => onNavigate('/')}
      />
    );
  }

  return <AppDetailPage app={app} onBack={() => onNavigate('/apps')} />;
}

function AppContent() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  // Listen to browser popstate (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    setCurrentPath(path);
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Determine current route
  const renderCurrentView = () => {
    // Detailed app page: /app/:slug
    if (currentPath.startsWith('/app/')) {
      const slug = currentPath.replace('/app/', '').split('/')[0];
      return <AppDetailView slug={slug} onNavigate={navigate} />;
    }

    // Apps catalog
    if (currentPath === '/apps' || currentPath.startsWith('/apps')) {
      return (
        <AppsCatalogPage
          onSelectApp={slug => navigate(`/app/${slug}`)}
        />
      );
    }

    // Scripts & Software page
    if (currentPath === '/scripts' || currentPath.startsWith('/scripts')) {
      return (
        <ScriptsAndAppsPage
          onSelectApp={slug => navigate(`/app/${slug}`)}
        />
      );
    }

    // Projects page
    if (currentPath === '/projects' || currentPath.startsWith('/projects')) {
      return (
        <ProjectsPage
          onSelectApp={slug => navigate(`/app/${slug}`)}
        />
      );
    }

    // Admin Login Page
    if (currentPath === '/admin/login') {
      return (
        <AdminLoginPage
          onLoginSuccess={() => navigate('/admin')}
          onGoHome={() => navigate('/')}
        />
      );
    }

    // Protected Admin Panel
    if (currentPath === '/admin' || currentPath.startsWith('/admin')) {
      return <AdminDashboardPage onGoHome={() => navigate('/')} />;
    }

    // About page
    if (currentPath === '/about' || currentPath.startsWith('/about')) {
      return <AboutPage />;
    }

    // Default Home Page
    return (
      <HomePage
        onNavigate={navigate}
        onSelectApp={slug => navigate(`/app/${slug}`)}
      />
    );
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col poster-canvas-bg transition-colors duration-250">
      <Header currentPath={currentPath} onNavigate={navigate} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6">
        {renderCurrentView()}
      </main>

      <Footer onNavigate={navigate} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}
