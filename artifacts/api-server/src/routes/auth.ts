import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, users, subscriptionPlans, userSubscriptions } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../middleware/auth";

const authRouter = Router();

const MASTER_EMAIL = process.env.MASTER_EMAIL || "yaguarestudio@gmail.com";
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || "Sanignacio43391475";
const MASTER_NAME = process.env.MASTER_NAME || "YAGUAR ESTUDIO";

export async function seedMasterAccount() {
  const existing = await db.select().from(users).where(eq(users.email, MASTER_EMAIL));
  if (existing.length === 0) {
    const hash = await bcrypt.hash(MASTER_PASSWORD, 10);
    await db.insert(users).values({
      email: MASTER_EMAIL,
      name: MASTER_NAME,
      passwordHash: hash,
      role: "master",
    });
    console.log("Seeded master account");
  }
}

authRouter.post("/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email || !password || !name) {
      res.status(400).json({ error: "Todos los campos son requeridos" });
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (password.length < 6) {
      res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }

    const existing = await db.select().from(users).where(eq(users.email, trimmedEmail));
    if (existing.length > 0) {
      res.status(409).json({ error: "Ya existe una cuenta con ese correo" });
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const [newUser] = await db
      .insert(users)
      .values({
        email: trimmedEmail,
        name: name.trim(),
        passwordHash: hash,
        role: "user",
      })
      .returning();

    const [freePlan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.slug, "free"));

    if (freePlan) {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await db.insert(userSubscriptions).values({
        userId: newUser.id,
        planId: freePlan.id,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });
    }

    const token = signToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error("POST /auth/register error:", err);
    res.status(500).json({ error: "Error al crear cuenta" });
  }
});

authRouter.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: "Correo y contraseña son requeridos" });
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const [user] = await db.select().from(users).where(eq(users.email, trimmedEmail));

    if (!user) {
      res.status(401).json({ error: "No existe una cuenta con ese correo" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Contraseña incorrecta" });
      return;
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("POST /auth/login error:", err);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

authRouter.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.userId));

    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    const [subscription] = await db
      .select({
        planName: subscriptionPlans.name,
        planSlug: subscriptionPlans.slug,
        limits: subscriptionPlans.limits,
        status: userSubscriptions.status,
        periodEnd: userSubscriptions.currentPeriodEnd,
      })
      .from(userSubscriptions)
      .innerJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
      .where(eq(userSubscriptions.userId, user.id));

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      subscription: subscription || null,
    });
  } catch (err) {
    console.error("GET /auth/me error:", err);
    res.status(500).json({ error: "Error al obtener sesión" });
  }
});

authRouter.post("/auth/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

export default authRouter;
