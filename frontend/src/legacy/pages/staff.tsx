import { useState } from "react";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  BridgeStaff,
  createStaffMember,
  deleteStaffMember,
  getStoredStaff,
  subscribeStaffChanges,
  updateStaffMember,
} from "@/lib/bridge";

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }
  return "Request failed. Check API server logs.";
}

export default function Staff() {
  const [staffList, setStaffList] = useState<BridgeStaff[]>(getStoredStaff);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<BridgeStaff | null>(null);

  useEffect(() => {
    return subscribeStaffChanges((nextStaff) => setStaffList(nextStaff));
  }, []);

  const handleAddStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim() || undefined,
      phone: String(fd.get("phone") ?? "").trim(),
      role: String(fd.get("role") ?? "cashier"),
      password: String(fd.get("password") ?? "").trim() || undefined,
      isActive: true,
    };

    if (!payload.name || !payload.phone) {
      toast({ title: "Name and phone are required", variant: "destructive" });
      return;
    }

    try {
      createStaffMember(payload as Omit<BridgeStaff, "id">);
      setStaffList(getStoredStaff());
      setIsAddOpen(false);
      form.reset();
      toast({ title: "Staff member added" });
    } catch (error) {
      toast({
        title: "Failed to add staff",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleEditStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingStaff) return;

    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "").trim();
    const payload: Record<string, unknown> = {
      name: String(fd.get("name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim() || undefined,
      phone: String(fd.get("phone") ?? "").trim(),
      role: String(fd.get("role") ?? editingStaff.role),
      isActive: String(fd.get("isActive") ?? "true") === "true",
    };

    if (password) {
      payload.password = password;
    }

    if (!payload.name || !payload.phone) {
      toast({ title: "Name and phone are required", variant: "destructive" });
      return;
    }

    try {
      updateStaffMember(editingStaff.id, payload as Partial<Omit<BridgeStaff, "id">>);
      setStaffList(getStoredStaff());
      setIsEditOpen(false);
      setEditingStaff(null);
      toast({ title: "Staff updated" });
    } catch (error) {
      toast({
        title: "Failed to update staff",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  function handleDeleteStaff(staff: BridgeStaff) {
    if (staffList.length <= 1) {
      toast({
        title: "Cannot delete last staff",
        description: "At least one staff member must remain.",
        variant: "destructive",
      });
      return;
    }

    const ok = window.confirm(`Delete staff \"${staff.name}\"?`);
    if (!ok) return;

    const deleted = deleteStaffMember(staff.id);
    if (!deleted) {
      toast({
        title: "Cannot delete staff",
        description: "At least one staff member must remain.",
        variant: "destructive",
      });
      return;
    }

    setStaffList(getStoredStaff());
    if (editingStaff?.id === staff.id) {
      setIsEditOpen(false);
      setEditingStaff(null);
    }
    toast({ title: "Staff deleted" });
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Staff Management</h1>
          <p className="text-muted-foreground">Manage roles, access, and team members</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-md"><Plus className="w-4 h-4 mr-2"/> Add Staff</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Staff</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddStaff} className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input name="name" required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" type="email" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input name="phone" required />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <select name="role" className="w-full h-10 px-3 rounded-md border" defaultValue="cashier">
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="cashier">Cashier</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="waiter">Waiter</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Password (optional)</Label>
                <Input name="password" type="password" />
              </div>
              <Button type="submit" className="w-full">Save Staff</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staffList.map((staff) => (
              <TableRow key={staff.id}>
                <TableCell className="font-semibold">{staff.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">{staff.role}</Badge>
                </TableCell>
                <TableCell>{staff.phone}<br/><span className="text-xs text-muted-foreground">{staff.email || "No email"}</span></TableCell>
                <TableCell>
                  {staff.isActive ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingStaff(staff);
                      setIsEditOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="ml-2"
                    onClick={() => handleDeleteStaff(staff)}
                    disabled={staffList.length <= 1}
                    title={staffList.length <= 1 ? "At least one staff member must remain" : "Delete staff"}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditingStaff(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff</DialogTitle>
          </DialogHeader>
          {editingStaff && (
            <form onSubmit={handleEditStaff} className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input name="name" required defaultValue={editingStaff.name} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" type="email" defaultValue={editingStaff.email || ""} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input name="phone" required defaultValue={editingStaff.phone} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <select name="role" className="w-full h-10 px-3 rounded-md border" defaultValue={editingStaff.role}>
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="cashier">Cashier</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="waiter">Waiter</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select name="isActive" className="w-full h-10 px-3 rounded-md border" defaultValue={editingStaff.isActive ? "true" : "false"}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>New Password (optional)</Label>
                <Input name="password" type="password" placeholder="Leave blank to keep current password" />
              </div>
              <Button type="submit" className="w-full">Update Staff</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
