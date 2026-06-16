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
}