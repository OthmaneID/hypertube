// Form checks that mirror the backend rules (backend/utils/validation.py, schema/User.py),
// so invalid input is caught here instead of failing as a 4xx request.
// Every function returns an i18n key under "validation." or null when the value is valid.

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MAX_LENGTH = 50;
export const USERNAME_MIN_LENGTH = 4;
export const USERNAME_MAX_LENGTH = 50;

// Keep in sync with COMMON_WORDS in backend/utils/validation.py
const COMMON_WORDS = new Set(
  `password passw0rd passwd pass welcome hello letmein login admin administrator root user
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
access security secure private public system server network mobile phone`.split(/\s+/),
);

const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i",
};

// The words a password may be hiding: its letters alone, and its middle part with leetspeak undone
function wordCores(password: string): string[] {
  const lowered = password.toLowerCase();
  const lettersOnly = lowered.replace(/[^a-z]/g, "");
  // Digits and symbols at the ends are padding ("Sunshine2024!"), only swaps inside the word are leetspeak
  const middle = lowered
    .replace(/[@$]/g, (c) => LEET[c])
    .replace(/^[^a-z]+|[^a-z]+$/g, "");
  const unleeted = middle
    .replace(/[0134579@$!]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z]/g, "");
  return [lettersOnly, unleeted, lowered];
}

export function passwordError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return "validation.passwordTooShort";
  if (password.length > PASSWORD_MAX_LENGTH) return "validation.passwordTooLong";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) return "validation.passwordCase";
  if (!/\d/.test(password)) return "validation.passwordDigit";
  if (!/[^A-Za-z0-9]/.test(password)) return "validation.passwordSpecial";
  if (wordCores(password).some((core) => COMMON_WORDS.has(core))) return "validation.passwordCommon";
  return null;
}

export function nameError(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "validation.nameRequired";
  if (trimmed.length > NAME_MAX_LENGTH) return "validation.nameTooLong";
  return null;
}

export function usernameError(username: string): string | null {
  const length = username.length;
  if (length < USERNAME_MIN_LENGTH || length > USERNAME_MAX_LENGTH) return "validation.usernameLength";
  return null;
}

export function emailError(email: string): string | null {
  // Same shape the backend's EmailStr accepts in practice: something@domain.tld
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return "validation.emailInvalid";
  return null;
}
