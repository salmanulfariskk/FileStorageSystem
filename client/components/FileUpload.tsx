'use client';
import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { AxiosError, AxiosProgressEvent } from 'axios';
import { uploadFile, refreshAccessToken } from '@/lib/api';
import { ApiError, ApiErrorResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Upload, X, FileIcon, Loader2 } from 'lucide-react';

const dropzoneVariants: Variants = {
  hover: { scale: 1.02, borderColor: '#3b82f6', transition: { duration: 0.2 } },
  default: { scale: 1, borderColor: '#d1d5db' },
  active: { borderColor: '#10b981', scale: 1.02, transition: { duration: 0.2 } },
};

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: 'easeIn' } },
};

interface FileUploadProps {
  currentFolderId: string | null;
  onUploadSuccess: () => void;
}

export default function FileUpload({ currentFolderId, onUploadSuccess }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; 

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        (file) => file.size <= MAX_FILE_SIZE
      );
      if (selectedFiles.length < e.target.files.length) {
        setError('Some files exceed the 10MB size limit and were ignored.');
      } else {
        setError('');
      }
      setFiles(selectedFiles);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        (file) => file.size <= MAX_FILE_SIZE
      );
      if (droppedFiles.length < e.dataTransfer.files.length) {
        setError('Some files exceed the 10MB size limit and were ignored.');
      } else {
        setError('');
      }
      setFiles(droppedFiles);
    }
  }, [MAX_FILE_SIZE]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      setError('Please log in to upload files');
      return;
    }

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        if (currentFolderId) {
          formData.append('folderId', currentFolderId);
        }

        await uploadFile(formData, accessToken, {
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(progress);
            }
          },
        });
      }
      setFiles([]);
      setError('');
      setUploadProgress(0);
      onUploadSuccess();
    } catch (error) {
      const err = error as AxiosError<ApiErrorResponse>;
      if (err.response?.status === 401) {
        try {
          const newAccessToken = await refreshAccessToken(localStorage.getItem('refreshToken') || '');
          localStorage.setItem('accessToken', newAccessToken);
          for (let i = 0; i < files.length; i++) {
            const formData = new FormData();
            formData.append('file', files[i]);
            if (currentFolderId) {
              formData.append('folderId', currentFolderId);
            }
            await uploadFile(formData, newAccessToken, {
              onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                if (progressEvent.total) {
                  const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                  setUploadProgress(progress);
                }
              },
            });
          }
          setFiles([]);
          setError('');
          setUploadProgress(0);
          onUploadSuccess();
        } catch (refreshErr) {
          const refreshError = refreshErr as ApiError;
          setError(refreshError.response?.data?.message || 'Session expired. Please log in again.');
        }
      } else {
        setError(err.response?.data?.message || 'Failed to upload files');
      }
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    setError('');
  };

  const clearFiles = () => {
    setFiles([]);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <motion.div
      variants={modalVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-auto border border-gray-200"
      role="dialog"
      aria-labelledby="file-upload-title"
    >
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg"
          role="alert"
        >
          {error}
        </motion.p>
      )}
      <motion.div
        variants={dropzoneVariants}
        animate={isDragging ? 'active' : 'default'}
        whileHover="hover"
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gradient-to-br from-gray-50 to-gray-100 shadow-inner"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="region"
        aria-label="File dropzone"
      >
        <Upload className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <p className="text-gray-600 mb-4 font-medium">
          {files.length > 0
            ? `${files.length} file${files.length > 1 ? 's' : ''} selected`
            : 'Drag and drop files here or click to select (max 10MB each)'}
        </p>
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
          ref={fileInputRef}
          aria-describedby="file-upload-description"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-md"
        >
          Select Files
        </label>
        <p id="file-upload-description" className="text-xs text-gray-500 mt-2">
          Supports multiple files, up to 10MB each
        </p>
      </motion.div>
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 max-h-48 overflow-y-auto space-y-2"
            role="list"
            aria-label="Selected files"
          >
            {files.map((file, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg shadow-sm"
                role="listitem"
              >
                <div className="flex items-center space-x-2">
                  <FileIcon className="h-5 w-5 text-gray-500" />
                  <span className="text-gray-700 text-sm truncate max-w-xs">{file.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {uploading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4"
        >
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">Uploading... {uploadProgress}%</p>
        </motion.div>
      )}
      {files.length > 0 && (
        <div className="mt-6 flex space-x-4">
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-lg transition-all duration-300"
          >
            {uploading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Uploading...
              </span>
            ) : (
              'Upload Files'
            )}
          </Button>
          <Button
            variant="outline"
            onClick={clearFiles}
            disabled={uploading}
            className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Clear
          </Button>
        </div>
      )}
    </motion.div>
  );
}