import { registerAs } from '@nestjs/config';
import { parseIntWithFallback } from '@/common/utils/parseIntWithFallback';
import { AgentEnvType, AgentMode } from './types';

const parseMode = (value: string | undefined): AgentMode => {
  return 'ws' === value ? 'ws' : 'mock';
};

export default registerAs('agent', (): AgentEnvType => ({
  mode: parseMode(process.env.AGENT_MODE),
  wsUrl: process.env.THIRD_PARTY_WS_URL ?? '',
  apiKey: process.env.THIRD_PARTY_API_KEY ?? '',
  reconnectInitialDelayMs: parseIntWithFallback(
    process.env.AGENT_RECONNECT_INITIAL_DELAY_MS, 500
  ),
  reconnectMaxDelayMs: parseIntWithFallback(
    process.env.AGENT_RECONNECT_MAX_DELAY_MS, 15_000
  ),
  reconnectMaxAttempts: parseIntWithFallback(
    process.env.AGENT_RECONNECT_MAX_ATTEMPTS, 8
  ),
  heartbeatIntervalMs: parseIntWithFallback(
    process.env.AGENT_HEARTBEAT_INTERVAL_MS, 25_000
  ),
  heartbeatTimeoutMs: parseIntWithFallback(
    process.env.AGENT_HEARTBEAT_TIMEOUT_MS, 10_000
  ),
}));
