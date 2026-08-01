import type { FastifyReply, FastifyRequest } from "fastify";
import { StakeService } from "./stake.service.js";
import { createStakeSchema } from "../../validators/stake.validator.js";
import { UnauthorizedError } from "../../errors/app-error.js";
import { STAKE_TERMS } from "../../constants/index.js";

export class StakeController {
  constructor(private readonly stakeService: StakeService) {}

  listTerms = async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({ terms: STAKE_TERMS });
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.authUser) throw new UnauthorizedError();
    const input = createStakeSchema.parse(request.body);
    const position = await this.stakeService.createStake(
      request.authUser.sub,
      input.networkId,
      input.sourceWalletId,
      input.principalUsdc,
      input.lockDays,
    );
    return reply.status(201).send(position);
  };

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.authUser) throw new UnauthorizedError();
    const positions = await this.stakeService.listPositions(request.authUser.sub);
    return reply.status(200).send({ positions });
  };

  withdraw = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.authUser) throw new UnauthorizedError();
    const { positionId } = request.params as { positionId: string };
    const position = await this.stakeService.withdraw(request.authUser.sub, positionId);
    return reply.status(200).send(position);
  };
}
