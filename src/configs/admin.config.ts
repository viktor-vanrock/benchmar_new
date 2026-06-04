import { registerAs } from '@nestjs/config';
import { AdminUserEnvType } from './types';

export default registerAs('admin', (): AdminUserEnvType => ({
  username: process.env.ADMIN_LOGIN || 'admin',
  email: process.env.ADMIN_EMAIL || 'admin@admin.com',
  password: process.env.ADMIN_PASSWORD || 'admin1234!@$%',
}));
