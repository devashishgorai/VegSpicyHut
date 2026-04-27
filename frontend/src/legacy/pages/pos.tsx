import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ReceiptText, ShoppingCart } from "lucide-react";
import {
  BridgeCustomer,
  BridgeMenuItem,
  fetchBridgeCustomers,
  fetchBridgeMenuGroups,
  getMenuImageUrl,
  getBridgeMenuGroups,
  getStoredTables,
  saveStoredTables,
  subscribeBridgeMenu,
  subscribeBridgeCustomers,
  USER_BACKEND_URL,
} from "@/lib/bridge";

type CartItem = {
  id: number;
  name: string;
  variant: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type DeliveryArea = "DLF" | "PS Group" | "Elita" | "Shapoorji Sukhobrishti";

const FIXED_CHARGE_AREAS: DeliveryArea[] = ["DLF", "PS Group", "Elita"];

const VEG_SPICY_MENU_IMAGE_MAP: Array<{ keywords: string[]; path: string }> = [
  { keywords: [ "lassi", "chach"], path: "/VegSpicyMenu/Lassi.webp" },
  { keywords: [ "water bottle" ], path: "/VegSpicyMenu/waterbottle.avif" },
  { keywords: [ "cold drinks", "drink", "beverage" ], path: "/VegSpicyMenu/colddrink.jpg" },
  { keywords: [ "Ajwain Prantha" ], path: "/VegSpicyMenu/AjwainPrantha.jpg" },
  { keywords: ["aloo pyaaz", "pyaaz aloo"], path: "/VegSpicyMenu/AlooPyaazParantha.webp" },
  { keywords: ["aloo prantha", "aloo paratha"], path: "/VegSpicyMenu/AlooPrantha.jpg" },
  { keywords: ["pyaaz prantha", "onion prantha", "onion paratha"], path: "/VegSpicyMenu/PyaazPrantha.jpg" },
  { keywords: ["masala lachha", "lacha paratha", "lachha paratha"], path: "/VegSpicyMenu/MasalaLachhaPrantha.jpg" },
  { keywords: ["wheat lachha"], path: "/VegSpicyMenu/WheatLachhaPrantha.jpg" },
  { keywords: ["plain prantha", "plain paratha"], path: "/VegSpicyMenu/PlainPrantha.jpg" },
  { keywords: ["plain roti"], path: "/VegSpicyMenu/PlainRoti.jpg" },
  { keywords: ["butter roti"], path: "/VegSpicyMenu/ButterRoti.webp" },
  { keywords: ["paneer makhani"], path: "/VegSpicyMenu/PaneerMakhani.jpg" },
  { keywords: ["paneer bhurji"], path: "/VegSpicyMenu/PaneerBhurji.jpg" },
  { keywords: ["palak paneer"], path: "/VegSpicyMenu/PalakPaneer.jpg" },
  { keywords: ["masala chole", "chole"], path: "/VegSpicyMenu/MasalaChole.jpg" },
  { keywords: ["dal fry"], path: "/VegSpicyMenu/ButterDalFry.jpg" },
  { keywords: ["kadhi pakora"], path: "/VegSpicyMenu/KadhiPakora.jpg" },
  { keywords: ["veg handi"], path: "/VegSpicyMenu/VegHandi.jpg" },
  { keywords: ["dry mix veg"], path: "/VegSpicyMenu/DryMixVeg.jpg" },
  { keywords: ["jeera aloo"], path: "/VegSpicyMenu/JeeraAloo.jpg" },
  { keywords: ["masala mushroom"], path: "/VegSpicyMenu/MasalaMushroom.jpg" },
  { keywords: ["masala chaap"], path: "/VegSpicyMenu/MasalaChaap.jpg" },
  { keywords: ["creamy palak corn"], path: "/VegSpicyMenu/CreamyPalakCorn.jpg" },
  { keywords: ["punjabi kali dal", "kali dal"], path: "/VegSpicyMenu/PanjabikaliDal.jpg" },
  { keywords: ["kashmiri pulao"], path: "/VegSpicyMenu/KashmiriPulao.jpg" },
  { keywords: ["tawa pulao"], path: "/VegSpicyMenu/SpecailTawaPulao.jpg" },
  { keywords: ["veg pulao", "peas pulao"], path: "/VegSpicyMenu/VegPulao_PeasPulao.jpg" },
  { keywords: ["jeera rice"], path: "/VegSpicyMenu/JeeraRice.jpg" },
  { keywords: ["plain rice"], path: "/VegSpicyMenu/PlainRice.webp" },
  { keywords: ["boondi raita"], path: "/VegSpicyMenu/BoondiRaita.jpg" },
  { keywords: ["vegetable raita"], path: "/VegSpicyMenu/VegetableRaita.jpg" },
  { keywords: ["jeera raita"], path: "/VegSpicyMenu/JeeraRaita.webp" },
  { keywords: ["plain curd"], path: "/VegSpicyMenu/PlainCurd.jpg" },
  { keywords: ["green salad"], path: "/VegSpicyMenu/GreenSalad.jpg" },
  { keywords: ["onion salad"], path: "/VegSpicyMenu/onionsalad.jpeg" },
  { keywords: ["fried papad"], path: "/VegSpicyMenu/FriedPapad.jpg" },
  { keywords: ["roasted papad"], path: "/VegSpicyMenu/RoastedPapad.jpg" },
  { keywords: ["gulab jamun"], path: "/VegSpicyMenu/GulabJamun.jpg" },
  { keywords: ["classic thali"], path: "/VegSpicyMenu/ClassicThali.png" },
  { keywords: ["premium thali"], path: "/VegSpicyMenu/PremiumThali.png" },
  { keywords: ["shahi thali"], path: "/VegSpicyMenu/ShahiThali.png" },
  { keywords: ["combo"], path: "/VegSpicyMenu/PFC_RS140.png" },
];

function resolveVegSpicyMenuImage(itemName: string, fallbackImage: string) {
  const normalized = String(itemName || "").toLowerCase();
  const matched = VEG_SPICY_MENU_IMAGE_MAP.find((entry) =>
    entry.keywords.some((keyword) => normalized.includes(String(keyword).toLowerCase())),
  );

  return matched?.path || fallbackImage;
}

function computeDeliveryCharge(orderType: "dine-in" | "takeaway" | "delivery", subtotal: number, deliveryArea: DeliveryArea | "") {
  if (orderType !== "delivery") return 0;
  if (!deliveryArea) return 20;

  if (FIXED_CHARGE_AREAS.includes(deliveryArea)) {
    return 20;
  }

  if (deliveryArea === "Shapoorji Sukhobrishti") {
    return subtotal < 200 ? 20 : 0;
  }

  return 20;
}

export default function POS() {
  const [menuGroups, setMenuGroups] = useState(getBridgeMenuGroups);
  const [activeGroupId, setActiveGroupId] = useState(menuGroups[0]?.id || "");
  const [search, setSearch] = useState("");
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway" | "delivery">("dine-in");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "GPay" | "PhonePe" | "Account">("Cash");
  const [deliveryArea, setDeliveryArea] = useState<DeliveryArea | "">("");
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [placing, setPlacing] = useState(false);
  const [customers, setCustomers] = useState<BridgeCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<BridgeCustomer | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [flatNo, setFlatNo] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [landmark, setLandmark] = useState("");
  const [autoLocation, setAutoLocation] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const tables = getStoredTables();
  const availableTables = tables.filter((table) => table.status === "available");
  const menuImageUrl = getMenuImageUrl();

  const activeGroup = menuGroups.find((group) => group.id === activeGroupId) || menuGroups[0];

  useEffect(() => {
    async function reloadMenu() {
      const nextGroups = await fetchBridgeMenuGroups();
      setMenuGroups(nextGroups);
      if (!nextGroups.some((group) => group.id === activeGroupId)) {
        setActiveGroupId(nextGroups[0]?.id || "");
      }
    }

    reloadMenu();
    return subscribeBridgeMenu(() => {
      reloadMenu();
    });
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCustomers() {
      try {
        const nextCustomers = await fetchBridgeCustomers();
        if (active) {
          setCustomers(nextCustomers);
        }
      } catch {
        if (active) {
          setCustomers([]);
        }
      }
    }

    loadCustomers();
    return subscribeBridgeCustomers((nextCustomers) => {
      if (active) {
        setCustomers(nextCustomers);
      }
    });
  }, []);

  const filteredItems = useMemo(
    () =>
      (activeGroup?.items || []).filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase())),
    [activeGroup?.items, search],
  );

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.totalPrice, 0), [cart]);
  const deliveryCharge = cart.length > 0 ? computeDeliveryCharge(orderType, subtotal, deliveryArea) : 0;
  const total = subtotal + deliveryCharge;
  const customerQuery = customerName.trim().toLowerCase();
  const resolvedCustomer = useMemo(() => {
    if (selectedCustomer) return selectedCustomer;
    if (!customerQuery && !phone.trim()) return null;

    return (
      customers.find((customer) => {
        const customerNameMatches = customer.name.toLowerCase() === customerQuery;
        const customerNameIncludes = customerQuery.length >= 2 && customer.name.toLowerCase().includes(customerQuery);
        const phoneMatches = phone.trim() ? customer.phone.replace(/\D/g, "") === phone.replace(/\D/g, "") : false;
        return customerNameMatches || customerNameIncludes || phoneMatches;
      }) || null
    );
  }, [customers, customerQuery, phone, selectedCustomer]);
  const customerBalanceAfterBill = resolvedCustomer && paymentMethod === "Account" ? resolvedCustomer.balance - total : resolvedCustomer?.balance ?? null;
  const customerSuggestions = useMemo(() => {
    const query = customerName.trim().toLowerCase();
    if (query.length < 2 && phone.trim().length < 3) {
      return customers.slice(0, 6);
    }

    return customers.filter((customer) => {
      const nameMatch = customer.name.toLowerCase().includes(query);
      const phoneMatch = phone.trim() ? customer.phone.includes(phone.replace(/\D/g, "")) : false;
      return nameMatch || phoneMatch;
    }).slice(0, 8);
  }, [customers, customerName, phone]);
  const deliveryTermsMessage =
    deliveryArea === "Shapoorji Sukhobrishti"
      ? subtotal < 200
        ? "Shapoorji Sukhobrishti: delivery is Rs 20 for subtotal below Rs 200."
        : "Shapoorji Sukhobrishti: free delivery for subtotal Rs 200 or above."
      : deliveryArea
        ? `${deliveryArea}: fixed delivery charge Rs 20.`
        : "Select delivery area to apply the correct delivery rule.";

  function addToCart(item: BridgeMenuItem, variant: string = "Regular") {
    const variantPrice = Number(item.prices?.[variant]);
    const unitPrice = Number.isFinite(variantPrice) ? variantPrice : item.price;

    setCart((prev) => {
      const existing = prev.find((entry) => entry.id === item.id && entry.variant === variant);
      if (existing) {
        return prev.map((entry) =>
          entry.id === item.id && entry.variant === variant
            ? {
                ...entry,
                quantity: entry.quantity + 1,
                totalPrice: (entry.quantity + 1) * entry.unitPrice,
              }
            : entry,
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          variant,
          quantity: 1,
          unitPrice,
          totalPrice: unitPrice,
        },
      ];
    });
  }

  function updateQuantity(id: number, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          const quantity = Math.max(0, item.quantity + delta);
          return {
            ...item,
            quantity,
            totalPrice: quantity * item.unitPrice,
          };
        })
        .filter((item) => item.quantity > 0),
    );
  }

  function selectCustomer(customer: BridgeCustomer) {
    setSelectedCustomer(customer);
    setCustomerName(customer.name);
    if (customer.phone) {
      setPhone(customer.phone);
    }
    setPaymentMethod("Account");
  }

  function clearCustomerSelection() {
    setSelectedCustomer(null);
  }

  async function useAutoLocation() {
    if (!navigator.geolocation) {
      setAutoLocation("Geolocation not supported on this browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
          );
          const data = await response.json();
          const label = data?.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          setAutoLocation(label);
        } catch {
          setAutoLocation("Unable to fetch readable location, please type manually");
        }
      },
      () => setAutoLocation("Location permission denied"),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function placeOrder() {
    if (orderType === "delivery" && (!customerName.trim() || !phone.trim())) return;
    if (cart.length === 0) return;
    if (paymentMethod === "Account" && !resolvedCustomer) {
      window.alert("Select a customer before billing to account.");
      return;
    }

    if (orderType === "dine-in" && !selectedTableId) {
      return;
    }

    if (orderType === "delivery" && !flatNo.trim() && !autoLocation.trim()) {
      return;
    }

    if (orderType === "delivery" && !deliveryArea) {
      return;
    }

    setPlacing(true);
    try {
      const digitsOnlyPhone = phone.replace(/\D/g, "");
      const fallbackPhone = "0000000";
      const normalizedPhone = digitsOnlyPhone.length >= 7 ? digitsOnlyPhone : fallbackPhone;

      const addressParts =
        orderType === "delivery"
          ? [
              deliveryArea && `Area: ${deliveryArea}`,
              flatNo && `Flat: ${flatNo}`,
              roomNo && `Room: ${roomNo}`,
              landmark && `Landmark: ${landmark}`,
              autoLocation && `Location: ${autoLocation}`,
            ].filter(Boolean)
          : orderType === "dine-in"
            ? [`Table: ${tables.find((table) => table.id === selectedTableId)?.name || selectedTableId}`]
            : ["Counter pickup"];

      const payload = {
        customerId: resolvedCustomer?._id,
        customerName: customerName.trim() || (orderType === "dine-in" ? "Walk-in Guest" : "Takeaway Guest"),
        phone: normalizedPhone,
        address: addressParts.join(", "),
        paymentMethod,
        items: cart.map((item) => ({
          name: item.name,
          variant: item.variant,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        deliveryCharge,
        total: Math.round(total),
      };

      const response = await fetch(`${USER_BACKEND_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = "Failed to place order";
        try {
          const data = await response.json();
          if (typeof data?.message === "string" && data.message.trim()) {
            message = data.message;
          }
        } catch {
          // no-op
        }
        throw new Error(message);
      }

      if (orderType === "dine-in" && selectedTableId) {
        const updatedTables = getStoredTables().map((table) =>
          table.id === selectedTableId ? { ...table, status: "occupied" as const } : table,
        );
        saveStoredTables(updatedTables);
      }

      try {
        setCustomers(await fetchBridgeCustomers());
      } catch {
        // no-op
      }

      setCart([]);
      setCustomerName("");
      setPhone("");
      setFlatNo("");
      setRoomNo("");
      setLandmark("");
      setAutoLocation("");
      setDeliveryArea("");
      setPaymentMethod("Cash");
      setSelectedTableId(null);
      setSavedAt(null);
      clearCustomerSelection();
    } finally {
      setPlacing(false);
    }
  }

  function saveCartDraft() {
    const draft = {
      orderType,
      selectedTableId,
      customerName,
      phone,
      deliveryArea,
      flatNo,
      roomNo,
      landmark,
      autoLocation,
      paymentMethod,
      cart,
      subtotal,
      deliveryCharge,
      total,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem("cbk_pos_cart_draft", JSON.stringify(draft));
    setSavedAt(new Date().toLocaleTimeString());
  }

  function printEBill() {
    if (cart.length === 0) return;

    const now = new Date();
    const orderNo = `CBK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    const customerLabel = customerName.trim() || (orderType === "dine-in" ? "Walk-in Guest" : "Takeaway Guest");
    const phoneLabel = phone.trim() || "N/A";
    const accountBalanceAfter = resolvedCustomer && paymentMethod === "Account" ? resolvedCustomer.balance - total : null;
    const tableLabel = tables.find((table) => table.id === selectedTableId)?.name || "Not selected";
    const deliveryAddressLabel = [
      deliveryArea && `Area: ${deliveryArea}`,
      flatNo && `Flat: ${flatNo}`,
      roomNo && `Room: ${roomNo}`,
      landmark && `Landmark: ${landmark}`,
      autoLocation && `Location: ${autoLocation}`,
    ]
      .filter(Boolean)
      .join(", ");
    const locationTitle =
      orderType === "delivery" ? "Delivery Address" : orderType === "takeaway" ? "Pickup" : "Table";
    const locationValue =
      orderType === "delivery"
        ? deliveryAddressLabel || "Not provided"
        : orderType === "takeaway"
          ? "Counter pickup"
          : tableLabel;

    const rowsHtml = cart
      .map(
        (item) => `
          <tr>
            <td class="item-name">${item.name}</td>
            <td>${item.variant}</td>
            <td class="num">${item.quantity}</td>
            <td class="num">${item.unitPrice.toFixed(2)}</td>
            <td class="num">${item.totalPrice.toFixed(2)}</td>
          </tr>
        `,
      )
      .join("");

    const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
    const logoUrl = new URL(`${basePath}/logo.png`, window.location.origin).toString();

    const printWindow = window.open("", "_blank", "width=430,height=780");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Veg Spicy Hut E-Bill</title>
          <style>
            @page { size: 80mm auto; margin: 6mm; }
            * { box-sizing: border-box; }
            body {
              font-family: "Courier New", monospace;
              color: #0f172a;
              margin: 0;
              background: #ffffff;
            }
            .bill {
              width: 78mm;
              margin: 0 auto;
              border: 1px dashed #64748b;
              padding: 10px;
            }
            .center { text-align: center; }
            .logo {
              width: 60px;
              height: 60px;
              object-fit: cover;
              border-radius: 10px;
              border: 1px solid #cbd5e1;
              margin-bottom: 6px;
            }
            h1 {
              margin: 0;
              font-size: 16px;
              letter-spacing: 0.3px;
            }
            .muted { color: #334155; font-size: 11px; }
            .line {
              border-top: 1px dashed #334155;
              margin: 8px 0;
            }
            .meta {
              font-size: 11px;
              line-height: 1.45;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            th, td {
              padding: 3px 0;
              border-bottom: 1px dotted #94a3b8;
              vertical-align: top;
            }
            th { text-align: left; font-size: 10px; color: #1e293b; }
            .num { text-align: right; white-space: nowrap; }
            .item-name { max-width: 28mm; }
            .totals {
              margin-top: 8px;
              font-size: 12px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
            }
            .grand {
              font-weight: 800;
              font-size: 14px;
              border-top: 1px dashed #334155;
              padding-top: 5px;
              margin-top: 4px;
            }
            .footer {
              margin-top: 10px;
              text-align: center;
              font-size: 10px;
              color: #1e293b;
            }
          </style>
        </head>
        <body>
          <div class="bill">
            <div class="center">
              <img src="${logoUrl}" alt="Veg Spicy Hut" class="logo" />
              <h1>Veg Spicy Hut</h1>
              <div class="muted">E-BILL / TAX INVOICE</div>
            </div>

            <div class="line"></div>

            <div class="meta">
              <div><strong>Order No:</strong> ${orderNo}</div>
              <div><strong>Date:</strong> ${now.toLocaleDateString()} ${now.toLocaleTimeString()}</div>
              <div><strong>Type:</strong> ${orderType.toUpperCase()}</div>
              <div><strong>Payment:</strong> ${paymentMethod}</div>
              <div><strong>${locationTitle}:</strong> ${locationValue}</div>
              <div><strong>Customer:</strong> ${customerLabel}</div>
              <div><strong>Phone:</strong> ${phoneLabel}</div>
              ${
                accountBalanceAfter !== null
                  ? `<div><strong>Balance After:</strong> ${accountBalanceAfter >= 0 ? `Rs ${accountBalanceAfter.toFixed(2)}` : `Due Rs ${Math.abs(accountBalanceAfter).toFixed(2)}`}</div>`
                  : ""
              }
            </div>

            <div class="line"></div>

            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Var</th>
                  <th class="num">Qty</th>
                  <th class="num">Rate</th>
                  <th class="num">Amt</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="totals">
              <div class="totals-row"><span>Subtotal</span><span>Rs ${subtotal.toFixed(2)}</span></div>
              <div class="totals-row"><span>Delivery</span><span>Rs ${deliveryCharge.toFixed(2)}</span></div>
              <div class="totals-row grand"><span>Grand Total</span><span>Rs ${total.toFixed(2)}</span></div>
            </div>

            <div class="line"></div>

            <div class="footer">
              <div>Thank you for dining with us!</div>
              <div>Fresh Taste. Fast Service.</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  function saveAndPrintBill() {
    if (cart.length === 0) return;
    saveCartDraft();
    printEBill();
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {menuGroups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => setActiveGroupId(group.id)}
              className={
                activeGroupId === group.id
                  ? "px-4 py-2 rounded-full bg-primary text-primary-foreground whitespace-nowrap"
                  : "px-4 py-2 rounded-full bg-muted whitespace-nowrap"
              }
            >
              {group.title}
            </button>
          ))}
        </div>

        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search in menu" />

        <div className="flex-1 overflow-y-auto pr-1">
          {menuGroups.length === 0 && (
            <Card className="mb-4 p-4 border-amber-200 bg-amber-50/60">
              <p className="text-sm font-medium">All menu items were cleared.</p>
              <p className="text-sm text-muted-foreground">Menu source is loaded from menu.jpeg.</p>
              <img src={menuImageUrl} alt="Menu source" className="mt-3 w-full rounded-lg border object-contain max-h-[420px] bg-white" />
            </Card>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <img src={resolveVegSpicyMenuImage(item.name, item.image)} alt={item.name} className="w-full h-36 object-cover object-center" />
                <div className="p-3 space-y-2">
                  <h3 className="font-semibold">{item.name}</h3>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {Object.entries(item.prices || {}).map(([variant, amount]) => (
                      <Badge key={`${item.id}-${variant}`} variant="outline">{variant}: Rs {amount}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {Object.entries(item.prices || {}).length > 0 ? (
                      Object.entries(item.prices || {}).map(([variant]) => (
                        <Button key={`${item.id}-add-${variant}`} onClick={() => addToCart(item, variant)} size="sm">
                          Add {variant}
                        </Button>
                      ))
                    ) : (
                      <Button onClick={() => addToCart(item)} size="sm">Add</Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Card className="w-[420px] h-full min-h-0 flex flex-col overflow-hidden border-blue-200 shadow-xl shadow-blue-200/30 bg-gradient-to-b from-blue-50/50 to-white">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 border-b bg-blue-100/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground font-bold">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <span>Cart</span>
            </div>
            {savedAt && <span className="text-xs text-muted-foreground">Saved {savedAt}</span>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button variant={orderType === "dine-in" ? "default" : "outline"} onClick={() => setOrderType("dine-in")}>Dine-in</Button>
            <Button variant={orderType === "takeaway" ? "default" : "outline"} onClick={() => setOrderType("takeaway")}>Takeaway</Button>
            <Button variant={orderType === "delivery" ? "default" : "outline"} onClick={() => setOrderType("delivery")}>Delivery</Button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <Button variant={paymentMethod === "Cash" ? "default" : "outline"} onClick={() => setPaymentMethod("Cash")}>Cash</Button>
            <Button variant={paymentMethod === "GPay" ? "default" : "outline"} onClick={() => setPaymentMethod("GPay")}>GPay</Button>
            <Button variant={paymentMethod === "PhonePe" ? "default" : "outline"} onClick={() => setPaymentMethod("PhonePe")}>PhonePe</Button>
            <Button variant={paymentMethod === "Account" ? "default" : "outline"} onClick={() => setPaymentMethod("Account")} disabled={!resolvedCustomer}>
              Account
            </Button>
          </div>

          {orderType === "dine-in" && (
            <select
              className="w-full h-10 rounded-md border border-blue-300 bg-white px-3 text-sm"
              value={selectedTableId || ""}
              onChange={(event) => setSelectedTableId(Number(event.target.value))}
            >
              <option value="" disabled>
                Select available table first
              </option>
              {availableTables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name} (Capacity {table.capacity})
                </option>
              ))}
            </select>
          )}

          <Input
            value={customerName}
            onChange={(event) => {
              setCustomerName(event.target.value);
              clearCustomerSelection();
            }}
            placeholder="Customer Name"
          />
          <Input
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              clearCustomerSelection();
            }}
            placeholder="Phone"
          />

          {(customerName.trim().length >= 2 || phone.trim().length >= 3) && customerSuggestions.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-white p-2 shadow-sm space-y-2 max-h-56 overflow-auto">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Matches</p>
              <div className="space-y-2">
                {customerSuggestions.map((customer) => (
                  <button
                    key={customer._id}
                    type="button"
                    className="w-full rounded-md border border-blue-100 px-3 py-2 text-left hover:bg-blue-50 transition-colors"
                    onClick={() => selectCustomer(customer)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{customer.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{customer.phone || "No phone"}</p>
                      </div>
                      <div className="text-right text-sm shrink-0">
                        <p className={customer.balance >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>
                          {customer.balance >= 0 ? `Balance Rs ${customer.balance.toFixed(2)}` : `Due Rs ${Math.abs(customer.balance).toFixed(2)}`}
                        </p>
                        <p className="text-xs text-muted-foreground">{customer.orderCount} orders</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {resolvedCustomer && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-950 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{resolvedCustomer.name}</span>
                <button type="button" className="text-xs underline" onClick={clearCustomerSelection}>
                  Clear
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Current balance</span>
                <span className={resolvedCustomer.balance >= 0 ? "font-semibold" : "font-semibold text-rose-700"}>
                  {resolvedCustomer.balance >= 0 ? `Rs ${resolvedCustomer.balance.toFixed(2)}` : `Due Rs ${Math.abs(resolvedCustomer.balance).toFixed(2)}`}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>After this bill</span>
                <span className={customerBalanceAfterBill !== null && customerBalanceAfterBill >= 0 ? "font-semibold" : "font-semibold text-rose-700"}>
                  {customerBalanceAfterBill === null
                    ? "-"
                    : customerBalanceAfterBill >= 0
                      ? `Rs ${customerBalanceAfterBill.toFixed(2)}`
                      : `Due Rs ${Math.abs(customerBalanceAfterBill).toFixed(2)}`}
                </span>
              </div>
            </div>
          )}

            {orderType === "delivery" && (
              <div className="space-y-2.5">
              <p className="text-xs font-semibold text-blue-900">Delivery Area</p>
              <select
                className="w-full h-10 rounded-md border border-blue-300 bg-white px-3 text-sm"
                value={deliveryArea}
                onChange={(event) => setDeliveryArea(event.target.value as DeliveryArea | "")}
              >
                <option value="" disabled>
                  Select delivery area
                </option>
                <option value="DLF">DLF</option>
                <option value="PS Group">PS Group</option>
                <option value="Elita">Elita</option>
                <option value="Shapoorji Sukhobrishti">Shapoorji Sukhobrishti</option>
              </select>
              <Input value={flatNo} onChange={(event) => setFlatNo(event.target.value)} placeholder="Flat No" />
              <Input value={roomNo} onChange={(event) => setRoomNo(event.target.value)} placeholder="Room No" />
              <Input value={landmark} onChange={(event) => setLandmark(event.target.value)} placeholder="Nearby Landmark" />
              <div className="flex gap-2">
                <Input value={autoLocation} onChange={(event) => setAutoLocation(event.target.value)} placeholder="Auto location / map location" />
                <Button type="button" variant="outline" onClick={useAutoLocation}>Auto</Button>
              </div>
              <div className="rounded-lg border border-blue-300 bg-blue-100/70 px-3 py-3 text-sm text-blue-950 shadow-sm space-y-2">
                <p className="font-bold tracking-tight">Delivery Terms & Conditions</p>
                <ul className="list-disc pl-5 space-y-1 leading-5">
                  <li>DLF, PS Group, Elita: fixed delivery charge Rs 20.</li>
                  <li>Shapoorji Sukhobrishti: Rs 20 if subtotal is below Rs 200, free delivery at Rs 200 or above.</li>
                </ul>
                <div className="rounded-md border border-blue-400 bg-white/80 px-2.5 py-2 font-semibold text-blue-900">
                  Applied rule: {deliveryTermsMessage}
                </div>
              </div>
              </div>
            )}
          </div>

          <div className="p-4 space-y-3 bg-[#f7fcff]">
            {cart.length === 0 && <p className="text-muted-foreground">Cart is empty</p>}
            {cart.map((item) => (
              <div key={`${item.id}-${item.variant}`} className="rounded-xl border border-blue-200 p-3 bg-white flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <img
                    src={resolveVegSpicyMenuImage(item.name, menuImageUrl)}
                    alt={item.name}
                    className="h-14 w-14 rounded-lg border border-blue-100 object-cover object-center shrink-0"
                  />
                  <div className="min-w-0">
                  <p className="font-semibold">{item.name} ({item.variant})</p>
                  <p className="text-sm text-muted-foreground">Rs {item.unitPrice} each</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, -1)}>-</Button>
                  <span className="w-5 text-center">{item.quantity}</span>
                  <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, 1)}>+</Button>
                </div>
                <p className="font-semibold">Rs {item.totalPrice}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t bg-blue-50 space-y-2 shrink-0">
          <div className="flex justify-between text-sm"><span>Subtotal</span><span>Rs {subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span>Delivery</span><span>Rs {deliveryCharge.toFixed(2)}</span></div>
          {orderType === "delivery" && (
            <div className="rounded-md border border-blue-200 bg-white px-2.5 py-2 text-sm text-blue-900">
              {deliveryTermsMessage}
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span>Rs {total.toFixed(2)}</span></div>

          <Button type="button" variant="outline" onClick={saveAndPrintBill} disabled={cart.length === 0}>
            <ReceiptText className="w-4 h-4 mr-2" />
            Save & Print E-Bill
          </Button>

          <Button
            className="w-full mt-2"
            onClick={placeOrder}
            disabled={
              placing ||
              cart.length === 0 ||
              (paymentMethod === "Account" && !resolvedCustomer) ||
              (orderType === "delivery" && !customerName.trim()) ||
              (orderType === "delivery" && !phone.trim()) ||
              (orderType === "dine-in" && !selectedTableId) ||
              (orderType === "delivery" && !deliveryArea) ||
              (orderType === "delivery" && !flatNo.trim() && !autoLocation.trim())
            }
          >
            {placing ? "Placing..." : "Place Bill + Order"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
