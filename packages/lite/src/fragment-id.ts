function fragmentToken(rawToken: string | number): string {
  const encodedToken = Array.from(String(rawToken), (character) => {
    if (/^[a-z0-9]$/iu.test(character)) return character;
    return `_${character.codePointAt(0)?.toString(16)}_`;
  }).join('');

  return `${encodedToken.length}_${encodedToken}`;
}

export function liteFragmentId(scope: string, ...tokens: Array<string | number>): string {
  return `lite-${[scope, ...tokens].map(fragmentToken).join('-')}`;
}
