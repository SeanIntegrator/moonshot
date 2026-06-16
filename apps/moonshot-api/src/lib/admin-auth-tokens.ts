import jwt from 'jsonwebtoken';
import type { AdminLoginResponse } from '@moonshot/types';

export function signAdminJwt(params: {
  adminUserId: string;
  cafeId: string;
  cafeSlug: string;
  email: string;
}): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('Server JWT configuration missing');
  }
  return jwt.sign(
    {
      sub: params.adminUserId,
      adminUserId: params.adminUserId,
      cafeId: params.cafeId,
      cafeSlug: params.cafeSlug,
      email: params.email,
      purpose: 'admin',
    },
    jwtSecret,
    { expiresIn: '30d' },
  );
}

export function buildAdminLoginResponse(params: {
  adminUserId: string;
  cafeId: string;
  cafeSlug: string;
  cafeName: string;
  email: string;
  displayName: string | null;
}): AdminLoginResponse {
  const token = signAdminJwt({
    adminUserId: params.adminUserId,
    cafeId: params.cafeId,
    cafeSlug: params.cafeSlug,
    email: params.email,
  });
  return {
    token,
    cafe: { id: params.cafeId, slug: params.cafeSlug, name: params.cafeName },
    adminUser: {
      id: params.adminUserId,
      email: params.email,
      displayName: params.displayName,
    },
  };
}
