export interface ApiError extends Error {
  response?: {
    status?: number;
    data?: {
      errors?: { msg: string }[];
      message?: string;
    };
  };
}

export interface File {
  _id: string;
  filename: string;
  size: number;
  url: string;
  contentType: string;
  uploadTime: string;
  folderId: string | null;
  userId: string;
}

export interface TypeFolder {
  _id: string;
  name: string;
  userId: string;
  parentId: string | null;
  createdAt: string;
}

export interface ApiErrorResponse {
  message: string;
}

export interface FileListProps {
  currentFolderId: string | null;
  onFolderClick: (folderName: string, folderId: string) => void;
  onRefresh: () => void;
  searchQuery?: string;
  onFileClick?: (fileId: string) => void; 
  onDeleteClick?: (id: string, isFolder: boolean, name: string) => void; 
}