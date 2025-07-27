'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AxiosError } from 'axios';
import { fetchRecentFiles, deleteFile, deleteFolder, refreshAccessToken, fetchFiles, downloadFile } from '@/lib/api';
import { ApiErrorResponse, File, TypeFolder } from '@/types';
import { FileText, ImageIcon, Folder, Trash2, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const buttonVariants = {
  hover: { scale: 1.05, transition: { duration: 0.2 } },
  tap: { scale: 0.95, transition: { duration: 0.1 } },
};

interface RecentProps {
  onFolderClick: (folderName: string, folderId: string) => void;
  onRefresh: () => void;
  fileTypeFilter?: string;
}

export default function Recent({ onFolderClick, onRefresh, fileTypeFilter = 'all' }: RecentProps) {
  const [items, setItems] = useState<(File | TypeFolder)[]>([]);
  const [error, setError] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; isFolder: boolean; name: string } | null>(null);
  const [folderSizes, setFolderSizes] = useState<{ [key: string]: number }>({});

  const fetchFolderSize = useCallback(
    async (folderId: string, accessToken: string) => {
      try {
        const folderContents = await fetchFiles(accessToken, folderId, 1);
        const totalSize = folderContents
          .filter((item) => 'size' in item)
          .reduce((sum, item) => sum + (('size' in item && item.size) || 0), 0);
        setFolderSizes((prev) => ({ ...prev, [folderId]: totalSize }));
      } catch (error) {
        console.error(`Failed to fetch size for folder ${folderId}:`, error);
      }
    },
    []
  );

  const fetchRecentItems = useCallback(async () => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      setError('Please log in to view recent files');
      return;
    }

    try {
      const data = await fetchRecentFiles(accessToken, 10, fileTypeFilter);
      setItems(data);

      const folders = data.filter((item) => !('contentType' in item)) as TypeFolder[];
      for (const folder of folders) {
        if (!folderSizes[folder._id]) {
          await fetchFolderSize(folder._id, accessToken);
        }
      }
    } catch (error) {
      const err = error as AxiosError<ApiErrorResponse>;
      if (err.response?.status === 401) {
        try {
          const newAccessToken = await refreshAccessToken(localStorage.getItem('refreshToken') || '');
          localStorage.setItem('accessToken', newAccessToken);
          const data = await fetchRecentFiles(newAccessToken, 10, fileTypeFilter);
          setItems(data);

          const folders = data.filter((item) => !('contentType' in item)) as TypeFolder[];
          for (const folder of folders) {
            if (!folderSizes[folder._id]) {
              await fetchFolderSize(folder._id, newAccessToken);
            }
          }
        } catch (refreshErr) {
          const refreshError = refreshErr as AxiosError<ApiErrorResponse>;
          setError(refreshError.response?.data?.message || 'Session expired. Please log in again.');
        }
      } else {
        setError(err.response?.data?.message || 'Failed to fetch recent files');
      }
    }
  }, [fetchFolderSize, folderSizes, fileTypeFilter]);

  const handleDelete = async () => {
    if (!itemToDelete) return;

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      setError('Please log in to delete items');
      setIsDeleteModalOpen(false);
      return;
    }

    try {
      if (itemToDelete.isFolder) {
        await deleteFolder(itemToDelete.id, accessToken);
      } else {
        await deleteFile(itemToDelete.id, accessToken);
      }
      setItems((prev) => prev.filter((item) => item._id !== itemToDelete.id));
      if (itemToDelete.isFolder) {
        setFolderSizes((prev) => {
          const newSizes = { ...prev };
          delete newSizes[itemToDelete.id];
          return newSizes;
        });
      }
      onRefresh();
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      const err = error as AxiosError<ApiErrorResponse>;
      if (err.response?.status === 401) {
        try {
          const newAccessToken = await refreshAccessToken(localStorage.getItem('refreshToken') || '');
          localStorage.setItem('accessToken', newAccessToken);
          if (itemToDelete.isFolder) {
            await deleteFolder(itemToDelete.id, newAccessToken);
          } else {
            await deleteFile(itemToDelete.id, newAccessToken);
          }
          setItems((prev) => prev.filter((item) => item._id !== itemToDelete.id));
          if (itemToDelete.isFolder) {
            setFolderSizes((prev) => {
              const newSizes = { ...prev };
              delete newSizes[itemToDelete.id];
              return newSizes;
            });
          }
          onRefresh();
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        } catch (refreshErr) {
          const refreshError = refreshErr as AxiosError<ApiErrorResponse>;
          setError(refreshError.response?.data?.message || 'Session expired. Please log in again.');
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }
      } else {
        setError(err.response?.data?.message || `Failed to delete ${itemToDelete.isFolder ? 'folder' : 'file'}`);
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
      }
    }
  };

  const handleDownload = async (fileId: string) => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        setError('Please log in to download files');
        return;
      }
      const { url, filename } = await downloadFile(fileId, accessToken);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/octet-stream',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      const err = error as AxiosError<ApiErrorResponse>;
      if (err.response?.status === 401) {
        try {
          const newAccessToken = await refreshAccessToken(localStorage.getItem('refreshToken') || '');
          localStorage.setItem('accessToken', newAccessToken);
          const { url, filename } = await downloadFile(fileId, newAccessToken);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/octet-stream',
            },
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch file');
          }

          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        } catch (refreshErr) {
          const refreshError = refreshErr as AxiosError<ApiErrorResponse>;
          setError(refreshError.response?.data?.message || 'Session expired. Please log in again.');
        }
      } else {
        setError(err.response?.data?.message || 'Failed to download file');
      }
    }
  };

  const openDeleteModal = (id: string, isFolder: boolean, name: string) => {
    setItemToDelete({ id, isFolder, name });
    setIsDeleteModalOpen(true);
  };

  useEffect(() => {
    fetchRecentItems();
  }, [fetchRecentItems, onRefresh, fileTypeFilter]);

  const getItemIcon = (item: File | TypeFolder) => {
    if ('contentType' in item) {
      if (item.contentType.startsWith('image/')) {
        return <ImageIcon className="h-5 w-5 text-blue-500" />;
      }
      return <FileText className="h-5 w-5 text-gray-500" />;
    }
    return <Folder className="h-5 w-5 text-yellow-500" />;
  };

  return (
    <div className="space-y-4 min-h-[400px]">
      <h3 className="text-xl font-semibold text-gray-800">Recent Files and Folders</h3>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-3 bg-red-50 border border-red-200 rounded-lg"
        >
          <p className="text-red-600 text-sm">{error}</p>
        </motion.div>
      )}
      {items.length === 0 && !error ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center py-8 text-gray-600"
        >
          <p>No recent files or folders found.</p>
        </motion.div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left bg-white rounded-lg shadow-sm border border-gray-200 min-h-[200px]">
            <thead>
              <tr className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">Size</th>
                <th className="p-4 font-semibold">Uploaded</th>
                <th className="p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <motion.tr
                  key={item._id}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150"
                >
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      {getItemIcon(item)}
                      {'contentType' in item ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-medium truncate"
                        >
                          {item.filename}
                        </a>
                      ) : (
                        <button
                          onClick={() => onFolderClick(item.name, item._id)}
                          className="text-blue-600 hover:underline font-medium text-left truncate"
                        >
                          {item.name}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-gray-600 align-middle">
                    {'size' in item ? (
                      `${(item.size / 1024).toFixed(2)} KB`
                    ) : folderSizes[item._id] ? (
                      `${(folderSizes[item._id] / 1024).toFixed(2)} KB`
                    ) : (
                      <span className="text-gray-400 text-sm inline-block">Calculating...</span>
                    )}
                  </td>
                  <td className="p-4 text-gray-600 align-middle">
                    {new Date('createdAt' in item ? item.createdAt : item.uploadTime).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <div className="flex space-x-2">
                      {'contentType' in item && (
                        <motion.button
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          onClick={() => handleDownload(item._id)}
                          className="flex items-center space-x-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-200 border border-blue-200"
                          title="Download file"
                        >
                          <Download className="h-4 w-4" />
                        </motion.button>
                      )}
                      <motion.button
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                        onClick={() =>
                          openDeleteModal(
                            item._id,
                            'contentType' in item ? false : true,
                            'contentType' in item ? item.filename : item.name
                          )
                        }
                        className="flex items-center space-x-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-200 border border-red-200"
                        title={`Delete ${'contentType' in item ? 'file' : 'folder'}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800">Confirm Delete</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-800">&quot;{itemToDelete?.name}&quot;</span>?
            </p>
            <p className="text-sm text-red-600 mt-2">This action cannot be undone.</p>
          </div>
          <DialogFooter className="flex space-x-2">
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setItemToDelete(null);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 border border-gray-300"
            >
              Cancel
            </motion.button>
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Delete
            </motion.button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}