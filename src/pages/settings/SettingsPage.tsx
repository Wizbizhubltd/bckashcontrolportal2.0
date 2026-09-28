import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Building2Icon, LandmarkIcon, BellIcon, UserPlusIcon } from 'lucide-react';
import { settingsApi, type Setting } from '../../api/settingsApi';
import { loanProductsApi, type LoanProduct } from '../../api/loanProductsApi';
import { StatCard } from '../../components/StatCard';
import { loadCurrencyDisplay } from '../../utils/money';
import { SETTINGS_TABS, AUTO_NOTIFICATION_KEYS, isOn, type SettingsTabKey } from './settingsCatalog';
import { SettingGroupCard } from './SettingGroupCard';
import { AccessRulesSection, AllSettingsSection, ClientRulesSection, LoanProductsSection, OfficeStructureSection } from './SettingsSections';
import { FeesSection } from './FeesSection';
import { RolePermissionsSection } from './RolePermissionsSection';

export function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // In the URL so a refresh or a shared link opens the same tab.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = SETTINGS_TABS.find((t) => t.key === tabParam) ?? SETTINGS_TABS[0];
  const selectTab = (key: SettingsTabKey) => setSearchParams(key === SETTINGS_TABS[0].key ? {} : { tab: key }, { replace: true });

  const loadSettings = async () => {
    try {
      setSettings(await settingsApi.list());
      // A saved currency display change applies across the portal straight away.
      void loadCurrencyDisplay();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load settings.');
    }
  };

  const loadProducts = async () => {
    try {
      setProducts(await loanProductsApi.list());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load loan products.');
    }
  };

  useEffect(() => {
    void Promise.all([loadSettings(), loadProducts()]).finally(() => setLoading(false));
  }, []);

  const settingsByKey = useMemo(() => new Map(settings.map((s) => [s.settingKey, s])), [settings]);
  const value = (key: string) => settingsByKey.get(key)?.settingValue ?? null;

  const activeProducts = products.filter((p) => p.active).length;
  const notificationsOn = AUTO_NOTIFICATION_KEYS.filter((key) => isOn(value(key))).length;
  const selfRegistration = isOn(value('allow_self_registration'));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-heading font-bold text-primary">Rules & Settings</h1>
        <p className="text-sm text-gray-500 mt-1">The rules offices and staff operate by. Settings marked “Not enforced yet” are saved but not yet acted on by the system.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          colored
          label="Organisation"
          value={value('company_name') || 'Not set'}
          sublabel={value('company_email') ?? undefined}
          icon={Building2Icon}
          tone="primary"
          loading={loading}
        />
        <StatCard
          colored
          label="Active loan products"
          value={`${activeProducts} of ${products.length}`}
          sublabel="Available for new applications"
          icon={LandmarkIcon}
          tone="success"
          loading={loading}
        />
        <StatCard
          colored
          label="Automatic notifications on"
          value={`${notificationsOn} of ${AUTO_NOTIFICATION_KEYS.length}`}
          sublabel={isOn(value('sms_enabled')) ? 'SMS sending on' : 'SMS sending off'}
          icon={BellIcon}
          tone="info"
          loading={loading}
        />
        <StatCard
          colored
          label="Customer self-registration"
          value={selfRegistration ? 'On' : 'Off'}
          sublabel={selfRegistration ? 'Customers can sign up themselves' : 'Only staff create customers'}
          icon={UserPlusIcon}
          tone={selfRegistration ? 'warning' : 'neutral'}
          loading={loading}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <nav role="tablist" aria-orientation="vertical" className="lg:w-60 flex-shrink-0 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible bg-white rounded-xl border border-gray-100 p-2 self-start w-full">
          {SETTINGS_TABS.map((tab) => {
            const selected = tab.key === activeTab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={selected}
                onClick={() => selectTab(tab.key)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left whitespace-nowrap border-l-4 transition-colors ${selected ? 'bg-primary/5 text-primary font-heading font-bold border-accent' : 'text-gray-600 hover:bg-gray-50 border-transparent'}`}
              >
                <tab.icon size={18} className="flex-shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 min-w-0 space-y-4" role="tabpanel">
          <div>
            <h2 className="text-lg font-heading font-bold text-gray-900">{activeTab.label}</h2>
            <p className="text-sm text-gray-500">{activeTab.description}</p>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">Loading…</div>
          ) : (
            <>
              {activeTab.key === 'organisation' && <OfficeStructureSection />}
              {activeTab.key === 'loan' && <LoanProductsSection products={products} onChanged={loadProducts} />}
              {activeTab.key === 'fees' && <FeesSection />}
              {activeTab.key === 'rbac' && (
                <>
                  <RolePermissionsSection />
                  <AccessRulesSection />
                </>
              )}
              {activeTab.key === 'onboarding' && <ClientRulesSection />}

              {activeTab.groups.map((group) => (
                // Keyed by tab too, so unsaved edits don't leak into another tab's card of the same title.
                <SettingGroupCard key={`${activeTab.key}:${group.title}`} group={group} settingsByKey={settingsByKey} onSaved={loadSettings} />
              ))}

              {activeTab.key === 'organisation' && <AllSettingsSection settings={settings} onChanged={loadSettings} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
