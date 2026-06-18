import type { Restaurant, Table, MenuItem, ReviewsResponse, CombinableGroup, ReservationDetail, Landmark, ManagerRestaurantData } from "./types";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || res.statusText);
  }
  return res.json();
}

export const getRestaurants = () => fetchJSON<Restaurant[]>("/restaurants");

export const getRestaurant = (id: string) => fetchJSON<Restaurant>(`/restaurants/${id}`);

export const getTables = (id: string, date?: string, time?: string) => {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (time) params.set("time", time);
  const qs = params.toString();
  return fetchJSON<Table[]>(`/restaurants/${id}/tables${qs ? `?${qs}` : ""}`);
};

export const getMenu = (id: string) => fetchJSON<MenuItem[]>(`/restaurants/${id}/menu`);

export const getReviews = (id: string) => fetchJSON<ReviewsResponse>(`/restaurants/${id}/reviews`);

export const postReview = (id: string, data: { rating: number; comment?: string }) =>
  fetchJSON<void>(`/restaurants/${id}/reviews`, { method: "POST", body: JSON.stringify(data) });

export const getCombinableGroups = (id: string) =>
  fetchJSON<CombinableGroup[]>(`/restaurants/${id}/combinable-groups`);

export const getLandmarks = (id: string) =>
  fetchJSON<Landmark[]>(`/restaurants/${id}/landmarks`);

export const createReservation = (data: {
  restaurantId: string;
  tableIds: string[];
  dinerName: string;
  dinerPhone: string;
  partySize: number;
  startTime: string;
  durationMinutes: number;
}) => fetchJSON<{ reservationId: string; lookupCode: string }>("/reservations", { method: "POST", body: JSON.stringify(data) });

export const lookupReservation = (code: string) =>
  fetchJSON<ReservationDetail>(`/reservations/lookup/${code}`);

export const cancelReservationApi = (id: string) =>
  fetchJSON<{ success: boolean }>(`/reservations/${id}/cancel`, { method: "POST" });

// Admin
export const adminListRestaurants = () =>
  fetchJSON<Array<{ id: string; name: string; address: string; cuisineType: string; isActive: boolean; managerAccessToken: string }>>("/admin/restaurants");

export const adminCreateRestaurant = (data: Record<string, unknown>) =>
  fetchJSON<{ restaurantId: string; managerAccessToken: string }>("/admin/restaurants", { method: "POST", body: JSON.stringify(data) });

export const adminToggleActive = (id: string, isActive: boolean) =>
  fetchJSON<{ success: boolean }>(`/admin/restaurants/${id}/active`, { method: "PATCH", body: JSON.stringify({ isActive }) });

export const adminDeleteRestaurant = (id: string) =>
  fetchJSON<{ success: boolean }>(`/admin/restaurants/${id}`, { method: "DELETE" });

// Manager
export const getManagerRestaurant = (token: string) =>
  fetchJSON<ManagerRestaurantData>(`/manager/${token}/restaurant`);

export const updateTableStatus = (token: string, tableId: string, action: string) =>
  fetchJSON<{ success: boolean }>(`/manager/${token}/tables/${tableId}/status`, { method: "POST", body: JSON.stringify({ action }) });

export const createWalkIn = (token: string, data: { tableIds: string[]; partySize?: number }) =>
  fetchJSON<{ success: boolean }>(`/manager/${token}/walk-in`, { method: "POST", body: JSON.stringify(data) });

export const updateManagerRestaurant = (token: string, data: Record<string, unknown>) =>
  fetchJSON<{ success: boolean }>(`/manager/${token}/restaurant`, { method: "PUT", body: JSON.stringify(data) });

export const updateManagerTables = (token: string, data: unknown[]) =>
  fetchJSON<{ success: boolean }>(`/manager/${token}/tables`, { method: "PUT", body: JSON.stringify(data) });

export const updateManagerMenu = (token: string, data: unknown[]) =>
  fetchJSON<{ success: boolean }>(`/manager/${token}/menu`, { method: "PUT", body: JSON.stringify(data) });

export const updateManagerGroups = (token: string, data: unknown[]) =>
  fetchJSON<{ success: boolean }>(`/manager/${token}/groups`, { method: "PUT", body: JSON.stringify(data) });

export const updateManagerLandmarks = (token: string, data: unknown[]) =>
  fetchJSON<{ success: boolean }>(`/manager/${token}/landmarks`, { method: "PUT", body: JSON.stringify(data) });
