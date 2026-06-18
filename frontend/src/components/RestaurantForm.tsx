import { useState } from "react";
import FloorPlanSVG from "./FloorPlanSVG";
import type { Landmark } from "../types";

interface TableDef {
  tableNumber: number;
  capacity: number;
  shape: "circle" | "rectangle";
  xPos: number;
  yPos: number;
  rotation: number;
}

interface MenuDef {
  name: string;
  price: number;
  category: string;
}

interface GroupDef {
  tableIndices: number[];
  combinedCapacity: number;
}

interface LandmarkDef {
  type: "entrance" | "window" | "restroom" | "reception" | "bar" | "kitchen";
  xPos: number;
  yPos: number;
  label: string;
}

export interface RestaurantFormData {
  name: string;
  address: string;
  cuisineType: string;
  priceTier: number;
  hours: string;
  tables: TableDef[];
  menuItems: MenuDef[];
  combinableGroups: GroupDef[];
  landmarks: LandmarkDef[];
}

interface Props {
  mode: "create" | "edit";
  initialData?: RestaurantFormData;
  onSubmit: (data: RestaurantFormData) => Promise<void>;
  submitLabel?: string;
}

const LANDMARK_TYPES = ["entrance", "window", "restroom", "reception", "bar", "kitchen"] as const;

export default function RestaurantForm({ mode, initialData, onSubmit, submitLabel }: Props) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [cuisineType, setCuisineType] = useState(initialData?.cuisineType ?? "");
  const [priceTier, setPriceTier] = useState(initialData?.priceTier ?? 2);
  const [hours, setHours] = useState(initialData?.hours ?? "");
  const [tableDefs, setTableDefs] = useState<TableDef[]>(initialData?.tables ?? []);
  const [menuDefs, setMenuDefs] = useState<MenuDef[]>(initialData?.menuItems ?? []);
  const [groupDefs, setGroupDefs] = useState<GroupDef[]>(initialData?.combinableGroups ?? []);
  const [landmarkDefs, setLandmarkDefs] = useState<LandmarkDef[]>(initialData?.landmarks ?? []);
  const [submitting, setSubmitting] = useState(false);

  const addTable = () => setTableDefs([...tableDefs, { tableNumber: tableDefs.length + 1, capacity: 4, shape: "rectangle", xPos: 50, yPos: 50, rotation: 0 }]);
  const removeTable = (i: number) => setTableDefs(tableDefs.filter((_, idx) => idx !== i));
  const updateTable = (i: number, field: string, value: number | string) => {
    const copy = [...tableDefs];
    copy[i] = { ...copy[i]!, [field]: value };
    setTableDefs(copy);
  };

  const addMenu = () => setMenuDefs([...menuDefs, { name: "", price: 0, category: "" }]);
  const removeMenu = (i: number) => setMenuDefs(menuDefs.filter((_, idx) => idx !== i));
  const updateMenu = (i: number, field: string, value: string | number) => {
    const copy = [...menuDefs];
    copy[i] = { ...copy[i]!, [field]: value };
    setMenuDefs(copy);
  };

  const addGroup = () => setGroupDefs([...groupDefs, { tableIndices: [], combinedCapacity: 0 }]);
  const removeGroup = (i: number) => setGroupDefs(groupDefs.filter((_, idx) => idx !== i));
  const toggleGroupTable = (gi: number, ti: number) => {
    const copy = [...groupDefs];
    const g = { ...copy[gi]! };
    g.tableIndices = g.tableIndices.includes(ti) ? g.tableIndices.filter((x) => x !== ti) : [...g.tableIndices, ti];
    g.combinedCapacity = g.tableIndices.reduce((sum, idx) => sum + (tableDefs[idx]?.capacity ?? 0), 0);
    copy[gi] = g;
    setGroupDefs(copy);
  };

  const addLandmark = () => setLandmarkDefs([...landmarkDefs, { type: "entrance", xPos: 50, yPos: 50, label: "" }]);
  const removeLandmark = (i: number) => setLandmarkDefs(landmarkDefs.filter((_, idx) => idx !== i));
  const updateLandmark = (i: number, field: string, value: string | number) => {
    const copy = [...landmarkDefs];
    copy[i] = { ...copy[i]!, [field]: value };
    setLandmarkDefs(copy);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ name, address, cuisineType, priceTier, hours, tables: tableDefs, menuItems: menuDefs, combinableGroups: groupDefs, landmarks: landmarkDefs });
    } finally {
      setSubmitting(false);
    }
  };

  // Preview data for SVG
  const previewTables = tableDefs.map((t, i) => ({
    id: `preview-${i}`,
    restaurantId: "",
    tableNumber: t.tableNumber,
    capacity: t.capacity,
    shape: t.shape,
    xPos: t.xPos,
    yPos: t.yPos,
    rotation: t.rotation,
    status: "available" as const,
    statusUpdatedAt: "",
    reservedUntil: null,
  }));

  const previewLandmarks: Landmark[] = landmarkDefs.map((l, i) => ({
    id: `lm-preview-${i}`,
    restaurantId: "",
    type: l.type,
    xPos: l.xPos,
    yPos: l.yPos,
    label: l.label || null,
  }));

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";
  const sectionCls = "bg-white rounded-xl border border-gray-200 p-5 mb-6";

  return (
    <form onSubmit={handleSubmit}>
      {/* Restaurant basics */}
      <div className={sectionCls}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Restaurant Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Cuisine Type</label>
            <input required value={cuisineType} onChange={(e) => setCuisineType(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
            <input required value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Hours</label>
            <input required value={hours} onChange={(e) => setHours(e.target.value)} placeholder="e.g. 11:00-22:00" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Price Tier</label>
            <select value={priceTier} onChange={(e) => setPriceTier(Number(e.target.value))} className={inputCls}>
              <option value={1}>₹</option>
              <option value={2}>₹₹</option>
              <option value={3}>₹₹₹</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className={sectionCls}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Tables</h3>
          <button type="button" onClick={addTable} className="text-sm bg-orange-600 text-white px-3 py-1 rounded-lg hover:bg-orange-700">Add Table</button>
        </div>
        {tableDefs.map((t, i) => (
          <div key={i} className="grid grid-cols-7 gap-2 mb-2 items-end">
            <div>
              <label className="block text-xs text-gray-400">#</label>
              <input type="number" value={t.tableNumber} onChange={(e) => updateTable(i, "tableNumber", +e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400">Seats</label>
              <input type="number" value={t.capacity} onChange={(e) => updateTable(i, "capacity", +e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400">Shape</label>
              <select value={t.shape} onChange={(e) => updateTable(i, "shape", e.target.value)} className={inputCls}>
                <option value="circle">Circle</option>
                <option value="rectangle">Rectangle</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400">X%</label>
              <input type="number" min={0} max={100} value={t.xPos} onChange={(e) => updateTable(i, "xPos", +e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400">Y%</label>
              <input type="number" min={0} max={100} value={t.yPos} onChange={(e) => updateTable(i, "yPos", +e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400">Rot°</label>
              <input type="number" value={t.rotation} onChange={(e) => updateTable(i, "rotation", +e.target.value)} className={inputCls} />
            </div>
            <button type="button" onClick={() => removeTable(i)} className="text-red-500 text-sm hover:text-red-700 pb-2">Remove</button>
          </div>
        ))}
      </div>

      {/* Live preview */}
      {tableDefs.length > 0 && (
        <div className={sectionCls}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Floor Plan Preview</h3>
          <FloorPlanSVG tables={previewTables} onTableClick={() => {}} landmarks={previewLandmarks} />
        </div>
      )}

      {/* Menu items */}
      <div className={sectionCls}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Menu Items</h3>
          <button type="button" onClick={addMenu} className="text-sm bg-orange-600 text-white px-3 py-1 rounded-lg hover:bg-orange-700">Add Item</button>
        </div>
        {menuDefs.map((m, i) => (
          <div key={i} className="grid grid-cols-4 gap-2 mb-2 items-end">
            <div>
              <label className="block text-xs text-gray-400">Name</label>
              <input value={m.name} onChange={(e) => updateMenu(i, "name", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400">Price</label>
              <input type="number" step="0.01" value={m.price} onChange={(e) => updateMenu(i, "price", +e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400">Category</label>
              <input value={m.category} onChange={(e) => updateMenu(i, "category", e.target.value)} className={inputCls} />
            </div>
            <button type="button" onClick={() => removeMenu(i)} className="text-red-500 text-sm hover:text-red-700 pb-2">Remove</button>
          </div>
        ))}
      </div>

      {/* Combinable groups */}
      <div className={sectionCls}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Combinable Table Groups</h3>
          <button type="button" onClick={addGroup} className="text-sm bg-orange-600 text-white px-3 py-1 rounded-lg hover:bg-orange-700">Add Group</button>
        </div>
        {groupDefs.map((g, gi) => (
          <div key={gi} className="mb-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap gap-2 mb-2">
              {tableDefs.map((t, ti) => (
                <button
                  key={ti}
                  type="button"
                  onClick={() => toggleGroupTable(gi, ti)}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    g.tableIndices.includes(ti) ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  T{t.tableNumber}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Combined capacity: {g.combinedCapacity}</span>
              <button type="button" onClick={() => removeGroup(gi)} className="text-red-500 text-xs hover:text-red-700 ml-auto">Remove</button>
            </div>
          </div>
        ))}
      </div>

      {/* Landmarks */}
      <div className={sectionCls}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Landmarks</h3>
          <button type="button" onClick={addLandmark} className="text-sm bg-orange-600 text-white px-3 py-1 rounded-lg hover:bg-orange-700">Add Landmark</button>
        </div>
        {landmarkDefs.map((l, i) => (
          <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-end">
            <div>
              <label className="block text-xs text-gray-400">Type</label>
              <select value={l.type} onChange={(e) => updateLandmark(i, "type", e.target.value)} className={inputCls}>
                {LANDMARK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400">X%</label>
              <input type="number" min={0} max={100} value={l.xPos} onChange={(e) => updateLandmark(i, "xPos", +e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400">Y%</label>
              <input type="number" min={0} max={100} value={l.yPos} onChange={(e) => updateLandmark(i, "yPos", +e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400">Label</label>
              <input value={l.label} onChange={(e) => updateLandmark(i, "label", e.target.value)} placeholder="optional" className={inputCls} />
            </div>
            <button type="button" onClick={() => removeLandmark(i)} className="text-red-500 text-sm hover:text-red-700 pb-2">Remove</button>
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 transition mb-6"
      >
        {submitting ? "Saving..." : (submitLabel || (mode === "create" ? "Create Restaurant" : "Save All Changes"))}
      </button>
    </form>
  );
}
