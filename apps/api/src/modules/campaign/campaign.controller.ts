import type { FastifyReply, FastifyRequest } from "fastify";
import { CampaignService } from "./campaign.service.js";
import {
  campaignIdParamSchema,
  createCampaignSchema,
  listCampaignsQuerySchema,
} from "../../validators/campaign.validator.js";
import { UnauthorizedError } from "../../errors/app-error.js";

export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = createCampaignSchema.parse(request.body);
    const campaign = await this.campaignService.create(input);
    return reply.status(201).send(campaign);
  };

  publish = async (request: FastifyRequest, reply: FastifyReply) => {
    const { campaignId } = campaignIdParamSchema.parse(request.params);
    const campaign = await this.campaignService.publish(campaignId);
    return reply.status(200).send(campaign);
  };

  archive = async (request: FastifyRequest, reply: FastifyReply) => {
    const { campaignId } = campaignIdParamSchema.parse(request.params);
    const campaign = await this.campaignService.archive(campaignId);
    return reply.status(200).send(campaign);
  };

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listCampaignsQuerySchema.parse(request.query);
    const result = await this.campaignService.list(query);
    return reply.status(200).send(result);
  };

  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    const { campaignId } = campaignIdParamSchema.parse(request.params);
    const campaign = await this.campaignService.getById(campaignId);
    return reply.status(200).send(campaign);
  };

  join = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = this.requireUserId(request);
    const { campaignId } = campaignIdParamSchema.parse(request.params);
    const participant = await this.campaignService.join(userId, campaignId);
    return reply.status(201).send(participant);
  };

  getMyProgress = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = this.requireUserId(request);
    const { campaignId } = campaignIdParamSchema.parse(request.params);
    const progress = await this.campaignService.getUserProgress(userId, campaignId);
    return reply.status(200).send(progress);
  };

  private requireUserId(request: FastifyRequest): string {
    if (!request.authUser) throw new UnauthorizedError();
    return request.authUser.sub;
  }
}
