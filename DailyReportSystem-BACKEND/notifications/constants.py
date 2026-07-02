EMAIL_CONTENT = {
    "password_reset": {
        "en": {
            "subject": "Password reset request",
            "text_body_template": (
                "A password reset was requested for your account.\n\n"
                "Reset link:\n"
                "{reset_link}\n\n"
                "If you did not request this change, you can ignore this email."
            ),
        },
        "ja": {
            "subject": "パスワード再設定のご依頼",
            "text_body_template": (
                "アカウントのパスワード再設定リクエストを受け付けました。\n\n"
                "再設定リンク:\n"
                "{reset_link}\n\n"
                "この変更に心当たりがない場合は、このメールを無視してください。"
            ),
        },
    },
    "invite_member": {
        "en": {
            "subject": "You've been invited to join {organization_name}",
            "text_body_template": (
                "You have been invited to join {organization_name}.\n\n"
                "Click the link below to log in and get started:\n"
                "{login_link}\n\n"
                "If you were not expecting this invitation, you can ignore this email."
            ),
        },
        "ja": {
            "subject": "{organization_name}への招待",
            "text_body_template": (
                "{organization_name}に招待されました。\n\n"
                "以下のリンクをクリックしてログインを開始してください:\n"
                "{login_link}\n\n"
                "この招待に心当たりがない場合は、このメールを無視してください。"
            ),
        },
    },
    "task_assigned": {
        "en": {
            "subject": "You have been assigned to a task: {task_name}",
            "text_body_template": (
                "Hi,\n\n"
                "{assigner_name} has assigned you to the task '{task_name}'.\n\n"
                "You can view the task here:\n"
                "{task_link}\n"
            ),
        },
        "ja": {
            "subject": "タスクに割り当てられました: {task_name}",
            "text_body_template": (
                "こんにちは。\n\n"
                "{assigner_name}さんがあなたをタスク「{task_name}」に割り当てました。\n\n"
                "以下のリンクからタスクを確認できます:\n"
                "{task_link}\n"
            ),
        },
    },
    "task_deadline_approaching": {
        "en": {
            "subject": "Reminder: Deadline approaching for task '{task_name}'",
            "text_body_template": (
                "Hi,\n\n"
                "This is a reminder that the task '{task_name}' is due tomorrow ({due_date}).\n\n"
                "You can view the task here:\n"
                "{task_link}\n"
            ),
        },
        "ja": {
            "subject": "リマインダー: タスク「{task_name}」の期限が近づいています",
            "text_body_template": (
                "こんにちは。\n\n"
                "タスク「{task_name}」の期限が明日（{due_date}）に迫っています。\n\n"
                "以下のリンクからタスクを確認できます:\n"
                "{task_link}\n"
            ),
        },
    },
}