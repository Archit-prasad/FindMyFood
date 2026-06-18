import { Link, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3 no-print">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-orange-600">
            FindMyFood
          </Link>
          <Link to="/lookup" className="text-sm text-gray-600 hover:text-orange-600">
            Lookup Booking
          </Link>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
