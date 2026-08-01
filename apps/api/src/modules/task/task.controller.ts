import type { FastifyReply, FastifyRequest } from "fastify";
import { TaskService } from "./task.service.js";
import { createTaskSchema, reviewTaskCompletionSchema, submitTaskCompletionSchema } from "../../validators/task.validator.js";
import { UnauthorizedError } from "../../errors/app-error.js";

export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = createTaskSchema.parse(request.body);
    const task = await this.taskService.create(input);
    return reply.status(201).send(task);
  };

  listForCampaign = async (request: FastifyRequest, reply: FastifyReply) => {
    const { campaignId } = request.params as { campaignId: string };
    const tasks = await this.taskService.listForCampaign(campaignId);
    return reply.status(200).send({ tasks });
  };

  submit = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = this.requireUserId(request);
    const input = submitTaskCompletionSchema.parse(request.body);
    const completion = await this.taskService.submit(userId, input.taskId, input.proof);
    return reply.status(200).send(completion);
  };

  review = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = reviewTaskCompletionSchema.parse(request.body);
    const completion = await this.taskService.review(input.taskCompletionId, input.approve, input.rejectedReason);
    return reply.status(200).send(completion);
  };

  private requireUserId(request: FastifyRequest): string {
    if (!request.authUser) throw new UnauthorizedError();
    return request.authUser.sub;
  }
}
