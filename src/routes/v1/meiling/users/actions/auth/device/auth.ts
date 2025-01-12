import { FastifyReply, FastifyRequest } from 'fastify';
import { getUserFromActionRequest } from '../..';
import { Meiling, Utils } from '../../../../../../../common';
import { getPrismaClient } from '../../../../../../../resources/prisma';

interface DeviceCode {
  user_code: string;
}

export async function deviceCodeAuthorizeHandler(req: FastifyRequest, rep: FastifyReply): Promise<void> {
  const userBase = (await getUserFromActionRequest(req)) as Meiling.Identity.User.UserInfoObject;
  const type = 'DEVICE_CODE';

  // get parameters and query
  let query = req.query as DeviceCode;
  const body = req.body as DeviceCode;

  // validate
  if (!Utils.isValidValue(query, query.user_code)) {
    if (!Utils.isValidValue(body, body.user_code)) {
      Meiling.V1.Error.sendMeilingError(rep, Meiling.V1.Error.ErrorType.INVALID_REQUEST, 'missing user_code.');
      return;
    }

    query = body;
  }

  // get userData of selected user
  const userData = await Meiling.Identity.User.getDetailedInfo(userBase);
  if (!userData) {
    Meiling.V1.Error.sendMeilingError(
      rep,
      Meiling.V1.Error.ErrorType.INTERNAL_SERVER_ERROR,
      'unable to fetch user from DB.',
    );
    return;
  }

  const minimumIssuedAt = new Date(new Date().getTime() - 1000 * Meiling.Authentication.Token.getValidTimeByType(type));

  const deviceTokens = await getPrismaClient().oAuthToken.findMany({
    where: {
      issuedAt: {
        gte: minimumIssuedAt,
      },
      type,
    },
  });

  const matchingUserCodes = deviceTokens.filter(
    (n) =>
      (n.metadata as unknown as Meiling.Authentication.Token.TokenMetadataV1).data?.deviceCode?.userCode ===
      query.user_code,
  );
  if (matchingUserCodes.length === 0) {
    Meiling.V1.Error.sendMeilingError(rep, Meiling.V1.Error.ErrorType.INVALID_REQUEST, 'no matching user_code found');
    return;
  }

  const userCode = matchingUserCodes[0];

  const client = await Meiling.OAuth2.ClientAuthorization.getClient(userCode.authorizationId);
  if (!client) {
    Meiling.V1.Error.sendMeilingError(
      rep,
      Meiling.V1.Error.ErrorType.APPLICATION_NOT_FOUND,
      'unable to find proper client',
    );
    return;
  }

  // load access control
  const acl = await Meiling.OAuth2.Client.getAccessControl(client.id);
  if (!acl) {
    Meiling.V1.Error.sendMeilingError(
      rep,
      Meiling.V1.Error.ErrorType.INTERNAL_SERVER_ERROR,
      'Failed to get Access Control from Server.',
    );
    return;
  }

  // is this user able to pass client check
  const clientPrivateCheck = await Meiling.OAuth2.ClientAccessControls.checkUsers(acl, userBase);
  if (!clientPrivateCheck) {
    Meiling.V1.Error.sendMeilingError(
      rep,
      Meiling.V1.Error.ErrorType.UNAUTHORIZED,
      'specified oAuth2 application is inaccessible',
    );
    return;
  }

  const authorization = await Meiling.OAuth2.ClientAuthorization.getById(userCode.authorizationId);
  if (!authorization) {
    Meiling.V1.Error.sendMeilingError(
      rep,
      Meiling.V1.Error.ErrorType.UNAUTHORIZED,
      "specified oAuth2 application didn't requested this authorization session",
    );
    return;
  }

  await getPrismaClient().oAuthClientAuthorization.update({
    where: {
      id: authorization.id,
    },
    data: {
      user: {
        connect: {
          id: userBase.id,
        },
      },
    },
  });

  const metadata = userCode.metadata as unknown as Meiling.Authentication.Token.TokenMetadata;
  if (!metadata?.data?.deviceCode) {
    Meiling.V1.Error.sendMeilingError(
      rep,
      Meiling.V1.Error.ErrorType.INTERNAL_SERVER_ERROR,
      "token doesn't seems to be have proper metadata",
    );
    return;
  }

  metadata.data.deviceCode.isAuthorized = true;

  await getPrismaClient().oAuthToken.update({
    where: {
      token: userCode.token,
    },
    data: {
      metadata: metadata as any,
    },
  });

  rep.send({
    success: true,
  });
}
