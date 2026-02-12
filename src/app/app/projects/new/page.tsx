"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

type BookingStep = "details" | "items" | "review";

interface TextileItem {
  id: string;
  category: string;
  itemName: string;
  quantity: number;
  notes: string;
}

const TEXTILE_CATEGORIES = [
  {
    id: "HOTEL",
    label: "Hotel & Hospitality",
    items: [
      "Bed Sheets (Single)",
      "Bed Sheets (Double)",
      "Bed Sheets (King)",
      "Pillow Covers",
      "Duvet Covers",
      "Bath Towels",
      "Hand Towels",
      "Face Towels",
      "Bathrobes",
      "Table Napkins",
      "Tablecloths",
      "Chair Covers",
      "Curtains",
      "Blankets",
    ],
  },
  {
    id: "HOSPITAL",
    label: "Hospital & Medical",
    items: [
      "Patient Bed Sheets",
      "Patient Gowns",
      "Surgical Drapes",
      "Surgical Towels",
      "Pillow Covers",
      "Blankets",
      "Lab Coats",
      "Scrubs (Top)",
      "Scrubs (Bottom)",
      "Mattress Protectors",
    ],
  },
  {
    id: "HOSTEL",
    label: "Hostel & PG",
    items: [
      "Bed Sheets (Single)",
      "Pillow Covers",
      "Blankets",
      "Towels",
      "Curtains",
      "Mattress Covers",
    ],
  },
  {
    id: "SALON",
    label: "Salon & Spa",
    items: [
      "Capes & Aprons",
      "Towels (Small)",
      "Towels (Large)",
      "Robes",
      "Head Wraps",
      "Seat Covers",
      "Wax Strips Cloth",
    ],
  },
  {
    id: "RESTAURANT",
    label: "Restaurant & Cafe",
    items: [
      "Table Napkins",
      "Tablecloths",
      "Aprons",
      "Chef Coats",
      "Kitchen Towels",
      "Seat Covers",
    ],
  },
  {
    id: "GENERAL",
    label: "General / Custom",
    items: [
      "Uniforms",
      "Overalls",
      "Mops & Dusters",
      "Rugs",
      "Cushion Covers",
      "Other (specify in notes)",
    ],
  },
];

let nextId = 1;
function genId() {
  return `item_${nextId++}`;
}

export default function NewProject() {
  const router = useRouter();
  const [bookingStep, setBookingStep] = useState<BookingStep>("details");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<TextileItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(
    TEXTILE_CATEGORIES[0].id,
  );
  const [submitting, setSubmitting] = useState(false);

  const addItem = (itemName: string, category: string) => {
    const existing = items.find(
      (i) => i.itemName === itemName && i.category === category,
    );
    if (existing) {
      setItems(
        items.map((i) =>
          i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i,
        ),
      );
    } else {
      setItems([
        ...items,
        { id: genId(), category, itemName, quantity: 1, notes: "" },
      ]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems(
      items
        .map((i) =>
          i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i,
        )
        .filter((i) => i.quantity > 0),
    );
  };

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const updateNotes = (id: string, notes: string) => {
    setItems(items.map((i) => (i.id === id ? { ...i, notes } : i)));
  };

  const setQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      removeItem(id);
    } else {
      setItems(items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)));
    }
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const activeCat = TEXTILE_CATEGORIES.find((c) => c.id === selectedCategory);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      if (!res.ok) {
        alert((await res.json()).error ?? "Failed to create order");
        setSubmitting(false);
        return;
      }
      const data = await res.json();
      const projectId = data.id;

      if (items.length > 0) {
        const itemsRes = await fetch(`/api/projects/${projectId}/items`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            items: items.map((i) => ({
              category: i.category,
              itemName: i.itemName,
              quantity: i.quantity,
              notes: i.notes || undefined,
            })),
          }),
        });
        if (!itemsRes.ok) {
          alert("Order created but failed to save items");
        }
      }

      router.push(`/app/projects/${projectId}`);
    } catch {
      alert("Something went wrong");
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Laundry Order</h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Create a booking for commercial laundry services.
        </p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-2">
        {(["details", "items", "review"] as BookingStep[]).map((s, i) => {
          const labels = {
            details: "Order Details",
            items: "Select Textiles",
            review: "Review",
          };
          const idx = ["details", "items", "review"].indexOf(bookingStep);
          const isActive = i === idx;
          const isDone = i < idx;
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`h-0.5 w-8 ${isDone ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--border))]"}`}
                />
              )}
              <button
                onClick={() => {
                  if (isDone) setBookingStep(s);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "bg-[hsl(var(--primary))] text-white"
                    : isDone
                      ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                      : "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]"
                }`}
              >
                {labels[s]}
              </button>
            </div>
          );
        })}
      </div>

      {/* Step 1: Details */}
      {bookingStep === "details" && (
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
            <CardDescription>
              Name your order and add a description.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Order Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Weekly Hotel Linen - Batch #42"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description *</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your laundry requirements, special instructions, pickup/delivery preferences..."
                className="min-h-[100px]"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => setBookingStep("items")}
                disabled={
                  title.trim().length < 3 || description.trim().length < 3
                }
                className="gap-2"
              >
                Next: Select Textiles <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Textile Items */}
      {bookingStep === "items" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Select Textile Items</CardTitle>
              <CardDescription>
                Choose items from categories common to hotels, hospitals,
                hostels, salons, and more.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category tabs */}
              <div className="flex flex-wrap gap-2">
                {TEXTILE_CATEGORIES.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={
                      selectedCategory === cat.id ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>

              {/* Items grid */}
              {activeCat && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {activeCat.items.map((itemName) => {
                    const existing = items.find(
                      (i) =>
                        i.itemName === itemName &&
                        i.category === activeCat.id,
                    );
                    return (
                      <button
                        key={itemName}
                        type="button"
                        onClick={() => addItem(itemName, activeCat.id)}
                        className={`flex items-center justify-between rounded-2xl border p-3 text-left transition ${
                          existing
                            ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]"
                            : "hover:bg-[hsl(var(--accent))]"
                        }`}
                      >
                        <span className="text-sm">{itemName}</span>
                        {existing ? (
                          <Badge className="bg-[hsl(var(--primary))] text-white">
                            {existing.quantity}
                          </Badge>
                        ) : (
                          <Plus className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected items summary */}
          {items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Selected Items ({totalItems} pieces)
                </CardTitle>
                <CardDescription>
                  Adjust quantities or add notes for special handling.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {item.itemName}
                        </div>
                        <div className="text-xs text-[hsl(var(--muted-foreground))]">
                          {
                            TEXTILE_CATEGORIES.find(
                              (c) => c.id === item.category,
                            )?.label
                          }
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            setQuantity(
                              item.id,
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="h-8 w-16 text-center"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Input
                      value={item.notes}
                      onChange={(e) => updateNotes(item.id, e.target.value)}
                      placeholder="Special instructions (e.g. stain pre-treatment, fabric softener)"
                      className="text-xs"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setBookingStep("details")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              onClick={() => setBookingStep("review")}
              disabled={items.length === 0}
              className="gap-2"
            >
              Review Order <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Step 3: Review */}
      {bookingStep === "review" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Review Your Order</CardTitle>
              <CardDescription>
                Confirm all details before submitting. Items cannot be changed
                once pre-wash and collection begins.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border p-4 space-y-2">
                <div className="text-sm font-semibold text-[hsl(var(--primary))]">
                  Order Details
                </div>
                <div className="text-sm">
                  <span className="text-[hsl(var(--muted-foreground))]">
                    Title:
                  </span>{" "}
                  {title}
                </div>
                <div className="text-sm">
                  <span className="text-[hsl(var(--muted-foreground))]">
                    Description:
                  </span>{" "}
                  {description}
                </div>
              </div>

              <div className="rounded-2xl border p-4 space-y-3">
                <div className="text-sm font-semibold text-[hsl(var(--primary))]">
                  Textile Items ({totalItems} pieces)
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div>
                        <span className="font-medium">{item.itemName}</span>
                        <span className="text-[hsl(var(--muted-foreground))]">
                          {" "}
                          —{" "}
                          {
                            TEXTILE_CATEGORIES.find(
                              (c) => c.id === item.category,
                            )?.label
                          }
                        </span>
                        {item.notes && (
                          <div className="text-xs text-[hsl(var(--muted-foreground))]">
                            Note: {item.notes}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline">×{item.quantity}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-3">
                <p className="text-xs text-yellow-700">
                  Once the provider initiates pre-wash and collection (first
                  milestone is funded), this item list becomes read-only and
                  cannot be modified.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setBookingStep("items")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Edit Items
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-2"
            >
              {submitting ? "Creating…" : "Create Order"}{" "}
              <ShoppingBag className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
