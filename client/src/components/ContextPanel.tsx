import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Plus, 
  File, 
  FileText, 
  Image, 
  Video, 
  Music, 
  Archive, 
  Code,
  Link,
  ExternalLink,
  Trash2,
  ChevronDown,
  ChevronRight,
  FileCode,
  FileSpreadsheet,
  Loader2
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type ContextItem, type InsertContextItem, contextTypes } from "@shared/schema";

interface ContextPanelProps {
  discussionId: string | null;
}

// File type to icon mapping
const getFileIcon = (fileName: string) => {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'txt':
    case 'md':
    case 'rtf':
      return FileText;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'webp':
      return Image;
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
      return Video;
    case 'mp3':
    case 'wav':
    case 'flac':
    case 'aac':
      return Music;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
      return Archive;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'html':
    case 'css':
    case 'scss':
    case 'py':
    case 'java':
    case 'cpp':
    case 'c':
      return FileCode;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return FileSpreadsheet;
    case 'json':
    case 'xml':
    case 'yaml':
    case 'yml':
      return Code;
    default:
      return File;
  }
};

// Get file preview (for text files)
const getFilePreview = (content: string, type: string): string => {
  if (!content) return "No content available";
  const preview = content.substring(0, 150);
  return preview.length < content.length ? preview + "..." : preview;
};

// Extract metadata from URL (simplified)
const extractLinkMetadata = async (url: string): Promise<{ title: string; description?: string }> => {
  try {
    // In a real implementation, you might use a service like Open Graph parser
    // For now, we'll just extract the domain and use URL as title
    const urlObj = new URL(url);
    return {
      title: urlObj.hostname,
      description: urlObj.pathname
    };
  } catch {
    return {
      title: url,
      description: "Invalid URL"
    };
  }
};

export function ContextPanel({ discussionId }: ContextPanelProps) {
  const [showAddFileDialog, setShowAddFileDialog] = useState(false);
  const [showAddLinkDialog, setShowAddLinkDialog] = useState(false);
  const [filesExpanded, setFilesExpanded] = useState(true);
  const [linksExpanded, setLinksExpanded] = useState(true);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<ContextItem | null>(null);
  const { toast } = useToast();
  
  // Fetch context items
  const { data: contextItems = [], isLoading, error } = useQuery<ContextItem[]>({
    queryKey: ["/api/discussions", discussionId, "context"],
    enabled: !!discussionId
  });

  // Filter items by type
  const files = contextItems.filter((item: ContextItem) => item.type === "file");
  const links = contextItems.filter((item: ContextItem) => item.type === "link");

  // Delete mutation
  const deleteContextMutation = useMutation({
    mutationFn: (itemId: string) => apiRequest("DELETE", `/api/context/${itemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discussions", discussionId, "context"] });
      toast({
        title: "Context Item Deleted",
        description: "The context item has been removed from the discussion.",
      });
      setDeleteConfirmItem(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete context item",
        variant: "destructive",
      });
    },
  });

  if (!discussionId) {
    return (
      <div className="w-[280px] p-4 bg-sidebar border-l" data-testid="context-panel-empty">
        <h3 className="font-medium mb-4">Context</h3>
        <div className="text-sm text-muted-foreground text-center py-8">
          <File className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Select a discussion to view context</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-[280px] p-4 bg-sidebar border-l" data-testid="context-panel-error">
        <h3 className="font-medium mb-4">Context</h3>
        <div className="text-sm text-destructive text-center py-8">
          <p>Failed to load context items</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[280px] bg-sidebar border-l flex flex-col h-full" data-testid="context-panel">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="font-medium mb-3">Context</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddFileDialog(true)}
            className="flex-1"
            data-testid="button-add-file"
          >
            <Plus className="w-3 h-3 mr-1" />
            File
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddLinkDialog(true)}
            className="flex-1"
            data-testid="button-add-link"
          >
            <Plus className="w-3 h-3 mr-1" />
            Link
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-8" data-testid="context-panel-loading">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading context...</p>
          </div>
        ) : (
          <>
            {/* Files Section */}
            <Collapsible open={filesExpanded} onOpenChange={setFilesExpanded}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-2 h-auto font-medium text-sm"
                  data-testid="button-toggle-files"
                >
                  <span className="flex items-center gap-2">
                    <File className="w-4 h-4" />
                    Files ({files.length})
                  </span>
                  {filesExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2">
                {files.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4" data-testid="files-empty-state">
                    No files added yet
                  </div>
                ) : (
                  files.map((file: ContextItem) => {
                    const IconComponent = getFileIcon(file.name);
                    return (
                      <Card
                        key={file.id}
                        className="p-3 hover-elevate"
                        data-testid={`file-card-${file.id}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <IconComponent className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium truncate" title={file.name}>
                              {file.name}
                            </span>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => setDeleteConfirmItem(file)}
                            data-testid={`button-delete-file-${file.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        {file.content && (
                          <div className="text-xs text-muted-foreground bg-muted rounded p-2">
                            {getFilePreview(file.content, file.type)}
                          </div>
                        )}
                      </Card>
                    );
                  })
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Links Section */}
            <Collapsible open={linksExpanded} onOpenChange={setLinksExpanded}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-2 h-auto font-medium text-sm"
                  data-testid="button-toggle-links"
                >
                  <span className="flex items-center gap-2">
                    <Link className="w-4 h-4" />
                    Links ({links.length})
                  </span>
                  {linksExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2">
                {links.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4" data-testid="links-empty-state">
                    No links added yet
                  </div>
                ) : (
                  links.map((link: ContextItem) => (
                    <Card
                      key={link.id}
                      className="p-3 hover-elevate"
                      data-testid={`link-card-${link.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Link className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-medium truncate" title={link.name}>
                            {link.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => link.content && window.open(link.content, '_blank')}
                            data-testid={`button-open-link-${link.id}`}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => setDeleteConfirmItem(link)}
                            data-testid={`button-delete-link-${link.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground truncate" title={link.content || ''}>
                        {link.content}
                      </div>
                    </Card>
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </div>

      {/* Add File Dialog */}
      <AddFileDialog
        open={showAddFileDialog}
        onOpenChange={setShowAddFileDialog}
        discussionId={discussionId}
      />

      {/* Add Link Dialog */}
      <AddLinkDialog
        open={showAddLinkDialog}
        onOpenChange={setShowAddLinkDialog}
        discussionId={discussionId}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmItem}
        onOpenChange={(open) => !open && setDeleteConfirmItem(null)}
      >
        <DialogContent data-testid="dialog-delete-context-item">
          <DialogHeader>
            <DialogTitle>Delete Context Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmItem?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmItem(null)}
              disabled={deleteContextMutation.isPending}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmItem && deleteContextMutation.mutate(deleteConfirmItem.id)}
              disabled={deleteContextMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteContextMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Add File Dialog Component
function AddFileDialog({
  open,
  onOpenChange,
  discussionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discussionId: string;
}) {
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const { toast } = useToast();

  const addFileMutation = useMutation({
    mutationFn: async (data: InsertContextItem) => {
      const response = await apiRequest("POST", `/api/discussions/${discussionId}/context`, data);
      return response.json() as Promise<ContextItem>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discussions", discussionId, "context"] });
      resetForm();
      onOpenChange(false);
      toast({
        title: "File Added",
        description: "The file has been added to the discussion context.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add file",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFileName("");
    setFileContent("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim() || !fileContent.trim()) return;

    addFileMutation.mutate({
      discussionId,
      type: "file",
      name: fileName.trim(),
      content: fileContent.trim(),
      metadata: { fileSize: fileContent.length }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-add-file">
        <DialogHeader>
          <DialogTitle>Add File to Context</DialogTitle>
          <DialogDescription>
            Upload a file to add it to the discussion context for AI reference.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Upload File *</Label>
            <Input
              id="file-upload"
              type="file"
              onChange={handleFileUpload}
              data-testid="input-file-upload"
            />
          </div>

          {fileName && (
            <div className="space-y-2">
              <Label htmlFor="file-name">File Name</Label>
              <Input
                id="file-name"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Enter file name..."
                data-testid="input-file-name"
              />
            </div>
          )}

          {fileContent && (
            <div className="space-y-2">
              <Label htmlFor="file-content">File Content</Label>
              <Textarea
                id="file-content"
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                placeholder="File content..."
                rows={6}
                className="text-sm font-mono"
                data-testid="textarea-file-content"
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addFileMutation.isPending}
              data-testid="button-cancel-add-file"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!fileName.trim() || !fileContent.trim() || addFileMutation.isPending}
              data-testid="button-add-file-submit"
            >
              {addFileMutation.isPending ? "Adding..." : "Add File"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add Link Dialog Component
function AddLinkDialog({
  open,
  onOpenChange,
  discussionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discussionId: string;
}) {
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const { toast } = useToast();

  const addLinkMutation = useMutation({
    mutationFn: async (data: InsertContextItem) => {
      const response = await apiRequest("POST", `/api/discussions/${discussionId}/context`, data);
      return response.json() as Promise<ContextItem>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discussions", discussionId, "context"] });
      resetForm();
      onOpenChange(false);
      toast({
        title: "Link Added",
        description: "The link has been added to the discussion context.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add link",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setLinkName("");
    setLinkUrl("");
  };

  const handleUrlChange = async (url: string) => {
    setLinkUrl(url);
    if (url && !linkName && isValidUrl(url)) {
      // Auto-extract metadata
      try {
        const metadata = await extractLinkMetadata(url);
        setLinkName(metadata.title);
      } catch {
        // Ignore extraction errors
      }
    }
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkName.trim() || !linkUrl.trim() || !isValidUrl(linkUrl)) return;

    addLinkMutation.mutate({
      discussionId,
      type: "link",
      name: linkName.trim(),
      content: linkUrl.trim(),
      metadata: { domain: new URL(linkUrl).hostname }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-add-link">
        <DialogHeader>
          <DialogTitle>Add Link to Context</DialogTitle>
          <DialogDescription>
            Add a reference link to the discussion context for AI reference.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="link-url">URL *</Label>
            <Input
              id="link-url"
              type="url"
              value={linkUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://example.com"
              required
              data-testid="input-link-url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link-name">Link Name *</Label>
            <Input
              id="link-name"
              value={linkName}
              onChange={(e) => setLinkName(e.target.value)}
              placeholder="Enter a descriptive name..."
              required
              data-testid="input-link-name"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addLinkMutation.isPending}
              data-testid="button-cancel-add-link"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !linkName.trim() || 
                !linkUrl.trim() || 
                !isValidUrl(linkUrl) || 
                addLinkMutation.isPending
              }
              data-testid="button-add-link-submit"
            >
              {addLinkMutation.isPending ? "Adding..." : "Add Link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}