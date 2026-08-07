
from datetime import date as routine_date, datetime, time
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetVerify(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=4, max_length=8)
    new_password: str = Field(..., min_length=6, max_length=100)


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class MessageResponse(BaseModel):
    message: str


class RoutineBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    date: routine_date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    priority: str = Field(default="Medium")
    status: str = Field(default="Pending")
    estimated_time: int = Field(default=60, ge=5, le=720)
    focus_mode_recommended: bool = Field(default=False)
    is_internal: bool = Field(default=False)
    suggestion: Optional[str] = Field(default=None, max_length=2000)
    session_id: Optional[int] = Field(default=None)

    # V2: Cognitive Intelligence fields
    energy_score: int = Field(5, ge=1, le=10)
    complexity_score: int = Field(5, ge=1, le=10)
    urgency_score: int = Field(5, ge=1, le=10)
    importance_score: int = Field(5, ge=1, le=10)
    deadline_score: int = Field(3, ge=1, le=10)
    location: Optional[str] = None
    deadline: Optional[datetime] = None
    category: Optional[str] = Field(default=None, max_length=100)
    scheduling_reason: Optional[str] = Field(default=None, max_length=2000)
    fixed_time: bool = Field(default=False)

    @field_validator("description", "suggestion", "scheduling_reason", mode="before")
    @classmethod
    def normalize_optional_text(cls, value):
        if value in ("", "null"):
            return None
        return value

    @field_validator("start_time", "end_time", mode="before")
    @classmethod
    def normalize_optional_time(cls, value):
        if value in ("", "null"):
            return None
        if isinstance(value, str):
            normalized = value.strip().upper()
            try:
                if normalized.endswith(("AM", "PM")):
                    return datetime.strptime(normalized, "%I:%M %p").time()
            except ValueError:
                pass
        return value

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str) -> str:
        allowed = {"High", "Medium", "Low"}
        normalized = value.capitalize()
        if normalized not in allowed:
            raise ValueError("Priority must be High, Medium, or Low.")
        return normalized

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        allowed = {"Pending", "Completed", "Partial", "Skipped"}
        normalized = value.capitalize()
        if normalized not in allowed:
            raise ValueError("Status must be Pending, Completed, Partial, or Skipped.")
        return normalized


class RoutineCreate(RoutineBase):
    pass


class RoutineUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    date: Optional[routine_date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    estimated_time: Optional[int] = Field(default=None, ge=5, le=720)
    actual_duration: Optional[int] = Field(default=None, ge=1, le=1440)
    focus_mode_recommended: Optional[bool] = None
    suggestion: Optional[str] = Field(default=None, max_length=2000)
    category: Optional[str] = Field(default=None, max_length=100)
    scheduling_reason: Optional[str] = Field(default=None, max_length=2000)
    location: Optional[str] = Field(default=None, max_length=500)

    @field_validator("description", "suggestion", "scheduling_reason", mode="before")
    @classmethod
    def normalize_optional_text(cls, value):
        if value in ("", "null"):
            return None
        return value

    @field_validator("start_time", "end_time", mode="before")
    @classmethod
    def normalize_optional_time(cls, value):
        if value in ("", "null"):
            return None
        if isinstance(value, str):
            normalized = value.strip().upper()
            try:
                if normalized.endswith(("AM", "PM")):
                    return datetime.strptime(normalized, "%I:%M %p").time()
            except ValueError:
                pass
        return value

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        allowed = {"High", "Medium", "Low"}
        normalized = value.capitalize()
        if normalized not in allowed:
            raise ValueError("Priority must be High, Medium, or Low.")
        return normalized

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        allowed = {"Pending", "Completed", "Partial", "Skipped"}
        normalized = value.capitalize()
        if normalized not in allowed:
            raise ValueError("Status must be Pending, Completed, Partial, or Skipped.")
        return normalized


class RoutineOut(RoutineBase):
    id: int
    user_id: str
    session_id: Optional[int] = None
    created_at: datetime
    actual_duration: Optional[int] = None
    deadline: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RoutineSessionOut(BaseModel):
    id: int
    user_id: str
    conversation_id: Optional[int] = None
    scheduled_for: routine_date
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConflictCheckRequest(BaseModel):
    routine_id: int
    new_start_time: Optional[time] = None
    new_end_time: Optional[time] = None
    new_date: Optional[routine_date] = None
    new_estimated_time: Optional[int] = None


class ConflictingRoutineInfo(BaseModel):
    id: int
    title: str
    start_time: Optional[time] = None
    end_time: Optional[time] = None

    model_config = ConfigDict(from_attributes=True)


class ConflictCheckResponse(BaseModel):
    has_conflict: bool
    conflicting_routines: list[ConflictingRoutineInfo] = []
    message: str = ""


class DailyReviewCarryForward(BaseModel):
    id: int
    title: str
    status: str
    category: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DailyReviewResponse(BaseModel):
    completed_count: int
    skipped_count: int
    partial_count: int
    pending_count: int
    total_focus_minutes: int
    total_recovery_minutes: int
    carry_forward: list[DailyReviewCarryForward] = []
    summary_message: str


class AIGenerationRequest(BaseModel):
    input_text: str = Field(..., min_length=5, max_length=5000)
    plan_scope: str = Field(default="daily")
    current_time: Optional[str] = Field(default=None, description="The user's local current time in ISO format or descriptive string")

    @field_validator("plan_scope")
    @classmethod
    def validate_scope(cls, value: str) -> str:
        allowed = {"daily", "weekly", "today"}
        normalized = value.lower()
        if normalized not in allowed:
            raise ValueError("plan_scope must be daily, weekly, or today.")
        return normalized


class AIPlannedRoutine(BaseModel):
    title: str
    description: str
    date: routine_date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    priority: str
    status: str = "Pending"
    estimated_time: int
    focus_mode_recommended: bool = False
    is_internal: bool = False
    suggestion: str

    # V2: Cognitive Intelligence fields
    energy_score: int = 5
    complexity_score: int = 5
    urgency_score: int = 5
    location: Optional[str] = None
    category: Optional[str] = None
    scheduling_reason: Optional[str] = None
    fixed_time: bool = False


class AIGenerationResponse(BaseModel):
    summary: str
    target_date: Optional[str] = None
    productivity_tips: list[str]
    routines: list[AIPlannedRoutine]
    schedule_confidence: float = Field(default=1.0)
    explanation: Optional[str] = None
    explanation_points: list[str] = Field(default_factory=list, description="Max 3 concise scheduling decisions")
    is_overloaded: bool = False
    overload_message: Optional[str] = None
    validation_warnings: Optional[list[str]] = None
    suggested_deferrals: list[str] = Field(default_factory=list)
    new_behavioral_insights: list[str] = Field(default_factory=list, description="New behavioral rules or preferences inferred from the user prompt. Format: 'Pattern Type: Insight'")


class AIClarificationOption(BaseModel):
    value: str
    label: str
    emoji: Optional[str] = None


class AIClarificationQuestion(BaseModel):
    id: str  # e.g. "travel_0", "personality"
    question: str  # Short mobile-friendly question text
    type: str = "single_choice"  # "single_choice" | "confirm"
    options: list[AIClarificationOption]
    task_title: Optional[str] = None  # Which task this relates to (null for global)
    default_value: Optional[str] = None  # Best-guess default


class AIAnalysisResponse(BaseModel):
    needs_clarification: bool
    clarifications: list[AIClarificationQuestion] = []
    result: Optional[AIGenerationResponse] = None  # Present when no clarification needed


class AIGenerationWithClarifications(BaseModel):
    input_text: str = Field(..., min_length=5, max_length=5000)
    plan_scope: str = Field(default="daily")
    current_time: Optional[str] = Field(default=None)
    clarifications: dict[str, str] = Field(default_factory=dict)

    @field_validator("plan_scope")
    @classmethod
    def validate_scope(cls, value: str) -> str:
        allowed = {"daily", "weekly", "today"}
        normalized = value.lower()
        if normalized not in allowed:
            raise ValueError("plan_scope must be daily, weekly, or today.")
        return normalized


class DashboardStats(BaseModel):
    # Today-scoped
    today_total: int
    today_completed: int
    today_pending: int

    # This-week-scoped
    week_total: int
    week_completed: int
    week_pending: int

    # Computed score (0-100) based on this week
    productivity_score: int
    completion_rate: float  # 0.0 – 1.0

    # Legacy aliases kept for backward compat with existing UI cards
    total_routines: int       # = week_total
    completed_routines: int   # = week_completed
    pending_routines: int     # = week_pending
    today_routines: int       # = today_total

    weekly_overview: list[dict]  # [{date, total, completed}]


class ProjectTaskBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = Field(default=None, max_length=4000)
    due_date: routine_date
    assignee: str = Field(..., min_length=2, max_length=255)
    priority: str = Field(default="Medium")
    status: str = Field(default="Todo")
    comments: Optional[str] = Field(default=None, max_length=4000)

    @field_validator("description", "comments", mode="before")
    @classmethod
    def normalize_optional_project_text(cls, value):
        if value in ("", "null"):
            return None
        return value

    @field_validator("priority")
    @classmethod
    def validate_project_priority(cls, value: str) -> str:
        allowed = {"Low", "Medium", "High", "Urgent"}
        normalized = value.capitalize()
        if normalized not in allowed:
            raise ValueError("Priority must be Low, Medium, High, or Urgent.")
        return normalized

    @field_validator("status")
    @classmethod
    def validate_project_status(cls, value: str) -> str:
        normalized = value.strip().lower().replace("-", " ")
        mapping = {
            "todo": "Todo",
            "in progress": "In Progress",
            "completed": "Completed",
            "blocked": "Blocked",
        }
        if normalized not in mapping:
            raise ValueError("Status must be Todo, In Progress, Completed, or Blocked.")
        return mapping[normalized]


class ProjectTaskCreate(ProjectTaskBase):
    pass


class ProjectTaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=255)
    description: Optional[str] = Field(default=None, max_length=4000)
    due_date: Optional[routine_date] = None
    assignee: Optional[str] = Field(default=None, min_length=2, max_length=255)
    priority: Optional[str] = None
    status: Optional[str] = None
    comments: Optional[str] = Field(default=None, max_length=4000)

    @field_validator("description", "comments", mode="before")
    @classmethod
    def normalize_optional_project_update_text(cls, value):
        if value in ("", "null"):
            return None
        return value

    @field_validator("priority")
    @classmethod
    def validate_optional_project_priority(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        allowed = {"Low", "Medium", "High", "Urgent"}
        normalized = value.capitalize()
        if normalized not in allowed:
            raise ValueError("Priority must be Low, Medium, High, or Urgent.")
        return normalized

    @field_validator("status")
    @classmethod
    def validate_optional_project_status(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        normalized = value.strip().lower().replace("-", " ")
        mapping = {
            "todo": "Todo",
            "in progress": "In Progress",
            "completed": "Completed",
            "blocked": "Blocked",
        }
        if normalized not in mapping:
            raise ValueError("Status must be Todo, In Progress, Completed, or Blocked.")
        return mapping[normalized]


class ProjectTaskOut(ProjectTaskBase):
    id: int
    user_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkspaceInviteCreate(BaseModel):
    invitee_email: EmailStr
    role: str = Field(default="Member")

    @field_validator("role")
    @classmethod
    def validate_workspace_role(cls, value: str) -> str:
        mapping = {
            "admin": "Admin",
            "member": "Member",
            "viewer": "Viewer",
        }
        normalized = value.strip().lower()
        if normalized not in mapping:
            raise ValueError("Role must be Admin, Member, or Viewer.")
        return mapping[normalized]


class WorkspaceInviteRespond(BaseModel):
    action: str = Field(..., min_length=6, max_length=7)

    @field_validator("action")
    @classmethod
    def validate_invite_action(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"accept", "decline"}:
            raise ValueError("Action must be accept or decline.")
        return normalized


class WorkspaceInviteTokenAccept(BaseModel):
    token: str = Field(..., min_length=20)


class WorkspaceInviteOut(BaseModel):
    id: int
    inviter_user_id: str
    inviter_name: str
    invitee_email: EmailStr
    role: str
    status: str
    created_at: datetime
    responded_at: Optional[datetime] = None


class WorkspaceMemberOut(BaseModel):
    email: EmailStr
    name: str
    role: str
    is_online: bool = False


class WorkspaceProjectBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    description: Optional[str] = Field(default=None, max_length=2000)
    color: str = Field(default="#22c1c3", min_length=4, max_length=20)

    @field_validator("description", mode="before")
    @classmethod
    def normalize_optional_workspace_project_text(cls, value):
        if value in ("", "null"):
            return None
        return value


class WorkspaceProjectCreate(WorkspaceProjectBase):
    pass


class WorkspaceProjectOut(WorkspaceProjectBase):
    id: int
    user_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkspaceTaskBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = Field(default=None, max_length=4000)
    assignee: str = Field(..., min_length=2, max_length=255)
    priority: str = Field(default="Medium")
    status: str = Field(default="Todo")
    due_date: routine_date
    progress: int = Field(default=0, ge=0, le=100)
    project_name: str = Field(default="Team Space", min_length=2, max_length=120)

    @field_validator("description", mode="before")
    @classmethod
    def normalize_optional_workspace_text(cls, value):
        if value in ("", "null"):
            return None
        return value

    @field_validator("priority")
    @classmethod
    def validate_workspace_priority(cls, value: str) -> str:
        allowed = {"Low", "Medium", "High", "Urgent"}
        normalized = value.capitalize()
        if normalized not in allowed:
            raise ValueError("Priority must be Low, Medium, High, or Urgent.")
        return normalized

    @field_validator("status")
    @classmethod
    def validate_workspace_status(cls, value: str) -> str:
        normalized = value.strip().lower().replace("-", " ")
        mapping = {
            "todo": "Todo",
            "in progress": "In Progress",
            "completed": "Completed",
        }
        if normalized not in mapping:
            raise ValueError("Status must be Todo, In Progress, or Completed.")
        return mapping[normalized]


class WorkspaceTaskCreate(WorkspaceTaskBase):
    pass


class WorkspaceTaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=255)
    description: Optional[str] = Field(default=None, max_length=4000)
    assignee: Optional[str] = Field(default=None, min_length=2, max_length=255)
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[routine_date] = None
    progress: Optional[int] = Field(default=None, ge=0, le=100)
    project_name: Optional[str] = Field(default=None, min_length=2, max_length=120)

    @field_validator("description", mode="before")
    @classmethod
    def normalize_optional_workspace_update_text(cls, value):
        if value in ("", "null"):
            return None
        return value

    @field_validator("priority")
    @classmethod
    def validate_optional_workspace_priority(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        allowed = {"Low", "Medium", "High", "Urgent"}
        normalized = value.capitalize()
        if normalized not in allowed:
            raise ValueError("Priority must be Low, Medium, High, or Urgent.")
        return normalized

    @field_validator("status")
    @classmethod
    def validate_optional_workspace_status(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        normalized = value.strip().lower().replace("-", " ")
        mapping = {
            "todo": "Todo",
            "in progress": "In Progress",
            "completed": "Completed",
        }
        if normalized not in mapping:
            raise ValueError("Status must be Todo, In Progress, or Completed.")
        return mapping[normalized]


class WorkspaceTaskOut(WorkspaceTaskBase):
    id: int
    user_id: str
    owner_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkspaceAIGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=5, max_length=2000)
    project_name: str = Field(default="Team Space", min_length=2, max_length=120)
    assignee: Optional[str] = Field(default=None, min_length=2, max_length=255)


class WorkspaceAIGeneratedTask(BaseModel):
    title: str
    description: str
    assignee: str
    priority: str
    status: str
    due_date: routine_date
    progress: int
    project_name: str


class WorkspaceAIGenerateResponse(BaseModel):
    message: str
    tasks: list[WorkspaceTaskOut]


class WorkspaceAITaskGroupOut(BaseModel):
    prompt: str
    created_at: datetime
    tasks: list[WorkspaceTaskOut]


class WorkspaceSettingsUpdate(BaseModel):
    workspace_name: str = Field(default="Team Space", min_length=2, max_length=120)
    theme: str = Field(default="ocean", min_length=3, max_length=20)
    notifications_enabled: bool = True
    email_notifications_enabled: bool = True
    permission_mode: str = Field(default="members_edit", min_length=4, max_length=30)
    smtp_host: Optional[str] = Field(default=None, max_length=255)
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_username: Optional[str] = Field(default=None, max_length=255)
    smtp_password: Optional[str] = Field(default=None, max_length=255)
    smtp_from_email: Optional[EmailStr] = None
    smtp_use_tls: bool = True

    @field_validator("theme")
    @classmethod
    def validate_workspace_theme(cls, value: str) -> str:
        allowed = {"ocean", "dark", "light"}
        normalized = value.strip().lower()
        if normalized not in allowed:
            raise ValueError("Theme must be ocean, dark, or light.")
        return normalized

    @field_validator("permission_mode")
    @classmethod
    def validate_permission_mode(cls, value: str) -> str:
        allowed = {"owner_only", "admins_edit", "members_edit", "read_only"}
        normalized = value.strip().lower()
        if normalized not in allowed:
            raise ValueError("Permission mode must be owner_only, admins_edit, members_edit, or read_only.")
        return normalized

    @field_validator("smtp_host", "smtp_username", "smtp_password", mode="before")
    @classmethod
    def normalize_optional_workspace_setting_text(cls, value):
        if value in ("", "null"):
            return None
        return value


class WorkspaceSettingsOut(BaseModel):
    workspace_name: str
    theme: str
    notifications_enabled: bool
    email_notifications_enabled: bool
    permission_mode: str
    smtp_host: Optional[str] = None
    smtp_port: int
    smtp_username: Optional[str] = None
    smtp_from_email: Optional[EmailStr] = None
    smtp_use_tls: bool
    email_configured: bool


class WorkspaceMemberPerformance(BaseModel):
    name: str
    role: str
    assigned_tasks: int
    completed_tasks: int
    completion_rate: int


class WorkspaceReportOut(BaseModel):
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    in_progress_tasks: int
    overdue_tasks: int
    productivity_percentage: int
    member_performance: list[WorkspaceMemberPerformance]


class WorkspaceBootstrapResponse(BaseModel):
    projects: list[WorkspaceProjectOut]
    tasks: list[WorkspaceTaskOut]
    members: list[WorkspaceMemberOut]
    invites: list[WorkspaceInviteOut]
    ai_tasks: list[WorkspaceTaskOut]
    ai_task_groups: list[WorkspaceAITaskGroupOut] = []
    reports: WorkspaceReportOut
    settings: WorkspaceSettingsOut

class UserPreferenceCreate(BaseModel):
    category: str = Field(..., max_length=120)
    value: str

class UserPreferenceOut(BaseModel):
    id: int
    user_id: str
    category: str
    value: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Orbit Schemas ─────────────────────────────────────────────────────────

class OrbitMessageOut(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    message_type: str
    metadata_json: Optional[dict] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrbitConversationOut(BaseModel):
    id: int
    user_id: str
    title: str
    status: str
    original_prompt: Optional[str] = None
    clarification_answers: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    messages: list[OrbitMessageOut] = []

    model_config = ConfigDict(from_attributes=True)


class OrbitConversationCreate(BaseModel):
    title: str = Field(default="New Conversation", max_length=255)


class OrbitConversationUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)


class OrbitSessionOut(BaseModel):
    id: int
    user_id: str
    conversation_id: Optional[int] = None
    status: str
    current_state: str
    context_json: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrbitChatRequest(BaseModel):
    conversation_id: Optional[int] = None  # None = create new conversation
    user_message: str = Field(..., min_length=1, max_length=5000)
    plan_scope: str = Field(default="today")
    current_time: Optional[str] = None
    timezone: Optional[str] = Field(default=None, description="IANA timezone string e.g. 'Asia/Kolkata'")
    # For Phase 2: clarification answers sent with follow-up
    clarifications: Optional[dict[str, str]] = None
    # Internal: indicate this is a follow-up after clarification
    is_clarification_response: bool = False
    # Intent passed from preflight check
    client_intent: Optional[str] = None


class OrbitChatResponse(BaseModel):
    conversation_id: int
    session_id: Optional[int] = None       # active orbit session id
    messages: list[OrbitMessageOut]        # new messages to append to chat
    routines_created: int = 0
    status: str = Field(default="COMPLETE")
    session_state: Optional[str] = None    # current state machine state



class OrbitTaskMemoryCreate(BaseModel):
    routine_id: Optional[int] = None
    task_title: str = Field(..., max_length=255)
    task_date: routine_date
    status: str  # completed | skipped | deferred
    deferred_to: Optional[routine_date] = None


class OrbitTaskMemoryOut(BaseModel):
    id: int
    user_id: str
    routine_id: Optional[int]
    task_title: str
    task_date: routine_date
    status: str
    deferred_to: Optional[routine_date]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrbitIncompleteTasksResponse(BaseModel):
    has_incomplete: bool
    tasks: list[OrbitTaskMemoryOut]
    checked_at: datetime

