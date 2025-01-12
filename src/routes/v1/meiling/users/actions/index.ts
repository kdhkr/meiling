import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { Meiling } from '../../../../../common';
import { userAppPlugin } from './apps';
import { clientAuthPlugin } from './auth';
import { userGetInfo } from './info/get';
import { userUpdateInfo } from './info/put';
import userSecurityPlugin from './security';
import userPasswordsPlugin from './security/passwords';

export function userActionsHandler(app: FastifyInstance, opts: FastifyPluginOptions, done: () => void) {
  // /v1/meiling/user/:userId/action
  // TODO: Implement authentication
  app.addHook('onRequest', async (req, rep) => {
    const userBase = await getUserFromActionRequest(req);
    if (userBase === undefined) {
      Meiling.V1.Error.sendMeilingError(rep, Meiling.V1.Error.ErrorType.INVALID_REQUEST, 'invalid request.');
      throw new Error('User is not privileged to run this command');
    } else if (userBase === null) {
      Meiling.V1.Error.sendMeilingError(
        rep,
        Meiling.V1.Error.ErrorType.UNAUTHORIZED,
        'you are not logged in as specified user.',
      );
      throw new Error('User is not privileged to run this command');
    }
  });

  app.get('/', userGetInfo);
  app.put('/', userUpdateInfo);

  // TODO: Remove this later.
  // legacy compatibility reasons. will be deprecated in future.
  // migrate to `/v1/security/passwords`.
  app.register(userPasswordsPlugin, { prefix: '/passwords' });

  app.register(clientAuthPlugin, { prefix: '/auth' });
  app.register(userAppPlugin, { prefix: '/apps' });
  app.register(userSecurityPlugin, { prefix: '/security' });

  done();
}

export async function getUserFromActionRequest(
  req: FastifyRequest,
): Promise<Meiling.Identity.User.UserInfoObject | undefined | null> {
  const users = await Meiling.V1.Session.getLoggedIn(req);
  const userId = (req.params as { userId: string }).userId;

  const user = users.find((n) => n.id === userId);

  return userId === undefined ? undefined : user === undefined ? null : user;
}
