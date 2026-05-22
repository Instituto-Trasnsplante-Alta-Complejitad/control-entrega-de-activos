import { Card } from "@/components/ui/card";

export default function StatCard({ title, value, icon: Icon, color }) {
  return (
    <Card className="p-5 relative overflow-hidden group hover:shadow-md transition-shadow duration-300">
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-green-200 opacity-40" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold mt-1.5 text-foreground">{value}</p>
        </div>
        <div className="relative z-10 p-2">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </Card>);

}