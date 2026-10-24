export const avatarMaxBytes = 2 * 1024 * 1024
export const avatarAcceptedTypes = ['image/jpeg', 'image/png', 'image/webp']

export function avatarThumbnail(url: string, size: number): string {
  const transformation = `c_fill,g_face,w_${size * 2},h_${size * 2},f_auto,q_auto`
  return url.replace(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)/, `$1${transformation}/`)
}

export function userInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}
