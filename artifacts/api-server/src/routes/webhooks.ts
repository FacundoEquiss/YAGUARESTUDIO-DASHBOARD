import { Router, Request, Response } from "express";
import { syncMercadoPagoPreapprovalById } from "../lib/subscription-billing";
import { env } from "../env";
import {
  getMercadoPagoResourceId,
  verifyMercadoPagoWebhookSignature,
} from "../lib/mercadopago-webhook";

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
    const { type } = req.body as {
      type?: string;
      data?: { id?: string | number };
      action?: string;
    };
    const action = String(req.query.topic || req.body.action || "");
    const eventId = getWebhookEventId(req);
    const resourceId = getMercadoPagoResourceId({
      body: req.body,
      query: req.query,
    });

    if (env.mpWebhookSecret) {
      const verification = verifyMercadoPagoWebhookSignature({
        secret: env.mpWebhookSecret,
        header: req.headers["x-signature"],
        headers: req.headers,
        query: req.query,
      });

      if (!verification.valid) {
        console.warn("[Webhook MP] Firma invalida", {
          eventId,
          reason: verification.reason,
          topic: req.query.topic,
        });
        res.status(401).json({ error: "Invalid webhook signature" });
        return;
      }
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
    res.status(500).send("Internal Error");
  }
});

export default webhooksRouter;
