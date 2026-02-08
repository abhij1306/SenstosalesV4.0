"use client";

import React from "react";
import { Card, Button, Badge, Input } from "@/components/common";
import {
    PageHeader,
    Layout,
    Typography,
    ButtonGroup,
} from "@/components/patterns";
import { cn } from "@/lib/utils";
import { api, type Buyer as APIBuyer, type Settings } from "@/lib/api";
import { useSettingsStore } from "@/store/settingsStore";
import { useToast } from "@/components/common/Toast";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Building02Icon,
    UserGroupIcon,
    Settings02Icon,
    Tick02Icon,
    RupeeIcon,
    PercentIcon,
    Mail01Icon,
    Location01Icon,
    PlusSignIcon,
    Delete02Icon,
    Cancel01Icon,
    PencilEdit01Icon,
    CallIcon,
    FolderDownloadIcon,
    ArrowDown01Icon,
    Calendar03Icon
} from "@hugeicons/core-free-icons";

type SettingsSection = "supplier" | "buyers" | "system" | "downloads";

interface SettingsClientProps {
    initialSettings?: Settings | null;
    initialBuyers?: APIBuyer[];
    initialDownloadPrefs?: any;
}

export function SettingsClient({ initialSettings, initialBuyers, initialDownloadPrefs }: SettingsClientProps) {
    const [activeSection, setActiveSection] = React.useState<SettingsSection>("supplier");
    const {
        settings, fetchSettings, saveAll, isLoading: isGlobalLoading
    } = useSettingsStore();
    const { toast } = useToast();

    React.useEffect(() => {
        if (initialSettings && initialBuyers) {
            useSettingsStore.getState().hydrateSettings({
                settings: initialSettings,
                buyers: initialBuyers,
                download_prefs: initialDownloadPrefs || null
            });
        } else {
            useSettingsStore.getState().hydrateSettings();
        }
    }, []);

    const handleSaveAll = async () => {
        try {
            await saveAll();
            toast("Success", "All settings saved successfully", "success");
        } catch (error) {
            toast("Error", "Failed to save settings", "error");
        }
    };

    const navItems = [
        { id: "supplier", label: "Supplier Profile", icon: Building02Icon },
        { id: "buyers", label: "Buyer Management", icon: UserGroupIcon },
        { id: "system", label: "System Defaults", icon: Settings02Icon },
        { id: "downloads", label: "Download Folders", icon: FolderDownloadIcon },
    ] as const;

    if (isGlobalLoading && !settings) {
        return (
            <div className="h-[400px] flex items-center justify-center bg-surface">
                <div className="flex flex-col gap-2 items-center">
                    <HugeiconsIcon icon={PlusSignIcon} className="w-6 h-6 animate-spin text-primary" />
                    <span className="typo-label-lg">Initializing System...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("h-full flex flex-col gap-4")}>
            {/* Header */}
            <PageHeader
                title="Settings & Master Data"
                subtitle="Configure organization identity, buyer relationships, and system defaults"
            />

            {/* Tab Navigation */}
            <ButtonGroup
                options={[
                    { id: "supplier", label: "Supplier Profile" },
                    { id: "buyers", label: "Buyer Management" },
                    { id: "system", label: "System Defaults" },
                    { id: "downloads", label: "Download Folders" },
                ]}
                value={activeSection}
                onChange={(v) => setActiveSection(v as SettingsSection)}
            />

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-auto">
                <div className="bg-surface border border-border rounded-lg">
                    {activeSection === "supplier" && <SupplierSection />}
                    {activeSection === "buyers" && <BuyersSection />}
                    {activeSection === "system" && <SystemSection />}
                    {activeSection === "downloads" && <DownloadPrefsSection />}
                </div>
            </div>
        </div>
    );
}

const SupplierSection = React.memo(() => {
    const settings = useSettingsStore(s => s.settings);
    const update = useSettingsStore(s => s.updateSettings);

    if (!settings) return null;

    return (
        <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FieldCompact
                    label="Registered Entity Name"
                    value={settings.supplier_name || ""}
                    onChange={(v) => update({ supplier_name: v })}
                    icon={<HugeiconsIcon icon={Building02Icon} className="w-4 h-4" />}
                    placeholder="e.g. Acme Industries Ltd."
                />
                <FieldCompact
                    label="Phone Number"
                    value={settings.supplier_contact || ""}
                    onChange={(v) => update({ supplier_contact: v })}
                    icon={<HugeiconsIcon icon={CallIcon} className="w-4 h-4" />}
                    placeholder="+91 98765 43210"
                />
                <FieldCompact
                    label="Primary Email"
                    value={settings.supplier_email || ""}
                    onChange={(v) => update({ supplier_email: v })}
                    placeholder="billing@company.com"
                    icon={<HugeiconsIcon icon={Mail01Icon} className="w-4 h-4" />}
                />
                <FieldCompact
                    label="GSTIN (Tax ID)"
                    value={settings.supplier_gstin || ""}
                    onChange={(v) => update({ supplier_gstin: v })}
                    icon={<HugeiconsIcon icon={PercentIcon} className="w-4 h-4" />}
                    placeholder="27ABCDE1234F1Z5"
                />
                <FieldCompact
                    label="Registered Address"
                    value={settings.supplier_address || ""}
                    onChange={(v) => update({ supplier_address: v })}
                    icon={<HugeiconsIcon icon={Location01Icon} className="w-4 h-4" />}
                    placeholder="Full registered address..."
                />
                <FieldCompact
                    label="Business Tagline / GC Header"
                    value={settings.supplier_description || ""}
                    onChange={(v) => update({ supplier_description: v })}
                    icon={<span className="typo-body-sm opacity-50">#</span>}
                    placeholder="e.g. Manufacturers & Suppliers of Fibre Glass Products..."
                />
            </div>
        </div>
    );
});

const BuyersSection = React.memo(() => {
    const { buyers, saveBuyer, deleteBuyer, setBuyerDefault } = useSettingsStore();
    const { toast } = useToast();
    const [editingBuyer, setEditingBuyer] = React.useState<APIBuyer | Partial<APIBuyer> | null>(null);

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this buyer?")) {
            try {
                await deleteBuyer(id);
                toast("Success", "Buyer deleted", "success");
            } catch (error) {
                toast("Error", "Failed to delete buyer", "error");
            }
        }
    };

    const handleSaveBuyer = async () => {
        if (!editingBuyer || !editingBuyer.name || !editingBuyer.gstin) {
            toast("Error", "Name and GSTIN are required", "error");
            return;
        }
        try {
            await saveBuyer(editingBuyer);
            toast("Success", editingBuyer.id ? "Updated" : "Created", "success");
            setEditingBuyer(null);
        } catch (error) {
            toast("Error", "Failed to save buyer", "error");
        }
    };

    return (
        <div className="p-4">
            <div className="flex justify-end mb-3">
                <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setEditingBuyer({ name: "", gstin: "", billing_address: "", place_of_supply: "", is_default: false })}
                >
                    <HugeiconsIcon icon={PlusSignIcon} className="w-4 h-4" />
                    <span className="ml-1">Add Buyer</span>
                </Button>
            </div>

            {editingBuyer && (
                <div className={cn("bg-surface-sunken/50 border border-border rounded-lg p-3 mb-3")}>
                    <div className={cn("flex items-center justify-between mb-3 pb-2 border-b border-border")}>
                        <div className="flex items-center gap-2">
                            <HugeiconsIcon icon={Building02Icon} className="w-4 h-4 text-primary" />
                            <span className="typo-title-md">{editingBuyer.id ? "Edit Buyer Profile" : "New Buyer Profile"}</span>
                        </div>
                        <Button variant="ghost" size="compact" onClick={() => setEditingBuyer(null)} className="h-6 w-6 p-0" aria-label="Close editor">
                            <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <FieldCompact
                            label="Buyer Name"
                            value={editingBuyer.name || ""}
                            onChange={(v) => setEditingBuyer({ ...editingBuyer, name: v })}
                            icon={<HugeiconsIcon icon={Building02Icon} className="w-4 h-4" />}
                            placeholder="e.g. ABC Corporation"
                        />
                        <FieldCompact
                            label="Buyer GSTIN"
                            value={editingBuyer.gstin || ""}
                            onChange={(v) => setEditingBuyer({ ...editingBuyer, gstin: v })}
                            icon={<HugeiconsIcon icon={PercentIcon} className="w-4 h-4" />}
                            placeholder="33AAACB1234C1Z1"
                        />
                        <FieldCompact
                            label="Place of Supply"
                            value={editingBuyer.place_of_supply || ""}
                            onChange={(v) => setEditingBuyer({ ...editingBuyer, place_of_supply: v })}
                            icon={<HugeiconsIcon icon={Location01Icon} className="w-4 h-4" />}
                            placeholder="Tamil Nadu"
                        />
                        <div className="md:col-span-2">
                            <FieldCompact
                                label="Billing Address"
                                value={(editingBuyer as any).billing_address || ""}
                                onChange={(v) => setEditingBuyer({ ...editingBuyer, billing_address: v })}
                                icon={<HugeiconsIcon icon={Location01Icon} className="w-4 h-4" />}
                                placeholder="Full billing address..."
                            />
                        </div>
                        <div className={cn("flex items-center gap-2 pt-2")}>
                            <Input
                                id="is-default"
                                type="checkbox"
                                checked={editingBuyer.is_default}
                                onChange={(e) => setEditingBuyer({ ...editingBuyer, is_default: e.target.checked })}
                                className="h-3.5 w-3.5 rounded border-border"
                            />
                            <label htmlFor="is-default" className="typo-body-sm text-subtle">Primary default</label>
                        </div>
                    </div>

                    <div className={cn("flex items-center justify-between pt-2 border-t border-border")}>
                        <Button variant="ghost" size="compact" onClick={() => setEditingBuyer(null)} className="h-7 px-2">Cancel</Button>
                        <Button variant="primary" size="compact" onClick={handleSaveBuyer} className="h-7 px-2">
                            <HugeiconsIcon icon={Tick02Icon} className="w-4 h-4 mr-1.5" />
                            Save
                        </Button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Array.isArray(buyers) && buyers.length > 0 ? (
                    buyers.map((buyer) => (
                        <div key={buyer.id} className={cn(
                            "bg-surface border border-border rounded-lg p-3",
                            "group relative",
                            buyer.is_default && "bg-primary/5 border-primary/20"
                        )}>
                            {!!buyer.is_default && (
                                <div className="absolute top-0 right-0">
                                    <span className="typo-label-md px-1.5 py-0.5 bg-primary text-white rounded-tl-none rounded-br-none rounded">
                                        PRIMARY
                                    </span>
                                </div>
                            )}
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-primary/10 text-primary rounded">
                                        <HugeiconsIcon icon={Building02Icon} size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="typo-body-md truncate">{buyer.name}</p>
                                        <p className="typo-body-sm text-subtle typo-mono-md">{buyer.gstin}</p>
                                    </div>
                                </div>

                                <div className={cn("flex items-center gap-2 text-subtle")}>
                                    <HugeiconsIcon icon={Location01Icon} size={12} />
                                    <span className="typo-body-sm truncate">{buyer.billing_address || buyer.address || "No address"}</span>
                                </div>

                                <div className={cn("flex items-center justify-between pt-2 border-t border-border mt-1")}>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="checkbox"
                                            checked={!!buyer.is_default}
                                            onChange={() => setBuyerDefault(buyer.id)}
                                            className="h-3 w-3 rounded-full"
                                        />
                                        <span className="typo-body-sm text-subtle">Default</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="compact"
                                            onClick={() => setEditingBuyer(buyer)}
                                            className="h-6 w-6 p-0"
                                            aria-label="Edit buyer"
                                        >
                                            <HugeiconsIcon icon={PencilEdit01Icon} className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="compact"
                                            onClick={() => handleDelete(buyer.id)}
                                            className="h-6 w-6 p-0 text-subtle hover:text-error"
                                            aria-label="Delete buyer"
                                        >
                                            <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="md:col-span-2 p-8 text-center bg-surface-sunken rounded-lg border border-border">
                        <HugeiconsIcon icon={UserGroupIcon} className="w-6 h-6 mx-auto text-subtle opacity-30 mb-2" />
                        <p className="typo-body-sm text-subtle">No Buyers Found</p>
                    </div>
                )}
            </div>
        </div>
    );
});

const SystemSection = React.memo(() => {
    const settings = useSettingsStore(s => s.settings);
    const update = useSettingsStore(s => s.updateSettings);

    if (!settings) return null;

    return (
        <div className={cn("p-4 grid grid-cols-1 xl:grid-cols-2 gap-3")}>
            <div className={cn("bg-surface border border-border rounded-lg p-4")}>
                <div className="flex flex-col gap-3 pt-1">
                    <div className="flex flex-col gap-1">
                        <p className="typo-label-lg">Base Currency</p>
                        <div className="relative">
                            <HugeiconsIcon icon={RupeeIcon} className="w-4 h-4 absolute left-2.5 top-2 text-subtle" />
                            <select className="w-full h-8 pl-8 pr-4 typo-body-md rounded-md border border-border bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors appearance-none">
                                <option>INR - Indian Rupee</option>
                                <option>USD - US Dollar</option>
                            </select>
                            <HugeiconsIcon icon={ArrowDown01Icon} className="absolute right-2.5 top-2 w-4 h-4 text-subtle pointer-events-none" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <p className="typo-label-lg">Fiscal Year Cycle</p>
                        <div className="relative">
                            <HugeiconsIcon icon={Calendar03Icon} className="w-4 h-4 absolute left-2.5 top-2 text-subtle" />
                            <select className="w-full h-8 pl-8 pr-4 typo-body-md rounded-md border border-border bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors appearance-none">
                                <option>April - March (India)</option>
                                <option>January - December</option>
                            </select>
                            <HugeiconsIcon icon={ArrowDown01Icon} className="absolute right-2.5 top-2 w-4 h-4 text-subtle pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            <div className={cn("bg-surface border border-border rounded-lg p-4")}>
                <div className="flex flex-col gap-3 pt-1">
                    <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col gap-1">
                            <p className="typo-label-sm text-subtle">IGST %</p>
                            <Input
                                type="number"
                                value={Math.round(Number(settings.igst_rate) || 18)}
                                onChange={(e) => update({ igst_rate: Number(e.target.value) || 0 })}
                                className="h-8 text-center typo-mono-md border-border"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="typo-label-sm text-subtle">CGST %</p>
                            <Input
                                type="number"
                                value={Math.round(Number(settings.cgst_rate) || 9)}
                                onChange={(e) => update({ cgst_rate: Number(e.target.value) || 0 })}
                                className="h-8 text-center typo-mono-md border-border"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="typo-label-sm text-subtle">SGST %</p>
                            <Input
                                type="number"
                                value={Math.round(Number(settings.sgst_rate) || 9)}
                                onChange={(e) => update({ sgst_rate: Number(e.target.value) || 0 })}
                                className="h-8 text-center typo-mono-md border-border"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

const DownloadPrefsSection = React.memo(() => {
    const { downloadPrefs: prefs, updateDownloadPrefs: update, pickFolderPath, isLoading, isPicking } = useSettingsStore();

    if (isLoading && !prefs) return (
        <div className="h-[300px] flex items-center justify-center">
            <HugeiconsIcon icon={PlusSignIcon} className="w-6 h-6 animate-spin text-primary/30" />
        </div>
    );

    const safePrefs = prefs || {} as any;

    const fields = [
        { key: "po_html", label: "PO (HTML)", placeholder: "C:\\Downloads\\PO" },
        { key: "srv_html", label: "SRV (HTML)", placeholder: "C:\\Downloads\\SRV" },
        { key: "challan", label: "Challans", placeholder: "C:\\Downloads\\Challan" },
        { key: "gc", label: "GCs", placeholder: "C:\\Downloads\\GC" },
        { key: "invoice", label: "Invoices", placeholder: "C:\\Downloads\\Invoice" },
        { key: "challan_summary", label: "Challan Reg", placeholder: "C:\\Downloads\\Summary" },
        { key: "invoice_summary", label: "Invoice Reg", placeholder: "C:\\Downloads\\Summary" },
        { key: "items_summary", label: "Items Sum", placeholder: "C:\\Downloads\\Summary" },
    ] as const;

    return (
        <div className="p-4">
            <div className={cn("flex flex-col gap-3 w-full")}>
                {fields.map((field) => (
                    <div key={field.key} className={cn("flex items-center gap-2 items-end")}>
                        <div className="flex-1">
                            <FieldCompact
                                label={field.label}
                                value={safePrefs[field.key] || ""}
                                onChange={(v) => update({ [field.key]: v })}
                                icon={<HugeiconsIcon icon={FolderDownloadIcon} className="w-4 h-4" />}
                                placeholder={field.placeholder}
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => pickFolderPath(field.key)}
                            disabled={isPicking}
                            className="h-8 typo-body-sm"
                        >
                            Browse...
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
});

// Compact field component
interface FieldCompactProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    icon?: React.ReactNode;
    placeholder?: string;
}

function FieldCompact({ label, value, onChange, icon, placeholder }: FieldCompactProps) {
    return (
        <div className="flex flex-col gap-1">
            <label className="typo-label-lg">{label}</label>
            <div className="relative">
                {icon && (
                    <div className="absolute left-2.5 top-2 text-subtle">
                        {icon}
                    </div>
                )}
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={cn(
                        "h-8 typo-body-md border-border",
                        icon && "pl-8"
                    )}
                />
            </div>
        </div>
    );
}
