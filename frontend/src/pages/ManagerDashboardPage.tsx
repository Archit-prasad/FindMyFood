import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { getManagerRestaurant, updateTableStatus, createWalkIn } from "../api";
import type { ManagerRestaurantData, Table, ManagerReservation, CombinableGroup } from "../types";
import FloorPlanSVG from "../components/FloorPlanSVG";

export default function ManagerDashboardPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ManagerRestaurantData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [combinedIds, setCombinedIds] = useState<string[]>([]);

  const refresh = useCallback(() => {
    if (!token) return;
    getManagerRestaurant(token).then(setData).catch(() => setError("Invalid manager link"));
  }, [token]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (error) return <p className="text-red-500 text-center mt-12">{error}</p>;
  if (!data) return <p className="text-gray-400 text-center mt-12">Loading...</p>;

  const linkedReservation = (tableId: string, status: string): ManagerReservation | undefined =>
    data.upcomingReservations.find((r) => r.tables.some((t) => t.tableId === tableId) && r.status === status);

  const matchingGroup = (tableId: string): CombinableGroup | undefined =>
    data.combinableGroups.find((g) => g.tableIds.includes(tableId));

  async function doAction(action: string) {
    if (!token || !selectedTable) return;
    setActionLoading(true);
    try {
      await updateTableStatus(token, selectedTable.id, action);
      setSelectedTable(null);
      refresh();
    } catch (e: any) {
      alert(e.message || "Action failed");
    }
    setActionLoading(false);
  }

  async function doWalkIn(tableIds: string[]) {
    if (!token) return;
    setActionLoading(true);
    try {
      const totalCap = tableIds.reduce((sum, tid) => {
        const t = data!.tables.find((x) => x.id === tid);
        return sum + (t?.capacity ?? 0);
      }, 0);
      await createWalkIn(token, { tableIds, partySize: totalCap });
      setSelectedTable(null);
      setCombinedIds([]);
      refresh();
    } catch (e: any) {
      alert(e.message || "Walk-in failed");
    }
    setActionLoading(false);
  }

  function handleTableClick(table: Table) {
    setSelectedTable(table);
    setCombinedIds([]);
  }

  const available = data.tables.filter((t) => t.status === "available").length;
  const occupied = data.tables.filter((t) => t.status === "occupied").length;
  const held = data.tables.filter((t) => t.status === "held").length;

  return (
    <div>
      {(data.restaurant as any).isActive === false && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-4 text-center">
          <p className="text-amber-800 font-semibold">This restaurant is currently inactive</p>
          <p className="text-xs text-amber-600 mt-1">It is hidden from diners. Contact your admin to reactivate.</p>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{data.restaurant.name}</h1>
          <p className="text-sm text-gray-500">Manager Dashboard · auto-refreshing</p>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="text-green-600 font-semibold">{available} open</span>
          <span className="text-amber-600 font-semibold">{held} held</span>
          <span className="text-red-600 font-semibold">{occupied} occupied</span>
        </div>
      </div>

      <div className="flex gap-2 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-green-500" /> Available</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-amber-500" /> Held</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-500" /> Occupied</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Floor plan */}
        <div className="lg:col-span-2">
          <FloorPlanSVG tables={data.tables} onTableClick={handleTableClick} landmarks={data.landmarks} mode="manager" />
        </div>

        {/* Right panel */}
        <div>
          {/* Action panel */}
          {selectedTable && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">Table {selectedTable.tableNumber}</h3>
                  <p className="text-xs text-gray-500">{selectedTable.capacity} seats · {selectedTable.status}</p>
                </div>
                <button onClick={() => setSelectedTable(null)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>

              {selectedTable.status === "available" && (
                <div className="space-y-2">
                  <button
                    onClick={() => doAction("mark_occupied")}
                    disabled={actionLoading}
                    className="w-full bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    Mark Occupied (Walk-in)
                  </button>

                  {/* Combined walk-in option */}
                  {(() => {
                    const group = matchingGroup(selectedTable.id);
                    if (!group) return null;
                    const otherIds = group.tableIds.filter((id) => id !== selectedTable.id);
                    const othersAvailable = otherIds.every((id) => data.tables.find((t) => t.id === id)?.status === "available");
                    if (!othersAvailable) return null;

                    return (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-800 font-medium mb-2">Combined Walk-in (up to {group.combinedCapacity} seats)</p>
                        {otherIds.map((id) => {
                          const t = data.tables.find((x) => x.id === id);
                          return (
                            <label key={id} className="flex items-center gap-2 text-xs mb-1">
                              <input
                                type="checkbox"
                                checked={combinedIds.includes(id)}
                                onChange={(e) => setCombinedIds(e.target.checked ? [...combinedIds, id] : combinedIds.filter((x) => x !== id))}
                                className="accent-blue-600"
                              />
                              Table {t?.tableNumber} ({t?.capacity} seats)
                            </label>
                          );
                        })}
                        {combinedIds.length > 0 && (
                          <button
                            onClick={() => doWalkIn([selectedTable.id, ...combinedIds])}
                            disabled={actionLoading}
                            className="mt-2 w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                          >
                            Seat Combined Walk-in
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {selectedTable.status === "held" && (() => {
                const res = linkedReservation(selectedTable.id, "upcoming");
                return (
                  <div>
                    {res && (
                      <div className="mb-3 p-3 bg-amber-50 rounded-lg text-xs text-gray-700">
                        <p className="font-medium">{res.dinerName}</p>
                        <p>Party of {res.partySize} · {res.durationMinutes} min</p>
                        <p className="text-gray-400">{new Date(res.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => doAction("seat")}
                        disabled={actionLoading}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        Seat
                      </button>
                      <button
                        onClick={() => doAction("no_show")}
                        disabled={actionLoading}
                        className="flex-1 bg-gray-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
                      >
                        No-show
                      </button>
                    </div>
                  </div>
                );
              })()}

              {selectedTable.status === "occupied" && (() => {
                const res = linkedReservation(selectedTable.id, "seated");
                return (
                  <div>
                    {res && (
                      <div className="mb-3 p-3 bg-red-50 rounded-lg text-xs text-gray-700">
                        <p className="font-medium">{res.dinerName}</p>
                        <p>Party of {res.partySize} · {res.durationMinutes} min</p>
                      </div>
                    )}
                    <button
                      onClick={() => doAction("mark_available")}
                      disabled={actionLoading}
                      className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      Mark Available
                    </button>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Upcoming reservations */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Upcoming Reservations</h3>
            {data.upcomingReservations.length === 0 && (
              <p className="text-sm text-gray-400">No upcoming reservations.</p>
            )}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.upcomingReservations.map((r) => (
                <div key={r.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{r.dinerName}</p>
                      <p className="text-xs text-gray-500">
                        Table {r.tables.map((t) => `#${t.tableNumber}`).join(", ")} · {r.partySize} guests
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-700">
                        {new Date(r.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        r.status === "upcoming" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Settings link */}
          <Link to={`/manager/${token}/settings`} className="block mt-4 text-center text-xs text-gray-400 hover:text-gray-600">
            Restaurant Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
