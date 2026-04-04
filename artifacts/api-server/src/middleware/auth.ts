import { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabase";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const cookieToken = typeof req.cookies?.token === "string" ? req.cookies.token.trim() : "";
  const authHeader = typeof req.headers.authorization === "string" ? req.headers.authorization.trim() : "";
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  const tokens = [cookieToken, bearerToken].filter((value, index, array) => value.length > 0 && array.indexOf(value) === index);

  if (tokens.length === 0) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  
  if (!supabase) {
    res.status(500).json({ error: "Supabase no está configurado" });
    return;
  }

  let validatedUser: { id: string; email?: string | null } | null = null;

  for (const token of tokens) {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      validatedUser = user;
      break;
    }
  }

  if (!validatedUser) {
    res.status(401).json({ error: "Token inválido o expirado" });
    return;
  }
  
  const [localUser] = await db
    .select()
    .from(users)
    .where(eq(users.supabaseAuthId, validatedUser.id));
    
  if (!localUser) {
     const [byEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, validatedUser.email || ""));
        
     if (!byEmail) {
       res.status(401).json({ error: "Usuario no encontrado" });
       return;
     }
     
     req.user = { userId: byEmail.id, email: byEmail.email, role: byEmail.role };
  } else {
     req.user = { userId: localUser.id, email: localUser.email, role: localUser.role };
  }

  next();
}
