import { Router } from "express";
import { db, orders, productStockMovements, products, suppliers } from "@workspace/db";
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const productsRouter = Router();

type MovementType = "purchase" | "sale" | "adjustment_in" | "adjustment_out";
const MOVEMENT_TYPES: MovementType[] = ["purchase", "sale", "adjustment_in", "adjustment_out"];

function normalizeSignedQuantity(quantity: number, movementType: MovementType): number {
  if (movementType === "sale" || movementType === "adjustment_out") {
    return -Math.abs(quantity);
  }

  return Math.abs(quantity);
}

async function validateSupplierOwnership(supplierId: number, userId: number): Promise<boolean> {
  const [supplier] = await db
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(and(eq(suppliers.id, supplierId), eq(suppliers.userId, userId), isNull(suppliers.deletedAt)));

  return !!supplier;
}

productsRouter.get("/products", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const lowStockOnly = req.query.lowStock === "true";

    const conditions = [eq(products.userId, userId), isNull(products.deletedAt)];

    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.sku, `%${search}%`),
          ilike(products.category, `%${search}%`),
        )!,
      );
    }

    if (category) {
      conditions.push(eq(products.category, category));
    }

    if (lowStockOnly) {
      conditions.push(sql`${products.currentStock} <= ${products.minStock}`);
    }

    const where = and(...conditions);

    const rows = await db
      .select({
        id: products.id,
        userId: products.userId,
        supplierId: products.supplierId,
        name: products.name,
        sku: products.sku,
        category: products.category,
        unit: products.unit,
        salePrice: products.salePrice,
        costPrice: products.costPrice,
        currentStock: products.currentStock,
        minStock: products.minStock,
        notes: products.notes,
        isActive: products.isActive,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        supplierName: suppliers.name,
      })
      .from(products)
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .where(where)
      .orderBy(desc(products.createdAt));

    res.json({
      products: rows.map((row) => ({
        ...row,
        lowStock: Number(row.currentStock) <= Number(row.minStock),
      })),
    });
  } catch (err) {
    console.error("GET /products error:", err);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

productsRouter.get("/products/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const productId = Number(req.params.id);

    if (isNaN(productId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [product] = await db
      .select({
        id: products.id,
        userId: products.userId,
        supplierId: products.supplierId,
        name: products.name,
        sku: products.sku,
        category: products.category,
        unit: products.unit,
        salePrice: products.salePrice,
        costPrice: products.costPrice,
        currentStock: products.currentStock,
        minStock: products.minStock,
        notes: products.notes,
        isActive: products.isActive,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        supplierName: suppliers.name,
      })
      .from(products)
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .where(and(eq(products.id, productId), eq(products.userId, userId), isNull(products.deletedAt)));

    if (!product) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    const movements = await db
      .select({
        id: productStockMovements.id,
        movementType: productStockMovements.movementType,
        quantity: productStockMovements.quantity,
        unitCost: productStockMovements.unitCost,
        notes: productStockMovements.notes,
        createdAt: productStockMovements.createdAt,
        supplierId: productStockMovements.supplierId,
        supplierName: suppliers.name,
        orderId: productStockMovements.orderId,
      })
      .from(productStockMovements)
      .leftJoin(suppliers, eq(productStockMovements.supplierId, suppliers.id))
      .where(eq(productStockMovements.productId, productId))
      .orderBy(desc(productStockMovements.createdAt))
      .limit(50);

    res.json({
      product: {
        ...product,
        lowStock: Number(product.currentStock) <= Number(product.minStock),
      },
      movements,
    });
  } catch (err) {
    console.error("GET /products/:id error:", err);
    res.status(500).json({ error: "Error al obtener producto" });
  }
});

productsRouter.post("/products", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { supplierId, name, sku, category, unit, salePrice, costPrice, currentStock, minStock, notes, isActive } = req.body as {
      supplierId?: number | null;
      name?: string;
      sku?: string;
      category?: string;
      unit?: string;
      salePrice?: number | string;
      costPrice?: number | string;
      currentStock?: number | string;
      minStock?: number | string;
      notes?: string;
      isActive?: boolean;
    };

    if (!name || !name.trim()) {
      res.status(400).json({ error: "El nombre del producto es obligatorio" });
      return;
    }

    let validSupplierId: number | null = null;
    if (supplierId != null && supplierId !== 0) {
      const parsed = Number(supplierId);
      if (isNaN(parsed) || parsed <= 0 || !(await validateSupplierOwnership(parsed, userId))) {
        res.status(400).json({ error: "Proveedor inválido" });
        return;
      }
      validSupplierId = parsed;
    }

    const [product] = await db
      .insert(products)
      .values({
        userId,
        supplierId: validSupplierId,
        name: name.trim(),
        sku: sku?.trim() || null,
        category: category?.trim() || null,
        unit: unit?.trim() || "unidad",
        salePrice: Math.max(0, Number(salePrice) || 0).toFixed(2),
        costPrice: Math.max(0, Number(costPrice) || 0).toFixed(2),
        currentStock: Math.max(0, Number(currentStock) || 0).toFixed(2),
        minStock: Math.max(0, Number(minStock) || 0).toFixed(2),
        notes: notes?.trim() || null,
        isActive: isActive ?? true,
      })
      .returning();

    res.status(201).json({ product });
  } catch (err) {
    console.error("POST /products error:", err);
    res.status(500).json({ error: "Error al crear producto" });
  }
});

productsRouter.put("/products/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const productId = Number(req.params.id);

    if (isNaN(productId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [existing] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.userId, userId), isNull(products.deletedAt)));

    if (!existing) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    const { supplierId, name, sku, category, unit, salePrice, costPrice, minStock, notes, isActive } = req.body as {
      supplierId?: number | null;
      name?: string;
      sku?: string;
      category?: string;
      unit?: string;
      salePrice?: number | string;
      costPrice?: number | string;
      minStock?: number | string;
      notes?: string;
      isActive?: boolean;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) {
      if (!name.trim()) {
        res.status(400).json({ error: "El nombre del producto es obligatorio" });
        return;
      }
      updates.name = name.trim();
    }
    if (sku !== undefined) updates.sku = sku?.trim() || null;
    if (category !== undefined) updates.category = category?.trim() || null;
    if (unit !== undefined) updates.unit = unit?.trim() || "unidad";
    if (salePrice !== undefined) updates.salePrice = Math.max(0, Number(salePrice) || 0).toFixed(2);
    if (costPrice !== undefined) updates.costPrice = Math.max(0, Number(costPrice) || 0).toFixed(2);
    if (minStock !== undefined) updates.minStock = Math.max(0, Number(minStock) || 0).toFixed(2);
    if (notes !== undefined) updates.notes = notes?.trim() || null;
    if (isActive !== undefined) updates.isActive = isActive;
    if (supplierId !== undefined) {
      if (supplierId == null || supplierId === 0) {
        updates.supplierId = null;
      } else {
        const parsed = Number(supplierId);
        if (isNaN(parsed) || parsed <= 0 || !(await validateSupplierOwnership(parsed, userId))) {
          res.status(400).json({ error: "Proveedor inválido" });
          return;
        }
        updates.supplierId = parsed;
      }
    }

    const [product] = await db
      .update(products)
      .set(updates)
      .where(and(eq(products.id, productId), eq(products.userId, userId)))
      .returning();

    res.json({ product });
  } catch (err) {
    console.error("PUT /products/:id error:", err);
    res.status(500).json({ error: "Error al actualizar producto" });
  }
});

productsRouter.post("/products/:id/movements", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const productId = Number(req.params.id);

    if (isNaN(productId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const { movementType, quantity, unitCost, notes, supplierId, orderId } = req.body as {
      movementType?: MovementType;
      quantity?: number | string;
      unitCost?: number | string;
      notes?: string;
      supplierId?: number | null;
      orderId?: number | null;
    };

    if (!movementType || !MOVEMENT_TYPES.includes(movementType)) {
      res.status(400).json({ error: "Tipo de movimiento inválido" });
      return;
    }

    const parsedQuantity = Math.abs(Number(quantity) || 0);
    if (parsedQuantity <= 0) {
      res.status(400).json({ error: "La cantidad debe ser mayor a 0" });
      return;
    }

    const parsedUnitCost = Math.max(0, Number(unitCost) || 0);
    const signedQuantity = normalizeSignedQuantity(parsedQuantity, movementType);

    let validSupplierId: number | null = null;
    if (supplierId != null && supplierId !== 0) {
      const parsed = Number(supplierId);
      if (isNaN(parsed) || parsed <= 0 || !(await validateSupplierOwnership(parsed, userId))) {
        res.status(400).json({ error: "Proveedor inválido" });
        return;
      }
      validSupplierId = parsed;
    }

    let validOrderId: number | null = null;
    if (orderId != null && orderId !== 0) {
      const parsed = Number(orderId);
      const [order] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(and(eq(orders.id, parsed), eq(orders.userId, userId), isNull(orders.deletedAt)));

      if (!order) {
        res.status(400).json({ error: "Pedido inválido" });
        return;
      }
      validOrderId = parsed;
    }

    const result = await db.transaction(async (tx) => {
      const [product] = await tx
        .select()
        .from(products)
        .where(and(eq(products.id, productId), eq(products.userId, userId), isNull(products.deletedAt)));

      if (!product) {
        return { error: "Producto no encontrado" } as const;
      }

      const currentStock = Number(product.currentStock || 0);
      const newStock = currentStock + signedQuantity;

      if (newStock < 0) {
        return { error: "No hay stock suficiente para este movimiento" } as const;
      }

      const [movement] = await tx
        .insert(productStockMovements)
        .values({
          userId,
          productId,
          supplierId: validSupplierId,
          orderId: validOrderId,
          movementType,
          quantity: signedQuantity.toFixed(2),
          unitCost: parsedUnitCost.toFixed(2),
          notes: notes?.trim() || null,
        })
        .returning();

      const [updatedProduct] = await tx
        .update(products)
        .set({
          currentStock: newStock.toFixed(2),
          costPrice: parsedUnitCost > 0 ? parsedUnitCost.toFixed(2) : product.costPrice,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId))
        .returning();

      return { movement, product: updatedProduct } as const;
    });

    if ("error" in result) {
      res.status(result.error === "Producto no encontrado" ? 404 : 400).json({ error: result.error });
      return;
    }

    res.status(201).json(result);
  } catch (err) {
    console.error("POST /products/:id/movements error:", err);
    res.status(500).json({ error: "Error al registrar movimiento de stock" });
  }
});

productsRouter.delete("/products/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const productId = Number(req.params.id);

    if (isNaN(productId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [existing] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.userId, userId), isNull(products.deletedAt)));

    if (!existing) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    await db
      .update(products)
      .set({ deletedAt: new Date(), updatedAt: new Date(), isActive: false })
      .where(and(eq(products.id, productId), eq(products.userId, userId)));

    res.json({ message: "Producto eliminado" });
  } catch (err) {
    console.error("DELETE /products/:id error:", err);
    res.status(500).json({ error: "Error al eliminar producto" });
  }
});

export default productsRouter;
