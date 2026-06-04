export function makeRedirectError(target: string = '/dashboard'): Error & { digest: string } {
  const digest = `NEXT_REDIRECT;push;${target};307;`
  const err = new Error(digest) as Error & { digest: string }
  err.digest = digest
  return err
}
