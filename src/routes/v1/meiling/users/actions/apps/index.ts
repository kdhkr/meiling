import { OAuthClient } from '@prisma/client';
import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { getUserFromActionRequest } from '..';
import { Meiling } from '../../../../../../common';
import { appActionsPlugin } from './actions';
import appDeleteHandler from './delete';
import appGetHandler from './get';
import userAppsHandler from './list';
import appCreateHandler from './post';

export function userAppPlugin(app: FastifyInstance, opts: FastifyPluginOptions, done: () => void): void {
  app.get('/', userAppsHandler);
  app.post('/', appCreateHandler);

  app.register(userAppsActionsPlugin, { prefix: '/:clientId' });

  done();
}

interface MeilingV1ClientIDParams {
  clientId: string;
}

export interface MeilingV1ClientRequest extends FastifyRequest {
  client: OAuthClient;
  status: {
    authorized: boolean;
    owned: boolean;
  };
}

export function userAppsActionsPlugin(app: FastifyInstance, opts: FastifyPluginOptions, done: () => void): void {
  app.addHook('onRequest', async (req, rep) => {
    const user = (await getUserFromActionRequest(req)) as Meiling.Identity.User.UserInfoObject;
    const clientId = (req.params as MeilingV1ClientIDParams).clientId;

    const userDetail = (await Meiling.Identity.User.getDetailedInfo(user)) as Meiling.Identity.User.UserDetailedObject;

    const owned = userDetail.ownedApps.filter((n) => n.id === clientId).length > 0;
    const authorized = userDetail.authorizedApps.filter((n) => n.id === clientId).length > 0;

    if (!owned && !authorized) {
      Meiling.V1.Error.sendMeilingError(rep, Meiling.V1.Error.ErrorType.APPLICATION_NOT_FOUND);
      throw new Error('You do not own/authorized this');
    }

    const client = (await Meiling.OAuth2.Client.getByClientId(clientId)) as OAuthClient;

    (req as MeilingV1ClientRequest).status = {
      owned,
      authorized,
    };

    (req as MeilingV1ClientRequest).client = client;
  });

  app.get('/', appGetHandler);
  app.delete('/', appDeleteHandler);
  app.register(appActionsPlugin);

  done();
}
