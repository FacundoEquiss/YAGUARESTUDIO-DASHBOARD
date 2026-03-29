import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, users, subscriptionPlans, userSubscriptions } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../middleware/auth";

const authRouter = Router();

function isSecureCookieEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.RAILWAY_ENVIRONMENT_NAME !== undefined ||
    process.env.RAILWAY_PUBLIC_DOMAIN !== undefined ||
    process.env.RENDER !== undefined
  );
}

function getAuthCookieOptions() {
  const secure = isSecureCookieEnvironment();

  return {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" as const : "lax" as const,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}

export async function seedMasterAccount() {
  const masterEmail = process.env.MASTER_EMAIL;
  const masterPassword = process.env.MASTER_PASSWORD;
  const masterName = process.env.MASTER_NAME ?? "YAGUAR ESTUDIO";

  if (!masterEmail || !masterPassword) {
    console.warn(
      "⚠️  MASTER_EMAIL or MASTER_PASSWORD env vars are not set. " +
      "Master account will NOT be seeded. Set them before first run."
    );
    return;
  }

  const existing = await db.select().from(users).where(eq(users.email, masterEmail));
  if (existing.length === 0) {
    const hash = await bcrypt.hash(masterPassword, 10);
    await db.insert(users).values({
      email: masterEmail,
      name: masterName,
      passwordHash: hash,
      role: "master",
    });
    console.log("Seeded master account");
  }
}


function userProfile(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    lastName: user.lastName,
    role: user.role,
    phone: user.phone,
    businessName: user.businessName,
    birthDate: user.birthDate,
    profilePhotoUrl: user.profilePhotoUrl,
    createdAt: user.createdAt,
  };
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

    res.cookie("token", token, getAuthCookieOptions());

    res.json({ user: userProfile(newUser) });
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

    res.cookie("token", token, getAuthCookieOptions());

    res.json({ user: userProfile(user) });
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
      user: userProfile(user),
      subscription: subscription || null,
    });
  } catch (err) {
    console.error("GET /auth/me error:", err);
    res.status(500).json({ error: "Error al obtener sesión" });
  }
});

authRouter.put("/auth/profile", requireAuth, async (req, res) => {
  try {
    const { name, lastName, phone, businessName, birthDate, profilePhotoUrl } = req.body as {
      name?: string;
      lastName?: string;
      phone?: string;
      businessName?: string;
      birthDate?: string;
      profilePhotoUrl?: string;
    };

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (lastName !== undefined) updates.lastName = lastName.trim() || null;
    if (phone !== undefined) updates.phone = phone.trim() || null;
    if (businessName !== undefined) updates.businessName = businessName.trim() || null;
    if (birthDate !== undefined) updates.birthDate = birthDate || null;
    if (profilePhotoUrl !== undefined) updates.profilePhotoUrl = profilePhotoUrl || null;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No hay campos para actualizar" });
      return;
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, req.user!.userId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    res.json({ user: userProfile(updated) });
  } catch (err) {
    console.error("PUT /auth/profile error:", err);
    res.status(500).json({ error: "Error al actualizar perfil" });
  }
});

authRouter.put("/auth/password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Ambas contraseñas son requeridas" });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres" });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId));
    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "La contraseña actual es incorrecta" });
      return;
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ passwordHash: hash }).where(eq(users.id, user.id));

    res.json({ ok: true });
  } catch (err) {
    console.error("PUT /auth/password error:", err);
    res.status(500).json({ error: "Error al cambiar contraseña" });
  }
});

authRouter.post("/auth/logout", (_req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: getAuthCookieOptions().secure,
    sameSite: getAuthCookieOptions().sameSite,
  });
  res.json({ ok: true });
});

export default authRouter;
