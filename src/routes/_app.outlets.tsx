import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Pencil, Plus, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  fetchOutlets,
  createOutlet,
  updateOutlet,
  setOutletActive,
  type Outlet,
} from "@/lib/hrms-db";

export const Route = createFileRoute("/_app/outlets")({
  head: () => ({ meta: [{ title: "Outlets - Cleans HRMS" }] }),
  component: OutletsPage,
});

function OutletsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  
  const [locationSearch, setLocationSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [form, setForm] = useState({
    name: "",
    latitude: "",
    longitude: "",
    geofence_radius_meters: "50",
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetchOutlets(true)
      .then(setOutlets)
      .catch((e: any) => toast.error("Failed to load outlets"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  function handleEdit(outlet: Outlet) {
    setEditingId(outlet.id);
    setForm({
      name: outlet.name,
      latitude: outlet.latitude ? String(outlet.latitude) : "",
      longitude: outlet.longitude ? String(outlet.longitude) : "",
      geofence_radius_meters: String(outlet.geofence_radius_meters),
    });
    setOpen(true);
  }

  function handleAddNew() {
    setEditingId(null);
    setForm({
      name: "",
      latitude: "",
      longitude: "",
      geofence_radius_meters: "50",
    });
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Outlet name is required");
    
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        geofence_radius_meters: Number(form.geofence_radius_meters) || 50,
      };

      if (editingId) {
        await updateOutlet(editingId, payload);
        toast.success("Outlet updated");
      } else {
        await createOutlet(payload);
        toast.success("Outlet created");
      }
      setOpen(false);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save outlet");
    } finally {
      setSaving(false);
    }
  }

  function handleFetchLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    
    setFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm({
          ...form,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        });
        setFetchingLocation(false);
        toast.success("Location fetched successfully");
      },
      (error) => {
        console.error(error);
        setFetchingLocation(false);
        toast.error("Could not fetch location. Please ensure location permissions are granted.");
      },
      { enableHighAccuracy: true }
    );
  }

  useEffect(() => {
    const query = locationSearch.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        // Restrict to India, prefer South India (viewbox), and force English results
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&viewbox=76.15,13.8,80.35,8.08&accept-language=en&limit=5`);
        const data = await res.json();
        setSearchResults(data);
      } catch (e) {
        // Silently ignore errors during live typing
      } finally {
        setIsSearching(false);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(timeoutId);
  }, [locationSearch]);

  function selectSearchResult(result: any) {
    setForm({
      ...form,
      latitude: parseFloat(result.lat).toFixed(6),
      longitude: parseFloat(result.lon).toFixed(6)
    });
    setSearchResults([]);
    setLocationSearch("");
    toast.success("Coordinates updated from search");
  }

  async function toggleStatus(outlet: Outlet) {
    try {
      await setOutletActive(outlet.id, !outlet.active);
      toast.success(outlet.active ? "Outlet deactivated" : "Outlet activated");
      load();
    } catch (error) {
      toast.error("Failed to update status");
    }
  }

  return (
    <div>
      <PageHeader
        title="Outlets Management"
        description="Add and manage your physical outlet locations and their geofencing perimeters."
        actions={
          <Button size="sm" onClick={handleAddNew}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Outlet
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Outlet" : "Add New Outlet"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Outlet Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Adyar Branch"
                required
              />
            </div>
            <div className="space-y-1.5 rounded-lg border border-border p-3 bg-muted/20">
              <Label className="text-xs">Search for an Address (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  placeholder="Start typing area (e.g. T Nagar Chennai)..."
                />
              </div>
              {isSearching && <div className="text-xs text-muted-foreground mt-1">Searching...</div>}
              {searchResults.length > 0 && (
                <div className="mt-2 flex flex-col gap-1 rounded-md border bg-background p-1 shadow-sm max-h-40 overflow-y-auto">
                  {searchResults.map((res, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectSearchResult(res)}
                      className="text-left text-xs p-2 hover:bg-muted rounded transition-colors"
                    >
                      {res.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="0.0000001"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  placeholder="e.g. 13.0827"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="0.0000001"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  placeholder="e.g. 80.2707"
                />
              </div>
            </div>
            
            <Button 
              type="button" 
              variant="secondary" 
              size="sm" 
              className="w-full text-xs" 
              onClick={handleFetchLocation}
              disabled={fetchingLocation}
            >
              <MapPin className="mr-1.5 h-3.5 w-3.5" />
              {fetchingLocation ? "Detecting location..." : "Fetch Current Location"}
            </Button>

            <div className="space-y-1.5">
              <Label>Geofence Radius (meters)</Label>
              <Input
                type="number"
                min="10"
                value={form.geofence_radius_meters}
                onChange={(e) => setForm({ ...form, geofence_radius_meters: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">Employees must be within this radius to clock in.</p>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Outlet"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="mt-6 rounded-2xl border border-slate-100 dark:border-[#1B3A5C] bg-card p-0 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading outlets...</div>
        ) : outlets.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No outlets found. Add your first outlet above.</div>
        ) : (
          <div className="divide-y divide-border">
            {outlets.map(outlet => (
              <div key={outlet.id} className={["flex items-center justify-between p-4", !outlet.active ? "opacity-60 bg-muted/30" : ""].join(" ")}>
                <div className="flex items-center gap-4">
                  <div className={["flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", outlet.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"].join(" ")}>
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      {outlet.name}
                      {!outlet.active && <span className="text-[10px] uppercase tracking-wider bg-muted px-2 py-0.5 rounded-full text-muted-foreground">Inactive</span>}
                    </h3>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" />
                      {outlet.latitude && outlet.longitude
                        ? outlet.latitude + ", " + outlet.longitude + " (" + outlet.geofence_radius_meters + "m radius)"
                        : "No coordinates set"}
                    </div>
                    {outlet.device_secret && (
                      <div className="mt-1 flex items-center gap-1.5 rounded bg-muted/50 px-1.5 py-0.5 text-xs">
                        <span className="font-mono text-[10px] text-muted-foreground select-all">
                          {outlet.device_secret}
                        </span>
                        <span className="text-[10px] uppercase text-muted-foreground">Device Secret</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(outlet)}>
                    <Pencil className="h-4 w-4 mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleStatus(outlet)}
                    className={outlet.active ? "text-destructive hover:text-destructive" : ""}
                  >
                    {outlet.active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
