export interface Restaurant {
  id: string;
  name: string;
  address: string;
  cuisineType: string;
  priceTier: number;
  popularityScore: number;
  hours: string;
  availableTableCount: number;
  totalTableCount: number;
}

export interface Table {
  id: string;
  restaurantId: string;
  tableNumber: number;
  capacity: number;
  shape: "circle" | "rectangle";
  xPos: number;
  yPos: number;
  rotation: number;
  status: "available" | "held" | "occupied" | "reserved";
  statusUpdatedAt: string;
  reservedUntil: string | null;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  price: number;
  category: string;
}

export interface Review {
  id: string;
  restaurantId: string;
  rating: number;
  comment: string | null;
}

export interface ReviewsResponse {
  reviews: Review[];
  avgRating: number;
  count: number;
}

export interface CombinableGroup {
  id: string;
  restaurantId: string;
  tableIds: string[];
  combinedCapacity: number;
}

export interface Landmark {
  id: string;
  restaurantId: string;
  type: "entrance" | "window" | "restroom" | "reception" | "bar" | "kitchen";
  xPos: number;
  yPos: number;
  label: string | null;
}

export interface ManagerReservation {
  id: string;
  dinerName: string;
  dinerPhone: string;
  partySize: number;
  startTime: string;
  durationMinutes: number;
  status: string;
  lookupCode: string;
  tables: Array<{ tableId: string; tableNumber: number }>;
}

export interface ManagerRestaurantData {
  restaurant: Omit<Restaurant, "availableTableCount" | "totalTableCount">;
  tables: Table[];
  menuItems: MenuItem[];
  combinableGroups: CombinableGroup[];
  landmarks: Landmark[];
  upcomingReservations: ManagerReservation[];
}

export interface ReservationDetail {
  id: string;
  restaurantId: string;
  dinerName: string;
  dinerPhone: string;
  partySize: number;
  startTime: string;
  durationMinutes: number;
  status: string;
  lookupCode: string;
  restaurantName: string;
  restaurantAddress: string;
  tables: { tableId: string; tableNumber: number; capacity: number }[];
}
