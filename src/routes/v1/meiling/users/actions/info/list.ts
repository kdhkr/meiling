import { FastifyReply, FastifyRequest } from 'fastify';
import { FastifyRequestWithSession } from '../../..';
import { Meiling } from '../../../../../../common';
import { sendMeilingError } from '../../../../../../common/meiling/v1/error/error';

export async function userGetLoggedInUserInfo(req: FastifyRequest, rep: FastifyReply) {
  const session = (req as FastifyRequestWithSession).session;
  const userRawSession = session.user;

  if (userRawSession && userRawSession.length > 0) {
    const users = session.user;
    if (!users) {
      sendMeilingError(rep, Meiling.V1.Error.ErrorType.UNAUTHORIZED, 'You are not logged in.');
      return;
    }

    const resultPromise = [];

    for (const user of users) {
      resultPromise.push(Meiling.Sanitize.getSanitizedUser(user.id));
    }
    const result = await Promise.all(resultPromise);

    rep.send(result);
  } else {
    sendMeilingError(rep, Meiling.V1.Error.ErrorType.UNAUTHORIZED, 'You are not logged in.');
  }
}
