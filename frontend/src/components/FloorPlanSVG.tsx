import type { Table, Landmark } from "../types";

interface Props {
  tables: Table[];
  onTableClick: (table: Table) => void;
  landmarks?: Landmark[];
  mode?: "diner" | "manager";
}

function tableSize(capacity: number) {
  const w = 5 + capacity * 1.5;
  const h = 4 + capacity;
  const r = 2 + capacity * 0.7;
  return { w, h, r };
}

function statusColor(status: string, mode: "diner" | "manager") {
  if (mode === "manager") {
    if (status === "available") return { fill: "#22c55e", stroke: "#16a34a" };
    if (status === "held") return { fill: "#f59e0b", stroke: "#d97706" };
    return { fill: "#ef4444", stroke: "#dc2626" };
  }
  if (status === "available") return { fill: "#22c55e", stroke: "#16a34a" };
  return { fill: "#9ca3af", stroke: "#6b7280" };
}

const LANDMARK_LABELS: Record<string, string> = {
  entrance: "IN",
  window: "W",
  restroom: "WC",
  reception: "RX",
  bar: "BAR",
  kitchen: "K",
};

export default function FloorPlanSVG({ tables, onTableClick, landmarks, mode = "diner" }: Props) {
  return (
    <svg viewBox="0 0 100 100" className="w-full bg-white rounded-xl border border-gray-200" style={{ maxHeight: "70vh" }}>
      <rect x="0" y="0" width="100" height="100" fill="#fafaf9" rx="2" />

      {/* Landmarks layer */}
      {landmarks?.map((lm) => (
        <g key={lm.id} style={{ pointerEvents: "none" }}>
          <circle cx={lm.xPos} cy={lm.yPos} r="2.2" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.2" />
          <text x={lm.xPos} y={lm.yPos + 0.3} textAnchor="middle" dominantBaseline="middle" fontSize="1.4" fill="#6b7280" fontWeight="bold">
            {LANDMARK_LABELS[lm.type] || lm.type}
          </text>
          {lm.label && (
            <text x={lm.xPos} y={lm.yPos + 3.5} textAnchor="middle" fontSize="1.2" fill="#9ca3af">
              {lm.label}
            </text>
          )}
        </g>
      ))}

      {/* Tables layer */}
      {tables.map((t) => {
        const size = tableSize(t.capacity);
        const color = statusColor(t.status, mode);
        const clickable = mode === "manager" || t.status === "available";
        const handleClick = clickable ? () => onTableClick(t) : undefined;
        const opacity = mode === "manager" ? 1 : (t.status === "available" ? 1 : 0.5);

        return (
          <g
            key={t.id}
            transform={`rotate(${t.rotation}, ${t.xPos}, ${t.yPos})`}
            onClick={handleClick}
            style={{ cursor: clickable ? "pointer" : "default" }}
            opacity={opacity}
          >
            {t.shape === "circle" ? (
              <circle cx={t.xPos} cy={t.yPos} r={size.r} fill={color.fill} stroke={color.stroke} strokeWidth="0.3" />
            ) : (
              <rect
                x={t.xPos - size.w / 2}
                y={t.yPos - size.h / 2}
                width={size.w}
                height={size.h}
                rx="0.8"
                fill={color.fill}
                stroke={color.stroke}
                strokeWidth="0.3"
              />
            )}
            <text x={t.xPos} y={t.yPos + 0.5} textAnchor="middle" dominantBaseline="middle" fontSize="2.2" fill="white" fontWeight="bold" style={{ pointerEvents: "none" }}>
              {t.tableNumber}
            </text>
            <text x={t.xPos} y={t.yPos + 3} textAnchor="middle" fontSize="1.4" fill="white" style={{ pointerEvents: "none" }}>
              {t.capacity} seats
            </text>
          </g>
        );
      })}
    </svg>
  );
}
