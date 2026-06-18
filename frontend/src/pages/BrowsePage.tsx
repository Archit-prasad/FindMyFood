import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRestaurants } from "../api";
import type { Restaurant } from "../types";

const priceTierLabel = (tier: number) => "₹".repeat(tier);

function getDateOptions() {
  const today = new Date();
  return [0, 1, 2].map((offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const label = offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const value = d.toISOString().split("T")[0]!;
    return { label, value };
  });
}

export default function BrowsePage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch] = useState("");
  const [priceFilter, setPriceFilter] = useState<number | null>(null);
  const [sortByPopularity, setSortByPopularity] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getDateOptions()[0]!.value);
  const dateOptions = getDateOptions();

  useEffect(() => {
    getRestaurants().then(setRestaurants).catch(console.error);
  }, []);

  let filtered = restaurants.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );
  if (priceFilter !== null) {
    filtered = filtered.filter((r) => r.priceTier === priceFilter);
  }
  if (sortByPopularity) {
    filtered = [...filtered].sort((a, b) => b.popularityScore - a.popularityScore);
  }

  return (
    <div>
      {/* Date strip */}
      <div className="flex gap-2 mb-4">
        {dateOptions.map((d) => (
          <button
            key={d.value}
            onClick={() => setSelectedDate(d.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              selectedDate === d.value
                ? "bg-orange-600 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:border-orange-400"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search restaurants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <div className="flex gap-1">
          {[1, 2, 3].map((tier) => (
            <button
              key={tier}
              onClick={() => setPriceFilter(priceFilter === tier ? null : tier)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                priceFilter === tier
                  ? "bg-orange-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:border-orange-400"
              }`}
            >
              {priceTierLabel(tier)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSortByPopularity(!sortByPopularity)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
            sortByPopularity
              ? "bg-orange-600 text-white"
              : "bg-white text-gray-700 border border-gray-300 hover:border-orange-400"
          }`}
        >
          Popular first
        </button>
      </div>

      {/* Restaurant cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((r) => (
          <Link
            key={r.id}
            to={`/restaurant/${r.id}?date=${selectedDate}`}
            className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-900">{r.name}</h2>
              <span className="text-sm text-gray-500">{priceTierLabel(r.priceTier)}</span>
            </div>
            <p className="text-sm text-gray-500 mb-1">{r.cuisineType}</p>
            <p className="text-xs text-gray-400 mb-3">{r.address}</p>
            <div className="flex items-center justify-between">
              <span
                className={`text-sm font-semibold px-3 py-1 rounded-full ${
                  r.availableTableCount > 3
                    ? "bg-green-100 text-green-700"
                    : r.availableTableCount > 0
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {r.availableTableCount > 0
                  ? `${r.availableTableCount} table${r.availableTableCount > 1 ? "s" : ""} open`
                  : "Fully booked"}
              </span>
              <span className="text-xs text-gray-400">★ {r.popularityScore}</span>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-400 mt-12">No restaurants found.</p>
      )}
    </div>
  );
}
