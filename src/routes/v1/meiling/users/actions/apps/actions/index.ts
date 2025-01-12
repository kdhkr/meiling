import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { MeilingV1ClientRequest } from '..';
import { appPermissionsPlugin } from './permissions';
import appAuthPlugin from './auth';
import { appRedirectURIPlugin } from './redirect_uri';
import appSessionPlugin from './sessions';
import { appClientSecretPlugin } from './client_secret';
import { Meiling } from '../../../../../../../common';

export function appActionsPlugin(app: FastifyInstance, opts: FastifyPluginOptions, done: () => void): void {
  app.register(authorizedAppsActionsPlugin);
  app.register(appOwnerActionsPlugin);

  done();
}

function authorizedAppsActionsPlugin(app: FastifyInstance, opts: FastifyPluginOptions, done: () => void): void {
  app.addHook('onRequest', (_req, rep, done) => {
    const req = _req as MeilingV1ClientRequest;

    if (!req.status.authorized) {
      Meiling.V1.Error.sendMeilingError(rep, Meiling.V1.Error.ErrorType.UNAUTHORIZED);
      throw new Error('Unauthorized!');
    }

    done();
  });

  app.register(appAuthPlugin, { prefix: '/auth' });
  app.register(appSessionPlugin, { prefix: '/sessions' });

  done();
}

function appOwnerActionsPlugin(app: FastifyInstance, opts: FastifyPluginOptions, done: () => void): void {
  app.addHook('onRequest', (_req, rep, done) => {
    const req = _req as MeilingV1ClientRequest;

    if (!req.status.owned) {
      Meiling.V1.Error.sendMeilingError(rep, Meiling.V1.Error.ErrorType.UNAUTHORIZED);
      throw new Error('Unauthorized!');
    }

    done();
  });

  app.register(appRedirectURIPlugin, { prefix: '/redirect_uri' });
  app.register(appClientSecretPlugin, { prefix: '/client_secret' });
  app.register(appPermissionsPlugin, { prefix: '/permissions' });

  done();
}
