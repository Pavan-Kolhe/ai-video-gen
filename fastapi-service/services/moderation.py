# services/moderation.py

BAD_WORDS = [
    "violence", "blood", "gore", "kill", "death",
    "nsfw", "nude", "sex", "drugs", "weapon",
    "terror", "suicide", "bomb"
]

def moderate_prompt(prompt: str):
    """
    Very simple moderation filter:
    Returns (allowed: bool, reasons: list)
    """

    prompt_lower = prompt.lower()
    reasons = []

    for word in BAD_WORDS:
        if word in prompt_lower:
            reasons.append(f"Contains forbidden word: {word}")

    allowed = len(reasons) == 0

    return allowed, reasons
