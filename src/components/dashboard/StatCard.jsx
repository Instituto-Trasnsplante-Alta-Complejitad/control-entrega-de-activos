import { Card } from "@/components/ui/card";

export default function StatCard({ title, value, icon: Icon, color }) {
  return (
    <Card className="p-5 relative overflow-hidden group hover:shadow-md transition-shadow duration-300">
      <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full bg-[#83db24] opacity-20 ${color}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold mt-1.5 text-foreground">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${color} bg-opacity-15`}>
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
    </Card>);

}