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
}