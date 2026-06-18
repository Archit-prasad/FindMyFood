import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { getRestaurant, getMenu, getReviews, postReview } from "../api";
import type { Restaurant, MenuItem, ReviewsResponse } from "../types";

export default function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0]!;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [reviewData, setReviewData] = useState<ReviewsResponse>({ reviews: [], avgRating: 0, count: 0 });
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getRestaurant(id).then(setRestaurant).catch(console.error);
    getMenu(id).then(setMenu).catch(console.error);
    getReviews(id).then(setReviewData).catch(console.error);
  }, [id]);

  if (!restaurant) return <p className="text-gray-400">Loading...</p>;

  const menuByCategory = menu.reduce<Record<string, MenuItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    try {
      await postReview(id, { rating: newRating, comment: newComment || undefined });
      setNewComment("");
      const updated = await getReviews(id);
      setReviewData(updated);
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">{restaurant.name}</h1>
        <p className="text-gray-500">{restaurant.cuisineType} · {"₹".repeat(restaurant.priceTier)}</p>
        <p className="text-sm text-gray-400 mt-1">{restaurant.address}</p>
        <p className="text-sm text-gray-400">Hours: {restaurant.hours}</p>
      </div>

      {/* CTA */}
      <Link
        to={`/restaurant/${id}/tables?date=${date}`}
        className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition mb-8"
      >
        View Floor Plan & Book a Table
      </Link>

      {/* Menu */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Menu</h2>
        {Object.entries(menuByCategory).map(([category, items]) => (
          <div key={category} className="mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{category}</h3>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between bg-white rounded-lg px-4 py-3 border border-gray-100">
                  <span className="text-gray-800">{item.name}</span>
                  <span className="text-gray-600 font-medium">₹{item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {menu.length === 0 && <p className="text-gray-400">No menu items available.</p>}
      </section>

      {/* Reviews */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Reviews
          {reviewData.count > 0 && (
            <span className="text-base font-normal text-gray-500 ml-2">
              ★ {reviewData.avgRating} ({reviewData.count})
            </span>
          )}
        </h2>

        {/* Submit review form */}
        <form onSubmit={handleSubmitReview} className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <label className="text-sm text-gray-600">Your rating:</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setNewRating(star)}
                  className={`text-2xl ${star <= newRating ? "text-yellow-400" : "text-gray-300"}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Leave a comment (optional)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
            rows={2}
          />
          <button
            type="submit"
            disabled={submitting}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>

        {/* Review list */}
        <div className="space-y-3">
          {reviewData.reviews.map((r) => (
            <div key={r.id} className="bg-white rounded-lg border border-gray-100 p-4">
              <div className="text-yellow-400 mb-1">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
              {r.comment && <p className="text-sm text-gray-700">{r.comment}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
