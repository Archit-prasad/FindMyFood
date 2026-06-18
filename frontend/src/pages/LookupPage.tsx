import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LookupPage() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) return;
    navigate(`/confirmation/${trimmed}`);
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Find Your Booking</h1>
      <p className="text-gray-500 text-center mb-6">
        Enter the lookup code you received when you booked.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. A1B2C3"
          maxLength={8}
          className="w-full text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg px-4 py-4 focus:outline-none focus:ring-2 focus:ring-orange-400 uppercase"
        />
        <button
          type="submit"
          className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 transition"
        >
          Look Up
        </button>
      </form>
    </div>
  );
}
