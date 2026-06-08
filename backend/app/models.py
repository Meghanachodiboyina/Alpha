from datetime import date, datetime, time, timezone

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text, Time, UniqueConstraint
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    subscription_plan = Column(String(50), default="free", nullable=False)
    created_at = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)

    routines = relationship("Routine", back_populates="user", cascade="all, delete-orphan")
    ai_usages = relationship("UserAIUsage", back_populates="user", cascade="all, delete-orphan")
    reset_otps = relationship("PasswordResetOTP", back_populates="user", cascade="all, delete-orphan")
    project_tasks = relationship("ProjectTask", back_populates="owner", cascade="all, delete-orphan")
    workspace_tasks = relationship("WorkspaceTask", back_populates="owner", cascade="all, delete-orphan")
    workspace_projects = relationship("WorkspaceProject", back_populates="owner", cascade="all, delete-orphan")
    workspace_settings = relationship("WorkspaceSettings", back_populates="owner", cascade="all, delete-orphan")
    workspace_ai_records = relationship("WorkspaceAITaskRecord", back_populates="owner", cascade="all, delete-orphan")
    sent_workspace_invites = relationship(
        "WorkspaceInvite",
        back_populates="inviter",
        cascade="all, delete-orphan",
        foreign_keys="WorkspaceInvite.inviter_user_id",
    )
    preferences = relationship("UserPreference", back_populates="user", cascade="all, delete-orphan")

class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String(120), nullable=False, index=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="preferences")


class Routine(Base):
    __tablename__ = "routines"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    date = Column(Date, default=date.today, nullable=False, index=True)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    priority = Column(String(20), default="Medium", nullable=False)
    status = Column(String(20), default="Pending", nullable=False)
    estimated_time = Column(Integer, default=60, nullable=False)
    focus_mode_recommended = Column(Boolean, default=False, nullable=False)
    is_internal = Column(Boolean, default=False, nullable=False)
    suggestion = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="routines")


class PasswordResetOTP(Base):
    __tablename__ = "password_reset_otps"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    otp_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    consumed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="reset_otps")


class ProjectTask(Base):
    __tablename__ = "project_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(Date, nullable=False, index=True)
    assignee = Column(String(255), nullable=False)
    priority = Column(String(20), default="Medium", nullable=False, index=True)
    status = Column(String(20), default="Todo", nullable=False, index=True)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)

    owner = relationship("User", back_populates="project_tasks")


class WorkspaceInvite(Base):
    __tablename__ = "workspace_invites"

    id = Column(Integer, primary_key=True, index=True)
    inviter_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    invitee_email = Column(String(255), nullable=False, index=True)
    role = Column(String(20), default="Member", nullable=False)
    status = Column(String(20), default="Pending", nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)
    responded_at = Column(DateTime, nullable=True)

    inviter = relationship("User", back_populates="sent_workspace_invites", foreign_keys=[inviter_user_id])


class WorkspaceTask(Base):
    __tablename__ = "workspace_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    assignee = Column(String(255), nullable=False)
    priority = Column(String(20), default="Medium", nullable=False, index=True)
    status = Column(String(20), default="Todo", nullable=False, index=True)
    due_date = Column(Date, nullable=False, index=True)
    progress = Column(Integer, default=0, nullable=False)
    project_name = Column(String(120), default="Team Space", nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)

    owner = relationship("User", back_populates="workspace_tasks")
    ai_records = relationship("WorkspaceAITaskRecord", back_populates="task", cascade="all, delete-orphan")


class WorkspaceProject(Base):
    __tablename__ = "workspace_projects"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_workspace_projects_user_name"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(120), nullable=False, index=True)
    description = Column(Text, nullable=True)
    color = Column(String(20), nullable=False, default="#22c1c3")
    created_at = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)

    owner = relationship("User", back_populates="workspace_projects")


class WorkspaceSettings(Base):
    __tablename__ = "workspace_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, unique=True, index=True)
    workspace_name = Column(String(120), nullable=False, default="Team Space")
    theme = Column(String(20), nullable=False, default="ocean")
    notifications_enabled = Column(Boolean, nullable=False, default=True)
    email_notifications_enabled = Column(Boolean, nullable=False, default=True)
    permission_mode = Column(String(30), nullable=False, default="members_edit")
    smtp_host = Column(String(255), nullable=True)
    smtp_port = Column(Integer, nullable=False, default=587)
    smtp_username = Column(String(255), nullable=True)
    smtp_password = Column(String(255), nullable=True)
    smtp_from_email = Column(String(255), nullable=True)
    smtp_use_tls = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)

    owner = relationship("User", back_populates="workspace_settings")


class WorkspaceAITaskRecord(Base):
    __tablename__ = "workspace_ai_task_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey("workspace_tasks.id"), nullable=False, index=True)
    prompt = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)

    owner = relationship("User", back_populates="workspace_ai_records")
    task = relationship("WorkspaceTask", back_populates="ai_records")

class UserAIUsage(Base):
    __tablename__ = "user_ai_usage"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, default=date.today, nullable=False, index=True)
    routine_generations = Column(Integer, default=0, nullable=False)
    audio_transcriptions = Column(Integer, default=0, nullable=False)
    clarification_requests = Column(Integer, default=0, nullable=False)
    analysis_requests = Column(Integer, default=0, nullable=False)
    last_request_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc), nullable=False)

    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_user_daily_usage"),)

    user = relationship("User", back_populates="ai_usages")
