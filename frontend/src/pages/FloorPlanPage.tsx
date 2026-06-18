import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getTables, getRestaurant, getCombinableGroups, getLandmarks } from "../api";
import type { Table, Restaurant, CombinableGroup, Landmark } from "../types";
import FloorPlanSVG from "../components/FloorPlanSVG";
import BookingModal from "../components/BookingModal";

export default function FloorPlanPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0]!;
  const time = searchParams.get("time") || undefined;

  const today = new Date().toISOString().split("T")[0]!;
  const isToday = date === today;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [groups, setGroups] = useState<CombinableGroup[]>([]);
  const [lms, setLms] = useState<Landmark[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  const refreshTables = useCallback(() => {
    if (!id) return;
    getTables(id, date, time).then(setTables).catch(console.error);
  }, [id, date, time]);

  useEffect(() => {
    if (!id) return;
    getRestaurant(id).then(setRestaurant).catch(console.error);
    getCombinableGroups(id).then(setGroups).catch(console.error);
    getLandmarks(id).then(setLms).catch(console.error);
  }, [id]);

  useEffect(() => {
    refreshTables();
    if (!isToday) return;

    const interval = setInterval(refreshTables, 4000);
    return () => clearInterval(interval);
  }, [refreshTables, isToday]);

  const available = tables.filter((t) => t.status === "available").length;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {restaurant?.name ?? "Loading..."}
        </h1>
        <p className="text-sm text-gray-500">
          {isToday ? "Live floor plan" : `Availability for ${date}`}
          {" · "}
          <span className={available > 0 ? "text-green-600" : "text-red-600"}>
            {available} table{available !== 1 ? "s" : ""} available
          </span>
          {isToday && <span className="text-gray-400"> · auto-refreshing</span>}
        </p>
      </div>

      <div className="flex gap-2 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-green-500" /> Available
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-gray-400 opacity-50" /> Taken
        </span>
      </div>

      <FloorPlanSVG tables={tables} onTableClick={setSelectedTable} landmarks={lms} />

      {selectedTable && id && (
        <BookingModal
          table={selectedTable}
          restaurantId={id}
          date={date}
          isToday={isToday}
          combinableGroups={groups}
          allTables={tables}
          onClose={() => setSelectedTable(null)}
          onBooked={refreshTables}
        />
      )}
    </div>
  );
}
