import SecuritySummaryCards from "./SecuritySummaryCards";
import SignupMetricsChart from "./SignupMetricsChart";
import SecurityLogsTable from "./SecurityLogsTable";
import DormantPlayersTable from "./DormantPlayersTable";
import ReminderSettingsForm from "./ReminderSettingsForm";
import CaptchaStatsCard from "./CaptchaStatsCard";

const AdminSecurity = () => (
  <div className="space-y-6">
    <h2 className="font-arcade text-base text-foreground">Security &amp; Dormancy</h2>
    <SecuritySummaryCards />
    <div className="grid gap-6 lg:grid-cols-2">
      <SignupMetricsChart />
      <div className="space-y-6">
        <CaptchaStatsCard />
        <ReminderSettingsForm />
      </div>
    </div>
    <DormantPlayersTable />
    <SecurityLogsTable />
  </div>
);

export default AdminSecurity;
