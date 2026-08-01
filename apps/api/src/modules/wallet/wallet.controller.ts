import type { FastifyReply, FastifyRequest } from "fastify";
import { WalletService } from "./wallet.service.js";
import {
  balanceQuerySchema,
  circleSendSchema,
  createCircleWalletSchema,
  linkWalletSchema,
  recordExternalTxSchema,
} from "../../validators/wallet.validator.js";
import { UnauthorizedError } from "../../errors/app-error.js";

export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  listNetworks = async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({ networks: this.walletService.listNetworks() });
  };

  getBalance = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = balanceQuerySchema.parse(request.query);
    const balances = await this.walletService.getOnChainBalances(input.networkId, input.address);
    return reply.status(200).send(balances);
  };

  linkWallet = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = this.requireUserId(request);
    const input = linkWalletSchema.parse(request.body);
    const wallet = await this.walletService.linkWallet(userId, input);
    return reply.status(201).send(wallet);
  };

  listMyWallets = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = this.requireUserId(request);
    const wallets = await this.walletService.listUserWallets(userId);
    return reply.status(200).send({ wallets });
  };

  recordExternalTx = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = this.requireUserId(request);
    const input = recordExternalTxSchema.parse(request.body);
    const receipt = await this.walletService.recordExternalTransaction(userId, input.networkId, input.txHash);
    return reply.status(200).send(receipt);
  };

  createCircleWallet = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = this.requireUserId(request);
    const input = createCircleWalletSchema.parse(request.body);
    const wallet = await this.walletService.createCircleWallet(userId, input.networkId);
    return reply.status(201).send(wallet);
  };

  getUnifiedBalance = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = this.requireUserId(request);
    const balance = await this.walletService.getUnifiedCircleBalance(userId);
    return reply.status(200).send(balance);
  };

  sendUsdc = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = this.requireUserId(request);
    const input = circleSendSchema.parse(request.body);
    const result = await this.walletService.sendUsdcFromCircleWallet(userId, input);
    return reply.status(202).send(result);
  };

  private requireUserId(request: FastifyRequest): string {
    if (!request.authUser) throw new UnauthorizedError();
    return request.authUser.sub;
  }
}

export function createWalletController(
  prisma: ConstructorParameters<typeof WalletService>[0],
  adapters: ConstructorParameters<typeof WalletService>[1],
  circleUsdc: ConstructorParameters<typeof WalletService>[2],
): WalletController {
  return new WalletController(new WalletService(prisma, adapters, circleUsdc));
}
