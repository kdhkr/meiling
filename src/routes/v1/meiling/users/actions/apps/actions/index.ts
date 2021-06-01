import { PrismaClient } from '.prisma/client';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { MeilingV1ClientRequest } from '..';
import { getUserFromActionRequest } from '../..';
import { User } from '../../../../../../../common';
import { sendMeilingError } from '../../../../error';
import { MeilingV1ErrorType } from '../../../../interfaces';
import appAuthPlugin from './auth';
import { appRedirectURIPlugin } from './redirect_uri';
import appSessionPlugin from './sessions';

const prisma = new PrismaClient();

export function appActionsPlugin(app: FastifyInstance, opts: FastifyPluginOptions, done: () => void): void {
  app.register(authorizedAppsActionsPlugin);
  app.register(appOwnerActionsPlugin);

  done();
}

export function authorizedAppsActionsPlugin(app: FastifyInstance, opts: FastifyPluginOptions, done: () => void): void {
  app.addHook('onRequest', (_req, rep, done) => {
    const req = _req as MeilingV1ClientRequest;

    if (!req.status.authorized) {
      sendMeilingError(rep, MeilingV1ErrorType.UNAUTHORIZED);
      throw new Error('Unauthorized!');
    }

    done();
  });

  app.register(appAuthPlugin, { prefix: '/auth' });
  app.register(appSessionPlugin, { prefix: '/sessions' });

  done();
}

export function appOwnerActionsPlugin(app: FastifyInstance, opts: FastifyPluginOptions, done: () => void): void {
  app.addHook('onRequest', (_req, rep, done) => {
    const req = _req as MeilingV1ClientRequest;

    if (!req.status.owned) {
      sendMeilingError(rep, MeilingV1ErrorType.UNAUTHORIZED);
      throw new Error('Unauthorized!');
    }

    app.register(appRedirectURIPlugin, { prefix: '/redirect_uri' });

    done();
  });

  done();
}
