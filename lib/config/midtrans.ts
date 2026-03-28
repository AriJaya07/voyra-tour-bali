import midtransClient from "midtrans-client";

export const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "";
export const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || "";
export const MIDTRANS_IS_PRODUCTION =
  process.env.MIDTRANS_IS_PRODUCTION === "true";
export const MIDTRANS_SNAP_URL =
  process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL || "";

export const snap = new midtransClient.Snap({
  isProduction: MIDTRANS_IS_PRODUCTION,
  serverKey: MIDTRANS_SERVER_KEY,
  clientKey: MIDTRANS_CLIENT_KEY,
});
