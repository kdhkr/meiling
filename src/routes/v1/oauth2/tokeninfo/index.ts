import { FastifyReply } from 'fastify/types/reply';
import { FastifyRequest } from 'fastify/types/request';
import { accessTokenInfoHandler } from './access_token';
import { idTokenInfoHandler } from './id_token';
import { refreshTokenInfoHandler } from './refresh_token';
import { Meiling } from '../../../../common';

interface OAuth2QueryTokenInfoBody {
  id_token?: string;
  access_token?: string;
  refresh_token?: string;
}

export async function oAuth2TokenInfoHandler(req: FastifyRequest, rep: FastifyReply): Promise<void> {
  const body = (req.body ? req.body : req.query) as OAuth2QueryTokenInfoBody;

  if (body?.id_token) {
    await idTokenInfoHandler(body.id_token, rep);
  } else if (body?.access_token) {
    await accessTokenInfoHandler(body.access_token, rep);
  } else if (body?.refresh_token) {
    await refreshTokenInfoHandler(body.refresh_token, rep);
  } else {
    Meiling.OAuth2.Error.sendOAuth2Error(rep, Meiling.OAuth2.Error.ErrorType.INVALID_REQUEST, 'missing proper query');
  }
  return;
}
