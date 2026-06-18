// ─────────────────────────────────────────────────────────────────
// SCANNING DEFERRED (spec 6.3)
// Real malware scanning requires paid services (Cloudinary scan
// add-on, or Cloud Functions + VirusTotal). Out of scope for the
// free-tier MVP. Current mitigations:
//   - Strict MIME and size validation (this file)
//   - Filename suspicious-pattern rejection
//   - Click-through download confirmation (AttachmentDownloadConfirm)
//   - Admin "remove attachment" action (Thread page options menu)
//   - User reporting (existing ReportModal)
// To enable real scanning later (Phase 3 / Blaze plan):
//   1. Enable Cloudinary malware detection on the upload preset, OR
//      add a Cloud Function on upload events that calls VirusTotal.
//   2. Store the result on the thread doc (e.g. attachmentStatus).
//   3. Gate the download UI on attachmentStatus === 'clean'.
// ─────────────────────────────────────────────────────────────────

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const BANNER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const FILE_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
// Belt-and-braces filename check — browsers can misreport MIME on renamed files.
const SUSPICIOUS_EXTENSIONS = ['.exe', '.bat', '.sh', '.cmd', '.scr', '.js', '.html', '.htm'];
// TODO: verify Cloudinary upload preset has "Allowed formats" set to
// pdf,doc,docx (defense in depth, server-side enforcement).
const BANNER_MAX = 5 * 1024 * 1024; // 5 MB
const IMAGE_MAX = 10 * 1024 * 1024; // 10 MB
const FILE_MAX = 25 * 1024 * 1024; // 25 MB

/**
 * Upload a file to Cloudinary via unsigned preset.
 * Validates type and size before uploading.
 * Returns { url, publicId, type, name, bytes, format }.
 */
export function uploadToCloudinary(file, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const isImage = IMAGE_TYPES.has(file.type);
    const isFile = FILE_TYPES.has(file.type);

    if (!isImage && !isFile) {
      return reject(new Error('Неподдржан тип. Дозволени: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX.'));
    }

    const max = isImage ? IMAGE_MAX : FILE_MAX;
    const label = isImage ? '10 MB' : '25 MB';
    if (file.size > max) {
      return reject(new Error(`Датотеката е преголема. Максимум ${label}.`));
    }

    if (isFile) {
      const nameLower = file.name.toLowerCase();
      if (SUSPICIOUS_EXTENSIONS.some((ext) => nameLower.includes(ext))) {
        return reject(new Error('Името на датотеката не е дозволено.'));
      }
    }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    // Use raw/upload for documents so Cloudinary stores the original binary unchanged.
    // auto/upload classifies PDFs as images and can corrupt or transform the file on delivery.
    const endpoint = isFile ? 'raw' : 'auto';
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${endpoint}/upload`);

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve({
          url: data.secure_url,
          publicId: data.public_id,
          type: isImage ? 'image' : 'file',
          name: file.name,
          bytes: data.bytes,
          format: data.format,
        });
      } else {
        let msg = 'Грешка при прикачување.';
        try {
          msg = JSON.parse(xhr.responseText)?.error?.message ?? msg;
        } catch { /* intentional */ }
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error('Мрежна грешка при прикачување.'));
    xhr.send(fd);
  });
}

/**
 * Upload a profile banner image (JPG/PNG/WebP, max 5 MB).
 * Returns { url, publicId }.
 *
 * NOTE: Old banners are NOT deleted from Cloudinary here — unsigned uploads
 * cannot trigger deletion (requires signed API). Old publicIds accumulate in
 * Cloudinary storage; clean up via the Cloudinary media library or a Cloud
 * Function if storage cost becomes a concern.
 */
export function uploadBanner(file, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    if (!BANNER_TYPES.has(file.type)) {
      return reject(new Error('Дозволени формати за банер: JPEG, PNG, WebP.'));
    }
    if (file.size > BANNER_MAX) {
      return reject(new Error('Банерот е преголем. Максимум 5 MB.'));
    }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve({ url: data.secure_url, publicId: data.public_id });
      } else {
        let msg = 'Грешка при прикачување на банер.';
        try {
          msg = JSON.parse(xhr.responseText)?.error?.message ?? msg;
        } catch { /* intentional */ }
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error('Мрежна грешка при прикачување.'));
    xhr.send(fd);
  });
}

export function cloudinaryDownloadUrl(url, filename) {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;
  const baseName = filename
    ? filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
    : null;
  const flag = baseName ? `fl_attachment:${baseName}` : 'fl_attachment';
  return `${parts[0]}/upload/${flag}/${parts[1]}`;
}

export function cloudinaryThumb(
  url,
  { width, height, gravity, quality = 'auto', format = 'auto', crop = 'limit' } = {},
) {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;
  const transforms = [
    width && `w_${width}`,
    height && `h_${height}`,
    gravity && `g_${gravity}`,
    `f_${format}`,
    `q_${quality}`,
    `c_${crop}`,
  ]
    .filter(Boolean)
    .join(',');
  return `${parts[0]}/upload/${transforms}/${parts[1]}`;
}
