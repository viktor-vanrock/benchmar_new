export type EnvType = {
  nodeEnv: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessExpire: string;
  jwtRefreshExpire: string;
};

export type AdminUserEnvType = {
  username: string;
  email: string;
  password: string;
};

export type DatabaseEnvType = {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
  url: string;
};

export type RedisEnvType = {
  password: string;
  host: string;
  port: number;
};
