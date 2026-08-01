import type { FastifyReply, FastifyRequest } from "fastify";
import type { PrismaClient } from "@sahaj/database";
import { AuthService } from "./auth.service.js";
import {
  refreshTokenSchema,
  requestNonceSchema,
  verifySignatureSchema,
} from "../../validators/auth.validator.js";
import { loadEnv } from "../../config/env.js";
import { UnauthorizedError } from "../../errors/app-error.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  requestNonce = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = requestNonceSchema.parse(request.body);
    const { nonce, expiresAt } = await this.authService.requestNonce(input.address, input.networkId);
    return reply.status(200).send({ nonce, expiresAt });
  };

  verify = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = verifySignatureSchema.parse(request.body);
    const session = await this.authService.verifySignatureAndLogin(input);
    return reply.status(200).send(session);
  };

  refresh = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = refreshTokenSchema.parse(request.body);
    const session = await this.authService.refreshSession(input.refreshToken);
    return reply.status(200).send(session);
  };

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = refreshTokenSchema.parse(request.body);
    await this.authService.logout(input.refreshToken);
    return reply.status(204).send();
  };

  me = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.authUser) throw new UnauthorizedError();
    const user = await this.authService.getUserById(request.authUser.sub);
    return reply.status(200).send({
      id: user.id,
      address: user.primaryAddress,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    });
  };
}

export function createAuthController(prisma: PrismaClient): AuthController {
  const env = loadEnv();
  return new AuthController(new AuthService(prisma, env.JWT_SECRET));
}
