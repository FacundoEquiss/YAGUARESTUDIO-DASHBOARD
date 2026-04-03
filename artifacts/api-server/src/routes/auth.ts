import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db, users, subscriptionPlans, userSubscriptions } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth, verifyToken } from "../middleware/auth";
import { env } from "../env";
import { supabase } from "../lib/supabase";

const authRouter = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-z0-9._-]{3,30}$/;
const PHONE_REGEX = /^[+()\-\d\s]{7,20}$/;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

function createRateLimiter(maxAttempts: number, windowMs: number) {
  const attempts = new Map<string, RateLimitEntry>();

  return {
    check(key: string): { allowed: boolean; retryAfterMs: number } {
      const now = Date.now();
      const current = attempts.get(key);

      if (!current || current.resetAt <= now) {
        attempts.set(key, {
          count: 1,
          resetAt: now + windowMs,
        });
        return { allowed: true, retryAfterMs: 0 };
      }

      current.count += 1;

      if (current.count > maxAttempts) {
        return { allowed: false, retryAfterMs: current.resetAt - now };
      }

      return { allowed: true, retryAfterMs: 0 };
    },
    clear(key: string) {
      attempts.delete(key);
    },
  };
}

const loginRateLimiter = createRateLimiter(8, 10 * 60 * 1000);
const registerRateLimiter = createRateLimiter(6, 10 * 60 * 1000);
const supabaseSyncLimiter = createRateLimiter(20, 10 * 60 * 1000);

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
    username: user.username,
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

function normalizeUsername(rawUsername: string | null | undefined): string {
  return (rawUsername || "").trim().toLowerCase();
}

function sanitizeText(value: string | null | undefined): string {
  return (value || "").trim();
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime());
}

function getClientIp(req: Request): string {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim().length > 0) {
    return forwardedFor.split(",")[0]?.trim() || req.ip || "unknown";
  }

  return req.ip || "unknown";
}

function buildDefaultName(rawName: string | null | undefined, email: string): string {
  const candidate = (rawName || "").trim();
  if (candidate.length > 0) {
    return candidate;
  }

  const localPart = email.split("@")[0]?.trim();
  return localPart && localPart.length > 0 ? localPart : "Usuario";
}

function dbErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === "string" ? maybeCode : null;
}

function dbErrorMessage(error: unknown): string {
  const code = dbErrorCode(error);

  if (code === "23505") {
    return "Conflicto de datos al sincronizar la cuenta. Probá iniciar sesión nuevamente.";
  }

  if (code === "23503") {
    return "No se pudo crear la suscripción inicial del usuario.";
  }

  return "Error de base de datos al sincronizar sesión";
}

function getRequestId(req: Request): string {
  const fromLocals = req.res?.locals?.requestId;
  if (typeof fromLocals === "string" && fromLocals.trim().length > 0) {
    return fromLocals;
  }

  const fromHeader = req.headers["x-request-id"];
  if (typeof fromHeader === "string" && fromHeader.trim().length > 0) {
    return fromHeader;
  }

  return crypto.randomUUID();
}

function logAuthFailure(req: Request, route: string, code: string, status: number, detail?: unknown) {
  console.error("[auth:error]", {
    requestId: getRequestId(req),
    route,
    method: req.method,
    status,
    code,
    detail,
  });
}

function sendError(
  req: Request,
  res: Response,
  status: number,
  code: string,
  message: string,
  detail?: unknown
) {
  logAuthFailure(req, req.path, code, status, detail);

  res.status(status).json({
    error: message,
    code,
    status,
    requestId: getRequestId(req),
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await new Promise<T>((resolve, reject) => {
      timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);

      promise
        .then(resolve)
        .catch(reject);
    });
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

type SupabaseTokenUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

function getBearerToken(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  const trimmed = authHeader.trim();
  if (!trimmed.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = trimmed.slice(7).trim();
  return token.length > 0 ? token : null;
}

async function validateSupabaseAccessToken(accessToken: string) {
  if (!supabase) {
    return { user: null as SupabaseTokenUser | null, error: "Supabase Auth no está configurado en el servidor" };
  }

  const result = await withTimeout(
    supabase.auth.getUser(accessToken),
    10000,
    "Timeout al validar el token de Supabase"
  );

  if (result.error || !result.data.user) {
    return { user: null, error: "Token de Supabase inválido o expirado" };
  }

  return { user: result.data.user as SupabaseTokenUser, error: null };
}

async function resolveLocalUserFromSupabase(accessToken: string) {
  const validated = await validateSupabaseAccessToken(accessToken);
  if (!validated.user) {
    return { user: null as typeof users.$inferSelect | null, error: validated.error ?? "Token inválido", status: 401 };
  }

  const supabaseAuthId = validated.user.id;
  const normalizedEmail = normalizeSupabaseEmail(validated.user.email);

  let [localUser] = await db
    .select()
    .from(users)
    .where(eq(users.supabaseAuthId, supabaseAuthId));

  if (!localUser && normalizedEmail) {
    const [byEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    localUser = byEmail ?? null;
  }

  if (!localUser) {
    return { user: null, error: "Usuario local no vinculado para la cuenta de Supabase", status: 404 };
  }

  return { user: localUser, error: null, status: 200 };
}

authRouter.post("/auth/register", async (req, res) => {
  let trimmedEmail = "";
  let normalizedUsername = "";

  try {
    const {
      email,
      password,
      name,
      lastName,
      username,
      birthDate,
      phone,
      businessName,
    } = req.body as {
      email?: string;
      password?: string;
      name?: string;
      lastName?: string;
      username?: string;
      birthDate?: string;
      phone?: string;
      businessName?: string;
    };

    const clientIp = getClientIp(req);
    const limiterKey = `${clientIp}:${sanitizeText(email).toLowerCase()}`;
    const rateResult = registerRateLimiter.check(limiterKey);

    if (!rateResult.allowed) {
      sendError(
        req,
        res,
        429,
        "register_rate_limited",
        "Demasiados intentos de registro. Probá nuevamente en unos minutos.",
        { retryAfterMs: rateResult.retryAfterMs }
      );
      return;
    }

    if (!email || !password || !name || !lastName || !username || !birthDate || !phone || !businessName) {
      res.status(400).json({
        error: "Todos los campos son requeridos",
      });
      return;
    }

    trimmedEmail = email.trim().toLowerCase();
    normalizedUsername = normalizeUsername(username);
    const trimmedName = sanitizeText(name);
    const trimmedLastName = sanitizeText(lastName);
    const trimmedPhone = sanitizeText(phone);
    const trimmedBusinessName = sanitizeText(businessName);

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      res.status(400).json({ error: "Ingresá un correo válido" });
      return;
    }

    if (!USERNAME_REGEX.test(normalizedUsername)) {
      res.status(400).json({
        error: "El nombre de usuario debe tener entre 3 y 30 caracteres y solo usar letras minúsculas, números, punto, guion o guion bajo",
      });
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 80) {
      res.status(400).json({ error: "El nombre debe tener entre 2 y 80 caracteres" });
      return;
    }

    if (trimmedLastName.length < 2 || trimmedLastName.length > 80) {
      res.status(400).json({ error: "El apellido debe tener entre 2 y 80 caracteres" });
      return;
    }

    if (!PHONE_REGEX.test(trimmedPhone)) {
      res.status(400).json({ error: "Ingresá un teléfono válido" });
      return;
    }

    if (trimmedBusinessName.length < 2 || trimmedBusinessName.length > 120) {
      res.status(400).json({ error: "El nombre de negocio debe tener entre 2 y 120 caracteres" });
      return;
    }

    if (!isIsoDate(birthDate)) {
      res.status(400).json({ error: "La fecha de nacimiento debe tener formato YYYY-MM-DD" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }

    const existing = await db.select().from(users).where(eq(users.email, trimmedEmail));
    if (existing.length > 0) {
      res.status(409).json({ error: "Ya existe una cuenta con ese correo" });
      return;
    }

    const existingUsername = await db.select().from(users).where(eq(users.username, normalizedUsername));
    if (existingUsername.length > 0) {
      res.status(409).json({ error: "Ese nombre de usuario ya está en uso" });
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const [newUser] = await db
      .insert(users)
      .values({
        email: trimmedEmail,
        username: normalizedUsername,
        name: trimmedName,
        lastName: trimmedLastName,
        birthDate,
        phone: trimmedPhone,
        businessName: trimmedBusinessName,
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

    registerRateLimiter.clear(limiterKey);
    res.cookie("token", token, getAuthCookieOptions());

    res.json({ user: userProfile(newUser) });
  } catch (err) {
    console.error("POST /auth/register error:", {
      email: trimmedEmail || req.body?.email || null,
      username: normalizedUsername || req.body?.username || null,
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

    const clientIp = getClientIp(req);
    const limiterKey = `${clientIp}:${sanitizeText(email).toLowerCase()}`;
    const rateResult = loginRateLimiter.check(limiterKey);

    if (!rateResult.allowed) {
      sendError(
        req,
        res,
        429,
        "login_rate_limited",
        "Demasiados intentos de inicio de sesión. Probá nuevamente en unos minutos.",
        { retryAfterMs: rateResult.retryAfterMs }
      );
      return;
    }

    if (!email || !password) {
      res.status(400).json({ error: "Correo y contraseña son requeridos" });
      return;
    }

    trimmedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      res.status(400).json({ error: "Ingresá un correo válido" });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.email, trimmedEmail));

    if (!user) {
      res.status(401).json({ error: "Correo o contraseña incorrectos" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Correo o contraseña incorrectos" });
      return;
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    loginRateLimiter.clear(limiterKey);
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
  const startedAt = Date.now();

  try {
    const clientIp = getClientIp(req);
    const rateResult = supabaseSyncLimiter.check(clientIp);

    if (!rateResult.allowed) {
      sendError(
        req,
        res,
        429,
        "supabase_sync_rate_limited",
        "Demasiadas sincronizaciones de sesión. Intentá nuevamente en unos minutos.",
        { retryAfterMs: rateResult.retryAfterMs }
      );
      return;
    }

    const bearerToken = getBearerToken(req.headers.authorization);
    if (!bearerToken) {
      sendError(req, res, 400, "missing_bearer_token", "Authorization Bearer token es requerido");
      return;
    }

    const validated = await validateSupabaseAccessToken(bearerToken);
    if (!validated.user) {
      sendError(req, res, 401, "invalid_supabase_token", validated.error || "Token de Supabase inválido o expirado");
      return;
    }

    const supabaseUser = validated.user;
    const supabaseAuthId = supabaseUser.id;
    const normalizedEmail = normalizeSupabaseEmail(supabaseUser.email);

    if (!normalizedEmail) {
      sendError(req, res, 400, "invalid_supabase_email", "La cuenta de Supabase no tiene email válido");
      return;
    }

    const metadataName = typeof supabaseUser.user_metadata?.name === "string"
      ? supabaseUser.user_metadata.name
      : typeof supabaseUser.user_metadata?.full_name === "string"
        ? supabaseUser.user_metadata.full_name
        : null;

    const generatedPasswordHash = await bcrypt.hash(crypto.randomUUID(), 10);
    let localUser: typeof users.$inferSelect | undefined;

    try {
      localUser = await db.transaction(async (tx) => {
        let resolvedUser: typeof users.$inferSelect | undefined;

        const [bySupabaseAuthId] = await tx
          .select()
          .from(users)
          .where(eq(users.supabaseAuthId, supabaseAuthId));

        if (bySupabaseAuthId) {
          resolvedUser = bySupabaseAuthId;
        }

        if (!resolvedUser) {
          const [byEmail] = await tx
            .select()
            .from(users)
            .where(eq(users.email, normalizedEmail));

          if (byEmail) {
            if (byEmail.supabaseAuthId && byEmail.supabaseAuthId !== supabaseAuthId) {
              throw new Error("EMAIL_LINKED_TO_OTHER_SUPABASE");
            }

            const [linkedByEmail] = await tx
              .update(users)
              .set({
                supabaseAuthId,
                name: byEmail.name || buildDefaultName(metadataName, normalizedEmail),
              })
              .where(eq(users.id, byEmail.id))
              .returning();

            resolvedUser = linkedByEmail;
          }
        }

        if (!resolvedUser) {
          const [createdUser] = await tx
            .insert(users)
            .values({
              email: normalizedEmail,
              supabaseAuthId,
              name: buildDefaultName(metadataName, normalizedEmail),
              passwordHash: generatedPasswordHash,
              role: "user",
            })
            .onConflictDoNothing({ target: users.email })
            .returning();

          if (createdUser) {
            resolvedUser = createdUser;
          } else {
            const [existingByEmail] = await tx
              .select()
              .from(users)
              .where(eq(users.email, normalizedEmail));

            if (!existingByEmail) {
              throw new Error("FAILED_TO_RESOLVE_USER_AFTER_INSERT");
            }

            if (existingByEmail.supabaseAuthId && existingByEmail.supabaseAuthId !== supabaseAuthId) {
              throw new Error("EMAIL_LINKED_TO_OTHER_SUPABASE");
            }

            const [linkedExisting] = await tx
              .update(users)
              .set({ supabaseAuthId })
              .where(eq(users.id, existingByEmail.id))
              .returning();

            resolvedUser = linkedExisting;
          }
        }

        const [freePlan] = await tx
          .select()
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.slug, "free"));

        if (resolvedUser && freePlan) {
          const now = new Date();
          const periodEnd = new Date(now);
          periodEnd.setMonth(periodEnd.getMonth() + 1);

          await tx
            .insert(userSubscriptions)
            .values({
              userId: resolvedUser.id,
              planId: freePlan.id,
              status: "active",
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
            })
            .onConflictDoNothing({ target: userSubscriptions.userId });
        }

        return resolvedUser;
      });
    } catch (dbError) {
      const code = dbErrorCode(dbError);
      console.error("POST /auth/supabase/sync database error:", {
        code,
        supabaseAuthId,
        email: normalizedEmail,
        error: dbError,
      });

      if (dbError instanceof Error && dbError.message === "EMAIL_LINKED_TO_OTHER_SUPABASE") {
        sendError(req, res, 409, "email_linked_conflict", "El correo ya está vinculado a otra cuenta de Supabase");
        return;
      }

      if (dbError instanceof Error && dbError.message === "FAILED_TO_RESOLVE_USER_AFTER_INSERT") {
        sendError(req, res, 500, "user_resolution_failed", "No se pudo resolver el usuario local");
        return;
      }

      if (code === "23505") {
        sendError(req, res, 409, "database_conflict", dbErrorMessage(dbError), dbError);
        return;
      }

      sendError(req, res, 500, "database_error", dbErrorMessage(dbError), dbError);
      return;
    }

    if (!localUser) {
      sendError(req, res, 500, "user_resolution_failed", "No se pudo resolver el usuario local");
      return;
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

    console.info("[auth:sync:success]", {
      requestId: getRequestId(req),
      route: req.path,
      durationMs: Date.now() - startedAt,
      userId: localUser.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al sincronizar sesión con Supabase";
    const status = message.toLowerCase().includes("timeout") ? 504 : 500;
    const durationMs = Date.now() - startedAt;

    console.error("POST /auth/supabase/sync error:", err);
    console.error("[auth:sync:timeout-metric]", {
      requestId: getRequestId(req),
      route: req.path,
      durationMs,
      timeout: status === 504,
    });

    sendError(
      req,
      res,
      status,
      status === 504 ? "supabase_validation_timeout" : "supabase_sync_error",
      message,
      err
    );
  }
});

authRouter.get("/auth/me", async (req, res) => {
  try {
    const bearerToken = getBearerToken(req.headers.authorization);
    const cookieToken = typeof req.cookies?.token === "string" ? req.cookies.token : null;

    let user: typeof users.$inferSelect | null = null;

    if (bearerToken) {
      const resolved = await resolveLocalUserFromSupabase(bearerToken);

      if (!resolved.user) {
        sendError(req, res, resolved.status, "auth_me_bearer_invalid", resolved.error || "No autenticado");
        return;
      }

      user = resolved.user;
    } else if (cookieToken) {
      const payload = verifyToken(cookieToken);

      if (payload) {
        const [localByJwt] = await db
          .select()
          .from(users)
          .where(eq(users.id, payload.userId));

        user = localByJwt ?? null;
      }
    }

    if (!user) {
      sendError(req, res, 401, "not_authenticated", "No autenticado");
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
    sendError(req, res, 500, "auth_me_error", "Error al obtener sesión", err);
  }
});

authRouter.put("/auth/profile", requireAuth, async (req, res) => {
  try {
    const { name, username, lastName, phone, businessName, birthDate, profilePhotoUrl } = req.body as {
      name?: string;
      username?: string;
      lastName?: string;
      phone?: string;
      businessName?: string;
      birthDate?: string;
      profilePhotoUrl?: string;
    };

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (username !== undefined) {
      const normalized = normalizeUsername(username);

      if (normalized && !USERNAME_REGEX.test(normalized)) {
        res.status(400).json({
          error: "El nombre de usuario debe tener entre 3 y 30 caracteres y solo usar letras minúsculas, números, punto, guion o guion bajo",
        });
        return;
      }

      if (normalized) {
        const [existing] = await db.select().from(users).where(eq(users.username, normalized));
        if (existing && existing.id !== req.user!.userId) {
          res.status(409).json({ error: "Ese nombre de usuario ya está en uso" });
          return;
        }
      }

      updates.username = normalized || null;
    }
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
