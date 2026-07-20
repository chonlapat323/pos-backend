import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OmiseService } from '../omise/omise.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly omiseService: OmiseService,
  ) {}

  listPurchasablePackages() {
    return this.prisma.package.findMany({
      where: { isTrial: false },
      orderBy: { durationDays: 'asc' },
    });
  }

  async getMySubscription(shopId: string) {
    const [shop, trialSubscription, latestSubscription] = await Promise.all([
      this.prisma.shop.findUniqueOrThrow({
        where: { id: shopId },
        select: {
          subscriptionStatus: true,
          subscriptionEndsAt: true,
          isActive: true,
        },
      }),
      this.prisma.shopSubscription.findFirst({
        where: { shopId, package: { isTrial: true } },
      }),
      this.prisma.shopSubscription.findFirst({
        where: { shopId },
        orderBy: { createdAt: 'desc' },
        include: { package: true },
      }),
    ]);

    return {
      subscriptionStatus: shop.subscriptionStatus,
      subscriptionEndsAt: shop.subscriptionEndsAt,
      isActive: shop.isActive,
      trialUsed: trialSubscription !== null,
      currentPackage: latestSubscription?.package ?? null,
    };
  }

  async purchase(shopId: string, packageId: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id: packageId },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    if (pkg.isTrial) {
      throw new BadRequestException('Trial package is not purchasable');
    }

    const shop = await this.prisma.shop.findUniqueOrThrow({
      where: { id: shopId },
      select: { subscriptionStatus: true },
    });
    if (shop.subscriptionStatus === 'ACTIVE') {
      const activeSubscription = await this.prisma.shopSubscription.findFirst({
        where: { shopId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        include: { package: true },
      });
      if (
        activeSubscription &&
        pkg.durationDays < activeSubscription.package.durationDays
      ) {
        throw new BadRequestException(
          'Cannot purchase a package shorter than your current active package',
        );
      }
    }

    const shopSubscription = await this.prisma.shopSubscription.create({
      data: {
        shopId,
        packageId: pkg.id,
        status: 'PENDING',
        startAt: new Date(),
        endAt: new Date(Date.now() + pkg.durationDays * 24 * 60 * 60 * 1000),
      },
    });

    const charge = await this.omiseService.createPromptPayCharge({
      amountThb: pkg.priceThb,
      description: `POS Services - ${pkg.name}`,
    });

    const payment = await this.prisma.subscriptionPayment.create({
      data: {
        shopSubscriptionId: shopSubscription.id,
        amountThb: pkg.priceThb,
        omiseChargeId: charge.chargeId,
        status: 'PENDING',
      },
    });

    return {
      paymentId: payment.id,
      qrImageUri: charge.qrImageUri,
      expiresAt: charge.expiresAt,
    };
  }

  async getPurchaseStatus(shopId: string, paymentId: string) {
    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { id: paymentId },
      include: { shopSubscription: { include: { package: true } } },
    });
    if (!payment || payment.shopSubscription.shopId !== shopId) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'PENDING') {
      return { status: payment.status };
    }

    if (!payment.omiseChargeId) {
      throw new BadRequestException('Payment has no associated charge');
    }

    const charge = await this.omiseService.getCharge(payment.omiseChargeId);
    if (charge.status === 'successful') {
      await this.activateSubscription(payment.id);
      return { status: 'PAID' };
    }
    if (charge.status === 'failed' || charge.status === 'expired') {
      await this.prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      return { status: 'FAILED' };
    }

    return { status: 'PENDING' };
  }

  private async activateSubscription(paymentId: string) {
    const payment = await this.prisma.subscriptionPayment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { shopSubscription: { include: { package: true } } },
    });
    const subscription = payment.shopSubscription;
    const endAt = new Date(
      Date.now() + subscription.package.durationDays * 24 * 60 * 60 * 1000,
    );

    await this.prisma.$transaction([
      this.prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: { status: 'PAID', paidAt: new Date() },
      }),
      this.prisma.shopSubscription.update({
        where: { id: subscription.id },
        data: { status: 'ACTIVE', startAt: new Date(), endAt },
      }),
      this.prisma.shop.update({
        where: { id: subscription.shopId },
        data: {
          subscriptionStatus: 'ACTIVE',
          subscriptionEndsAt: endAt,
          isActive: true,
          suspendReason: null,
        },
      }),
    ]);
  }

  getHistory(shopId: string) {
    return this.prisma.shopSubscription.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      include: {
        package: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async suspendExpiredShops() {
    await this.prisma.shop.updateMany({
      where: {
        isActive: true,
        subscriptionEndsAt: { lt: new Date() },
      },
      data: {
        isActive: false,
        subscriptionStatus: 'EXPIRED',
        suspendReason: 'SUBSCRIPTION_EXPIRED',
      },
    });
  }
}
