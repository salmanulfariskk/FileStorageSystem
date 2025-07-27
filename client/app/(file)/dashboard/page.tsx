"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, Variants } from "framer-motion";
import { AxiosError } from "axios";
import { createFolder, refreshAccessToken, logout } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FileUpload from "@/components/FileUpload";
import FileList from "@/components/FileList";
import Recent from "@/components/Recent";
import {
  Home,
  Upload,
  FolderPlus,
  ChevronLeft,
  FileText,
  LogOut,
  Search,
  X,
} from "lucide-react";
import Image from "next/image";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, ApiErrorResponse } from "@/types";

const sidebarVariants: Variants = {
  expanded: {
    width: "260px",
    transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] },
  },
  collapsed: {
    width: "80px",
    transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] },
  },
};

const contentVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0.0, 0.2, 1] },
  },
};

const buttonVariants: Variants = {
  hover: { scale: 1.05, transition: { duration: 0.2 } },
  tap: { scale: 0.95, transition: { duration: 0.1 } },
};

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] } },
};

export default function Dashboard() {
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [error, setError] = useState("");
  const [isRecentView, setIsRecentView] = useState(false);
  type PathItem = { name: string; id: string | null };
  const [currentPath, setCurrentPath] = useState<PathItem[]>([
    { name: "Home", id: null },
  ]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all");
  const [userName, setUserName] = useState<string>("User");

  useEffect(() => {
    setIsSearching(true);
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  useEffect(() => {
    const storedUserName = localStorage.getItem("username");
    if (storedUserName) {
      setUserName(storedUserName);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("accessToken")) {
      router.push("/login");
    }
  }, [router]);

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken") || "";
      await logout(refreshToken);
      localStorage.clear();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      localStorage.clear();
      router.push("/login");
    } finally {
      setIsLogoutModalOpen(false);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleFolderClick = (folderName: string, folderId: string) => {
    setCurrentPath([...currentPath, { name: folderName, id: folderId }]);
    setIsRecentView(false);
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setFileTypeFilter("all");
  };

  const handleBreadcrumbClick = (index: number) => {
    setCurrentPath(currentPath.slice(0, index + 1));
    setIsRecentView(false);
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setFileTypeFilter("all");
  };

  const handleRecentClick = () => {
    setIsRecentView(true);
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setFileTypeFilter("all");
  };

  const handleDashboardClick = () => {
    setIsRecentView(false);
    setCurrentPath([{ name: "Home", id: null }]);
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setFileTypeFilter("all");
  };

  const clearSearch = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      setError("Folder name is required");
      return;
    }

    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      setError("Please log in to create folders");
      return;
    }

    try {
      await createFolder(
        folderName.trim(),
        currentPath[currentPath.length - 1].id,
        accessToken
      );
      setFolderName("");
      setIsFolderModalOpen(false);
      setError("");
      handleRefresh();
    } catch (error) {
      const err = error as AxiosError<ApiErrorResponse>;
      if (err.response?.status === 401) {
        try {
          const newAccessToken = await refreshAccessToken(
            localStorage.getItem("refreshToken") || ""
          );
          localStorage.setItem("accessToken", newAccessToken);
          await createFolder(
            folderName.trim(),
            currentPath[currentPath.length - 1].id,
            newAccessToken
          );
          setFolderName("");
          setIsFolderModalOpen(false);
          setError("");
          handleRefresh();
        } catch (refreshErr) {
          const err = refreshErr as ApiError;
          setError(
            err.response?.data?.message ||
              "Session expired. Please log in again."
          );
        }
      } else {
        setError(err.response?.data?.message || "Failed to create folder");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex">
      <motion.aside
        variants={sidebarVariants}
        animate={isSidebarCollapsed ? "collapsed" : "expanded"}
        className="bg-white shadow-2xl fixed h-full z-10 border-r border-gray-200 flex flex-col overflow-hidden"
        style={{ padding: isSidebarCollapsed ? "24px 16px" : "24px" }}
      >
        <div
          className={`flex items-center ${
            isSidebarCollapsed ? "justify-center" : "justify-between"
          } mb-8`}
        >
          {!isSidebarCollapsed && (
            <div className="flex items-center">
              <Image
                src="/assets/logo.png"
                alt="Logo"
                width={40}
                height={40}
                className="mr-2"
              />
              <h2 className="text-xl font-bold text-gray-800">File Storage</h2>
            </div>
          )}
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={toggleSidebar}
            className={`p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors duration-200 cursor-pointer ${
              isSidebarCollapsed ? "mt-4" : ""
            }`}
          >
            {isSidebarCollapsed ? (
              <Image
                src="/assets/logo.png"
                alt="Logo"
                width={40}
                height={40}
                className="mr-2"
              />
            ) : (
              <ChevronLeft className="h-6 w-6" />
            )}
          </motion.button>
        </div>
        <nav className="space-y-4 flex-1">
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={handleRecentClick}
            className={`flex items-center ${
              isSidebarCollapsed ? "justify-center" : "justify-start"
            } w-full text-left p-3 rounded-lg transition-all duration-200 cursor-pointer ${
              isRecentView
                ? "text-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
            }`}
            title={isSidebarCollapsed ? "Recent" : ""}
          >
            <FileText className="h-6 w-6 shrink-0" />
            {!isSidebarCollapsed && <span className="ml-2">Recent</span>}
          </motion.button>
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={handleDashboardClick}
            className={`flex items-center ${
              isSidebarCollapsed ? "justify-center" : "justify-start"
            } w-full text-left p-3 rounded-lg transition-all duration-200 cursor-pointer ${
              !isRecentView
                ? "text-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
            }`}
            title={isSidebarCollapsed ? "Dashboard" : ""}
          >
            <Home className="h-6 w-6 shrink-0" />
            {!isSidebarCollapsed && <span className="ml-2">Dashboard</span>}
          </motion.button>
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => setIsUploadModalOpen(true)}
            className={`flex items-center ${
              isSidebarCollapsed ? "justify-center" : "justify-start"
            } text-gray-600 hover:text-blue-600 hover:bg-blue-50 w-full text-left p-3 rounded-lg transition-all duration-200 cursor-pointer`}
            title={isSidebarCollapsed ? "Upload Files" : ""}
          >
            <Upload className="h-6 w-6 shrink-0" />
            {!isSidebarCollapsed && <span className="ml-2">Upload Files</span>}
          </motion.button>
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={() => setIsFolderModalOpen(true)}
            className={`flex items-center ${
              isSidebarCollapsed ? "justify-center" : "justify-start"
            } text-gray-600 hover:text-blue-600 hover:bg-blue-50 w-full text-left p-3 rounded-lg transition-all duration-200 cursor-pointer`}
            title={isSidebarCollapsed ? "New Folder" : ""}
          >
            <FolderPlus className="h-6 w-6 shrink-0" />
            {!isSidebarCollapsed && <span className="ml-2">New Folder</span>}
          </motion.button>
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={handleLogout}
            className={`flex items-center ${
              isSidebarCollapsed ? "justify-center" : "justify-start"
            } text-gray-600 hover:text-red-600 hover:bg-red-50 w-full text-left p-3 rounded-lg transition-all duration-200 cursor-pointer`}
            title={isSidebarCollapsed ? "Logout" : ""}
          >
            <LogOut className="h-6 w-6 shrink-0" />
            {!isSidebarCollapsed && <span className="ml-2">Logout</span>}
          </motion.button>
        </nav>
      </motion.aside>

      <div
        className={`flex-1 ${
          isSidebarCollapsed ? "ml-20" : "ml-64"
        } p-6 sm:p-8 transition-all duration-300`}
      >
        <motion.div
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl mx-auto space-y-8"
        >
          {!isRecentView && (
            <Breadcrumb className="mb-6">
              <BreadcrumbList>
                {currentPath.map((path, index) => (
                  <div key={index} className="flex items-center">
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        onClick={() => handleBreadcrumbClick(index)}
                        className="cursor-pointer hover:text-blue-600 transition-colors duration-200"
                      >
                        {path.name}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {index < currentPath.length - 1 && <BreadcrumbSeparator />}
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <p className="text-red-600 text-sm">{error}</p>
            </motion.div>
          )}

          {isRecentView ? (
            <Recent
              onFolderClick={handleFolderClick}
              onRefresh={handleRefresh}
              fileTypeFilter={fileTypeFilter}
            />
          ) : (
            <Card className="bg-white shadow-xl border-none rounded-2xl">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-gray-800">
                  File Storage Dashboard
                </CardTitle>
                <p className="text-gray-600">
                  Manage your files with ease and security.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mt-4 max-w-md">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      type="text"
                      placeholder="Search files and folders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200 rounded-lg bg-gray-50/50 text-gray-800 placeholder-gray-400 focus:outline-none"
                    />
                    {searchTerm && (
                      <button
                        onClick={clearSearch}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                      >
                        <X className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
                      </button>
                    )}
                    {isSearching && (
                      <div className="absolute right-10 inset-y-0 flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                  </div>
                  <Select
                    value={fileTypeFilter}
                    onValueChange={(value) => setFileTypeFilter(value)}
                  >
                    <SelectTrigger className="w-[180px] border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg bg-gray-50/50 text-gray-800 transition-all duration-200 ease-in-out hover:bg-gray-100 cursor-pointer">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                      <SelectItem
                        value="all"
                        className="px-4 py-2 text-gray-800 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 cursor-pointer"
                      >
                        All Files
                      </SelectItem>
                      <SelectItem
                        value="image"
                        className="px-4 py-2 text-gray-800 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 cursor-pointer"
                      >
                        Images
                      </SelectItem>
                      <SelectItem
                        value="pdf"
                        className="px-4 py-2 text-gray-800 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 cursor-pointer"
                      >
                        PDFs
                      </SelectItem>
                      <SelectItem
                        value="document"
                        className="px-4 py-2 text-gray-800 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 cursor-pointer"
                      >
                        Documents
                      </SelectItem>
                      <SelectItem
                        value="other"
                        className="px-4 py-2 text-gray-800 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 cursor-pointer"
                      >
                        Others
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-h-[24px] mt-2">
                  {(debouncedSearchTerm || fileTypeFilter !== "all") && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-sm text-gray-600"
                    >
                      {debouncedSearchTerm && (
                        <>
                          Searching for:{" "}
                          <span className="font-medium">
                            &quot;{debouncedSearchTerm}&quot;
                          </span>
                        </>
                      )}
                      {debouncedSearchTerm && fileTypeFilter !== "all" && " | "}
                      {fileTypeFilter !== "all" && (
                        <>
                          Filtered by:{" "}
                          <span className="font-medium">
                            {fileTypeFilter.charAt(0).toUpperCase() +
                              fileTypeFilter.slice(1)}
                          </span>
                        </>
                      )}
                    </motion.div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-8">
                <div className="relative">
                  <FileList
                    key={refreshTrigger}
                    currentFolderId={currentPath[currentPath.length - 1].id}
                    onFolderClick={handleFolderClick}
                    onRefresh={handleRefresh}
                    searchQuery={debouncedSearchTerm}
                    fileTypeFilter={fileTypeFilter}
                  />
                  {isSearching && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-lg"
                    >
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800">
              Upload File
            </DialogTitle>
          </DialogHeader>
          <div className="max-w-full overflow-x-auto">
            <FileUpload
              currentFolderId={currentPath[currentPath.length - 1].id}
              onUploadSuccess={() => {
                handleRefresh();
                setIsUploadModalOpen(false);
              }}
            />
          </div>
          <DialogFooter>
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => setIsUploadModalOpen(false)}
              className="px-4 py-2 bg-red-600 text-white border border-red-700 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all duration-200 ease-in-out cursor-pointer"
            >
              Cancel
            </motion.button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFolderModalOpen} onOpenChange={setIsFolderModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 transition-all duration-300 ease-in-out transform">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800 transition-opacity duration-200 ease-in-out">
              Create New Folder
            </DialogTitle>
          </DialogHeader>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
          >
            <Input
              placeholder="Enter folder name..."
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && folderName.trim()) {
                  handleCreateFolder();
                }
              }}
              className="mb-6 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg bg-gray-50/50 text-gray-800 placeholder-gray-400 transition-all duration-200 ease-in-out focus:outline-none"
              autoFocus
            />
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }}
                className="text-red-500 text-sm mb-4"
              >
                {error}
              </motion.p>
            )}
          </motion.div>
          <DialogFooter className="flex justify-end space-x-3">
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => {
                setIsFolderModalOpen(false);
                setFolderName("");
                setError("");
              }}
              className="px-4 py-2 bg-red-600 text-white border border-red-700 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all duration-200 ease-in-out cursor-pointer"
            >
              Cancel
            </motion.button>
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={handleCreateFolder}
              disabled={!folderName.trim()}
              className={`px-4 py-2 rounded-lg text-white transition-all duration-200 ease-in-out focus:outline-none cursor-pointer ${
                folderName.trim()
                  ? "bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/50"
                  : "bg-gray-400 cursor-not-allowed opacity-70"
              }`}
            >
              Create Folder
            </motion.button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLogoutModalOpen} onOpenChange={setIsLogoutModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
          <motion.div variants={modalVariants} initial="hidden" animate="visible">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-800">Confirm Logout</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-600 text-base">
                <span className="font-semibold text-gray-800">{userName}</span>, are you sure you want to log out?
              </p>
              <p className="text-sm text-gray-500 mt-2">You will be signed out of your account, and all local data will be cleared.</p>
            </div>
            <DialogFooter className="flex justify-end space-x-3">
              <motion.button
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400/50 transition-all duration-200 ease-in-out cursor-pointer"
              >
                Cancel
              </motion.button>
              <motion.button
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={confirmLogout}
                className="px-4 py-2 bg-red-600 text-white border border-red-700 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all duration-200 ease-in-out cursor-pointer"
              >
                Logout
              </motion.button>
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
}