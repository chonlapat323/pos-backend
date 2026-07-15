export interface PlatformJwtPayload {
  sub: string;
  type: 'platform';
  name: string;
}

export interface CurrentPlatformAdminPayload {
  id: string;
  name: string;
  permissions: string[];
  isSuperAdmin: boolean;
}
