import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { User } from "lucide-react";

const Settings = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-border">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Profile Settings</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user?.email || ""} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Your full name"
                />
              </div>

              <Button className="w-full">Save Changes</Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
