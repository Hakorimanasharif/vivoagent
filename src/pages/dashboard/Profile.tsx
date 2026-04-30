import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff, User, Mail, Phone, Lock, Loader2, CheckCircle2 } from "lucide-react";
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
  const navigate = useNavigate();

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
        }
      } catch (e) { console.error('Failed to fetch profile:', e); }
    };
    fetchProfile();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const body: any = { name, email, phone };
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
    <div className="max-w-2xl mx-auto">
      <PageHeader title="My Profile" breadcrumb="Profile" />

      {/* Profile Card */}
      <Card className="p-6 mb-6 rounded-2xl border-0 shadow-xl bg-gradient-to-br from-primary to-primary/80 text-white overflow-hidden relative">
        <div className="absolute -right-10 -top-10 h-40 w-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-2xl font-black border border-white/30">
            {agentUser?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div>
            <h2 className="text-xl font-black">{agentUser?.name || 'Agent'}</h2>
            <p className="text-white/70 text-sm">{agentUser?.email}</p>
            <div className="flex items-center gap-1 mt-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-300" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Active Agent</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Edit Form */}
      <Card className="p-6 rounded-2xl">
        <h3 className="text-sm font-bold text-foreground mb-4">Update Credentials</h3>
        <form onSubmit={handleUpdate} className="space-y-5">
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> Full Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="agent@example.com" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0780000000" className="h-11" />
          </div>

          <div className="border-t pt-5 mt-5">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
              <Lock className="h-3.5 w-3.5" /> Change Password (optional)
            </h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <div className="relative">
                  <Input type={showCurrentPw ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="h-11 pr-10" />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Input type={showNewPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="h-11 pr-10" />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full h-11 text-base font-bold mt-2" disabled={isLoading}>
            {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Updating...</> : "Save Changes"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Profile;
