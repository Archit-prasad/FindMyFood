import "dotenv/config";
import express from "express";
import cors from "cors";
import restaurantRoutes from "./routes/restaurants.js";
import reservationRoutes from "./routes/reservations.js";
import adminRoutes from "./routes/admin.js";
import managerRoutes from "./routes/manager.js";

const app = express();
const PORT = process.env["PORT"] ?? 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/restaurants", restaurantRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/manager", managerRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
