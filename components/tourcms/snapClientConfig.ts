export const TOURCMS_MIDTRANS_CLIENT_KEY =
  process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";

const isProd = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";

export const TOURCMS_MIDTRANS_SNAP_URL = isProd
  ? "https://app.midtrans.com/snap/snap.js"
  : "https://app.sandbox.midtrans.com/snap/snap.js";
