import "server-only";
import { createHmac } from "node:crypto";
import { serverEnv } from "@/lib/server-env";

/**
 * Provedor de assinatura de prescrições.
 *
 * A emissão juridicamente válida exige assinatura digital qualificada
 * (ICP-Brasil) — tipicamente via PSC com certificado em nuvem. A integração
 * real deve implementar esta interface, assinando o `contentHash` com o
 * certificado do médico e retornando a referência verificável (ex.: CMS/PAdES).
 */
export type SignatureResult = { provider: string; reference: string; legallyValid: boolean };

export interface SignatureProvider {
  id: string;
  label: string;
  legallyValid: boolean;
  isAvailable(): boolean;
  unavailableReason?: string;
  sign(input: { contentHash: string; signerId: string; prescriptionId: string }): Promise<SignatureResult>;
}

const noneProvider: SignatureProvider = {
  id: "none",
  label: "Não configurado",
  legallyValid: false,
  isAvailable: () => false,
  unavailableReason:
    "A integração com o provedor de assinatura digital ICP-Brasil ainda não está configurada. A prescrição permanece aguardando assinatura.",
  async sign() {
    throw new Error("Provedor de assinatura não configurado.");
  },
};

/** SOMENTE DESENVOLVIMENTO: sela o hash com HMAC. Sem validade jurídica. */
const devUnsignedProvider: SignatureProvider = {
  id: "dev-unsigned",
  label: "Selo de desenvolvimento (sem validade jurídica)",
  legallyValid: false,
  isAvailable: () => Boolean(serverEnv.SIGNATURE_DEV_SECRET) && serverEnv.APP_ENV !== "production",
  unavailableReason: "SIGNATURE_DEV_SECRET não configurado.",
  async sign({ contentHash, signerId, prescriptionId }) {
    const timestamp = new Date().toISOString();
    const mac = createHmac("sha256", serverEnv.SIGNATURE_DEV_SECRET!)
      .update(`${prescriptionId}|${signerId}|${contentHash}|${timestamp}`)
      .digest("hex");
    return { provider: "dev-unsigned", reference: `dev-hmac:${timestamp}:${mac}`, legallyValid: false };
  },
};

export function getSignatureProvider(): SignatureProvider {
  switch (serverEnv.SIGNATURE_PROVIDER) {
    case "dev-unsigned":
      return devUnsignedProvider;
    default:
      return noneProvider;
  }
}
