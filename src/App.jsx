import HomePage from './pages/HomePage.jsx';

const routes = [
  {
    "pageName": "HomePage",
    "route": "/"
  }
];

export default function App() {
  const currentPath = window.location.pathname;
  const route = routes.find((item) => item.route === currentPath) || routes[0];
  const Page = {
    HomePage: HomePage
  }[route.pageName];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-slate-200 bg-white/90 px-6 py-4">
        <nav className="mx-auto flex max-w-6xl flex-wrap gap-3" aria-label="Site navigation">
          {routes.map((item) => (
            <a key={item.route} className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" href={item.route}>
              {item.route === '/' ? 'Home' : item.route.replace(/^\//, '')}
            </a>
          ))}
        </nav>
      </header>
      <Page />
    </div>
  );
}
