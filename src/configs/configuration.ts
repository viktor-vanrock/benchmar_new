import { EnvType } from '@/configs/types';

export default (): EnvType => ({
  nodeEnv: process.env.NODE_ENV || 'dev',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
  jwtAccessExpire: process.env.JWT_ACCESS_EXPIRE || '15m',
  jwtRefreshExpire: process.env.JWT_REFRESH_EXPIRE || '7d',
});
