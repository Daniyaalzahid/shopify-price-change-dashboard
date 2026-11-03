export type Product = {
  id: string;
  name: string;
  variant: string;
  sku: string;
  brand: string;
  collection: string;
  price: number;
  compareAt: number | null;
  status: string;
  image?: string;
  collections?: string[];
  kind: "ac" | "fridge" | "tv" | "washer" | "small";
};
export const products: Product[] = [
  {
    id: "1",
    name: "Haier Triple Inverter AC",
    variant: "1.5 Ton · White",
    sku: "HAI-HSU-18HFP",
    brand: "Haier",
    collection: "Air Conditioners",
    price: 155000,
    compareAt: 165000,
    status: "Active",
    kind: "ac",
  },
  {
    id: "2",
    name: "Dawlance Inverter Refrigerator",
    variant: "9191 WB · Silver",
    sku: "DAW-9191-SLV",
    brand: "Dawlance",
    collection: "Refrigerators",
    price: 98000,
    compareAt: 105000,
    status: "Active",
    kind: "fridge",
  },
  {
    id: "3",
    name: "Samsung Crystal UHD TV",
    variant: "55 Inch · Black",
    sku: "SAM-55-CU7000",
    brand: "Samsung",
    collection: "Televisions",
    price: 172000,
    compareAt: 185000,
    status: "Active",
    kind: "tv",
  },
  {
    id: "4",
    name: "Haier Twin Tub Washing Machine",
    variant: "10 Kg · White",
    sku: "HAI-HWM-100",
    brand: "Haier",
    collection: "Washing Machines",
    price: 42500,
    compareAt: 46000,
    status: "Active",
    kind: "washer",
  },
  {
    id: "5",
    name: "Binbazz Digital Air Fryer",
    variant: "BIN-7805 · Black",
    sku: "BIN-AF-7805",
    brand: "Binbazz",
    collection: "Small Appliances",
    price: 24500,
    compareAt: 28500,
    status: "Active",
    kind: "small",
  },
  {
    id: "6",
    name: "Gree Fairy Inverter AC",
    variant: "1 Ton · White",
    sku: "GRE-GS12-FITH",
    brand: "Gree",
    collection: "Air Conditioners",
    price: 132000,
    compareAt: 140000,
    status: "Active",
    kind: "ac",
  },
  {
    id: "7",
    name: "Dawlance Automatic Washing Machine",
    variant: "8 Kg · Grey",
    sku: "DAW-DWT-180",
    brand: "Dawlance",
    collection: "Washing Machines",
    price: 78500,
    compareAt: 85000,
    status: "Active",
    kind: "washer",
  },
  {
    id: "8",
    name: "Haier HRF Inverter Refrigerator",
    variant: "438 IFRA · Black",
    sku: "HAI-HRF-438-BK",
    brand: "Haier",
    collection: "Refrigerators",
    price: 112000,
    compareAt: 120000,
    status: "Active",
    kind: "fridge",
  },
  {
    id: "9",
    name: "Binbazz Smart LED TV",
    variant: "40 Inch · Black",
    sku: "BIN-40S9X",
    brand: "Binbazz",
    collection: "Televisions",
    price: 54500,
    compareAt: 59900,
    status: "Active",
    kind: "tv",
  },
  {
    id: "10",
    name: "Samsung Top Mount Refrigerator",
    variant: "RT38 · Silver",
    sku: "SAM-RT38-SLV",
    brand: "Samsung",
    collection: "Refrigerators",
    price: 189000,
    compareAt: null,
    status: "Draft",
    kind: "fridge",
  },
  {
    id: "11",
    name: "Binbazz Food Factory",
    variant: "BIN-FF02 · Black",
    sku: "BIN-FF02",
    brand: "Binbazz",
    collection: "Small Appliances",
    price: 18500,
    compareAt: 22000,
    status: "Active",
    kind: "small",
  },
  {
    id: "12",
    name: "Gree Pular Inverter AC",
    variant: "1.5 Ton · White",
    sku: "GRE-GS18-PULAR",
    brand: "Gree",
    collection: "Air Conditioners",
    price: 178000,
    compareAt: 190000,
    status: "Active",
    kind: "ac",
  },
  {
    id: "13",
    name: "Haier Triple Inverter AC",
    variant: "1 Ton · White",
    sku: "HAI-HSU-12HFP",
    brand: "Haier",
    collection: "Air Conditioners",
    price: 125000,
    compareAt: 135000,
    status: "Active",
    kind: "ac",
  },
  {
    id: "14",
    name: "Canon Water Dispenser",
    variant: "1225 · Black",
    sku: "CAN-1225-BK",
    brand: "Canon",
    collection: "Small Appliances",
    price: 36500,
    compareAt: 39900,
    status: "Active",
    kind: "small",
  },
  {
    id: "15",
    name: "Dawlance Microwave Oven",
    variant: "20 Litre · Black",
    sku: "DAW-MD4-BK",
    brand: "Dawlance",
    collection: "Small Appliances",
    price: 23900,
    compareAt: 26000,
    status: "Active",
    kind: "small",
  },
  {
    id: "16",
    name: "Haier Front Load Washing Machine",
    variant: "8 Kg · Silver",
    sku: "HAI-HW80-SLV",
    brand: "Haier",
    collection: "Washing Machines",
    price: 145000,
    compareAt: 155000,
    status: "Draft",
    kind: "washer",
  },
];
export type Filters = {
  query: string;
  brand: string;
  collection: string;
  status: string;
  editedOnly: boolean;
};
export type Drafts = Record<string, string>;
export function priceError(raw: string): string | null {
  if (raw.trim() === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(raw.trim()))
    return "Enter a positive price with up to 2 decimals.";
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value > 999999999)
    return "Price must be between Rs. 0.01 and Rs. 999,999,999.";
  return null;
}
export function isChanged(product: Product, drafts: Drafts) {
  const raw = drafts[product.id];
  return (
    raw !== undefined &&
    raw.trim() !== "" &&
    (priceError(raw) !== null || Number(raw) !== product.price)
  );
}
export function filterProducts(
  items: Product[],
  filters: Filters,
  drafts: Drafts,
) {
  const q = filters.query.trim().toLowerCase();
  return items.filter(
    (p) =>
      (!q || `${p.name} ${p.variant} ${p.sku}`.toLowerCase().includes(q)) &&
      (!filters.brand || p.brand === filters.brand) &&
      (!filters.collection || (p.collections ?? [p.collection]).includes(filters.collection)) &&
      (!filters.status || p.status === filters.status) &&
      (!filters.editedOnly || isChanged(p, drafts)),
  );
}
export function readDrafts(raw: string | null, items: Product[] = products): Drafts {
  if (!raw) return {};
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    const result: Drafts = {};
    for (const p of items) {
      const value = (data as Record<string, unknown>)[p.id];
      if (typeof value === "string" && value.length < 40) result[p.id] = value;
    }
    return result;
  } catch {
    return {};
  }
}
export const money = (value: number) =>
  new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 }).format(value);
