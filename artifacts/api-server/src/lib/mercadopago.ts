import { MercadoPagoConfig, PreApproval, Payment } from 'mercadopago';
import { env } from "../env";

// El token debe configurarse en Vercel/Railway según corresponda
const accessToken = env.mpAccessToken || '';

if (!accessToken && env.isHosted) {
  console.warn("[config warning] MP_ACCESS_TOKEN is not configured. Mercado Pago integration will fail.");
}

export const mpClient = new MercadoPagoConfig({ 
  accessToken,
  options: { timeout: 10000 } 
});

export const mpPreApproval = new PreApproval(mpClient);
export const mpPayment = new Payment(mpClient);
