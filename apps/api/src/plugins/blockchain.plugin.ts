import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { getAdapterRegistry } from "@sahaj/blockchain-adapters";
import { CircleUsdcService, createCircleClient, loadCircleConfigFromEnv } from "@sahaj/circle-sdk";

export default fp(async function blockchainPlugin(app: FastifyInstance) {
  const adapterRegistry = getAdapterRegistry();
  app.decorate("adapterRegistry", adapterRegistry);

  const circleConfig = loadCircleConfigFromEnv();
  const circleClient = createCircleClient(circleConfig);
  app.decorate("circleUsdc", new CircleUsdcService(circleClient, circleConfig.environment));

  app.log.info(
    { networks: adapterRegistry.listEnabledNetworks().map((n) => n.id) },
    "Blockchain adapters initialized",
  );
});
