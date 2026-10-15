import re

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128

# Words people build passwords around. A password whose letters spell one of these
# (ignoring case, digits, symbols and common letter swaps like 0 -> o) is rejected.
# Keep in sync with frontend/src/utils/validation.ts
COMMON_WORDS = frozenset("""
password passw0rd passwd pass welcome hello letmein login admin administrator root user
guest master secret qwerty qwertyuiop azerty asdf asdfgh asdfghjkl zxcvbn zxcvbnm abc abcd
abcdef abcdefg abcdefgh iloveyou love lover loveme trustno monkey dragon shadow sunshine
princess football baseball basketball soccer hockey tennis golf superman batman spiderman
starwars pokemon naruto minecraft fortnite computer internet google facebook instagram
twitter youtube netflix hypertube movie movies cinema film films series stream video
summer winter spring autumn flower flowers rainbow butterfly angel angels heaven freedom
whatever nothing something anything everything family friend friends friendship forever
happy happiness smile beautiful pretty sweet sweetheart honey baby babygirl darling
cookie cookies chocolate banana orange apple cherry pepper ginger coffee pizza cheese
chicken tiger lion eagle falcon wolf bear horse kitty puppy doggy cat dog fish snake
killer hunter ranger soldier warrior ninja pirate wizard knight king queen prince
jordan michael jennifer jessica ashley daniel thomas charlie robert matthew andrew joshua
justin william michelle nicole hannah amanda melissa george jasmine taylor
money dollar gold silver diamond lucky magic matrix mustang ferrari porsche harley
music guitar piano rock metal jazz dance party summer school student teacher doctor
welcome hello world helloworld test testing tester example sample default changeme
access security secure private public system server network mobile phone
""".split())

_LEET = str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i"})


def _word_cores(password: str) -> set[str]:
    """The words a password may be hiding: its letters alone, and its middle part with leetspeak undone."""
    lowered = password.lower()
    letters_only = re.sub(r"[^a-z]", "", lowered)
    # Digits and symbols at the ends are padding ("Sunshine2024!"), only swaps inside the word are leetspeak
    middle = re.sub(r"^[^a-z]+|[^a-z]+$", "", lowered.translate(str.maketrans({"@": "a", "$": "s"})))
    unleeted = re.sub(r"[^a-z]", "", middle.translate(_LEET))
    return {letters_only, unleeted, lowered}


def password_error(password: str) -> str | None:
    """Why the password is too weak, or None when it is acceptable."""
    if len(password) < PASSWORD_MIN_LENGTH:
        return f"Password must be at least {PASSWORD_MIN_LENGTH} characters long"
    if len(password) > PASSWORD_MAX_LENGTH:
        return f"Password must be at most {PASSWORD_MAX_LENGTH} characters long"
    if not re.search(r"[a-z]", password) or not re.search(r"[A-Z]", password):
        return "Password must contain both lowercase and uppercase letters"
    if not re.search(r"\d", password):
        return "Password must contain at least one digit"
    if not re.search(r"[^A-Za-z0-9]", password):
        return "Password must contain at least one special character"
    if _word_cores(password) & COMMON_WORDS:
        return "Password is too common, avoid simple English words"
    return None


def check_password(password: str) -> str:
    """Pydantic validator: returns the password or raises ValueError with the reason."""
    error = password_error(password)
    if error:
        raise ValueError(error)
    return password
