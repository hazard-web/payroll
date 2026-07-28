const cloudinary = require('cloudinary').v2;

if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Uploads a base64 Data URL to Cloudinary.
 * @param {string} base64Str - The raw base64 data string (e.g. data:image/png;base64,...)
 * @param {string} folder - The destination folder name in Cloudinary
 * @returns {Promise<string>} - The secure URL of the uploaded asset
 */
async function uploadBase64(base64Str, folder = 'payroll_portal') {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary environment variables are not configured in .env');
  }
  try {
    const result = await cloudinary.uploader.upload(base64Str, {
      folder,
      resource_type: 'auto', // Auto detects image, pdf, raw document type
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(error.message || 'Cloudinary upload failed');
  }
}

module.exports = {
  cloudinary,
  uploadBase64,
};
