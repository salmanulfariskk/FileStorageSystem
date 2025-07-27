'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { AxiosError } from 'axios';
import { motion } from 'framer-motion';
import { fetchFiles, deleteFile, deleteFolder, refreshAccessToken, downloadFile } from '@/lib/api';
import { ApiError, ApiErrorResponse, File, TypeFolder, FileListProps } from '@/types';
import { FileText, ImageIcon, Trash2, Folder, Search, FolderOpen, Download } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { debounce } from 'lodash';

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const buttonVariants = {
  hover: { scale: 1.05, transition: { duration: 0.2 } },
  tap: { scale: 0.95, transition: { duration: 0.1 } },
};

interface ExtendedFileListProps extends FileListProps {
  searchQuery?: string;
  fileTypeFilter?: string;
}

interface SearchResult extends File {
  folderPath?: string;
}

interface FolderSearchResult extends TypeFolder {
  folderPath?: string;
}

type SearchItem = SearchResult | FolderSearchResult;

export default function FileList({
  currentFolderId,
  onFolderClick,
  onRefresh,
  searchQuery = '',
  fileTypeFilter = 'all',
}: ExtendedFileListProps) {
  const [files, setFiles] = useState<(File | TypeFolder)[]>([]);
  const [allFiles, setAllFiles] = useState<(File | TypeFolder)[]>([]);
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; isFolder: boolean; name: string } | null>(null);
  const [folderSizes, setFolderSizes] = useState<{ [key: string]: number }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const { ref, inView } = useInView({ threshold: 0 });

  const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms));

  const searchFilesRecursively = useCallback(
    async (folderId: string | null, query: string, accessToken: string, folderPath: string = ''): Promise<SearchItem[]> => {
      try {
        const items = (await Promise.race([fetchFiles(accessToken, folderId, 1, 100, fileTypeFilter), timeout(10000)])) as (File | TypeFolder)[];
        const results: SearchItem[] = [];

        for (const item of items) {
          const itemName = 'contentType' in item ? item.filename : item.name;
          const currentPath = folderPath ? `${folderPath}/${itemName}` : itemName;

          if (itemName.toLowerCase().includes(query.toLowerCase())) {
            if ('contentType' in item) {
              results.push({ ...item, folderPath: folderPath || 'Root' } as SearchResult);
            } else {
              results.push({ ...item, folderPath: folderPath || 'Root' } as FolderSearchResult);
            }
          }

          if (!('contentType' in item)) {
            const subResults = (await Promise.race([
              searchFilesRecursively(item._id, query, accessToken, currentPath),
              timeout(10000),
            ])) as SearchItem[];
            results.push(...subResults);
          }
        }

        return results;
      } catch (error) {
        console.error(`Failed to search in folder ${folderId || 'Root'}:`, error);
        return [];
      }
    },
    [fileTypeFilter]
  );

  const fetchFolderSize = useCallback(
    async (folderId: string, accessToken: string) => {
      try {
        const folderContents = (await Promise.race([fetchFiles(accessToken, folderId, 1, 100, 'all'), timeout(10000)])) as (File | TypeFolder)[];
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

  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        setInitialLoading(false);
        return;
      }

      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        setError('Please log in to search files');
        setIsSearching(false);
        setInitialLoading(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = (await Promise.race([searchFilesRecursively(null, query, accessToken), timeout(15000)])) as SearchItem[];
        setSearchResults(results);
        setError('');
      } catch (error) {
        const err = error as AxiosError<ApiErrorResponse>;
        if (err.response?.status === 401) {
          try {
            const newAccessToken = await Promise.race([
              refreshAccessToken(localStorage.getItem('refreshToken') || ''),
              timeout(10000),
            ]);
            localStorage.setItem('accessToken', String(newAccessToken));
            const results = (await Promise.race([searchFilesRecursively(null, query, String(newAccessToken)), timeout(15000)])) as SearchItem[];
            setSearchResults(results);
            setError('');
          } catch (refreshErr) {
            const refreshError = refreshErr as ApiError;
            setError(refreshError.response?.data?.message || 'Session expired. Please log in again.');
          }
        } else {
          setError(err.message || 'Failed to search files');
        }
      } finally {
        setIsSearching(false);
        setInitialLoading(false);
      }
    },
    [searchFilesRecursively]
  );

  const fetchFilesList = useCallback(
    async (pageNum: number) => {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        setError('Please log in to view files');
        setInitialLoading(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = (await Promise.race([fetchFiles(accessToken, currentFolderId, pageNum, 20, fileTypeFilter), timeout(10000)])) as (File | TypeFolder)[];
        console.log(`[fetchFilesList] Page ${pageNum} fetched:`, data.length, 'items');
        if (pageNum === 1) {
          setAllFiles(data);
        } else {
          setAllFiles((prev) => [...prev, ...data]);
        }
        setHasMore(data.length === 20);

        const folders = data.filter((item) => !('contentType' in item)) as TypeFolder[];
        for (const folder of folders) {
          if (!folderSizes[folder._id]) {
            await fetchFolderSize(folder._id, accessToken);
          }
        }
      } catch (error) {
        const err = error as AxiosError<ApiErrorResponse>;
        console.error('[fetchFilesList] Error:', err);
        if (err.response?.status === 401) {
          try {
            const newAccessToken = await Promise.race([
              refreshAccessToken(localStorage.getItem('refreshToken') || ''),
              timeout(10000),
            ]);
            localStorage.setItem('accessToken', String(newAccessToken));
            const data = (await Promise.race([
              fetchFiles(String(newAccessToken), currentFolderId, pageNum, 20, fileTypeFilter),
              timeout(10000),
            ])) as (File | TypeFolder)[];
            if (pageNum === 1) {
              setAllFiles(data);
            } else {
              setAllFiles((prev) => [...prev, ...data]);
            }
            setHasMore(data.length === 20);

            const folders = data.filter((item) => !('contentType' in item)) as TypeFolder[];
            for (const folder of folders) {
              if (!folderSizes[folder._id]) {
                await fetchFolderSize(folder._id, String(newAccessToken));
              }
            }
          } catch (refreshErr) {
            const refreshError = refreshErr as ApiError;
            setError(refreshError.response?.data?.message || 'Session expired. Please log in again.');
          }
        } else {
          setError(err.message || 'Failed to fetch files');
        }
      } finally {
        setIsLoading(false);
        setInitialLoading(false);
        console.log('[fetchFilesList] Completed, isLoading:', false, 'initialLoading:', false);
      }
    },
    [currentFolderId, fileTypeFilter, fetchFolderSize]
  );

  const debouncedFetchFilesList = useMemo(
    () => debounce((pageNum: number) => fetchFilesList(pageNum), 500),
    [fetchFilesList]
  );

  useEffect(() => {
    console.log('[Initial Fetch useEffect] Triggered with:', { currentFolderId, fileTypeFilter, searchQuery });
    setInitialLoading(true);
    setError('');
    setPage(1);
    setAllFiles([]);
    setFiles([]);
    setSearchResults([]);
    setHasMore(true);

    if (searchQuery.trim()) {
      performSearch(searchQuery);
    } else {
      fetchFilesList(1);
    }

    return () => {
      console.log('[Initial Fetch useEffect] Cleanup');
      debouncedFetchFilesList.cancel();
    };
  }, [currentFolderId, fileTypeFilter, searchQuery, performSearch, fetchFilesList]);

  useEffect(() => {
    if (inView && hasMore && !isLoading && !searchQuery.trim() && !initialLoading) {
      console.log('[Infinite Scroll useEffect] Fetching page:', page + 1);
      setPage((prev) => {
        const nextPage = prev + 1;
        debouncedFetchFilesList(nextPage);
        return nextPage;
      });
    }
  }, [inView, hasMore, isLoading, searchQuery, debouncedFetchFilesList, page, initialLoading]);

  useEffect(() => {
    console.log('[Files Update useEffect] Updating files with:', { searchResults: searchResults.length, allFiles: allFiles.length });
    if (searchQuery.trim()) {
      setFiles(searchResults);
    } else {
      setFiles(allFiles);
    }
  }, [searchResults, allFiles, searchQuery]);

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
      setAllFiles((prev) => prev.filter((item) => item._id !== itemToDelete.id));
      setSearchResults((prev) => prev.filter((item) => item._id !== itemToDelete.id));
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
          setAllFiles((prev) => prev.filter((item) => item._id !== itemToDelete.id));
          setSearchResults((prev) => prev.filter((item) => item._id !== itemToDelete.id));
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
          const refreshError = refreshErr as ApiError;
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
        headers: { 'Accept': 'application/octet-stream' },
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
            headers: { 'Accept': 'application/octet-stream' },
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
          const refreshError = refreshErr as ApiError;
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

  const getItemIcon = (item: File | TypeFolder | SearchItem) => {
    if ('contentType' in item) {
      if (item.contentType.startsWith('image/')) {
        return <ImageIcon className="h-5 w-5 text-blue-500" />;
      }
      return <FileText className="h-5 w-5 text-gray-500" />;
    }
    return <Folder className="h-5 w-5 text-yellow-500" />;
  };

  const highlightSearchTerm = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">{part}</mark>
      ) : (
        part
      )
    );
  };

  const getDisplayMessage = () => {
    if ((isLoading && files.length === 0) || isSearching) {
      return searchQuery.trim() ? 'Searching...' : 'Loading files...';
    }
    if (error) return error;
    if (searchQuery.trim()) {
      return searchResults.length === 0
        ? `No files or folders found matching "${searchQuery}"`
        : `Found ${searchResults.length} result${searchResults.length === 1 ? '' : 's'} for "${searchQuery}"`;
    }
    if (files.length === 0) return 'No files or folders uploaded yet.';
    return null;
  };

  const displayMessage = getDisplayMessage();

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="text-gray-600 mt-2">Loading files...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-h-[400px]">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-800">
          {searchQuery.trim() ? 'Search Results' : 'Your Files and Folders'}
        </h3>
        {searchQuery.trim() && searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex items-center text-sm text-gray-600"
          >
            <Search className="h-4 w-4 mr-1" />
            {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
          </motion.div>
        )}
      </div>

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

      {displayMessage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className={`text-center py-8 ${searchQuery.trim() && searchResults.length === 0 ? 'text-gray-500' : 'text-gray-600'}`}
        >
          <div className="flex flex-col items-center space-y-2">
            {searchQuery.trim() && searchResults.length === 0 ? (
              <>
                <Search className="h-12 w-12 text-gray-400" />
                <p className="text-lg font-medium">{displayMessage}</p>
                <p className="text-sm text-gray-400">Try adjusting your search terms</p>
              </>
            ) : (
              <p>{displayMessage}</p>
            )}
          </div>
        </motion.div>
      )}

      {files.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left bg-white rounded-lg shadow-sm border border-gray-200 min-h-[200px]">
            <thead>
              <tr className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <th className="p-4 font-semibold">Name</th>
                {searchQuery.trim() && <th className="p-4 font-semibold">Location</th>}
                <th className="p-4 font-semibold">Size</th>
                <th className="p-4 font-semibold">Uploaded</th>
                <th className="p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((item, index) => (
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
                          className="text-blue-600 hover:underline font-medium truncate cursor-pointer"
                        >
                          {highlightSearchTerm(item.filename, searchQuery)}
                        </a>
                      ) : (
                        <button
                          onClick={() => onFolderClick(item.name, item._id)}
                          className="text-blue-600 hover:underline font-medium text-left truncate cursor-pointer"
                        >
                          {highlightSearchTerm(item.name, searchQuery)}
                        </button>
                      )}
                    </div>
                  </td>
                  {searchQuery.trim() && (
                    <td className="p-4 text-gray-600">
                      <div className="flex items-center space-x-2">
                        <FolderOpen className="h-4 w-4 text-gray-400" />
                        <span className="text-sm truncate">{String('folderPath' in item ? item.folderPath : 'Root')}</span>
                      </div>
                    </td>
                  )}
                  <td className="p-4 text-gray-600">
                    {'size' in item ? (
                      `${(item.size / 1024).toFixed(2)} KB`
                    ) : folderSizes[item._id] ? (
                      `${(folderSizes[item._id] / 1024).toFixed(2)} KB`
                    ) : (
                      <span className="text-gray-400 text-sm">Calculating...</span>
                    )}
                  </td>
                  <td className="p-4 text-gray-600">
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
                          className="flex items-center space-x-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-200 border border-blue-200 cursor-pointer"
                          title="Download file"
                        >
                          <Download className="h-4 w-4" />
                        </motion.button>
                      )}
                      <motion.button
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                        onClick={() => openDeleteModal(item._id, 'contentType' in item ? false : true, 'contentType' in item ? item.filename : item.name)}
                        className="flex items-center space-x-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-200 border border-red-200 cursor-pointer"
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

          {hasMore && !searchQuery.trim() && (
            <div ref={ref} className="h-10 flex items-center justify-center mt-4">
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <p className="text-gray-500">Loading more...</p>
                </div>
              ) : (
                <p className="text-gray-400">Scroll for more</p>
              )}
            </div>
          )}
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
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 border border-gray-300 cursor-pointer"
            >
              Cancel
            </motion.button>
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
            >
              Delete
            </motion.button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}