import { useState } from "react";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { FileEdit, MoreVertical, Trash2, Eye, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface UserTableProps {
  users: User[];
  filter: string;
}

export default function UserTable({ users, filter }: UserTableProps) {
  const { toast } = useToast();
  const [editUser, setEditUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedEmail, setEditedEmail] = useState("");
  const [editedStatus, setEditedStatus] = useState("");
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "123456", // Default password for manually added users
    role: "photographer",
    status: "active",
  });

  const filteredUsers = filter === "all" 
    ? users 
    : users.filter((user) => user.status === filter);

  const handleEditUser = (user: User) => {
    setEditUser(user);
    setEditedName(user.name);
    setEditedEmail(user.email);
    setEditedStatus(user.status);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;

    try {
      await apiRequest("PATCH", `/api/users/${editUser.id}`, {
        name: editedName,
        email: editedEmail,
        status: editedStatus,
      });

      toast({
        title: "User updated",
        description: "User details have been updated successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsEditDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await apiRequest("DELETE", `/api/users/${userToDelete.id}`, {});

      toast({
        title: "User deleted",
        description: "User has been deleted successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddUser = async () => {
    try {
      await apiRequest("POST", "/api/users", newUser);

      toast({
        title: "User added",
        description: "New user has been added successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setAddUserDialogOpen(false);
      setNewUser({
        name: "",
        email: "",
        password: "123456",
        role: "photographer",
        status: "active",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewProjects = (userId: string | number) => {
    // Navigate to a filtered view of projects for this user
    // In a real app, this would navigate to a different page/view
    toast({
      title: "View Projects",
      description: `Viewing projects for user ID: ${userId}`,
    });
  };

  const handleResendWelcomeEmail = async (user: User) => {
    try {
      const response = await apiRequest("POST", `/api/users/${user.id}/resend-welcome-email`, {});
      
      toast({
        title: "Email enviado",
        description: `Email de acesso reenviado para ${user.email}`,
      });
      
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao reenviar email de acesso. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "suspended":
        return <Badge className="bg-yellow-100 text-yellow-800">Suspended</Badge>;
      case "canceled":
        return <Badge className="bg-red-100 text-red-800">Canceled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Users Management</h1>
        <Button onClick={() => setAddUserDialogOpen(true)}>
          Add User
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Subscription ID</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Event</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                      {user.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {user.phone || "-"}
                </TableCell>
                <TableCell>
                  {getStatusBadge(user.status)}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {user.subscription_id || "-"}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {formatDate(user.createdAt)}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {user.lastEvent ? (
                    <>
                      <span className={`
                        ${user.lastEvent.type === 'payment.approved' && 'text-green-600'}
                        ${user.lastEvent.type === 'payment.failed' && 'text-yellow-600'}
                        ${user.lastEvent.type === 'subscription.canceled' && 'text-red-600'}
                      `}>
                        {user.lastEvent.type}
                      </span> ({formatDate(user.lastEvent.timestamp)})
                    </>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditUser(user)}>
                        <FileEdit className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewProjects(user.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        <span>View Projects</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteClick(user)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update the user information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={editedEmail}
                onChange={(e) => setEditedEmail(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                onValueChange={setEditedStatus}
                defaultValue={editedStatus}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => editUser && handleResendWelcomeEmail(editUser)}
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              <Mail className="mr-2 h-4 w-4" />
              Resend Welcome Email
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveEdit}>
                Save changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user "{userToDelete?.name}" and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add User Dialog */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new photographer account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-name" className="text-right">
                Name
              </Label>
              <Input
                id="new-name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-email" className="text-right">
                Email
              </Label>
              <Input
                id="new-email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-status" className="text-right">
                Status
              </Label>
              <Select
                onValueChange={(value) => setNewUser({ ...newUser, status: value })}
                defaultValue={newUser.status}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setAddUserDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleAddUser}
              disabled={!newUser.name || !newUser.email}
            >
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
