import type { FastifyReply, FastifyRequest } from "fastify";
import { RewardService } from "./reward.service.js";
import { claimRewardSchema, rewardHistoryQuerySchema } from "../../validators/reward.validator.js";
import { UnauthorizedError } from "../../errors/app-error.js";

export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  getBalance = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = this.requireUserId(request);
    const balance = await this.rewardService.getBalance(userId);
    return reply.status(200).send(balance);
  };

  getHistory = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = this.requireUserId(request);
    const query = rewardHistoryQuerySchema.parse(request.query);
    const history = await this.rewardService.listHistory(userId, query.page, query.pageSize);
    return reply.status(200).send(history);
  };

  claim = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = this.requireUserId(request);
    const input = claimRewardSchema.parse(request.body);
    const claim = await this.rewardService.claim(userId, input.usdcAmount, input.networkId, input.destinationAddress);
    return reply.status(202).send(claim);
  };

  listClaims = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = this.requireUserId(request);
    const claims = await this.rewardService.listClaims(userId);
    return reply.status(200).send({ claims });
  };

  getClaimStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = this.requireUserId(request);
    const { claimId } = request.params as { claimId: string };
    const claim = await this.rewardService.getClaimStatus(claimId, userId);
    return reply.status(200).send(claim);
  };

  private requireUserId(request: FastifyRequest): string {
    if (!request.authUser) throw new UnauthorizedError();
    return request.authUser.sub;
  }
}
