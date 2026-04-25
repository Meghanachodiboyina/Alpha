CREATE TABLE IF NOT EXISTS workspace_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    assignee VARCHAR(255) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
    status VARCHAR(20) NOT NULL DEFAULT 'Todo',
    due_date DATE NOT NULL,
    progress INT NOT NULL DEFAULT 0,
    project_name VARCHAR(120) NOT NULL DEFAULT 'Team Space',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workspace_tasks_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    INDEX idx_workspace_tasks_user_id (user_id),
    INDEX idx_workspace_tasks_project_name (project_name),
    INDEX idx_workspace_tasks_due_date (due_date),
    INDEX idx_workspace_tasks_status (status),
    INDEX idx_workspace_tasks_priority (priority)
);

CREATE TABLE IF NOT EXISTS workspace_projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#22c1c3',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workspace_projects_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_workspace_projects_user_name UNIQUE (user_id, name),
    INDEX idx_workspace_projects_user_id (user_id),
    INDEX idx_workspace_projects_name (name)
);

CREATE TABLE IF NOT EXISTS workspace_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    workspace_name VARCHAR(120) NOT NULL DEFAULT 'Team Space',
    theme VARCHAR(20) NOT NULL DEFAULT 'ocean',
    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    permission_mode VARCHAR(30) NOT NULL DEFAULT 'members_edit',
    smtp_host VARCHAR(255) NULL,
    smtp_port INT NOT NULL DEFAULT 587,
    smtp_username VARCHAR(255) NULL,
    smtp_password VARCHAR(255) NULL,
    smtp_from_email VARCHAR(255) NULL,
    smtp_use_tls BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workspace_settings_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_workspace_settings_user UNIQUE (user_id),
    INDEX idx_workspace_settings_user_id (user_id)
);

CREATE TABLE IF NOT EXISTS workspace_ai_task_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    task_id INT NOT NULL,
    prompt TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workspace_ai_task_records_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_workspace_ai_task_records_task
        FOREIGN KEY (task_id) REFERENCES workspace_tasks(id)
        ON DELETE CASCADE,
    INDEX idx_workspace_ai_task_records_user_id (user_id),
    INDEX idx_workspace_ai_task_records_task_id (task_id)
);
