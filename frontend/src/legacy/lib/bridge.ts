const DEFAULT_BACKEND_URL = process.env.NODE_ENV === "production" ? "https://veg-sqjs.onrender.com" : "http://localhost:5000";
export const USER_BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_BACKEND_URL;
const TABIO_SESSION_TOKEN_KEY = "tabio_session_token";
const BRIDGE_POLL_INTERVAL_MS = 8000;

function resolveAdminToken() {
  const fromEnv = String(process.env.NEXT_PUBLIC_ADMIN_API_KEY || "").trim();
  if (fromEnv) return fromEnv;

  const fromLegacyEnv = String(process.env.NEXT_PUBLIC_OWNER_API_KEY || "").trim();
  if (fromLegacyEnv) return fromLegacyEnv;

  const fromSession = String(localStorage.getItem(TABIO_SESSION_TOKEN_KEY) || "").trim();
  if (fromSession) return fromSession;

  return "";
}

function buildAdminHeaders(extraHeaders: Record<string, string> = {}) {
  const token = resolveAdminToken();
  if (!token) return extraHeaders;

  return {
    ...extraHeaders,
    Authorization: `Bearer ${token}`,
    "x-admin-key": token,
  };
}

async function buildRequestError(response: Response, fallbackMessage: string) {
  let message = fallbackMessage;
  try {
    const data = await response.json();
    const responseMessage = typeof data?.message === "string" ? data.message.trim() : "";
    if (responseMessage) {
      message = responseMessage;
    }
  } catch {
    // no-op
  }

  return new Error(`${message} (HTTP ${response.status})`);
}

export type BridgeOrderStatus = "Preparing" | "Ready" | "Delivered";

export type BridgeOrderItem = {
  name: string;
  variant: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type BridgeOrder = {
  _id: string;
  customerId?: string;
  customerName: string;
  phone: string;
  address: string;
  paymentMethod?: "Cash" | "GPay" | "PhonePe" | string;
  items: BridgeOrderItem[];
  total: number;
  deliveryCharge?: number;
  customerBalanceAfter?: number | null;
  status: BridgeOrderStatus;
  createdAt: string;
};

export type BridgeCustomerTransaction = {
  _id: string;
  type: "credit" | "debit";
  amount: number;
  note?: string;
  orderId?: string;
  balanceAfter: number;
  createdAt: string;
};

export type BridgeCustomer = {
  _id: string;
  name: string;
  phone: string;
  address: string;
  balance: number;
  due: number;
  wallet: number;
  orderCount: number;
  lifetimeSpend: number;
  lastVisit: string | null;
  createdAt: string;
  updatedAt: string;
  transactions?: BridgeCustomerTransaction[];
};

export type BridgeMenuItem = {
  id: number;
  name: string;
  price: number;
  prices: Record<string, number>;
  image: string;
};

export type BridgeMenuGroup = {
  id: string;
  title: string;
  items: BridgeMenuItem[];
};

export type BridgeTableStatus = "available" | "occupied" | "reserved";

export type BridgeTable = {
  id: number;
  name: string;
  capacity: number;
  status: BridgeTableStatus;
};

export type BridgeInventoryItem = {
  id: number;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  cost: number;
};

export type BridgeStaff = {
  id: number;
  name: string;
  email?: string;
  phone: string;
  role: "owner" | "manager" | "cashier" | "kitchen" | "waiter";
  isActive: boolean;
  password?: string;
};

const MENU_IMAGE_RELATIVE_URL = "/menu.jpeg";

export function getMenuImageUrl() {
  return MENU_IMAGE_RELATIVE_URL;
}

function pickBasePrice(prices: Record<string, number>) {
  const values = Object.values(prices);
  return values.length ? Math.min(...values) : 0;
}

function toGroupId(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type BackendMenuCategory = {
  id: string;
  title: string;
  items: Array<{
    id: number;
    name: string;
    prices?: Record<string, number>;
    image?: string;
  }>;
};

function localFallbackMenuGroups(): BridgeMenuGroup[] {
  return [];
}

function mapBackendMenuToBridgeGroups(categories: BackendMenuCategory[]): BridgeMenuGroup[] {
  return (Array.isArray(categories) ? categories : [])
    .map((category, categoryIndex) => ({
      id: String(category.id || toGroupId(category.title) || `group-${categoryIndex + 1}`),
      title: String(category.title || "Menu"),
      items: (Array.isArray(category.items) ? category.items : []).map((item, itemIndex) => ({
        id: Number(item.id) || categoryIndex * 1000 + itemIndex + 1,
        name: String(item.name || "Item"),
        prices: item.prices && typeof item.prices === "object" ? item.prices : { Regular: 0 },
        price: pickBasePrice(item.prices || { Regular: 0 }),
        image: item.image || getMenuImageUrl(),
      })),
    }))
    .filter((group) => group.items.length > 0)
    .sort((a, b) => {
        const aIsCombos = a.id === "combos" || a.title.toLowerCase() === "combos";
        const bIsCombos = b.id === "combos" || b.title.toLowerCase() === "combos";
        if (aIsCombos && !bIsCombos) return -1;
        if (!aIsCombos && bIsCombos) return 1;

      const aIsExtra = a.id === "extra" || a.title.toLowerCase() === "extra";
      const bIsExtra = b.id === "extra" || b.title.toLowerCase() === "extra";
      if (aIsExtra && !bIsExtra) return -1;
      if (!aIsExtra && bIsExtra) return 1;
      return 0;
    });
}

export function getBridgeMenuGroups(): BridgeMenuGroup[] {
  return localFallbackMenuGroups();
}

export async function fetchBridgeMenuGroups(): Promise<BridgeMenuGroup[]> {
  try {
    const response = await fetch(`${USER_BACKEND_URL}/api/menu`);
    if (!response.ok) throw new Error("Failed to fetch menu");
    const data = (await response.json()) as BackendMenuCategory[];
    return mapBackendMenuToBridgeGroups(data);
  } catch {
    return localFallbackMenuGroups();
  }
}

export async function createBridgeMenuItem(payload: {
  categoryId?: string;
  categoryTitle: string;
  name: string;
  price?: number;
  prices?: Record<string, number>;
  image?: string;
}) {
  const prices =
    payload.prices && typeof payload.prices === "object"
      ? payload.prices
      : payload.price !== undefined
        ? { Regular: payload.price }
        : { Regular: 0 };

  const response = await fetch(`${USER_BACKEND_URL}/api/menu`, {
    method: "POST",
    headers: buildAdminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      categoryId: payload.categoryId,
      categoryTitle: payload.categoryTitle,
      name: payload.name,
      prices,
      image: payload.image,
    }),
  });
  if (!response.ok) throw new Error("Failed to create menu item");
  return response.json();
}

export async function updateBridgeMenuItem(
  itemId: number,
  payload: {
    categoryId?: string;
    categoryTitle?: string;
    name?: string;
    price?: number;
    prices?: Record<string, number>;
    image?: string;
  },
) {
  const prices =
    payload.prices && typeof payload.prices === "object"
      ? payload.prices
      : payload.price !== undefined
        ? { Regular: payload.price }
        : undefined;

  const response = await fetch(`${USER_BACKEND_URL}/api/menu/${itemId}`, {
    method: "PATCH",
    headers: buildAdminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      categoryId: payload.categoryId,
      categoryTitle: payload.categoryTitle,
      name: payload.name,
      prices,
      image: payload.image,
    }),
  });
  if (!response.ok) throw new Error("Failed to update menu item");
  return response.json();
}

export async function deleteBridgeMenuItem(itemId: number) {
  const response = await fetch(`${USER_BACKEND_URL}/api/menu/${itemId}`, {
    method: "DELETE",
    headers: buildAdminHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete menu item");
}

export function subscribeBridgeMenu(onMenuChanged: () => void) {
  let active = true;
  let lastFingerprint = "";

  const poll = async () => {
    try {
      const groups = await fetchBridgeMenuGroups();
      const nextFingerprint = JSON.stringify(groups);
      if (!lastFingerprint) {
        lastFingerprint = nextFingerprint;
        return;
      }
      if (nextFingerprint !== lastFingerprint) {
        lastFingerprint = nextFingerprint;
        onMenuChanged();
      }
    } catch {
      // no-op
    }
  };

  void poll();
  const pollId = window.setInterval(() => {
    if (!active) return;
    void poll();
  }, BRIDGE_POLL_INTERVAL_MS);

  return () => {
    active = false;
    window.clearInterval(pollId);
  };
}

export const bridgeMenuGroups: BridgeMenuGroup[] = getBridgeMenuGroups();

const tablesStorageKey = "cbk_admin_tables";
const inventoryStorageKey = "cbk_admin_inventory";
const inventoryChangedEvent = "cbk_inventory_changed";
const staffStorageKey = "cbk_admin_staff";
const staffChangedEvent = "cbk_staff_changed";

const defaultTables: BridgeTable[] = [
  { id: 1, name: "T1", capacity: 4, status: "available" },
  { id: 2, name: "T2", capacity: 4, status: "available" },
  { id: 3, name: "T3", capacity: 2, status: "reserved" },
  { id: 4, name: "T4", capacity: 6, status: "occupied" },
  { id: 5, name: "T5", capacity: 4, status: "available" },
  { id: 6, name: "T6", capacity: 8, status: "available" },
];

const defaultInventory: BridgeInventoryItem[] = [
  { id: 1, name: "Basmati Rice", category: "Grains", unit: "kg", stock: 28, minStock: 8, cost: 95 },
  { id: 2, name: "Chicken", category: "Meat", unit: "kg", stock: 16, minStock: 6, cost: 220 },
  { id: 3, name: "Paneer", category: "Dairy", unit: "kg", stock: 11, minStock: 4, cost: 300 },
  { id: 4, name: "Cooking Oil", category: "Essentials", unit: "ltr", stock: 18, minStock: 5, cost: 130 },
  { id: 5, name: "Spice Mix", category: "Spices", unit: "kg", stock: 7, minStock: 3, cost: 420 },
  { id: 6, name: "Mushroom", category: "Veggies", unit: "kg", stock: 9, minStock: 3, cost: 180 },
];

const defaultStaff: BridgeStaff[] = [
  {
    id: 1,
    name: "Owner",
    email: "owner@tabio.com",
    phone: "9999999999",
    role: "owner",
    isActive: true,
    password: "demo1234",
  },
  {
    id: 2,
    name: "Kitchen Captain",
    email: "kitchen@chkhna.com",
    phone: "9000000002",
    role: "kitchen",
    isActive: true,
  },
];

export function getStoredTables(): BridgeTable[] {
  const raw = localStorage.getItem(tablesStorageKey);
  if (!raw) return defaultTables;
  try {
    const parsed = JSON.parse(raw) as BridgeTable[];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultTables;
    return parsed;
  } catch {
    return defaultTables;
  }
}

export function saveStoredTables(tables: BridgeTable[]) {
  localStorage.setItem(tablesStorageKey, JSON.stringify(tables));
}

export function getStoredInventory(): BridgeInventoryItem[] {
  const raw = localStorage.getItem(inventoryStorageKey);
  if (!raw) return defaultInventory;
  try {
    const parsed = JSON.parse(raw) as BridgeInventoryItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultInventory;
    return parsed;
  } catch {
    return defaultInventory;
  }
}

export function saveStoredInventory(items: BridgeInventoryItem[]) {
  localStorage.setItem(inventoryStorageKey, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(inventoryChangedEvent));
}

export function subscribeInventoryChanges(onChange: (items: BridgeInventoryItem[]) => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key !== inventoryStorageKey) return;
    onChange(getStoredInventory());
  };

  const handleCustomEvent = () => {
    onChange(getStoredInventory());
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(inventoryChangedEvent, handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(inventoryChangedEvent, handleCustomEvent);
  };
}

export function createInventoryItem(input: Omit<BridgeInventoryItem, "id">): BridgeInventoryItem {
  const items = getStoredInventory();
  const nextId = items.length ? Math.max(...items.map((item) => item.id)) + 1 : 1;
  const nextItem: BridgeInventoryItem = {
    id: nextId,
    ...input,
  };
  const updated = [nextItem, ...items];
  saveStoredInventory(updated);
  return nextItem;
}

export function updateInventoryItem(itemId: number, patch: Partial<Omit<BridgeInventoryItem, "id">>): BridgeInventoryItem | null {
  const items = getStoredInventory();
  let updatedItem: BridgeInventoryItem | null = null;

  const updated = items.map((item) => {
    if (item.id !== itemId) return item;
    updatedItem = {
      ...item,
      ...patch,
      stock: Math.max(0, Number(patch.stock ?? item.stock)),
      minStock: Math.max(0, Number(patch.minStock ?? item.minStock)),
      cost: Math.max(0, Number(patch.cost ?? item.cost)),
    };
    return updatedItem;
  });

  saveStoredInventory(updated);
  return updatedItem;
}

export function deleteInventoryItem(itemId: number): boolean {
  const items = getStoredInventory();
  const updated = items.filter((item) => item.id !== itemId);
  if (updated.length === items.length) return false;
  saveStoredInventory(updated);
  return true;
}

export function getStoredStaff(): BridgeStaff[] {
  const raw = localStorage.getItem(staffStorageKey);
  if (!raw) return defaultStaff;
  try {
    const parsed = JSON.parse(raw) as BridgeStaff[];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultStaff;
    return parsed;
  } catch {
    return defaultStaff;
  }
}

export function saveStoredStaff(staff: BridgeStaff[]) {
  localStorage.setItem(staffStorageKey, JSON.stringify(staff));
  window.dispatchEvent(new CustomEvent(staffChangedEvent));
}

export function subscribeStaffChanges(onChange: (staff: BridgeStaff[]) => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key !== staffStorageKey) return;
    onChange(getStoredStaff());
  };

  const handleCustomEvent = () => {
    onChange(getStoredStaff());
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(staffChangedEvent, handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(staffChangedEvent, handleCustomEvent);
  };
}

export function createStaffMember(input: Omit<BridgeStaff, "id">): BridgeStaff {
  const staff = getStoredStaff();
  const nextId = staff.length ? Math.max(...staff.map((member) => member.id)) + 1 : 1;
  const nextMember: BridgeStaff = {
    id: nextId,
    ...input,
  };
  saveStoredStaff([nextMember, ...staff]);
  return nextMember;
}

export function updateStaffMember(staffId: number, patch: Partial<Omit<BridgeStaff, "id">>): BridgeStaff | null {
  const staff = getStoredStaff();
  let updatedMember: BridgeStaff | null = null;
  const updated = staff.map((member) => {
    if (member.id !== staffId) return member;
    updatedMember = {
      ...member,
      ...patch,
    };
    return updatedMember;
  });
  saveStoredStaff(updated);
  return updatedMember;
}

export function deleteStaffMember(staffId: number): boolean {
  const staff = getStoredStaff();
  if (staff.length <= 1) return false;
  const updated = staff.filter((member) => member.id !== staffId);
  if (updated.length === staff.length) return false;
  saveStoredStaff(updated);
  return true;
}

export async function fetchBridgeOrders(): Promise<BridgeOrder[]> {
  const response = await fetch(`${USER_BACKEND_URL}/api/orders`);
  if (!response.ok) throw new Error("Failed to fetch bridge orders");
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchBridgeCustomers(): Promise<BridgeCustomer[]> {
  const response = await fetch(`${USER_BACKEND_URL}/api/customers`);
  if (!response.ok) throw new Error("Failed to fetch bridge customers");
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function upsertBridgeCustomer(payload: {
  name: string;
  phone?: string;
  address?: string;
  openingBalance?: number;
  note?: string;
}) {
  const response = await fetch(`${USER_BACKEND_URL}/api/customers`, {
    method: "POST",
    headers: buildAdminHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await buildRequestError(response, "Failed to save customer");
  return response.json() as Promise<BridgeCustomer>;
}

export async function deleteBridgeCustomer(customerId: string) {
  const response = await fetch(`${USER_BACKEND_URL}/api/customers/${customerId}`, {
    method: "DELETE",
    headers: buildAdminHeaders(),
  });
  if (!response.ok) throw await buildRequestError(response, "Failed to delete customer");
}

export function subscribeBridgeCustomers(onChange: (customers: BridgeCustomer[]) => void) {
  let active = true;
  let lastFingerprint = "";

  const poll = async () => {
    try {
      const customers = await fetchBridgeCustomers();
      const nextFingerprint = JSON.stringify(customers);
      if (!lastFingerprint) {
        lastFingerprint = nextFingerprint;
        return;
      }
      if (nextFingerprint !== lastFingerprint) {
        lastFingerprint = nextFingerprint;
        onChange(customers);
      }
    } catch {
      // no-op
    }
  };

  void poll();
  const pollId = window.setInterval(() => {
    if (!active) return;
    void poll();
  }, BRIDGE_POLL_INTERVAL_MS);

  return () => {
    active = false;
    window.clearInterval(pollId);
  };
}

export async function patchBridgeOrderStatus(orderId: string, status: BridgeOrderStatus): Promise<BridgeOrder> {
  const response = await fetch(`${USER_BACKEND_URL}/api/orders/${orderId}`, {
    method: "PATCH",
    headers: buildAdminHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw await buildRequestError(response, "Failed to update order status");
  return response.json();
}

export async function deleteBridgeOrder(orderId: string): Promise<void> {
  const response = await fetch(`${USER_BACKEND_URL}/api/orders/${orderId}`, {
    method: "DELETE",
    headers: buildAdminHeaders(),
  });
  if (!response.ok) throw await buildRequestError(response, "Failed to delete order");
}

export function subscribeBridgeOrders(
  onNewOrder: (order: BridgeOrder) => void,
  onUpdatedOrder: (order: BridgeOrder) => void,
  onDeletedOrder?: (payload: { _id: string }) => void,
) {
  let active = true;
  const snapshot = new Map<string, BridgeOrder>();

  const sync = async () => {
    try {
      const orders = await fetchBridgeOrders();
      const incoming = new Map<string, BridgeOrder>();

      for (const order of orders) {
        incoming.set(order._id, order);
      }

      // On first sync, establish a baseline so existing orders are not emitted as "new"
      // and therefore duplicated in pages that already loaded initial data separately.
      if (snapshot.size === 0) {
        snapshot.clear();
        for (const [id, order] of incoming.entries()) {
          snapshot.set(id, order);
        }
        return;
      }

      for (const order of incoming.values()) {
        const previous = snapshot.get(order._id);
        if (!previous) {
          onNewOrder(order);
          continue;
        }
        if (JSON.stringify(previous) !== JSON.stringify(order)) {
          onUpdatedOrder(order);
        }
      }

      if (onDeletedOrder) {
        for (const existingId of snapshot.keys()) {
          if (!incoming.has(existingId)) {
            onDeletedOrder({ _id: existingId });
          }
        }
      }

      snapshot.clear();
      for (const [id, order] of incoming.entries()) {
        snapshot.set(id, order);
      }
    } catch {
      // no-op
    }
  };

  void sync();
  const pollId = window.setInterval(() => {
    if (!active) return;
    void sync();
  }, BRIDGE_POLL_INTERVAL_MS);

  return () => {
    active = false;
    window.clearInterval(pollId);
  };
}

export function deriveCustomersFromOrders(orders: BridgeOrder[]) {
  const map = new Map<string, { phone: string; name: string; orders: number; spend: number; lastVisit: string; address: string }>();

  for (const order of orders) {
    const key = order.phone || `${order.customerName}-${order._id}`;
    const existing = map.get(key);
    if (existing) {
      existing.orders += 1;
      existing.spend += order.total;
      if (new Date(order.createdAt) > new Date(existing.lastVisit)) {
        existing.lastVisit = order.createdAt;
        existing.name = order.customerName;
        existing.address = order.address;
      }
    } else {
      map.set(key, {
        phone: order.phone,
        name: order.customerName,
        orders: 1,
        spend: order.total,
        lastVisit: order.createdAt,
        address: order.address,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.orders - a.orders);
}

export function nextBridgeStatus(status: BridgeOrderStatus): BridgeOrderStatus {
  if (status === "Preparing") return "Ready";
  if (status === "Ready") return "Delivered";
  return "Delivered";
}
