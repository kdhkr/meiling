import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { getUserFromActionRequest } from '../../..';
import { getPrismaClient } from '../../../../../../../../resources/prisma';
import { convertAuthentication } from '../../../../../../../../common/meiling/v1/database';
import { Meiling } from '../../../../../../../../common';

function user2FAEnablePlugin(app: FastifyInstance, opts: FastifyPluginOptions, done: () => void): void {
  app.get('/', async (req, rep) => {
    const user = await getUserFromActionRequest(req);
    if (!user) {
      Meiling.V1.Error.sendMeilingError(rep, Meiling.V1.Error.ErrorType.UNAUTHORIZED);
      return;
    }

    rep.send({
      enabled: user.useTwoFactor,
    });
  });

  app.post('/', async (req, rep) => {
    const user = await getUserFromActionRequest(req);
    if (!user) {
      Meiling.V1.Error.sendMeilingError(rep, Meiling.V1.Error.ErrorType.UNAUTHORIZED);
      return;
    }

    const methods = Object.values(Meiling.V1.Interfaces.ExtendedAuthMethods);

    const currentAvailables = await Promise.all(
      methods.map(async (n) => {
        const dbType = convertAuthentication(n);
        const isAvailable =
          (await getPrismaClient().authentication.count({
            where: {
              user: {
                id: user.id,
              },
              method: dbType,
            },
          })) > 0;

        const is2FAEnabled =
          (await getPrismaClient().authentication.count({
            where: {
              user: {
                id: user.id,
              },
              method: dbType,
              allowTwoFactor: true,
            },
          })) > 0;

        const isPasswordlessEnabled =
          (await getPrismaClient().authentication.count({
            where: {
              user: {
                id: user.id,
              },
              method: dbType,
              allowSingleFactor: true,
            },
          })) > 0;

        const isPasswordResetEnabled =
          (await getPrismaClient().authentication.count({
            where: {
              user: {
                id: user.id,
              },
              method: dbType,
              allowPasswordReset: true,
            },
          })) > 0;

        return {
          enabled: {
            '2fa': is2FAEnabled,
            passwordless: isPasswordlessEnabled,
            passwordReset: isPasswordResetEnabled,
          },
          method: n,
          available: isAvailable,
        };
      }),
    );

    const twoFactorReadyMethods = currentAvailables.filter((n) => n.available && n.enabled['2fa']);

    if (twoFactorReadyMethods.length === 0) {
      Meiling.V1.Error.sendMeilingError(
        rep,
        Meiling.V1.Error.ErrorType.UNSUPPORTED_SIGNIN_METHOD,
        'there is no 2fa supported method to login',
      );
      return;
    }

    await getPrismaClient().user.update({
      where: {
        id: user.id,
      },
      data: {
        useTwoFactor: true,
      },
    });

    rep.send({ success: true });
  });

  app.delete('/', async (req, rep) => {
    const user = await getUserFromActionRequest(req);
    if (!user) {
      Meiling.V1.Error.sendMeilingError(rep, Meiling.V1.Error.ErrorType.UNAUTHORIZED);
      return;
    }

    await getPrismaClient().user.update({
      where: {
        id: user.id,
      },
      data: {
        useTwoFactor: false,
      },
    });

    rep.send({ success: true });
  });

  done();
}

export default user2FAEnablePlugin;
