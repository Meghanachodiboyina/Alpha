export type MessageType =
  | 'user_message'
  | 'orbit_message'
  | 'clarification_question'
  | 'thinking_state'
  | 'routine_summary'
  | 'routine_preview_card'
  | 'task_recovery_prompt'
  | 'replan_suggestion'
  | 'ai_insight';

export interface OrbitMsg {
  id: number | string;
  role: 'user' | 'orbit';
  content: string;
  message_type: MessageType;
  metadata_json?: any;
  created_at?: string;
}
