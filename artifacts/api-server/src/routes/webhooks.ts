import { Router, Request, Response } from "express";
import { syncMercadoPagoPreapprovalById } from "../lib/subscription-billing";

const webhooksRouter = Router();

function getWebhookEventId(req: Request): string {
  const body = req.body as {
    id?: string | number;
    type?: string;
    action?: string;
    data?: { id?: string | number };
  };

  if (body.id !== undefined && body.id !== null) {
    return String(body.id);
  }

  const eventType = String(body.type || req.query.topic || body.action || "unknown");
  const resourceId = body.data?.id !== undefined && body.data?.id !== null
    ? String(body.data.id)
    : "unknown";

  return `${eventType}:${resourceId}`;
}

function isMercadoPagoSubscriptionEvent(type?: string, topic?: string, action?: string): boolean {
  const candidates = [type, topic, action]
    .filter(Boolean)
    .map(value => String(value).toLowerCase());

  return candidates.some(value =>
    value === "subscription_preapproval" ||
    value === "preapproval" ||
    value.includes("subscription_preapproval") ||
    value.includes("preapproval"),
  );
}

webhooksRouter.post("/mercadopago", async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body as {
      type?: string;
      data?: { id?: string | number };
      action?: string;
    };
    const action = String(req.query.topic || req.body.action || "");
    const eventId = getWebhookEventId(req);
    const resourceId = data?.id !== undefined && data?.id !== null ? String(data.id) : undefined;

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

    console.log("[Webhook MP] Evento recibido", {
      eventId,
      type,
      action,
      resourceId,
    });

    if (isMercadoPagoSubscriptionEvent(type, String(req.query.topic || ""), action) && resourceId) {
      const syncResult = await syncMercadoPagoPreapprovalById(resourceId, {
        notificationId: eventId,
      });

      console.log("[Webhook MP] Suscripción sincronizada", syncResult);
    } else if (type === "payment" && resourceId) {
      console.log(`[Webhook MP] Pago recibido ${resourceId}. Aún no se procesa billing puntual.`);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("[Webhook MP] Error procesando evento:", error);
    // Retornamos 200 siempre a MP a menos que haya un reintento forzoso para evitar penalizaciones
    res.status(200).send("Internal Error Processed");
  }
});

export default webhooksRouter;
