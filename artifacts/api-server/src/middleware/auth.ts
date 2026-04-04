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
  const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  
  if (!supabase) {
    res.status(500).json({ error: "Supabase no está configurado" });
    return;
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    res.status(401).json({ error: "Token inválido o expirado" });
    return;
  }
  
  const [localUser] = await db
    .select()
    .from(users)
    .where(eq(users.supabaseAuthId, user.id));
    
  if (!localUser) {
     const [byEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, user.email || ""));
        
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
