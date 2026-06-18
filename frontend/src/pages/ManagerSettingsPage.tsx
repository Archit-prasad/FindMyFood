import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import RestaurantForm from "../components/RestaurantForm";
import type { RestaurantFormData } from "../components/RestaurantForm";
import {
  getManagerRestaurant, updateManagerRestaurant, updateManagerTables,
  updateManagerMenu, updateManagerGroups, updateManagerLandmarks,
} from "../api";
import type { ManagerRestaurantData } from "../types";

export default function ManagerSettingsPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ManagerRestaurantData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!token) return;
    getManagerRestaurant(token).then(setData).catch(() => setError("Invalid manager link"));
  }, [token]);

  if (error) return <p className="text-red-500 text-center mt-12">{error}</p>;
  if (!data) return <p className="text-gray-400 text-center mt-12">Loading...</p>;

  const initialData: RestaurantFormData = {
    name: data.restaurant.name,
    address: data.restaurant.address,
    cuisineType: data.restaurant.cuisineType,
    priceTier: data.restaurant.priceTier,
    hours: data.restaurant.hours,
    tables: data.tables.map((t) => ({
      tableNumber: t.tableNumber,
      capacity: t.capacity,
      shape: t.shape,
      xPos: t.xPos,
      yPos: t.yPos,
      rotation: t.rotation,
    })),
    menuItems: data.menuItems.map((m) => ({ name: m.name, price: m.price, category: m.category })),
    combinableGroups: data.combinableGroups.map((g) => ({
      tableIndices: g.tableIds.map((tid) => data.tables.findIndex((t) => t.id === tid)).filter((i) => i >= 0),
      combinedCapacity: g.combinedCapacity,
    })),
    landmarks: data.landmarks.map((l) => ({ type: l.type, xPos: l.xPos, yPos: l.yPos, label: l.label || "" })),
  };

  const handleSubmit = async (formData: RestaurantFormData) => {
    if (!token) return;
    await updateManagerRestaurant(token, {
      name: formData.name, address: formData.address, cuisineType: formData.cuisineType,
      priceTier: formData.priceTier, hours: formData.hours,
    });
    await updateManagerTables(token, formData.tables);
    await updateManagerMenu(token, formData.menuItems);

    // Fetch new table IDs after tables replacement
    const freshData = await getManagerRestaurant(token);
    const freshTableIds = freshData.tables.map((t) => t.id);
    await updateManagerGroups(token,
      formData.combinableGroups.map((g) => ({
        tableIds: g.tableIndices.map((i) => freshTableIds[i]).filter(Boolean),
        combinedCapacity: g.combinedCapacity,
      }))
    );
    await updateManagerLandmarks(token, formData.landmarks);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">{data.restaurant.name}</p>
        </div>
        <Link to={`/manager/${token}`} className="text-sm text-orange-600 hover:text-orange-700">
          Back to Dashboard
        </Link>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">
          Changes saved successfully.
        </div>
      )}

      <RestaurantForm mode="edit" initialData={initialData} onSubmit={handleSubmit} submitLabel="Save All Changes" />
    </div>
  );
}
