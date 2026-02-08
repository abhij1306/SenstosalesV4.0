import { create } from 'zustand';
import { api, type Settings, type Buyer, type DownloadPrefs } from "@/lib/api";

interface SettingsState {
    settings: Settings | null;
    buyers: Buyer[];
    downloadPrefs: DownloadPrefs | null;
    isLoading: boolean;
    isPicking: boolean;
    error: string | null;

    // Actions
    fetchSettings: () => Promise<void>;
    updateSettings: (newSettings: Partial<Settings>) => void;
    saveSettings: () => Promise<void>;

    fetchBuyers: () => Promise<void>;
    setBuyers: (buyers: Buyer[]) => void;
    saveBuyer: (buyer: Partial<Buyer>) => Promise<void>;
    deleteBuyer: (id: number) => Promise<void>;
    setBuyerDefault: (id: number) => Promise<void>;

    fetchDownloadPrefs: () => Promise<void>;
    updateDownloadPrefs: (newPrefs: Partial<DownloadPrefs>) => void;
    pickFolderPath: (key: keyof DownloadPrefs) => Promise<void>;
    saveDownloadPrefs: () => Promise<void>;

    // Global Actions
    hydrateSettings: (data?: { settings: Settings; buyers: Buyer[]; download_prefs: DownloadPrefs }) => Promise<void>;
    saveAll: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
    settings: null,
    buyers: [],
    downloadPrefs: null,
    isLoading: false,
    isPicking: false,
    error: null,

    fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
            const settings = await api.getSettings();
            set({ settings });
        } catch (err: any) {
            set({ error: err.message });
        } finally {
            set({ isLoading: false });
        }
    },

    updateSettings: (newSettings) => {
        const current = get().settings;
        if (current) {
            set({ settings: { ...current, ...newSettings } });
        }
    },

    saveSettings: async () => {
        const settings = get().settings;
        if (!settings) return;
        const batch = Object.entries(settings).map(([key, value]) => ({
            key,
            value: String(value)
        }));
        await api.updateSettingsBatch(batch);
    },

    fetchBuyers: async () => {
        set({ isLoading: true, error: null });
        try {
            const buyers = await api.getBuyers();
            set({ buyers });
        } catch (err: any) {
            set({ error: err.message });
        } finally {
            set({ isLoading: false });
        }
    },

    setBuyers: (buyers) => set({ buyers }),

    saveBuyer: async (buyer) => {
        if (buyer.id) {
            await api.updateBuyer(buyer.id, buyer);
        } else {
            await api.createBuyer(buyer);
        }
        await get().fetchBuyers();
    },

    deleteBuyer: async (id) => {
        await api.deleteBuyer(id);
        await get().fetchBuyers();
    },

    setBuyerDefault: async (id) => {
        await api.setBuyerDefault(id);
        await get().fetchBuyers();
    },

    fetchDownloadPrefs: async () => {
        set({ isLoading: true, error: null });
        try {
            const downloadPrefs = await api.getDownloadPrefs();
            set({ downloadPrefs });
        } catch (err: any) {
            set({ error: err.message });
        } finally {
            set({ isLoading: false });
        }
    },

    updateDownloadPrefs: (newPrefs) => {
        const current = get().downloadPrefs || ({} as any);
        set({ downloadPrefs: { ...current, ...newPrefs } });
    },

    pickFolderPath: async (key) => {
        if (get().isPicking) return;
        set({ isPicking: true });

        try {
            const result = await api.pickFolder();
            if (result.path) {
                let current = get().downloadPrefs;
                if (!current || !current.po_html) {
                    try {
                        current = await api.getDownloadPrefs();
                        set({ downloadPrefs: current });
                    } catch {
                        current = {
                            po_html: "C:\\Downloads\\PO_HTML",
                            srv_html: "C:\\Downloads\\SRV_HTML",
                            challan: "C:\\Downloads\\Challan",
                            invoice: "C:\\Downloads\\Invoice",
                            challan_summary: "C:\\Downloads\\Challan_Summary",
                            invoice_summary: "C:\\Downloads\\Invoice_Summary",
                            items_summary: "C:\\Downloads\\Items_Summary",
                            gc: "C:\\Downloads\\GC"
                        };
                    }
                }
                const updated = { ...current, [key]: result.path };
                set({ downloadPrefs: updated as DownloadPrefs });
                await api.updateDownloadPrefs(updated as DownloadPrefs);
            }
        } finally {
            set({ isPicking: false });
        }
    },

    saveDownloadPrefs: async () => {
        const prefs = get().downloadPrefs;
        if (!prefs) return;
        await api.updateDownloadPrefs(prefs);
    },

    hydrateSettings: async (data?) => {
        if (data) {
            set({
                settings: data.settings,
                buyers: data.buyers,
                downloadPrefs: data.download_prefs,
                isLoading: false
            });
            return;
        }

        set({ isLoading: true, error: null });
        try {
            const full = await api.getSettingsFull();
            set({
                settings: full.settings,
                buyers: full.buyers,
                downloadPrefs: full.download_prefs,
                isLoading: false
            });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    saveAll: async () => {
        set({ isLoading: true, error: null });
        try {
            await Promise.all([
                get().saveSettings(),
                get().saveDownloadPrefs()
            ]);
        } catch (err: any) {
            set({ error: err.message });
            throw err;
        } finally {
            set({ isLoading: false });
        }
    }
}));
