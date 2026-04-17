const cloudinary = require('../config/cloudinary.config.js');
const { Readable } = require('stream');

const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      folder = 'charters-business/resumes',
      publicId,
      resourceType = 'raw',
    } = options;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resourceType,
        access_mode: 'public',
        tags: ['resume', 'job-application'],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    Readable.from(fileBuffer).pipe(uploadStream);
  });
};

const deleteFromCloudinary = async (publicId, resourceType = 'raw') => {
  try {
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

const getCloudinaryUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, {
    secure: true,
    resource_type: 'raw',
    ...options,
  });
};

const extractPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) {
    return null;
  }

  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;

    const pathParts = parts[1].split('/');
    const publicIdParts = pathParts.filter(
      (part) => !part.startsWith('v') && !part.includes('_')
    );

    const publicIdWithExt = publicIdParts.join('/');
    const publicId =
      publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.')) ||
      publicIdWithExt;

    return publicId;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  getCloudinaryUrl,
  extractPublicId,
};
