import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { lookupReservation, cancelReservationApi } from "../api";
import type { ReservationDetail } from "../types";

export default function ConfirmationPage() {
  const { lookupCode } = useParams<{ lookupCode: string }>();
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!lookupCode) return;
    lookupReservation(lookupCode)
      .then(setReservation)
      .catch(() => setError("Reservation not found."));
  }, [lookupCode]);

  const handleCancel = async () => {
    if (!reservation || !window.confirm("Are you sure you want to cancel this booking?")) return;
    setCancelling(true);
    try {
      await cancelReservationApi(reservation.id);
      setReservation({ ...reservation, status: "cancelled" });
    } catch {
      alert("Failed to cancel.");
    }
    setCancelling(false);
  };

  if (error) return <p className="text-red-500 text-center mt-12">{error}</p>;
  if (!reservation) return <p className="text-gray-400 text-center mt-12">Loading...</p>;

  const startDate = new Date(reservation.startTime);
  const isCancelled = reservation.status === "cancelled";

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {isCancelled ? "Booking Cancelled" : "Booking Confirmed!"}
        </h1>
        <p className="text-gray-500">{reservation.restaurantName}</p>
      </div>

      {/* Lookup code */}
      <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6 text-center mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Your Lookup Code</p>
        <p className="text-4xl font-mono font-bold text-orange-600 tracking-widest">
          {reservation.lookupCode}
        </p>
        <p className="text-xs text-gray-400 mt-2">Use this code to find your booking later</p>
      </div>

      {/* Details */}
      <div className={`bg-white rounded-xl border border-gray-200 p-5 mb-6 ${isCancelled ? "opacity-60" : ""}`}>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Restaurant</dt>
            <dd className="text-sm font-medium text-gray-900">{reservation.restaurantName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Address</dt>
            <dd className="text-sm text-gray-900">{reservation.restaurantAddress}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Table(s)</dt>
            <dd className="text-sm font-medium text-gray-900">
              {reservation.tables.map((t) => `#${t.tableNumber} (${t.capacity} seats)`).join(", ")}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Date & Time</dt>
            <dd className="text-sm text-gray-900">
              {startDate.toLocaleDateString()} at {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Duration</dt>
            <dd className="text-sm text-gray-900">{reservation.durationMinutes} minutes</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Party Size</dt>
            <dd className="text-sm text-gray-900">{reservation.partySize}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Guest</dt>
            <dd className="text-sm text-gray-900">{reservation.dinerName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Status</dt>
            <dd className={`text-sm font-medium ${isCancelled ? "text-red-600" : "text-green-600"}`}>
              {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Actions */}
      <div className="flex gap-3 no-print">
        <button
          onClick={() => window.print()}
          className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
        >
          Print Receipt
        </button>
        {!isCancelled && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex-1 bg-red-100 text-red-700 py-3 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50 transition"
          >
            {cancelling ? "Cancelling..." : "Cancel Booking"}
          </button>
        )}
      </div>
    </div>
  );
}
