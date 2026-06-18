import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createReservation } from "../api";
import type { Table, CombinableGroup } from "../types";

interface Props {
  table: Table;
  restaurantId: string;
  date: string;
  isToday: boolean;
  combinableGroups: CombinableGroup[];
  allTables: Table[];
  onClose: () => void;
  onBooked: () => void;
}

export default function BookingModal({ table, restaurantId, date, isToday, combinableGroups, allTables, onClose, onBooked }: Props) {
  const navigate = useNavigate();
  const [dinerName, setDinerName] = useState("");
  const [dinerPhone, setDinerPhone] = useState("");
  const [partySize, setPartySize] = useState(table.capacity);
  const [duration, setDuration] = useState(90);
  const [timeOption, setTimeOption] = useState<string>(isToday ? "now" : "19:00");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCombined, setUseCombined] = useState<string | null>(null);

  const matchingGroup = combinableGroups.find((g) => g.tableIds.includes(table.id));
  const combinedTables = matchingGroup
    ? allTables.filter((t) => matchingGroup.tableIds.includes(t.id))
    : [];
  const combinedAllAvailable = combinedTables.every((t) => t.status === "available");

  function getStartTime(): string {
    if (isToday) {
      const now = new Date();
      if (timeOption === "now") return now.toISOString();
      if (timeOption === "30min") return new Date(now.getTime() + 30 * 60 * 1000).toISOString();
      if (timeOption === "1hr") return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    }
    return new Date(`${date}T${timeOption}:00`).toISOString();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dinerName.trim() || !dinerPhone.trim()) return;
    setSubmitting(true);
    setError(null);

    const tableIds = useCombined && matchingGroup ? matchingGroup.tableIds : [table.id];

    try {
      const result = await createReservation({
        restaurantId,
        tableIds,
        dinerName: dinerName.trim(),
        dinerPhone: dinerPhone.trim(),
        partySize,
        startTime: getStartTime(),
        durationMinutes: duration,
      });
      onBooked();
      navigate(`/confirmation/${result.lookupCode}`);
    } catch (err: any) {
      try {
        const body = JSON.parse(err.message);
        setError(body.error || "This table was just taken, please choose another.");
      } catch {
        setError("This table was just taken, please choose another.");
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Table {table.tableNumber}
            </h2>
            <p className="text-sm text-gray-500">
              {table.shape === "circle" ? "Round" : "Rectangular"} · {table.capacity} seats
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Combined table option — only when party exceeds single table */}
        {matchingGroup && combinedAllAvailable && partySize > table.capacity && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={useCombined === matchingGroup.id}
                onChange={(e) => setUseCombined(e.target.checked ? matchingGroup.id : null)}
                className="accent-blue-600"
              />
              <span>
                Combine with Table{combinedTables.length > 2 ? "s" : ""}{" "}
                {combinedTables.filter((t) => t.id !== table.id).map((t) => t.tableNumber).join(" + ")}
                {" "}(fits up to {matchingGroup.combinedCapacity})
              </span>
            </label>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Time selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
            {isToday ? (
              <div className="flex gap-2">
                {[
                  { value: "now", label: "Now" },
                  { value: "30min", label: "In 30 min" },
                  { value: "1hr", label: "In 1 hr" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTimeOption(opt.value)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                      timeOption === opt.value
                        ? "bg-orange-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="time"
                value={timeOption}
                onChange={(e) => setTimeOption(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            )}
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
            <div className="flex gap-2">
              {[60, 90, 120].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                    duration === d
                      ? "bg-orange-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {d / 60} hr{d > 60 ? "s" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Party size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Party size</label>
            <input
              type="number"
              min={1}
              max={useCombined && matchingGroup ? matchingGroup.combinedCapacity : table.capacity}
              value={partySize}
              onChange={(e) => {
                const size = Number(e.target.value);
                setPartySize(size);
                if (size <= table.capacity) setUseCombined(null);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Diner info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
            <input
              type="text"
              required
              value={dinerName}
              onChange={(e) => setDinerName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
            <input
              type="tel"
              required
              value={dinerPhone}
              onChange={(e) => setDinerPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 transition"
          >
            {submitting ? "Booking..." : "Book This Table"}
          </button>
        </form>
      </div>
    </div>
  );
}
