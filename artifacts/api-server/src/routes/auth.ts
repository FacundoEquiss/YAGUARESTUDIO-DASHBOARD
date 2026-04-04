import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { db, users, subscriptionPlans, userSubscriptions } from "@workspace/db";
import { eq } from "drizzle-orm";
import { compare } from "bcryptjs";
import { requireAuth } from "../middleware/auth";
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
    if (!supabase) {
        console.warn("⚠️ Supabase not configured. Cannot seed master account properly.");
        return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: masterEmail,
      password: masterPassword,
      options: {
        data: { name: masterName }
      }
    });

    if (authError || !authData.user) {
        console.error("Error creating master account on Supabase:", authError);
        return;
    }

    await db.insert(users).values({
      email: masterEmail,
      name: masterName,
      supabaseAuthId: authData.user.id,
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

function isSupabaseUserAlreadyExistsError(error: unknown): boolean {
  const message = String((error as { message?: unknown } | null)?.message || "").toLowerCase();
  return message.includes("already registered") || message.includes("already exists") || message.includes("user exists");
}

function isSupabaseEmailNotConfirmedError(error: unknown): boolean {
  const message = String((error as { message?: unknown } | null)?.message || "").toLowerCase();
  return message.includes("email not confirmed") || message.includes("email_not_confirmed");
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

    if (localUser && localUser.supabaseAuthId !== supabaseAuthId) {
      await db
        .update(users)
        .set({ supabaseAuthId })
        .where(eq(users.id, localUser.id));

      localUser = {
        ...localUser,
        supabaseAuthId,
      };
    }
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
      lastName?: string | null;
      username?: string | null;
      birthDate?: string | null;
      phone?: string | null;
      businessName?: string | null;
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

    if (!email || !password || !name) {
      res.status(400).json({
        error: "Nombre, correo y contraseña son requeridos",
      });
      return;
    }

    trimmedEmail = email.trim().toLowerCase();
    normalizedUsername = normalizeUsername(username);
    const trimmedName = sanitizeText(name);
    const trimmedLastName = sanitizeText(lastName);
    const trimmedPhone = sanitizeText(phone);
    const trimmedBusinessName = sanitizeText(businessName);
    const normalizedBirthDate = sanitizeText(birthDate);

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      res.status(400).json({ error: "Ingresá un correo válido" });
      return;
    }

    if (normalizedUsername && !USERNAME_REGEX.test(normalizedUsername)) {
      res.status(400).json({
        error: "El nombre de usuario debe tener entre 3 y 30 caracteres y solo usar letras minúsculas, números, punto, guion o guion bajo",
      });
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 80) {
      res.status(400).json({ error: "El nombre debe tener entre 2 y 80 caracteres" });
      return;
    }

    if (trimmedLastName && (trimmedLastName.length < 2 || trimmedLastName.length > 80)) {
      res.status(400).json({ error: "El apellido debe tener entre 2 y 80 caracteres" });
      return;
    }

    if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone)) {
      res.status(400).json({ error: "Ingresá un teléfono válido" });
      return;
    }

    if (trimmedBusinessName && (trimmedBusinessName.length < 2 || trimmedBusinessName.length > 120)) {
      res.status(400).json({ error: "El nombre de negocio debe tener entre 2 y 120 caracteres" });
      return;
    }

    if (normalizedBirthDate && !isIsoDate(normalizedBirthDate)) {
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

    if (normalizedUsername) {
      const existingUsername = await db.select().from(users).where(eq(users.username, normalizedUsername));
      if (existingUsername.length > 0) {
        res.status(409).json({ error: "Ese nombre de usuario ya está en uso" });
        return;
      }
    }

    if (!supabase) {
       res.status(500).json({ error: "Supabase is not configured" });
       return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: password,
      options: {
        data: {
          name: trimmedName,
          ...(trimmedLastName ? { lastName: trimmedLastName } : {}),
        }
      }
    });

    let supabaseUserId = authData?.user?.id;
    let accessToken = authData?.session?.access_token || "";

    if (authError || !supabaseUserId) {
      if (isSupabaseUserAlreadyExistsError(authError)) {
        // Permite recuperar registros parcialmente migrados: cuenta existe en Supabase,
        // pero no necesariamente en la tabla local.
        const { data: existingSession, error: existingSessionError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (existingSessionError || !existingSession.user) {
          res.status(409).json({
            error: "Ya existe una cuenta con ese correo. Iniciá sesión o restablecé tu contraseña.",
          });
          return;
        }

        supabaseUserId = existingSession.user.id;
        accessToken = existingSession.session?.access_token || "";
      } else {
        res.status(400).json({ error: authError?.message || "Error registrando usuario en Supabase" });
        return;
      }
    }

    const [newUser] = await db
      .insert(users)
      .values({
        email: trimmedEmail,
        username: normalizedUsername || null,
        name: trimmedName,
        lastName: trimmedLastName || null,
        birthDate: normalizedBirthDate || null,
        phone: trimmedPhone || null,
        businessName: trimmedBusinessName || null,
        supabaseAuthId: supabaseUserId,
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

    if (!accessToken) {
      const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (!sessionError && sessionData?.session?.access_token) {
        accessToken = sessionData.session.access_token;
      }
    }

    if (accessToken) {
      res.cookie("token", accessToken, getAuthCookieOptions());
    }
    registerRateLimiter.clear(limiterKey);

    res.json({
      user: userProfile(newUser),
      accessToken: accessToken || null,
    });
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
        "Demasiados intentos. Probá nuevamente en unos minutos.",
        { retryAfterMs: rateResult.retryAfterMs }
      );
      return;
    }

    if (!email || !password) {
      res.status(400).json({ error: "Completá todos los campos" });
      return;
    }

    trimmedEmail = email.trim().toLowerCase();

    if (!supabase) {
       res.status(500).json({ error: "Supabase no está configurado." });
       return;
    }

    let supabaseUserId: string | null = null;
    let accessToken = "";

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (!authError && authData.user) {
      supabaseUserId = authData.user.id;
      accessToken = authData.session?.access_token || "";
    } else {
      const [legacyUser] = await db.select().from(users).where(eq(users.email, trimmedEmail));

      if (!legacyUser) {
        res.status(401).json({ error: "Credenciales incorrectas" });
        return;
      }

      if (isSupabaseEmailNotConfirmedError(authError)) {
        res.status(403).json({ error: "Tu correo todavía no está confirmado en Supabase." });
        return;
      }

      if (!legacyUser.passwordHash) {
        res.status(401).json({ error: "Credenciales incorrectas" });
        return;
      }

      const passwordMatches = await compare(password, legacyUser.passwordHash);
      if (!passwordMatches) {
        res.status(401).json({ error: "Credenciales incorrectas" });
        return;
      }

      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            name: legacyUser.name,
            ...(legacyUser.lastName ? { lastName: legacyUser.lastName } : {}),
          },
        },
      });

      if (!signupError && signupData.user) {
        supabaseUserId = signupData.user.id;
        accessToken = signupData.session?.access_token || "";
      } else if (isSupabaseUserAlreadyExistsError(signupError)) {
        const { data: migratedSession, error: migratedSessionError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (migratedSessionError || !migratedSession.user) {
          res.status(409).json({
            error: "Tu cuenta existe en Supabase pero la contraseña no coincide. Restablecé tu contraseña para continuar.",
          });
          return;
        }

        supabaseUserId = migratedSession.user.id;
        accessToken = migratedSession.session?.access_token || "";
      } else {
        res.status(500).json({ error: "No se pudo migrar la cuenta a Supabase" });
        return;
      }

      if (supabaseUserId && legacyUser.supabaseAuthId !== supabaseUserId) {
        await db.update(users).set({ supabaseAuthId: supabaseUserId }).where(eq(users.id, legacyUser.id));
      }
    }

    if (!supabaseUserId) {
      res.status(401).json({ error: "Credenciales incorrectas" });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.supabaseAuthId, supabaseUserId));
    if (!user) {
      const [byEmail] = await db.select().from(users).where(eq(users.email, trimmedEmail));
      if (!byEmail) {
        res.status(404).json({ error: "Usuario no encontrado en base local." });
        return;
      }

      await db.update(users).set({ supabaseAuthId: supabaseUserId }).where(eq(users.id, byEmail.id));
      if (accessToken) {
        res.cookie("token", accessToken, getAuthCookieOptions());
      }
      loginRateLimiter.clear(limiterKey);

      res.json({
        user: userProfile(byEmail),
        accessToken: accessToken || null,
      });
      return;
    }

    loginRateLimiter.clear(limiterKey);
    if (accessToken) {
      res.cookie("token", accessToken, getAuthCookieOptions());
    }

    res.json({
      user: userProfile(user),
      accessToken: accessToken || null,
    });
  } catch (err) {
    console.error("POST /auth/login error:", {
      email: trimmedEmail || req.body?.email || null,
      origin: req.headers.origin ?? null,
      error: err,
    });
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

authRouter.get("/auth/me", async (req, res) => {
  try {
    const bearerToken = getBearerToken(req.headers.authorization);
    const cookieToken = typeof req.cookies?.token === "string" ? req.cookies.token : null;

    let user: typeof users.$inferSelect | null = null;

    if (bearerToken) {
      const resolved = await resolveLocalUserFromSupabase(bearerToken);

      if (resolved.user) {
        user = resolved.user;
      }
    }

    if (!user && cookieToken) {
      const resolved = await resolveLocalUserFromSupabase(cookieToken);

      if (resolved.user) {
        user = resolved.user;
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

authRouter.put("/auth/password", requireAuth, async (_req, res) => {
  res.status(400).json({ error: "Para cambiar la contraseña por favor usá la app cliente." });
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
