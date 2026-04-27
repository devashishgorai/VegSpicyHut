import { useEffect, useState } from "react";
import { useAppOutlet } from "@/lib/contexts";
import {
  getGetSettingsQueryKey,
  useGetSettings,
  useUpdateSettings,
} from "@/lib/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

export default function Settings() {
  const { outletId } = useAppOutlet();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings(outletId);
  const updateSettings = useUpdateSettings();
  const [draftSettings, setDraftSettings] = useState<typeof settings | null>(null);

  useEffect(() => {
    if (settings) {
      setDraftSettings(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!draftSettings) return;

    try {
      await updateSettings.mutateAsync({
        outletId,
        data: {
          gstEnabled: draftSettings.gstEnabled,
          gstRate: Number(draftSettings.gstRate),
          serviceChargeEnabled: draftSettings.serviceChargeEnabled,
          serviceChargeRate: Number(draftSettings.serviceChargeRate),
          loyaltyPointsPerRupee: Number(draftSettings.loyaltyPointsPerRupee),
          loyaltyRedemptionRate: Number(draftSettings.loyaltyRedemptionRate),
          currencySymbol: draftSettings.currencySymbol,
          receiptFooter: draftSettings.receiptFooter,
          printKotAutomatically: draftSettings.printKotAutomatically,
          zomatoEnabled: draftSettings.zomatoEnabled,
          swiggyEnabled: draftSettings.swiggyEnabled,
          carbonTrackingEnabled: draftSettings.carbonTrackingEnabled,
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey(outletId) });
      toast({ title: "Settings updated" });
    } catch {
      toast({
        title: "Failed to update settings",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !settings || !draftSettings) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Outlet Settings</h1>
          <p className="text-muted-foreground">Configure taxes, printing, and billing defaults</p>
        </div>
        <Button
          className="rounded-xl shadow-md"
          onClick={handleSave}
          disabled={updateSettings.isPending}
        >
          {updateSettings.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Taxes & Charges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Enable GST</Label>
                <p className="text-sm text-muted-foreground">Apply GST to all orders</p>
              </div>
              <Switch
                checked={draftSettings.gstEnabled}
                onCheckedChange={(checked) =>
                  setDraftSettings((prev) => (prev ? { ...prev, gstEnabled: checked } : prev))
                }
              />
            </div>
            {draftSettings.gstEnabled && (
              <div className="space-y-2">
                <Label>Default GST Rate (%)</Label>
                <Input
                  value={draftSettings.gstRate}
                  onChange={(e) =>
                    setDraftSettings((prev) =>
                      prev ? { ...prev, gstRate: Number(e.target.value || 0) } : prev,
                    )
                  }
                  type="number"
                  className="w-32"
                />
              </div>
            )}
            <div className="flex items-center justify-between border-t pt-6">
              <div>
                <Label className="text-base">Service Charge</Label>
                <p className="text-sm text-muted-foreground">Automatically add service charge</p>
              </div>
              <Switch
                checked={draftSettings.serviceChargeEnabled}
                onCheckedChange={(checked) =>
                  setDraftSettings((prev) =>
                    prev ? { ...prev, serviceChargeEnabled: checked } : prev,
                  )
                }
              />
            </div>
            {draftSettings.serviceChargeEnabled && (
              <div className="space-y-2">
                <Label>Service Charge Rate (%)</Label>
                <Input
                  value={draftSettings.serviceChargeRate}
                  onChange={(e) =>
                    setDraftSettings((prev) =>
                      prev ? { ...prev, serviceChargeRate: Number(e.target.value || 0) } : prev,
                    )
                  }
                  type="number"
                  className="w-32"
                />
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
