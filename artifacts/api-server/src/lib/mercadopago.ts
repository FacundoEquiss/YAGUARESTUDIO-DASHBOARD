import { MercadoPagoConfig, PreApproval, Payment } from 'mercadopago';

// El token debe configurarse en Vercel/Railway según corresponda
const accessToken = process.env.MP_ACCESS_TOKEN || '';

if (!accessToken && process.env.NODE_ENV === "production") {
  console.warn("⚠️ MP_ACCESS_TOKEN no está configurado. La integración con Mercado Pago fallará.");
}

export const mpClient = new MercadoPagoConfig({ 
  accessToken,
  options: { timeout: 10000 } 
});

export const mpPreApproval = new PreApproval(mpClient);
export const mpPayment = new Payment(mpClient);
