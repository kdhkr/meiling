import { Authorization, PrismaClient, User } from '@prisma/client';
import { MeilingV1ExtendedAuthMethods, MeilingV1SigninType } from '../interfaces';
import { convertAuthentication } from './database';

const prisma = new PrismaClient();

export async function getAvailableExtendedAuthenticationMethods(
  user?: User | string,
  signinType?: MeilingV1SigninType | 'password_reset',
  signinMethod?: MeilingV1ExtendedAuthMethods,
): Promise<Authorization[]> {
  let uuid;
  if (user !== undefined) {
    if (typeof user === 'string') {
      uuid = user;
    } else {
      uuid = user.id;
    }
  } else {
    uuid = undefined;
  }

  let auths;

  if (signinType !== undefined) {
    auths = await prisma.authorization.findMany({
      where: {
        userId: uuid,
        allowSingleFactor: signinType === MeilingV1SigninType.PASSWORDLESS ? true : undefined,
        allowTwoFactor: signinType === MeilingV1SigninType.TWO_FACTOR_AUTH ? true : undefined,
        allowPasswordReset: signinType === 'password_reset' ? true : undefined,
        method: signinMethod !== undefined ? convertAuthentication(signinMethod) : undefined,
      },
    });
  } else {
    auths = await prisma.authorization.findMany({
      where: {
        userId: uuid,
        method: signinMethod !== undefined ? convertAuthentication(signinMethod) : undefined,
      },
    });
  }

  return auths;
}
