import "fastify";
import type { PrismaClient } from "@sahaj/database";
import type { AdapterRegistry } from "@sahaj/blockchain-adapters";
import type { CircleUsdcService } from "@sahaj/circle-sdk";
import type { AccessTokenPayload } from "../utils/jwt.js";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    adapterRegistry: AdapterRegistry;
    circleUsdc: CircleUsdcService;
  }

  interface FastifyRequest {
    authUser?: AccessTokenPayload;
  }
}
