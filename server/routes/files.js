const express = require('express');
const mongoose = require('mongoose');
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const auth = require('../middleware/auth');
const router = express.Router();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const File = require('../models/File');
const Folder = require('../models/Folder');

async function folderContainsFileType(folderId, userId, fileTypeFilter) {
  const fileQuery = { userId, folderId };
  if (fileTypeFilter !== 'all') {
    if (fileTypeFilter === 'image') {
      fileQuery.contentType = { $regex: '^image/', $options: 'i' };
    } else if (fileTypeFilter === 'pdf') {
      fileQuery.contentType = 'application/pdf';
    } else if (fileTypeFilter === 'document') {
      fileQuery.contentType = {
        $in: [
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
      };
    } else if (fileTypeFilter === 'other') {
      fileQuery.contentType = {
        $nin: [
          /^image\//,
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
      };
    }
  }

  const files = await File.find(fileQuery).limit(1);
  if (files.length > 0) {
    return true;
  }

  const subFolders = await Folder.find({ parentId: folderId, userId });
  for (const subFolder of subFolders) {
    const hasMatchingFiles = await folderContainsFileType(subFolder._id, userId, fileTypeFilter);
    if (hasMatchingFiles) {
      return true;
    }
  }

  return false;
}

// Create a new folder
router.post('/folders', auth, async (req, res) => {
  const { name, parentId } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Folder name is required' });
  }

  try {
    if (parentId) {
      const parentFolder = await Folder.findOne({ _id: parentId, userId: req.user.userId });
      if (!parentFolder) {
        return res.status(404).json({ message: 'Parent folder not found' });
      }
    }

    const folder = new Folder({
      name,
      userId: req.user.userId,
      parentId: parentId || null,
      createdAt: new Date(),
    });

    await folder.save();
    res.status(201).json(folder);
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ message: 'Error creating folder', error: error.message });
  }
});

// Upload file
router.post('/upload', auth, async (req, res) => {
  if (!req.files || !req.files.file) {
    console.error('No file provided in request');
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const file = req.files.file;
  const folderId = req.body?.folderId;
  const key = `${req.user.userId}/${Date.now()}_${file.name}`;
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: file.data,
    ContentType: file.mimetype,
  };

  try {
    let validatedFolderId = null;

    if (folderId && folderId !== 'null' && folderId !== 'undefined') {
      const folder = await Folder.findOne({ _id: folderId, userId: req.user.userId });
      if (!folder) {
        console.error('Folder not found for folderId:', folderId);
        return res.status(404).json({ message: 'Folder not found or does not belong to user' });
      }
      validatedFolderId = folderId;
    } else {
      console.log('No folderId provided, uploading to root drive');
    }

    await s3Client.send(new PutObjectCommand(params));
    const url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    const fileData = new File({
      filename: file.name,
      size: file.size,
      url,
      contentType: file.mimetype,
      userId: req.user.userId,
      folderId: validatedFolderId,
      uploadTime: new Date(),
    });

    await fileData.save();
    res.status(201).json(fileData);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Error uploading file', error: error.message });
  }
});

// Get files and folders
router.get('/', auth, async (req, res) => {
  try {
    const { folderId, page = 1, limit = 20, fileTypeFilter = 'all' } = req.query;
    console.log('Fetching files with params:', { folderId, page, limit, fileTypeFilter });

    const fileQuery = { userId: req.user.userId };
    if (folderId && folderId !== 'null') {
      fileQuery.folderId = folderId;
    } else {
      fileQuery.folderId = null;
    }

    if (fileTypeFilter !== 'all') {
      if (fileTypeFilter === 'image') {
        fileQuery.contentType = { $regex: '^image/', $options: 'i' };
      } else if (fileTypeFilter === 'pdf') {
        fileQuery.contentType = 'application/pdf';
      } else if (fileTypeFilter === 'document') {
        fileQuery.contentType = {
          $in: [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ],
        };
      } else if (fileTypeFilter === 'other') {
        fileQuery.contentType = {
          $nin: [
            /^image\//,
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ],
        };
      }
    }

    const files = await File.find(fileQuery)
      .sort({ uploadTime: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const folderQuery = { userId: req.user.userId, parentId: folderId || null };
    const allFolders = await Folder.find(folderQuery)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    let folders = allFolders;
    if (fileTypeFilter !== 'all') {
      folders = [];
      for (const folder of allFolders) {
        const hasMatchingFiles = await folderContainsFileType(folder._id, req.user.userId, fileTypeFilter);
        if (hasMatchingFiles) {
          folders.push(folder);
        }
      }
    }

    console.log('Files fetched:', files.length, 'Folders fetched:', folders.length);
    res.json({ files, folders });
  } catch (error) {
    console.error('Error fetching files and folders:', error);
    res.status(500).json({ message: 'Error fetching files and folders', error: error.message });
  }
});

// Get recent files and folders
router.get('/recent', auth, async (req, res) => {
  try {
    const { limit = 10, fileTypeFilter = 'all' } = req.query;
    console.log('Fetching recent files with params:', { limit, fileTypeFilter });

    const fileQuery = { userId: req.user.userId };

    if (fileTypeFilter !== 'all') {
      if (fileTypeFilter === 'image') {
        fileQuery.contentType = { $regex: '^image/', $options: 'i' };
      } else if (fileTypeFilter === 'pdf') {
        fileQuery.contentType = 'application/pdf';
      } else if (fileTypeFilter === 'document') {
        fileQuery.contentType = {
          $in: [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ],
        };
      } else if (fileTypeFilter === 'other') {
        fileQuery.contentType = {
          $nin: [
            /^image\//,
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ],
        };
      }
    }

    const files = await File.find(fileQuery)
      .sort({ uploadTime: -1 })
      .limit(parseInt(limit));

    const folderQuery = { userId: req.user.userId, parentId: null };
    const allFolders = await Folder.find(folderQuery)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    let folders = allFolders;
    if (fileTypeFilter !== 'all') {
      folders = [];
      for (const folder of allFolders) {
        const hasMatchingFiles = await folderContainsFileType(folder._id, req.user.userId, fileTypeFilter);
        if (hasMatchingFiles) {
          folders.push(folder);
        }
      }
    }

    console.log('Recent files fetched:', files.length, 'Recent folders fetched:', folders.length);
    res.json([...folders, ...files]);
  } catch (error) {
    console.error('Error fetching recent files and folders:', error);
    res.status(500).json({ message: 'Error fetching recent files and folders', error: error.message });
  }
});

// Get a specific folder
router.get('/folders/:id', auth, async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    res.json(folder);
  } catch (error) {
    console.error('Error fetching folder:', error);
    res.status(500).json({ message: 'Error fetching folder', error: error.message });
  }
});

// Delete a folder
router.delete('/folders/:id', auth, async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    const subFolders = await Folder.find({ parentId: folder._id });
    const files = await File.find({ folderId: folder._id });
    if (subFolders.length > 0 || files.length > 0) {
      return res.status(400).json({ message: 'Folder is not empty' });
    }

    await folder.deleteOne();
    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ message: 'Error deleting folder', error: error.message });
  }
});

// Get a specific file
router.get('/:id', auth, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!file) return res.status(404).json({ message: 'File not found' });
    res.json(file);
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ message: 'Error fetching file', error: error.message });
  }
});

// Delete a file
router.delete('/:id', auth, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!file) return res.status(404).json({ message: 'File not found' });

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: file.url.split('/').slice(-2).join('/'),
    };
    await s3Client.send(new DeleteObjectCommand(params));
    await file.deleteOne();
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'Error deleting file', error: error.message });
  }
});

// Download a file
router.get('/export/:id', auth, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: file.url.split('/').slice(-2).join('/'),
      ContentDisposition: `attachment; filename="${file.filename}"`,
    };

    const presignedUrl = await getSignedUrl(s3Client, new GetObjectCommand(params), { expiresIn: 60 });

    res.json({ url: presignedUrl, filename: file.filename });
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({ message: 'Error generating download URL', error: error.message });
  }
});

module.exports = router;