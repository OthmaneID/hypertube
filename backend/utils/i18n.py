TRANSLATIONS = {
    "en": {
        "verify_subject": "Verify your Hypertube email",
        "verify_body": (
            "Hello {username},\n\n"
            "Please verify your email address by opening this link:\n\n"
            "{link}\n\n"
            "This link expires in 24 hours.\n\n"
            "If you did not create this account, you can ignore this email."
        ),
        "reset_subject": "Password Reset Request",
        "reset_body": (
            "Hello {username},\n\n"
            "You requested a password reset. Please click the link below "
            "to reset your password:\n\n"
            "{link}\n\n"
            "If you did not request this, please ignore this email.\n\nThank you."
        ),
    },
    "fr": {
        "verify_subject": "Vérifiez votre adresse e-mail Hypertube",
        "verify_body": (
            "Bonjour {username},\n\n"
            "Veuillez vérifier votre adresse e-mail en ouvrant ce lien :\n\n"
            "{link}\n\n"
            "Ce lien expire dans 24 heures.\n\n"
            "Si vous n'avez pas créé ce compte, vous pouvez ignorer cet e-mail."
        ),
        "reset_subject": "Demande de réinitialisation du mot de passe",
        "reset_body": (
            "Bonjour {username},\n\n"
            "Vous avez demandé une réinitialisation de mot de passe. "
            "Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :\n\n"
            "{link}\n\n"
            "Si vous n'avez pas demandé cela, veuillez ignorer cet e-mail.\n\nMerci."
        ),
    },
}

def get_translation(lang: str, key: str) -> str:
    """Return the translation string for a given language and key.
    Falls back to English if the key or language is not found."""
    return TRANSLATIONS.get(lang, TRANSLATIONS["en"]).get(
        key, TRANSLATIONS["en"].get(key, "")
    )
