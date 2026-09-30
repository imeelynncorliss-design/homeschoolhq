// Client-side image compression, shared by any upload flow that needs it
// (curriculum import today; portfolio work samples, roadmap item 11, later).
// No new dependency: HEIC conversion uses the already-installed heic2any,
// resizing/re-encoding uses the browser's own canvas.

const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.8

export function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return file.type === 'image/heic' || file.type === 'image/heif' ||
    name.endsWith('.heic') || name.endsWith('.heif')
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const heic2any = (await import('heic2any')).default
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 }) as Blob
  return new File([converted], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' })
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Could not load image: ${file.name}`))
    img.src = url
  })
}

/**
 * Converts HEIC/HEIF to JPEG if needed, then resizes so the longest edge is
 * at most 1600px and re-encodes as JPEG at 0.8 quality. Returns the original
 * file if compression fails or offers no benefit.
 */
export async function compressImage(file: File): Promise<File> {
  const source = isHeicFile(file) ? await convertHeicToJpeg(file) : file

  let img: HTMLImageElement
  try {
    img = await loadImage(source)
  } catch {
    return source
  }

  const longestEdge = Math.max(img.width, img.height)
  const scale = longestEdge > MAX_DIMENSION ? MAX_DIMENSION / longestEdge : 1
  const width = Math.round(img.width * scale)
  const height = Math.round(img.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    URL.revokeObjectURL(img.src)
    return source
  }
  ctx.drawImage(img, 0, 0, width, height)
  URL.revokeObjectURL(img.src)

  const blob: Blob | null = await new Promise(resolve => {
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
  })
  if (!blob) return source

  const newName = source.name.replace(/\.\w+$/, '.jpg')
  const compressed = new File([blob], newName, { type: 'image/jpeg' })

  // Only use the compressed version if it's actually smaller.
  return compressed.size < source.size ? compressed : source
}
