export enum WsEvent {
  // чат
  StartChat = 'start_chat',
  ChatStarted = 'chat_started',
  SendMessage = 'send_message',
  AgentMessage = 'agent_message',

  // рекомендации
  SelectRecommendation = 'select_recommendation',
  RejectRecommendation = 'reject_recommendation',
  RecommendationUpdated = 'recommendation_updated',

  // гипотезы
  RegenerateHypotheses = 'regenerate_hypotheses',
  HypothesesGenerated = 'hypotheses_generated',

  // ошибки
  Error = 'error'
}
