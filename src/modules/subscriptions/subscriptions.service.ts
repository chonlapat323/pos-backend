import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OmiseService } from '../omise/omise.service';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { PrismaService } from '../prisma/prisma.service';

// A shop already on its highest-tier package can't buy the same-or-lower tier again until it's
// within this many days of expiring (or already expired) - otherwise every purchase would just
// silently discard whatever time is still left on the current period.
const RENEWAL_WINDOW_DAYS = 7;

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly omiseService: OmiseService,
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  // Lets the mobile app read the Omise public key (needed to tokenize a card) at runtime instead
  // of baking it into the build - a platform admin can rotate it from the settings page without
  // anyone having to rebuild and resubmit the app to the store.
  async getConfig() {
    const omisePublicKey =
      await this.platformSettingsService.get('OMISE_PUBLIC_KEY');
    return { omisePublicKey };
  }

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

  async purchase(
    shopId: string,
    packageId: string,
    options?: { paymentMethod?: 'PROMPTPAY' | 'CARD'; omiseToken?: string },
  ) {
    const pkg = await this.prisma.package.findUnique({
      where: { id: packageId },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    if (pkg.isTrial) {
      throw new BadRequestException('Trial package is not purchasable');
    }

    const shop = await this.prisma.shop.findUniqueOrThrow({
      where: { id: shopId },
      select: { subscriptionStatus: true, subscriptionEndsAt: true },
    });
    if (shop.subscriptionStatus === 'ACTIVE') {
      const activeSubscription = await this.prisma.shopSubscription.findFirst({
        where: { shopId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        include: { package: true },
      });
      if (activeSubscription) {
        const isUpgrade =
          pkg.durationDays > activeSubscription.package.durationDays;
        if (!isUpgrade) {
          const daysLeft = shop.subscriptionEndsAt
            ? daysUntil(shop.subscriptionEndsAt)
            : 0;
          if (daysLeft > RENEWAL_WINDOW_DAYS) {
            throw new BadRequestException(
              `Your current package is still active for ${daysLeft} more days - renewal opens ${RENEWAL_WINDOW_DAYS} days before it expires`,
            );
          }
        }
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

    const description = `POS Services - ${pkg.name}`;

    if (options?.paymentMethod === 'CARD') {
      if (!options.omiseToken) {
        throw new BadRequestException(
          'Card token is required for card payments',
        );
      }
      const charge = await this.omiseService.createCardCharge({
        token: options.omiseToken,
        amountThb: pkg.priceThb,
        description,
      });
      if (charge.status === 'failed') {
        throw new BadRequestException(
          charge.failure_message ?? 'Card payment failed',
        );
      }

      const payment = await this.prisma.subscriptionPayment.create({
        data: {
          shopSubscriptionId: shopSubscription.id,
          amountThb: pkg.priceThb,
          omiseChargeId: charge.id,
          status: 'PENDING',
        },
      });

      return {
        paymentId: payment.id,
        qrImageUri: null,
        expiresAt: null,
        // Only set when the card actually needs 3D Secure - the caller sends the owner there
        // and then polls getPurchaseStatus() the same way as a PromptPay charge.
        authorizeUri:
          charge.status === 'pending' ? (charge.authorize_uri ?? null) : null,
      };
    }

    const charge = await this.omiseService.createPromptPayCharge({
      amountThb: pkg.priceThb,
      description,
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
      authorizeUri: null,
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

    const shop = await this.prisma.shop.findUniqueOrThrow({
      where: { id: subscription.shopId },
      select: { subscriptionEndsAt: true },
    });
    const now = new Date();
    // Renewing before the current period actually ends extends it rather than discarding the
    // remaining time - only fall back to "now" when there's no time left to stack on top of.
    const base =
      shop.subscriptionEndsAt && shop.subscriptionEndsAt > now
        ? shop.subscriptionEndsAt
        : now;
    const endAt = new Date(
      base.getTime() + subscription.package.durationDays * 24 * 60 * 60 * 1000,
    );

    await this.prisma.$transaction([
      this.prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: { status: 'PAID', paidAt: now },
      }),
      this.prisma.shopSubscription.update({
        where: { id: subscription.id },
        data: { status: 'ACTIVE', startAt: now, endAt },
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
