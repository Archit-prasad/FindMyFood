import { useEffect, useState } from "react";
import RestaurantForm from "../components/RestaurantForm";
import type { RestaurantFormData } from "../components/RestaurantForm";
import { adminCreateRestaurant, adminListRestaurants, adminToggleActive, adminDeleteRestaurant } from "../api";

interface AdminRestaurant {
  id: string;
  name: string;
  address: string;
  cuisineType: string;
  isActive: boolean;
  managerAccessToken: string;
}

export default function AdminPage() {
  const [list, setList] = useState<AdminRestaurant[]>([]);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const refreshList = () => {
    adminListRestaurants().then(setList).catch(console.error);
  };

  useEffect(() => { refreshList(); }, []);

  const handleCreate = async (data: RestaurantFormData) => {
    const res = await adminCreateRestaurant({
      name: data.name,
      address: data.address,
      cuisineType: data.cuisineType,
      priceTier: data.priceTier,
      hours: data.hours,
      tables: data.tables,
      menuItems: data.menuItems,
      combinableGroups: data.combinableGroups,
      landmarks: data.landmarks,
    });
    setCreatedToken(res.managerAccessToken);
    setShowForm(false);
    refreshList();
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    await adminToggleActive(id, !currentActive);
    refreshList();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Permanently delete "${name}" and all its data (tables, reservations, menu, reviews)? This cannot be undone.`)) return;
    await adminDeleteRestaurant(id);
    refreshList();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin — Restaurants</h1>

      {/* Restaurant list */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">All Restaurants ({list.length})</h2>
          <button
            onClick={() => { setShowForm(!showForm); setCreatedToken(null); }}
            className="text-sm bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
          >
            {showForm ? "Cancel" : "Add Restaurant"}
          </button>
        </div>

        {list.length === 0 && <p className="text-sm text-gray-400">No restaurants yet.</p>}

        <div className="space-y-3">
          {list.map((r) => (
            <div key={r.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{r.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                    {r.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{r.cuisineType} · {r.address}</p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200 font-mono max-w-[200px] truncate">
                  /manager/{r.managerAccessToken}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/manager/${r.managerAccessToken}`)}
                  className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1"
                  title="Copy full manager link"
                >
                  Copy
                </button>
              </div>

              <button
                onClick={() => handleToggle(r.id, r.isActive)}
                className={`text-xs px-3 py-1 rounded-lg shrink-0 ${r.isActive ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
              >
                {r.isActive ? "Deactivate" : "Reactivate"}
              </button>

              <button
                onClick={() => handleDelete(r.id, r.name)}
                className="text-xs px-3 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 shrink-0"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Created token display */}
      {createdToken && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold text-green-800 mb-2">Restaurant Created!</h2>
          <p className="text-sm text-gray-700 mb-3">Manager dashboard link:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white px-3 py-2 rounded border border-green-300 text-sm font-mono break-all">
              {window.location.origin}/manager/{createdToken}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/manager/${createdToken}`)}
              className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && <RestaurantForm mode="create" onSubmit={handleCreate} />}
    </div>
  );
}
