import { Router, Request, Response } from "express";
import crypto from "crypto";
import { db, userSubscriptions } from "@workspace/db";
import { eq } from "drizzle-orm";
// import { mpPayment, mpPreApproval } from "../lib/mercadopago"; // Para consultar si es necesario

const webhooksRouter = Router();

// Endpoint enfocado a recibir notificaciones IPN/Webhooks de Mercado Pago
webhooksRouter.post("/mercadopago", async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;
    const action = req.query.topic || req.body.action;

    // TODO: En producción estricta, validar firma x-signature con MP_WEBHOOK_SECRET
    // https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
    const signature = req.headers["x-signature"];
    const mpSecret = process.env.MP_WEBHOOK_SECRET;

    if (mpSecret && signature) {
      // Implementar la validación de firma aquí
      // const manifest = ...
      // const expectedSignature = crypto.createHmac("sha256", mpSecret).update(manifest).digest("hex");
      // if (signature !== expectedSignature) throw new Error("Firma inválida");
    }

    // Procesamiento Idempotente
    console.log(`[Webhook MP] Evento recibido: type=${type}, action=${action}`);
    
    // Aquí implementamos la lógica de actualización del UserSubscription 
    if (type === "subscription_preapproval") {
      const subscriptionId = data.id;
      console.log(`Verificando subscripción: ${subscriptionId}`);
      // Lógica de consultar a MP (mpPreApproval.get({ id: subscriptionId })) y hacer db.update()
    } else if (type === "payment") {
      const paymentId = data.id;
      console.log(`Verificando pago: ${paymentId}`);
      // Lógica de consultar a MP (mpPayment.get({ id: paymentId })) y actualizar billing
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("[Webhook MP] Error procesando evento:", error);
    // Retornamos 200 siempre a MP a menos que haya un reintento forzoso para evitar penalizaciones
    res.status(200).send("Internal Error Processed");
  }
});

export default webhooksRouter;
