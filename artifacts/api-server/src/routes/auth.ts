import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db, users, subscriptionPlans, userSubscriptions } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../middleware/auth";
import { env } from "../env";
import { supabase } from "../lib/supabase";

const authRouter = Router();

function isSecureCookieEnvironment(): boolean {
  return env.isHosted;
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
  const masterEmail = env.masterEmail;
  const masterPassword = env.masterPassword;
  const masterName = env.masterName;

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
    supabaseAuthId: user.supabaseAuthId,
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

function normalizeSupabaseEmail(rawEmail: string | null | undefined): string {
  return (rawEmail || "").trim().toLowerCase();
}

function buildDefaultName(rawName: string | null | undefined, email: string): string {
  const candidate = (rawName || "").trim();
  if (candidate.length > 0) {
    return candidate;
  }

  const localPart = email.split("@")[0]?.trim();
  return localPart && localPart.length > 0 ? localPart : "Usuario";
}

authRouter.post("/auth/register", async (req, res) => {
  let trimmedEmail = "";

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

    trimmedEmail = email.trim().toLowerCase();

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
    console.error("POST /auth/register error:", {
      email: trimmedEmail || req.body?.email || null,
      origin: req.headers.origin ?? null,
      error: err,
    });
    res.status(500).json({ error: "Error al crear cuenta" });
  }
});

authRouter.post("/auth/login", async (req, res) => {
  let trimmedEmail = "";

  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: "Correo y contraseña son requeridos" });
      return;
    }

    trimmedEmail = email.trim().toLowerCase();
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
    console.error("POST /auth/login error:", {
      email: trimmedEmail || req.body?.email || null,
      origin: req.headers.origin ?? null,
      error: err,
    });
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

authRouter.post("/auth/supabase/sync", async (req, res) => {
  try {
    const { accessToken } = req.body as { accessToken?: string };

    if (!accessToken) {
      res.status(400).json({ error: "accessToken es requerido" });
      return;
    }

    if (!supabase) {
      res.status(500).json({ error: "Supabase Auth no está configurado en el servidor" });
      return;
    }

    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      res.status(401).json({ error: "Token de Supabase inválido o expirado" });
      return;
    }

    const supabaseUser = data.user;
    const supabaseAuthId = supabaseUser.id;
    const normalizedEmail = normalizeSupabaseEmail(supabaseUser.email);

    if (!normalizedEmail) {
      res.status(400).json({ error: "La cuenta de Supabase no tiene email válido" });
      return;
    }

    let [localUser] = await db
      .select()
      .from(users)
      .where(eq(users.supabaseAuthId, supabaseAuthId));

    if (!localUser) {
      const [byEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail));

      if (byEmail) {
        if (byEmail.supabaseAuthId && byEmail.supabaseAuthId !== supabaseAuthId) {
          res.status(409).json({ error: "El correo ya está vinculado a otra cuenta de Supabase" });
          return;
        }

        const [linkedUser] = await db
          .update(users)
          .set({ supabaseAuthId })
          .where(eq(users.id, byEmail.id))
          .returning();

        localUser = linkedUser;
      }
    }

    if (!localUser) {
      const metadataName = typeof supabaseUser.user_metadata?.name === "string"
        ? supabaseUser.user_metadata.name
        : typeof supabaseUser.user_metadata?.full_name === "string"
          ? supabaseUser.user_metadata.full_name
          : null;

      const generatedPasswordHash = await bcrypt.hash(crypto.randomUUID(), 10);

      const [createdUser] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          supabaseAuthId,
          name: buildDefaultName(metadataName, normalizedEmail),
          passwordHash: generatedPasswordHash,
          role: "user",
        })
        .returning();

      localUser = createdUser;

      const [freePlan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.slug, "free"));

      if (freePlan) {
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await db.insert(userSubscriptions).values({
          userId: localUser.id,
          planId: freePlan.id,
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        });
      }
    }

    const token = signToken({
      userId: localUser.id,
      email: localUser.email,
      role: localUser.role,
    });

    res.cookie("token", token, getAuthCookieOptions());

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
      .where(eq(userSubscriptions.userId, localUser.id));

    res.json({
      user: userProfile(localUser),
      subscription: subscription || null,
    });
  } catch (err) {
    console.error("POST /auth/supabase/sync error:", err);
    res.status(500).json({ error: "Error al sincronizar sesión con Supabase" });
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
