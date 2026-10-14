import { service } from "../integration/helpers";

/** Limpa contadores de rate limit para execuções repetidas em ambiente local. */
export default async function globalSetup() {
  await service.from("rate_limits").delete().gte("hits", 0);
}
