import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { Payment, User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

export function PaymentHistory() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: payments, isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/admin/payments"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const isLoading = paymentsLoading || usersLoading;

  const getUserById = (userId: number) => {
    return users?.find(user => user.id === userId);
  };

  const getInitials = (user?: User) => {
    if (!user) return "?";
    
    if (!user.firstName && !user.lastName) {
      return user.username.substring(0, 2).toUpperCase();
    }
    
    const firstInitial = user.firstName ? user.firstName.charAt(0) : "";
    const lastInitial = user.lastName ? user.lastName.charAt(0) : "";
    
    return (firstInitial + lastInitial).toUpperCase();
  };

  const filteredPayments = payments
    ? payments.filter(payment => {
        const user = getUserById(payment.userId);
        if (!user) return false;
        
        const searchLower = searchQuery.toLowerCase();
        
        return (
          user.username.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          (user.firstName && user.firstName.toLowerCase().includes(searchLower)) ||
          (user.lastName && user.lastName.toLowerCase().includes(searchLower)) ||
          payment.plan.toLowerCase().includes(searchLower) ||
          payment.method.toLowerCase().includes(searchLower) ||
          payment.status.toLowerCase().includes(searchLower)
        );
      })
    : [];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const formatAmount = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  const formatPlan = (plan: string) => {
    return plan.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {t("paymentHistory")}
        </h3>
        <div className="relative w-full max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder={t("search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>{t("users")}</TableHead>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("amount")}</TableHead>
                <TableHead>{t("plan")}</TableHead>
                <TableHead>{t("method")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => {
                const user = getUserById(payment.userId);
                
                return (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Avatar className="mr-2">
                          <AvatarFallback className="bg-primary-500 text-primary-foreground">
                            {getInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-sm">{user?.email || 'Unknown'}</div>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(payment.date.toString())}</TableCell>
                    <TableCell>{formatAmount(payment.amount)}</TableCell>
                    <TableCell>{formatPlan(payment.plan)}</TableCell>
                    <TableCell className="capitalize">{payment.method}</TableCell>
                    <TableCell>
                      {payment.status === "completed" ? (
                        <Badge variant="outline" className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 border-green-200 dark:border-green-700">
                          {t("completed")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100 border-red-200 dark:border-red-700">
                          {t("failed")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        {t("viewDetails")}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredPayments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No payment history found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
