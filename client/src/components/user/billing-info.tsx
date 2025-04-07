import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Payment } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function BillingInfo() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  // Query user payments
  const { data: payments, isLoading } = useQuery<Payment[]>({
    queryKey: [`/api/payments/user/${user?.id}`],
    enabled: !!user,
  });

  const handleUpgrade = () => {
    // Redirect to subscription page
    window.location.href = "/subscription";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const formatAmount = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  const formatPlan = (plan: string) => {
    return plan.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card className="bg-gray-50 dark:bg-gray-700">
        <CardContent className="p-6">
          <div className="sm:flex sm:items-start sm:justify-between">
            <div>
              <h4 className="text-base font-medium text-gray-900 dark:text-white">{t("currentPlan")}</h4>
              <div className="mt-2">
                {user?.isPremium ? (
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100">
                      <svg className="mr-1.5 h-2 w-2 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 8 8">
                        <circle cx="4" cy="4" r="3" />
                      </svg>
                      {t("premiumPlan")}
                    </span>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {t("subscriptionRenews")} May 1, 2023.
                    </p>
                  </div>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-100">
                    {t("freePlan")}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-5 sm:mt-0">
              {user?.isPremium ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/subscription">{t("manage")}</Link>
                </Button>
              ) : (
                <Button size="sm" onClick={handleUpgrade}>
                  {t("upgrade")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <div>
        <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">{t("paymentHistory")}</h4>
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-md">
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading payment history...</p>
            </div>
          ) : payments && payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t("date")}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t("amount")}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t("plan")}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t("status")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(payment.date.toString())}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatAmount(payment.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatPlan(payment.plan)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {payment.status === "completed" ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100">
                            {t("completed")}
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100">
                            {t("failed")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("noPaymentHistory")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
