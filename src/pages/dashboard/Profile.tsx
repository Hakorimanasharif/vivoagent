import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff, User, Mail, Phone, Lock, Loader2, ShieldCheck, Camera } from "lucide-react";
import { toast } from "sonner";

const API_BASE = 'https://globalbackend-oqoz.onrender.com';

const Profile = () => {
  const [agentUser, setAgentUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [avatar, setAvatar] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useState<any>(null);

  const agentToken = localStorage.getItem('agentToken') || '';

  useEffect(() => {
    if (!agentToken) { navigate('/login'); return; }
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/agent/profile`, {
          headers: { 'Authorization': `Bearer ${agentToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAgentUser(data);
          setName(data.name || '');
          setEmail(data.email || '');
          setPhone(data.phone || '');
          setAvatar(data.avatar || '');
        }
      } catch (e) { console.error('Failed to fetch profile:', e); }
    };
    fetchProfile();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const body: any = { name, email, phone, avatar };
      if (currentPassword && newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      const res = await fetch(`${API_BASE}/api/auth/agent/credentials`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${agentToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Profile updated successfully!");
        localStorage.setItem('agentUser', JSON.stringify(data.user));
        setAgentUser(data.user);
        setCurrentPassword('');
        setNewPassword('');
      } else {
        toast.error(data.message || 'Update failed');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <PageHeader title="Profile Settings" breadcrumb="Profile" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Left Column: Avatar & Summary */}
        <Card className="p-6 md:col-span-1 rounded-3xl border-border/50 shadow-sm flex flex-col items-center text-center">
          <div className="relative group mb-6">
            <input
              type="file"
              className="hidden"
              id="avatarInput"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setIsUploading(true);
                const fd = new FormData();
                fd.append('image', file);
                try {
                  const res = await fetch(`${API_BASE}/api/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${agentToken}` },
                    body: fd
                  });
                  const data = await res.json();
                  if (data.success) {
                    setAvatar(data.imageUrl);
                    toast.success("Photo uploaded! Click Save to confirm.");
                  }
                } catch (e) { toast.error("Upload failed"); }
                finally { setIsUploading(false); }
              }}
            />
            <label htmlFor="avatarInput" className="relative cursor-pointer block">
              <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center text-5xl font-black text-primary border-4 border-background shadow-xl overflow-hidden">
                {avatar ? (
                  <img src={avatar} className="h-full w-full object-cover" alt="" />
                ) : (
                  agentUser?.name?.[0]?.toUpperCase() || 'A'
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploading ? <Loader2 className="text-white h-8 w-8 animate-spin" /> : <Camera className="text-white h-8 w-8" />}
              </div>
            </label>
          </div>
          
          <h2 className="text-2xl font-bold tracking-tight mb-1">{agentUser?.name || 'Agent User'}</h2>
          <p className="text-muted-foreground text-sm mb-4">{agentUser?.email}</p>
          
          <div className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 px-4 py-2 rounded-full text-sm font-semibold mb-6 w-full">
            <ShieldCheck className="h-4 w-4" /> Official Agent
          </div>
          
          <div className="w-full pt-6 border-t border-border/50 flex flex-col gap-3 text-left">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Account Status</span>
              <span className="font-semibold text-emerald-600">Active</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Role</span>
              <span className="font-semibold capitalize">Platform Agent</span>
            </div>
          </div>
        </Card>

        {/* Right Column: Form */}
        <Card className="p-6 md:col-span-2 rounded-3xl border-border/50 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Personal Information</h3>
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="pl-10 h-12 bg-muted/30 border-border/50 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12 bg-muted/30 border-border/50 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10 h-12 bg-muted/30 border-border/50 rounded-xl" />
                </div>
              </div>
            </div>

            <div className="pt-8 mt-8 border-t border-border/50">
              <h3 className="text-lg font-bold mb-6">Security Settings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type={showCurrentPw ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="pl-10 h-12 bg-muted/30 border-border/50 rounded-xl" />
                    <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type={showNewPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="pl-10 h-12 bg-muted/30 border-border/50 rounded-xl" />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <Button type="submit" className="h-12 px-8 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all" disabled={isLoading}>
                {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : "Save Changes"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
