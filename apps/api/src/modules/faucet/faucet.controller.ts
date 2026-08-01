import type { FastifyReply, FastifyRequest } from "fastify";
import { FaucetService } from "./faucet.service.js";
import { requestFaucetSchema } from "../../validators/faucet.validator.js";
import { UnauthorizedError } from "../../errors/app-error.js";

export class FaucetController {
  constructor(private readonly faucetService: FaucetService) {}

  request = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.authUser) throw new UnauthorizedError();
    const input = requestFaucetSchema.parse(request.body);
    const result = await this.faucetService.requestFaucet(request.authUser.sub, input.networkId, input.address);
    return reply.status(200).send(result);
  };
}
