// N'accepte qu'un chemin interne : évite une redirection ouverte via ?redirect=//site-externe.
export function safeRedirect(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}
